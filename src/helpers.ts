import { ethers } from 'ethers';
import { AORI_API, NATIVE_TOKEN_ADDRESS } from './constants';
import { ChainInfo, DomainInfo, TokenInfo, QuoteRequest, QuoteResponse, ERC20QuoteResponse, NativeQuoteResponse, SignerType, SwapRequest, SwapResponse, TypedDataSigner, OrderStatus, PollOrderStatusOptions, QueryOrdersParams, QueryOrdersResponse, OrderDetails, TransactionRequest, TransactionResponse, NativeSwapResponse, ERC20SwapResponse, SwapConfig, TxExecutor, Order, CancelOrderResponse, CancelTxExecutor, CancelTx } from './types';

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
 * Type guard to check if a quote response is for a native token swap
 * @param response The quote response to check
 * @returns True if this is a native token swap
 */
export function isNativeQuoteResponse(response: QuoteResponse): response is NativeQuoteResponse {
  return !('signingHash' in response);
}

/**
 * Type guard to check if a quote response is for an ERC20 token swap
 * @param response The quote response to check
 * @returns True if this is an ERC20 token swap
 */
export function isERC20QuoteResponse(response: QuoteResponse): response is ERC20QuoteResponse {
  return 'signingHash' in response;
}

/**
 * Checks if a quote response indicates a native token swap (no signing hash required)
 * @param quoteResponse The quote response to check
 * @returns True if this is a native token swap
 */
export function isNativeSwap(quoteResponse: QuoteResponse): boolean {
  return isNativeQuoteResponse(quoteResponse);
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
 * @param txExecutor The wallet/provider that can execute transactions
 * @param gasLimit Optional gas limit override
 * @returns Transaction response with hash and success status
 */
export async function executeNativeSwap(
  nativeResponse: NativeSwapResponse,
  txExecutor: TxExecutor,
  gasLimit?: string
): Promise<TransactionResponse> {
  try {
    // Validate the native response
    validateNativeSwapResponse(nativeResponse);

    const transactionRequest: TransactionRequest = {
      to: nativeResponse.to,
      data: nativeResponse.data,
      value: nativeResponse.value,
      gasLimit
    };

    // Estimate gas if not provided and estimateGas is available
    if (!gasLimit && txExecutor.estimateGas) {
      try {
        const estimatedGas = await txExecutor.estimateGas(transactionRequest);
        // Add 20% buffer to estimated gas
        // Add 20% buffer to estimated gas
        const bufferMultiplier = BigInt(120); // 120% = original + 20% buffer
        const baseMultiplier = BigInt(100);
        transactionRequest.gasLimit = (estimatedGas * bufferMultiplier / baseMultiplier).toString();
      } catch (error) {
        // If gas estimation fails, use a default
        transactionRequest.gasLimit = "200000";
      }
    }

    // Execute the transaction
    const tx = await txExecutor.sendTransaction(transactionRequest);

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
export function validateNativeSwapResponse(response: NativeSwapResponse): void {
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
export function constructNativeSwapTransaction(
  nativeResponse: NativeSwapResponse,
  gasLimit?: string
): TransactionRequest {
  validateNativeSwapResponse(nativeResponse);

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
  // Check if this is a native swap (no signing hash)
  if (isNativeSwap(quoteResponse)) {
    return ""; // No signature required for native swaps
  }

  // At this point, we know it's an ERC20 swap with signingHash
  if (!isERC20QuoteResponse(quoteResponse)) {
    throw new Error("Signing hash is required for ERC20 swaps");
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
  { srcEid, dstEid, chainId, verifyingContract, domainInfo }: { srcEid: number, dstEid: number, chainId: number, verifyingContract: `0x${string}`, domainInfo: DomainInfo }
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
  // Check if this is a native swap (no signing hash)
  if (isNativeSwap(quoteResponse)) {
    return {
      orderHash: quoteResponse.orderHash,
      signature: "" // No signature required for native swaps
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
//                        EXECUTE SWAP 
//////////////////////////////////////////////////////////////*/

/**
 * Complete swap execution that automatically handles both ERC20 and native tokens
 * @param quote The quote response from a previous getQuote call
 * @param config Configuration object containing the appropriate parameters for each swap type
 * @param baseUrl The base URL of the API
 * @param apiKey Optional API key for authentication
 * @param options Optional parameters including AbortSignal
 * @returns TransactionResponse for native tokens (after execution) or SwapResponse for ERC20 tokens
 */
export async function executeSwap(
  quote: QuoteResponse,
  config: SwapConfig,
  baseUrl: string = AORI_API,
  apiKey?: string,
  { signal }: { signal?: AbortSignal } = {}
): Promise<TransactionResponse | SwapResponse> {
  try {
    // Native token flow (no signature required)
    if (config.type === 'native') {
      // Validate that the input token is actually native
      if (!isNativeToken(quote.inputToken)) {
        throw new Error("Native swap config provided but input token is not native token");
      }

      // Validate it's a native swap
      if (!isNativeSwap(quote)) {
        throw new Error("Quote response indicates ERC20 swap, not native token");
      }

      // Submit swap with empty signature (native swaps don't require signatures)
      const swapResponse = await submitSwap(
        {
          orderHash: quote.orderHash,
          signature: "" // Empty signature for native swaps
        },
        baseUrl,
        apiKey,
        { signal }
      );

      // Validate response type
      if (!isNativeSwapResponse(swapResponse)) {
        throw new Error("Expected native deposit response but received standard ERC20 response");
      }

      // Execute the native deposit transaction
      return await executeNativeSwap(swapResponse, config.txExecutor, config.gasLimit);

    } else {
      // ERC20 token flow
      // Validate that the input token is not native
      if (isNativeToken(quote.inputToken)) {
        throw new Error("ERC20 swap config provided but input token is native token");
      }

      // Sign the order using EIP-712 typed data
      const { signature } = await signReadableOrder(
        quote,
        config.signer,
        config.userAddress,
        baseUrl,
        apiKey
      );

      // Submit the swap request
      const swapResponse = await submitSwap(
        {
          orderHash: quote.orderHash,
          signature
        },
        baseUrl,
        apiKey,
        { signal }
      );

      // Validate response type
      if (!isERC20SwapResponse(swapResponse)) {
        throw new Error("Unexpected native token response for ERC20 swap request");
      }

      return swapResponse;
    }

  } catch (error) {
    // For native tokens, return a TransactionResponse format for consistency
    if (config.type === 'native') {
      return {
        success: false,
        txHash: "",
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // For ERC20 tokens, re-throw the error
    throw error;
  }
}

////////////////////////////////////////////////////////////////*/
//                      ORDER UTILITIES
//////////////////////////////////////////////////////////////*/

/**
 * Converts a QuoteResponse, SwapResponse, or OrderDetails to a contract-compliant Order
 * @param order The quote response, swap response, or order details to convert
 * @param chains Optional chains object (if not provided, will fetch from API)
 * @param baseUrl The base URL of the API (for fetching chains if not cached)
 * @param apiKey Optional API key for authentication
 * @returns The contract-compliant order struct
 * 
 * @example
 * // Stateful usage (with cached chains)
 * const order = await parseOrder(quote, aori.chains);
 * const order = await parseOrder(swapResponse, aori.chains);
 * const order = await parseOrder(orderDetails, aori.chains);
 * 
 * // Stateless usage (fetches chains from API)
 * const order = await parseOrder(quote);
 * const order = await parseOrder(swapResponse, undefined, customApiUrl, apiKey);
 * const order = await parseOrder(orderDetails, undefined, customApiUrl, apiKey);
 */
export async function parseOrder(
  order: QuoteResponse | SwapResponse | OrderDetails,
  chains?: Record<string, ChainInfo>,
  baseUrl: string = AORI_API,
  apiKey?: string
): Promise<Order> {
  let inputChain: ChainInfo;
  let outputChain: ChainInfo;

  if (chains) {
    // Use provided chains (stateful usage)
    inputChain = chains[order.inputChain.toLowerCase()];
    outputChain = chains[order.outputChain.toLowerCase()];

    if (!inputChain) {
      throw new Error(`Input chain '${order.inputChain}' not found in provided chains`);
    }
    if (!outputChain) {
      throw new Error(`Output chain '${order.outputChain}' not found in provided chains`);
    }
  } else {
    // Fetch chains from API (stateless usage)
    try {
      [inputChain, outputChain] = await Promise.all([
        getChain(order.inputChain, baseUrl, apiKey),
        getChain(order.outputChain, baseUrl, apiKey)
      ]);
    } catch (error) {
      throw new Error(`Failed to fetch chain information: ${error}`);
    }
  }

  return {
    inputAmount: order.inputAmount,
    outputAmount: order.outputAmount,
    inputToken: order.inputToken,
    outputToken: order.outputToken,
    startTime: order.startTime,
    endTime: order.endTime,
    srcEid: inputChain.eid,
    dstEid: outputChain.eid,
    offerer: order.offerer,
    recipient: order.recipient
  };
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

/**
 * Fetches order details and converts them to a contract-compliant Order format
 * @param orderHash The hash of the order to get
 * @param chains Optional chains object (if not provided, will fetch from API)
 * @param baseUrl The base URL of the API
 * @param apiKey Optional API key for authentication
 * @param options Optional parameters including AbortSignal
 * @returns A promise that resolves with the contract-compliant order
 */
export async function getOrder(
  orderHash: string,
  chains?: Record<string, ChainInfo>,
  baseUrl: string = AORI_API,
  apiKey?: string,
  { signal }: { signal?: AbortSignal } = {}
): Promise<Order> {
  const orderDetails = await getOrderDetails(orderHash, baseUrl, apiKey, { signal });
  return await parseOrder(orderDetails, chains, baseUrl, apiKey);
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

////////////////////////////////////////////////////////////////*/
//                             CANCEL 
//////////////////////////////////////////////////////////////*/

/**
* Checks if an order can be cancelled based on its event history
* An order can be cancelled if it has a "received" event but lacks "completed" or "cancelled" events
* @param orderHash The hash of the order to check
* @param orderDetails Optional pre-fetched order details to avoid duplicate API calls
* @param baseUrl The base URL of the API (only used if orderDetails not provided)
* @param apiKey Optional API key for authentication (only used if orderDetails not provided)
* @param options Optional parameters including AbortSignal (only used if orderDetails not provided)
* @returns Promise<boolean> True if the order can be cancelled, false otherwise
*/
export async function canCancel(
  orderHash: string,
  orderDetails?: OrderDetails,
  baseUrl: string = AORI_API,
  apiKey?: string,
  { signal }: { signal?: AbortSignal } = {}
): Promise<boolean> {
  try {
    // Use provided order details or fetch them if not provided
    const resolvedOrderDetails = orderDetails || await getOrderDetails(orderHash, baseUrl, apiKey, { signal });

    if (!resolvedOrderDetails.events || !Array.isArray(resolvedOrderDetails.events)) {
      console.warn('Order has no events array:', orderHash);
      return false;
    }

    // Check if order has expired (current time > endTime)
    const currentTime = Math.floor(Date.now() / 1000);
    const endTime = Number(resolvedOrderDetails.endTime);
    const hasExpired = currentTime > endTime;

    // Extract event types from the events array
    const eventTypes = resolvedOrderDetails.events.map(event => event.eventType?.toLowerCase());

    // Check if order has "received" event (required for cancellation)
    const hasReceivedEvent = eventTypes.includes('received');

    // Check if order has terminal events that prevent cancellation
    const hasCompletedEvent = eventTypes.includes('completed');
    const hasCancelledEvent = eventTypes.includes('cancelled');

    // Order can be cancelled if:
    // 1. It has a "received" event (was processed by the system)
    // 2. It does not have "completed" or "cancelled" events (not in terminal state)
    // 3. It has not expired (current time <= endTime)
    const canBeCancelled = hasReceivedEvent && !hasCompletedEvent && !hasCancelledEvent && !hasExpired;

    console.log('Cancellation check for order:', {
      orderHash,
      events: eventTypes,
      hasReceivedEvent,
      hasCompletedEvent,
      hasCancelledEvent,
      hasExpired,
      currentTime,
      endTime,
      canBeCancelled
    });

    return canBeCancelled;

  } catch (error) {
    console.error('Failed to check if order can be cancelled:', error);
    return false;
  }
}

/**
 * Gets transaction data for cancelling an order from the API
 * @param orderHash The hash of the order to cancel
 * @param baseUrl The base URL of the API
 * @param apiKey Optional API key for authentication
 * @param options Optional parameters including AbortSignal
 * @returns Promise<CancelTx> Transaction data for cancelling the order
 */
export async function getCancelTx(
  orderHash: string,
  baseUrl: string = AORI_API,
  apiKey?: string,
  { signal }: { signal?: AbortSignal } = {}
): Promise<CancelTx> {
  try {
    const response = await http({
      method: 'POST',
      url: new URL('cancel', baseUrl),
      headers: buildHeaders(apiKey),
      signal,
      data: {
        orderHash
      }
    });

    return response.data;
  } catch (error) {
    // Preserve the original error details from the server
    if (error instanceof HttpError) {
      throw new Error(error.message);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Cancels an order using either an order hash or pre-fetched cancel response
 * @param orderHash Optional order hash string to cancel
 * @param cancelTx Optional pre-fetched CancelTx object
 * @param txExecutor Transaction executor for blockchain operations
 * @param baseUrl The base URL of the API (only used if orderHash provided)
 * @param apiKey Optional API key for authentication (only used if orderHash provided)
 * @param options Optional parameters including AbortSignal
 * @returns Transaction response with cancellation details
 */
export async function cancelOrder(
  orderHash: string | undefined,
  cancelTx: CancelTx | undefined,
  txExecutor: CancelTxExecutor,
  baseUrl: string = AORI_API,
  apiKey?: string,
  { signal }: { signal?: AbortSignal } = {}
): Promise<CancelOrderResponse> {
  try {
    // Validate that at least one parameter is provided
    if (!orderHash && !cancelTx) {
      throw new Error("No order provided: either orderHash or cancelTx must be specified");
    }

    let cancelResponse: CancelTx;

    // If both are provided, prioritize cancelTx and ignore orderHash
    if (cancelTx) {
      cancelResponse = cancelTx;
    } else if (orderHash) {
      // Only orderHash provided, need to fetch cancel data
      try {
        cancelResponse = await getCancelTx(orderHash, baseUrl, apiKey, { signal });
      } catch (error) {
        // Re-throw the original error without additional wrapping to preserve server message
        throw error;
      }
    } else {
      // This should never happen due to the earlier validation, but TypeScript doesn't know that
      throw new Error("No order provided: either orderHash or cancelTx must be specified");
    }

    // Validate chain if possible
    if (txExecutor.getChainId) {
      try {
        const currentChainId = await txExecutor.getChainId();
        console.log('Cancel transaction debug info:', {
          orderHash: cancelResponse.orderHash,
          requiredChain: cancelResponse.chain,
          currentChainId,
          contractAddress: cancelResponse.to,
          transactionValue: cancelResponse.value
        });
      } catch (error) {
        console.warn('Could not get current chain ID for validation:', error);
      }
    }

    // Construct transaction request
    const transactionRequest: TransactionRequest = {
      to: cancelResponse.to,
      data: cancelResponse.data,
      value: cancelResponse.value
    };

    // Estimate gas if available
    if (txExecutor.estimateGas) {
      try {
        const estimatedGas = await txExecutor.estimateGas(transactionRequest);
        // Add 20% buffer to estimated gas
        const bufferMultiplier = BigInt(120); // 120% = original + 20% buffer
        const baseMultiplier = BigInt(100);
        transactionRequest.gasLimit = (estimatedGas * bufferMultiplier / baseMultiplier).toString();
      } catch (error) {
        // Conservative fallback gas limit
        transactionRequest.gasLimit = "400000";
      }
    }

    // Execute transaction
    const tx = await txExecutor.sendTransaction(transactionRequest);
    await tx.wait();

    // Determine if this was cross-chain based on value (cross-chain has LayerZero fees)
    const isCrossChain = cancelResponse.value !== "0";

    return {
      success: true,
      txHash: tx.hash,
      isCrossChain,
      ...(isCrossChain && { fee: cancelResponse.value })
    };

  } catch (error) {
    return {
      success: false,
      txHash: "",
      isCrossChain: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}