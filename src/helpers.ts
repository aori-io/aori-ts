import { ethers } from 'ethers';
import { AORI_API } from './constants';
import { ChainInfo, DomainInfo, TokenInfo, QuoteRequest, QuoteResponse, SignerType, SwapRequest, SwapResponse, TypedDataSigner, OrderStatus, PollOrderStatusOptions, QueryOrdersParams, QueryOrdersResponse, OrderDetails } from './types';

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