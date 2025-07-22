import { ethers } from 'ethers';
import { AORI_API, NATIVE_TOKEN_ADDRESS } from './constants';
import { ChainInfo, DomainInfo, TokenInfo, QuoteRequest, QuoteResponse, SignerType, SwapRequest, SwapResponse, TypedDataSigner, OrderStatus, PollOrderStatusOptions, QueryOrdersParams, QueryOrdersResponse, OrderDetails, TransactionRequest, TransactionResponse, NativeDepositExecutor, NativeSwapResponse, ERC20SwapResponse } from './types';

////////////////////////////////////////////////////////////////*/
//                      NATIVE TOKEN UTILITIES
//////////////////////////////////////////////////////////////*/

/**
 * Checks if a token address represents a native token (ETH)
 * @param tokenAddress The token address to check
 * @returns True if the address represents a native token
 */
export function isNativeToken(tokenAddress: string): boolean {
  return tokenAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();
}

/**
 * Checks if a quote response indicates a native token deposit (empty signing hash)
 * @param quoteResponse The quote response to check
 * @returns True if this is a native token deposit
 */
export function isNativeDeposit(quoteResponse: QuoteResponse): boolean {
  return quoteResponse.signingHash === "";
}

/**
 * Type guard to check if a swap response is a native deposit response
 * @param response The swap response to check
 * @returns True if this is a native deposit response
 */
export function isNativeSwapResponse(response: SwapResponse): response is NativeSwapResponse {
  return 'to' in response && 'data' in response && 'value' in response &&
         response.to !== undefined && response.data !== undefined && response.value !== undefined;
}

/**
 * Type guard to check if a swap response is an ERC20 deposit response
 * @param response The swap response to check
 * @returns True if this is an ERC20 deposit response
 */
export function isERC20SwapResponse(response: SwapResponse): response is ERC20SwapResponse {
  return !isNativeSwapResponse(response);
}

/**
 * Executes a native token deposit transaction
 * @param nativeResponse The native swap response containing transaction data
 * @param executor The wallet/provider that can execute transactions
 * @param gasLimit Optional gas limit override
 * @returns Transaction response with hash and success status
 */
export async function executeNativeDeposit(
  nativeResponse: NativeSwapResponse,
  executor: NativeDepositExecutor,
  gasLimit?: string
): Promise<TransactionResponse> {
  try {
    // Validate the native response
    validateNativeDepositResponse(nativeResponse);

    const transactionRequest: TransactionRequest = {
      to: nativeResponse.to,
      data: nativeResponse.data,
      value: nativeResponse.value,
      gasLimit
    };

    // Estimate gas if not provided and estimateGas is available
    if (!gasLimit && executor.estimateGas) {
      try {
        const estimatedGas = await executor.estimateGas(transactionRequest);
        // Add 20% buffer to estimated gas
        transactionRequest.gasLimit = (estimatedGas + (estimatedGas * 20n / 100n)).toString();
      } catch (error) {
        // If gas estimation fails, use a default
        transactionRequest.gasLimit = "200000";
      }
    }

    // Execute the transaction
    const tx = await executor.sendTransaction(transactionRequest);
    
    // Wait for transaction confirmation
    await tx.wait();

    return {
      success: true,
      txHash: tx.hash
    };

  } catch (error) {
    return {
      success: false,
      txHash: "",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Validates a native deposit response to ensure all required fields are present
 * @param response The native swap response to validate
 */
export function validateNativeDepositResponse(response: NativeSwapResponse): void {
  if (!response.to) {
    throw new Error("Native deposit response missing 'to' field");
  }
  
  if (!response.data) {
    throw new Error("Native deposit response missing 'data' field");
  }
  
  if (!response.value) {
    throw new Error("Native deposit response missing 'value' field");
  }

  // Validate that 'to' is a valid Ethereum address
  if (!ethers.isAddress(response.to)) {
    throw new Error(`Invalid contract address: ${response.to}`);
  }

  // Validate that 'data' is valid hex
  if (!response.data.startsWith('0x')) {
    throw new Error("Transaction data must be valid hex string starting with '0x'");
  }

  // Validate that 'value' matches inputAmount for native tokens
  if (response.value !== response.inputAmount) {
    throw new Error("Transaction value must match input amount for native token deposits");
  }

  // Validate that input token is native token
  if (!isNativeToken(response.inputToken)) {
    throw new Error("Native deposit response must have native token as input token");
  }
}

/**
 * Constructs a transaction request from a native swap response
 * @param nativeResponse The native swap response
 * @param gasLimit Optional gas limit override
 * @returns Transaction request ready for execution
 */
export function constructNativeDepositTransaction(
  nativeResponse: NativeSwapResponse,
  gasLimit?: string
): TransactionRequest {
  validateNativeDepositResponse(nativeResponse);
  
  return {
    to: nativeResponse.to,
    data: nativeResponse.data,
    value: nativeResponse.value,
    gasLimit: gasLimit || "200000" // Default gas limit
  };
}

/**
 * Validates that a contract address is a trusted Aori contract
 * @param contractAddress The contract address to validate
 * @param trustedAddresses Optional array of trusted contract addresses
 */
export function validateContractAddress(
  contractAddress: string,
  trustedAddresses?: string[]
): void {
  if (!ethers.isAddress(contractAddress)) {
    throw new Error(`Invalid contract address: ${contractAddress}`);
  }

  // If trusted addresses are provided, validate against them
  if (trustedAddresses && trustedAddresses.length > 0) {
    const isValidAddress = trustedAddresses.some(
      addr => addr.toLowerCase() === contractAddress.toLowerCase()
    );
    
    if (!isValidAddress) {
      throw new Error(
        `Contract address ${contractAddress} is not in the list of trusted addresses: ${trustedAddresses.join(', ')}`
      );
    }
  }
}

/**
 * Validates that the user has sufficient native token balance
 * @param userBalance The user's current balance in wei
 * @param requiredAmount The required amount in wei
 * @param buffer Optional buffer percentage (default: 5%)
 */
export function validateSufficientBalance(
  userBalance: string | bigint,
  requiredAmount: string | bigint,
  buffer: number = 5
): void {
  const balance = typeof userBalance === 'string' ? BigInt(userBalance) : userBalance;
  const required = typeof requiredAmount === 'string' ? BigInt(requiredAmount) : requiredAmount;
  
  // Add buffer for gas costs
  const bufferAmount = (required * BigInt(buffer)) / 100n;
  const totalRequired = required + bufferAmount;

  if (balance < totalRequired) {
    throw new Error(
      `Insufficient balance. Required: ${totalRequired.toString()} wei (including ${buffer}% buffer), Available: ${balance.toString()} wei`
    );
  }
}

/**
 * Decodes and validates the transaction calldata to ensure it's a depositNative call
 * @param data The transaction calldata
 * @returns True if the data represents a valid depositNative call
 */
export function validateDepositNativeCalldata(data: string): boolean {
  try {
    // depositNative function selector: depositNative(Order)
    // This is a basic validation - in a production environment you might want to
    // use a proper ABI decoder to validate the full function call
    
    if (!data.startsWith('0x')) {
      return false;
    }

    // Check minimum length (4 bytes for function selector)
    if (data.length < 10) {
      return false;
    }

    // Extract function selector (first 4 bytes)
    const functionSelector = data.slice(0, 10);
    
    // You would replace this with the actual depositNative function selector
    // For now, we'll just validate that it's a valid hex string with proper length
    return /^0x[0-9a-fA-F]{8}/.test(functionSelector);
    
  } catch (error) {
    return false;
  }
}

/**
 * Creates an error handler for common native token transaction errors
 * @param error The error object
 * @returns A user-friendly error message
 */
export function handleNativeTokenError(error: any): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.code) {
    switch (error.code) {
      case 'CALL_EXCEPTION':
        return 'depositNative() transaction failed. Please check your balance and gas settings.';
      case 'INSUFFICIENT_FUNDS':
        return 'Insufficient funds to complete the transaction including gas fees.';
      case 'UNPREDICTABLE_GAS_LIMIT':
        return 'Unable to estimate gas for the transaction. Please try again or set a manual gas limit.';
      case 'USER_REJECTED':
        return 'Transaction was rejected by the user.';
      case 'NETWORK_ERROR':
        return 'Network error occurred. Please check your connection and try again.';
      default:
        return error.message || 'An unknown error occurred during the native token transaction.';
    }
  }

  return error?.message || 'An unknown error occurred during the native token transaction.';
}

////////////////////////////////////////////////////////////////*/
//                      HELPER FUNCTIONS
//////////////////////////////////////////////////////////////*/

export async function fetchAllChains(
    baseUrl: string = AORI_API,
    apiKey?: string,
   { signal }: { signal?: AbortSignal } = {},
  ): Promise<Record<string, ChainInfo>> {
  try {

    const response = await http({
      method: 'GET',
      url: new URL('chains', baseUrl),
      headers: buildHeaders(apiKey),
      signal,
    })

      // Convert array to object with chainKey as key
      const chainsArray = response.data;
      const chainsObject: Record<string, ChainInfo> = {};
      
      for (const chain of chainsArray) {
        chainsObject[chain.chainKey.toLowerCase()] = chain;
      }
      
      return chainsObject;
  } catch (error) {
      throw new Error(`Failed to fetch chains: ${error}`);
    }
  }
  
  /**
   * Fetches the chain information for a specific chain
   * @param chain The chain identifier - can be either chainId (number) or chainKey (string)
   * @param baseUrl The base URL of the API
   * @param apiKey Optional API key for authentication
   * @returns The chain information for the specified chain
   */
  export async function getChain(
    chain: string | number,
    baseUrl: string = AORI_API,
    apiKey?: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<ChainInfo> {
    try {

      const response = await http({
        method: 'GET',
        url: new URL('chains', baseUrl),
        headers: buildHeaders(apiKey),
        signal
      })
      const chainsArray = response.data;
      
      let targetChain;
      
      if (typeof chain === 'string') {
        // Search by chainKey
        targetChain = chainsArray.find((chainInfo: ChainInfo) => 
          chainInfo.chainKey.toLowerCase() === chain.toLowerCase()
        );
      } else {
        // Search by chainId
        targetChain = chainsArray.find((chainInfo: ChainInfo) => 
          chainInfo.chainId === chain
        );
      }
      
      if (!targetChain) {
        throw new Error(`Chain not found for identifier: ${chain}`);
      }
      
      return targetChain;
    } catch (error) {
      throw new Error(`Failed to fetch chain information: ${error}`);
    }
  }
  
  /**
   * Fetches the contract address for a specific chain
   * @param chain The chain identifier - can be either chainId (number) or chainKey (string)
   * @param baseUrl The base URL of the API
   * @param apiKey Optional API key for authentication
   * @returns The contract address for the specified chain
   */
  export async function getAddress(
    chain: string | number,
    baseUrl: string = AORI_API,
    apiKey?: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<string> {
    try {
      
      const response = await http({
        method: 'GET',
        url: new URL('chains', baseUrl),
        headers: buildHeaders(apiKey),
        signal
      });
      const chainsArray = response.data;
      
      let targetChain;
      
      if (typeof chain === 'string') {
        // Search by chainKey
        targetChain = chainsArray.find((chainInfo: ChainInfo) => 
          chainInfo.chainKey.toLowerCase() === chain.toLowerCase()
        );
      } else {
        // Search by chainId
        targetChain = chainsArray.find((chainInfo: ChainInfo) => 
          chainInfo.chainId === chain
        );
      }
      
      if (!targetChain) {
        throw new Error(`Chain not found for identifier: ${chain}`);
      }
      
      return targetChain.address;
    } catch (error) {
      throw new Error(`Failed to fetch chain address: ${error}`);
    }
  }

  /**
 * Fetches the chain information for a specific EID
 * @param eid The EID of the chain to get information for
 * @param baseUrl The base URL of the API
 * @param apiKey Optional API key for authentication
 * @returns The chain information for the specified EID
 */
export async function getChainByEid(
    eid: number,
    baseUrl: string = AORI_API,
    apiKey?: string,
   { signal }: { signal?: AbortSignal } = {},
  ): Promise<ChainInfo> {
    try {
      const response = await http({
        method: 'GET',
        url: new URL('chains', baseUrl),
        headers: buildHeaders(apiKey),
        signal
      });
      const chainsArray = response.data;
      
      const targetChain = chainsArray.find((chainInfo: ChainInfo) => 
        chainInfo.eid === eid
      );
      
      if (!targetChain) {
        throw new Error(`Chain not found for EID: ${eid}`);
      }
      
      return targetChain;
    } catch (error) {
      throw new Error(`Failed to fetch chain information: ${error}`);
    }
  }

  //////////////////////////////////////////////////////////////*/
  //                        DOMAIN FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  /**
   * Fetches the domain information needed for EIP-712 typed data signing
   * @param baseUrl The base URL of the API
   * @param apiKey Optional API key for authentication
   * @returns The domain information containing name, version, and type strings
   */
  export async function getDomain(
    baseUrl: string = AORI_API,
    apiKey?: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<DomainInfo> {
    try {
      const response = await http({
        method: 'GET',
        url: new URL('domain', baseUrl),
        headers: buildHeaders(apiKey),
        signal,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch domain information: ${error}`);
    }
  }

  //////////////////////////////////////////////////////////////*/
  //                        TOKEN FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  /**
   * Fetches all tokens across all chains or for a specific chain
   * @param baseUrl The base URL of the API
   * @param apiKey Optional API key for authentication
   * @param chain Optional chain identifier to filter by - can be either chainId (number) or chainKey (string)
   * @returns All tokens or tokens filtered by chain
   */
  export async function fetchAllTokens(
    baseUrl: string = AORI_API,
    apiKey?: string,
    { signal, chain }: { signal?: AbortSignal; chain?: string | number } = {},
  ): Promise<TokenInfo[]> {
    try {
      const url = new URL('tokens', baseUrl);
      
      // Add chain filter if provided
      if (chain !== undefined) {
        if (typeof chain === 'string') {
          url.searchParams.set('chainKey', chain);
        } else {
          url.searchParams.set('chainId', chain.toString());
        }
      }

      const response = await http({
        method: 'GET',
        url,
        headers: buildHeaders(apiKey),
        signal,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch tokens: ${error}`);
    }
  }

  /**
   * Fetches tokens for a specific chain
   * @param chain The chain identifier - can be either chainId (number) or chainKey (string)
   * @param baseUrl The base URL of the API
   * @param apiKey Optional API key for authentication
   * @returns The tokens for the specified chain
   */
  export async function getTokens(
    chain: string | number,
    baseUrl: string = AORI_API,
    apiKey?: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<TokenInfo[]> {
    return await fetchAllTokens(baseUrl, apiKey, { signal, chain });
  }

  //////////////////////////////////////////////////////////////*/
  //                         GET A QUOTE
  //////////////////////////////////////////////////////////////*/
  
  export async function getQuote(
    request: QuoteRequest,
    baseUrl: string = AORI_API,
    apiKey?: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<QuoteResponse> {
    try {
      const response = await http({
        method: 'POST',
        url: new URL('quote', baseUrl),
        headers: buildHeaders(apiKey),
        signal,
        data: {
          ...request,
          inputAmount: request.inputAmount.toString(), // Convert any number type to string
        }
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Quote request failed: ${error}`);
    }
  }
  
  
  //////////////////////////////////////////////////////////////*/
  //                     SIGN AN ORDER
  //////////////////////////////////////////////////////////////*/
  
  /**
   * Signs an order using the signing hash from a quote response
   * @param quoteResponse The quote response containing the signing hash
   * @param signer The signer object containing the private key
   * @returns The signature string
   */
  export async function signOrder(
    quoteResponse: QuoteResponse,
    signer: SignerType
  ): Promise<string> {
    // Check if this is a native deposit (empty signing hash)
    if (isNativeDeposit(quoteResponse)) {
      return ""; // No signature required for native deposits
    }

    // Create signing key directly from private key
    const signingKey = new ethers.SigningKey(signer.privateKey);
    
    // Remove '0x' prefix if present and convert to Uint8Array
    const signingHashHex = quoteResponse.signingHash.startsWith('0x')
      ? quoteResponse.signingHash
      : '0x' + quoteResponse.signingHash;
  
    // Get bytes from the hash
    const signingHashBytes = ethers.getBytes(signingHashHex);
  
    const signedHash = signingKey.sign(signingHashBytes);
  
    // Format signature
    const formattedSignature = ethers.concat([
      signedHash.r,
      signedHash.s,
      `0x${signedHash.v.toString(16).padStart(2, '0')}`
    ]);
  
    return formattedSignature;
  }

  //////////////////////////////////////////////////////////////*/
  //                     CREATE TYPED DATA
  //////////////////////////////////////////////////////////////*/
  export function createTypedData(
    quoteResponse: QuoteResponse,
    {srcEid, dstEid, chainId, verifyingContract, domainInfo}: {srcEid: number, dstEid: number, chainId: number, verifyingContract: `0x${string}`, domainInfo: DomainInfo}
  ) {
    // Define the types for EIP-712 typed data
    const types = {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "verifyingContract", type: "address" }   
      ],
      Order: [
        { name: "inputAmount", type: "uint128" },
        { name: "outputAmount", type: "uint128" },
        { name: "inputToken", type: "address" },
        { name: "outputToken", type: "address" },
        { name: "startTime", type: "uint32" },
        { name: "endTime", type: "uint32" },
        { name: "srcEid", type: "uint32" },
        { name: "dstEid", type: "uint32" },
        { name: "offerer", type: "address" },
        { name: "recipient", type: "address" },
      ]
    };
  
    // Convert numeric startTime/endTime to strings if needed
    const startTimeStr = typeof quoteResponse.startTime === 'number'
      ? quoteResponse.startTime.toString()
      : quoteResponse.startTime;
  
    const endTimeStr = typeof quoteResponse.endTime === 'number'
      ? quoteResponse.endTime.toString()
      : quoteResponse.endTime;
  
    // Construct the message from the QuoteResponse
    const message = {
      offerer: quoteResponse.offerer,
      recipient: quoteResponse.recipient,
      inputToken: quoteResponse.inputToken,
      outputToken: quoteResponse.outputToken,
      inputAmount: BigInt(quoteResponse.inputAmount),
      outputAmount: BigInt(quoteResponse.outputAmount),
      startTime: BigInt(Number(startTimeStr)),
      endTime: BigInt(Number(endTimeStr)),
      srcEid,
      dstEid,
    };
  
    // Create the domain object
    const domain = {
      name: domainInfo.name,
      version: domainInfo.version,
      chainId: BigInt(chainId),
      verifyingContract
    } as const;

    return {
      domain,
      types,
      primaryType: "Order",
      message
    } as const
  }
  
  //////////////////////////////////////////////////////////////*/
  //                     SIGN READABLE ORDER
  //////////////////////////////////////////////////////////////*/
  
  /**
   * Signs an order using EIP-712 typed data format
   * @param quoteResponse The quote response containing order details
   * @param signer The wallet client that can sign typed data
   * @param userAddress The address of the user signing the order
   * @param baseUrl The base URL of the API
   * @param apiKey Optional API key for authentication
   * @param inputChain Optional input chain info. If not provided, will fetch from API
   * @param outputChain Optional output chain info. If not provided, will fetch from API
   * @param domainInfo Optional domain info for EIP-712. If not provided, will fetch from API
   * @returns The signature and orderHash
   */
  export async function signReadableOrder(
    quoteResponse: QuoteResponse,
    signer: TypedDataSigner,
    userAddress: string,
    baseUrl: string = AORI_API,
    apiKey?: string,
    inputChain?: ChainInfo,
    outputChain?: ChainInfo,
    domainInfo?: DomainInfo
  ): Promise<{ orderHash: string, signature: string }> {
    // Check if this is a native deposit (empty signing hash)
    if (isNativeDeposit(quoteResponse)) {
      return {
        orderHash: quoteResponse.orderHash,
        signature: "" // No signature required for native deposits
      };
    }

    // Use provided chain info if available, otherwise fetch from API
    let resolvedInputChainInfo: ChainInfo;
    let resolvedOutputChainInfo: ChainInfo;
    let resolvedDomainInfo: DomainInfo;
    
    if (inputChain) {
      resolvedInputChainInfo = inputChain;
    } else {
      // fetch input chain from API
      resolvedInputChainInfo = await getChain(quoteResponse.inputChain, baseUrl, apiKey);
    }
    
    if (outputChain) {
      resolvedOutputChainInfo = outputChain;
    } else {
      // fetch output chain from API
      resolvedOutputChainInfo = await getChain(quoteResponse.outputChain, baseUrl, apiKey);
    }

    if (domainInfo) {
      resolvedDomainInfo = domainInfo;
    } else {
      // fetch domain info from API
      resolvedDomainInfo = await getDomain(baseUrl, apiKey);
    }

    const { domain, types, primaryType, message } = createTypedData(quoteResponse, {
      srcEid: resolvedInputChainInfo.eid,
      dstEid: resolvedOutputChainInfo.eid,
      chainId: resolvedInputChainInfo.chainId,
      verifyingContract: resolvedInputChainInfo.address as `0x${string}`,
      domainInfo: resolvedDomainInfo
    });

  
    // Sign the typed data
    const signature = await signer.signTypedData({
      account: userAddress,
      domain,
      types,
      primaryType,
      message
    });
  
    return {
      orderHash: quoteResponse.orderHash,
      signature
    };
  }
  //////////////////////////////////////////////////////////////*/
  //                     SUBMIT A SWAP
  //////////////////////////////////////////////////////////////*/
  
  export async function submitSwap(
    request: SwapRequest,
    baseUrl: string = AORI_API,
    apiKey?: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<SwapResponse> {
    try {

      const response = await http({
        method: 'POST',
        url: new URL('swap', baseUrl),
        headers: buildHeaders(apiKey),
        signal,
        data: {
          orderHash: request.orderHash,
          signature: request.signature,
        }
      });
  
      const data = response.data;
      
      // Check if this is a native deposit response (has to, data, value fields)
      const isNativeResponse = data.to && data.data && data.value;
      
      if (isNativeResponse) {
        // Native deposit response
        return {
          orderHash: data.orderHash,
          offerer: data.offerer,
          recipient: data.recipient,
          inputToken: data.inputToken,
          outputToken: data.outputToken,
          inputAmount: data.inputAmount,
          outputAmount: data.outputAmount,
          inputChain: data.inputChain,
          outputChain: data.outputChain,
          startTime: data.startTime,
          endTime: data.endTime,
          status: data.status,
          createdAt: data.createdAt,
          to: data.to,
          data: data.data,
          value: data.value,
        };
      } else {
        // ERC20 deposit response (standard)
        return {
          orderHash: data.orderHash,
          offerer: data.offerer,
          recipient: data.recipient,
          inputToken: data.inputToken,
          outputToken: data.outputToken,
          inputAmount: data.inputAmount,
          outputAmount: data.outputAmount,
          inputChain: data.inputChain,
          outputChain: data.outputChain,
          startTime: data.startTime,
          endTime: data.endTime,
          status: data.status,
          createdAt: data.createdAt,
        };
      }
    } catch (error) {
      throw new Error(`Swap request failed: ${error}`);
    }
  }
  
  ////////////////////////////////////////////////////////////////*/
  //                   GET ORDER STATUS
  //////////////////////////////////////////////////////////////*/
  
  /**
   * Fetches the current status of an order
   * @param orderHash The hash of the order to check
   * @param baseUrl The base URL of the API
   * @param apiKey Optional API key for authentication
   * @returns A promise that resolves with the order status
   */
  export async function getOrderStatus(
    orderHash: string,
    baseUrl: string = AORI_API,
    apiKey?: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<OrderStatus> {
    try {   
      const response = await http({
        method: 'GET',
        url: new URL(`data/status/${orderHash}`, baseUrl),
        headers: buildHeaders(apiKey),
        signal
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch order status: ${error}`);
    }
  }
  
  /**
   * Polls the order status until it's completed, failed, or times out
   * @param orderHash The hash of the order to poll
   * @param baseUrl The base URL of the API
   * @param options Polling options and callbacks
   * @param apiKey Optional API key for authentication
   * @returns A promise that resolves with the final order status
   */
  export async function pollOrderStatus(
    orderHash: string,
    baseUrl: string = AORI_API,
    options: PollOrderStatusOptions = {},
    apiKey?: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<OrderStatus> {
    const {
      onStatusChange,
      onComplete,
      onError,
      interval = 500,
      timeout = 60000
    } = options;
  
    let lastStatus: string | null = null;
    const startTime = Date.now();
  
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          // Check if we've exceeded the timeout
          if (Date.now() - startTime > timeout) {
            const error = new Error('Order status polling timed out');
            onError?.(error);
            reject(error);
            return;
          }
  
          // Use the getOrderStatus function with apiKey
          const status = await getOrderStatus(orderHash, baseUrl, apiKey, { signal });
  
          // Notify if status has changed
          if (status.status !== lastStatus) {
            lastStatus = status.status;
            onStatusChange?.(status);
          }
  
          // Check for completed or failed status
          if (status.status === 'completed' || status.status === 'failed') {
            onComplete?.(status);
            resolve(status);
            return;
          }
  
          // Continue polling
          setTimeout(checkStatus, interval);
  
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          onError?.(err);
          reject(err);
        }
      };
  
      // Start polling
      checkStatus();
    });
  }
  
  ////////////////////////////////////////////////////////////////*/
  //                   GET ORDER DETAILS
  //////////////////////////////////////////////////////////////*/
  
  /**
   * Fetches detailed information about an order
   * @param orderHash The hash of the order to get details for
   * @param baseUrl The base URL of the API
   * @param apiKey Optional API key for authentication
   * @returns A promise that resolves with the order details
   */
  export async function getOrderDetails(
    orderHash: string,
    baseUrl: string = AORI_API,
    apiKey?: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<OrderDetails> {
    try {
      const response = await http({
        method: 'GET',
        url: new URL(`data/details/${orderHash}`, baseUrl),
        headers: buildHeaders(apiKey),
        signal
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch order details: ${error}`);
    }
  }
  
  ////////////////////////////////////////////////////////////////*/
  //                        QUERY ORDERS
  //////////////////////////////////////////////////////////////*/
  
  /**
   * Queries orders with filtering criteria
   * 
   * @param baseUrl - The base URL of the API server
   * @param params - Parameters to filter the orders by
   * @param apiKey - Optional API key for authentication
   * @returns A promise that resolves to the query results
   * @throws Will throw an error if the request fails
   */
  export async function queryOrders(
    baseUrl: string,
    params: QueryOrdersParams,
    apiKey?: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<QueryOrdersResponse> {
    try {

      const url = new URL('data/query', baseUrl);
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
      const response = await http({
        method: 'GET',
        url,
        headers: buildHeaders(apiKey),
        signal,
      });
  
      return response.data;
    } catch (error) {
      if (error instanceof HttpError) {
        if (error.response.status === 404) {
          // Return empty result with pagination
          return {
            orders: [],
            pagination: {
              currentPage: params.page || 1,
              limit: params.limit || 10,
              totalRecords: 0,
              totalPages: 0
            }
          };
        }
        throw new Error(`API error: ${error.message}`);
      }

      throw new Error(`Failed to query orders: ${String(error)}`);
    }
}

async function http<ResponseType = any>({
    method,
    url,
    data,
    signal,
    headers,
}: {
    method: string;
    url: URL;
    data?: any;
    signal?: AbortSignal;
    headers?: HeadersInit;
}) {
    const response = await fetch(url, {
        method,
        body: data ? JSON.stringify(data) : undefined,
        headers,
        signal,
    });

    if (!response.ok) {
        const text = await response.text();
        throw new HttpError(text, response.status, response);
    }

    return {
        status: response.status,
        headers: response.headers,
        data: await response.json() as ResponseType,
    };
}

function buildHeaders(apiKey?: string): HeadersInit {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (apiKey) {
        headers['x-api-key'] = apiKey;
    }
    return headers;
}

class HttpError extends Error {
    constructor(message: string, public status: number, public response: Response) {
        super(message);
    }
}