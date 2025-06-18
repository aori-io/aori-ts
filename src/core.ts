import { SwapRequest, SwapResponse, QuoteRequest, QuoteResponse, ChainInfo, TypedDataSigner, OrderStatus, PollOrderStatusOptions, QueryOrdersParams, QueryOrdersResponse, OrderDetails, WSEvent, SignerType, WebSocketOptions } from './types';
import { ethers } from 'ethers';
import axios from 'axios';
import {
  AORI_API,
  AORI_WS_API
} from './constants';

/**
 * Aori is the main class for interacting with the Aori API
 */
export class Aori {
  // General
  public chains: Record<string, ChainInfo> = {};
  public baseUrl: string = AORI_API;
  public apiKey?: string;

  // WebSocket
  private ws: WebSocket | null = null;
  private wsOptions: WebSocketOptions;

  /**
   * Creates a new Aori instance
   * @param chains The list of supported chains and their configurations
   * @param baseUrl The base URL of the API
   * @param apiKey Optional API key for authentication
   */
  private constructor(
    chains: Record<string, ChainInfo>,
    baseUrl: string = AORI_API,
    apiKey?: string,
    wsOptions: WebSocketOptions = {}
  ) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.chains = chains;
    this.wsOptions = wsOptions;
  }

  /**
   * Creates a new Aori instance and fetches up to date chain information and contract deployments
   * @param baseUrl The base URL of the API
   * @param apiKey Optional API key for authentication
   * @returns A promise that resolves with the Aori instance
   */
  public static async create(baseUrl: string = AORI_API, apiKey?: string) {
    const chains = await fetchChains(baseUrl, apiKey);
    return new Aori(chains, baseUrl, apiKey);
  }

  /**
   * Returns the chain information for a given chain key
   * @param chainKey The key of the chain to get information for
   * @returns The chain information
   */
  public getChainInfoByKey(chainKey: string) {
    return this.chains[chainKey.toLowerCase()];
  }

  /**
   * Returns the chain information for a given chain ID
   * @param chainId The ID of the chain to get information for
   * @returns The chain information
   */
  public getChainInfoById(chainId: number) {
    return Object.values(this.chains).find(chain => chain.chainId === chainId);
  }

  /**
   * Returns the chain information for a given EID
   * @param eid The EID of the chain to get information for
   * @returns The chain information
   */
  public getChainInfoByEid(eid: number) {
    return Object.values(this.chains).find(chain => chain.eid === eid);
  }

  /**
   * Signs an order using EIP-712 typed data format
   * @param quoteResponse The quote response containing order details
   * @param signer The wallet client that can sign typed data
   * @param userAddress The address of the user signing the order
   * @returns The signature and orderHash
   */
  public async signReadableOrder(quoteResponse: QuoteResponse, signer: TypedDataSigner, userAddress: string) {
    // Get chain information from the constants
    const inputChainInfo = this.getChainInfoByKey(quoteResponse.inputChain);
    const outputChainInfo = this.getChainInfoByKey(quoteResponse.outputChain);

    if (!inputChainInfo) {
      throw new Error(`Chain information not found for ${quoteResponse.inputChain}`);
    }

    if (!outputChainInfo) {
      throw new Error(`Chain information not found for ${quoteResponse.outputChain}`);
    }

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
      srcEid: inputChainInfo.eid,
      dstEid: outputChainInfo.eid,
    };

    // Create the domain object
    const domain = {
      name: "Aori",
      version: "0.3.0",
      chainId: BigInt(inputChainInfo.chainId),
      verifyingContract: inputChainInfo.address
    };

    // Sign the typed data
    const signature = await signer.signTypedData({
      account: userAddress,
      domain,
      types,
      primaryType: "Order",
      message
    });

    return {
      orderHash: quoteResponse.orderHash,
      signature
    };
  }

  /**
   * Connect to the Aori WebSocket server
   * @returns Promise that resolves when connection is established
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Add API key to URL if provided
        let wsUrl = this.baseUrl;
        if (this.apiKey) {
          wsUrl += `?key=${this.apiKey}`;
        }

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.wsOptions.onConnect?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const wsEvent: WSEvent = JSON.parse(event.data);
            this.wsOptions.onMessage?.(wsEvent);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          this.wsOptions.onDisconnect?.(event);
        };

        this.ws.onerror = (error) => {
          this.wsOptions.onError?.(error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if the WebSocket is currently connected
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Requests a quote for a swap
   * @param request The quote request
   * @returns The quote response
   */
  public async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    return await getQuote(request, this.baseUrl, this.apiKey);
  }

  /**
   * Signs an order using the signing hash from a quote response
   * @param quoteResponse The quote response containing the signing hash
   * @param signer The signer object containing the private key
   * @returns The signature string
   */
  public async signOrder(quoteResponse: QuoteResponse, signer: SignerType) {
    return await signOrder(quoteResponse, signer);
  }

  /**
   * Submits a swap request to the Aori API
   * @param request The swap request
   * @returns The swap response
   */
  public async submitSwap(request: SwapRequest) {
    return await submitSwap(request, this.baseUrl, this.apiKey);
  }

  /**
   * Fetches the current status of an order
   * @param orderHash The hash of the order to check
   * @returns The order status
   */
  public async getOrderStatus(orderHash: string) {
    return await getOrderStatus(orderHash, this.baseUrl, this.apiKey);
  }

  /**
   * Polls the order status until it's completed, failed, or times out
   * @param orderHash The hash of the order to poll
   * @param options Polling options and callbacks
   * @returns The final order status
   */
  public async pollOrderStatus(orderHash: string, options: PollOrderStatusOptions = {}) {
    return await pollOrderStatus(orderHash, this.baseUrl, options, this.apiKey);
  }

  /**
   * Fetches detailed information about an order
   * @param orderHash The hash of the order to get details for
   * @returns The order details
   */
  public async getOrderDetails(orderHash: string) {
    return await getOrderDetails(orderHash, this.baseUrl, this.apiKey);
  }

  /**
   * Queries orders with filtering criteria
   * @param params The parameters to filter the orders by
   * @returns The query results
   */
  public async queryOrders(params: QueryOrdersParams) {
    return await queryOrders(this.baseUrl, params, this.apiKey);
  }
}

////////////////////////////////////////////////////////////////*/
//                      HELPER FUNCTIONS
//////////////////////////////////////////////////////////////*/

export async function fetchChains(
  baseUrl: string = AORI_API,
  apiKey?: string
): Promise<Record<string, ChainInfo>> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    
    const response = await axios.get(`${baseUrl}/chains`, { headers });
    // Convert array to object with chainKey as key
    const chainsArray = response.data;
    const chainsObject: Record<string, ChainInfo> = {};
    
    for (const chain of chainsArray) {
      chainsObject[chain.chainKey.toLowerCase()] = chain;
    }
    
    return chainsObject;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Failed to fetch chains: ${error.response.data}`);
    }
    throw new Error(`Failed to fetch chains: ${error}`);
  }
}

export async function getQuote(
  request: QuoteRequest,
  baseUrl: string = AORI_API,
  apiKey?: string
): Promise<QuoteResponse> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    
    const response = await axios.post(`${baseUrl}/quote`, {
      ...request,
      inputAmount: request.inputAmount.toString(), // Convert any number type to string
    }, { headers });
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Quote request failed: ${error.response.data}`);
    }
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
  const wallet = new ethers.Wallet(signer.privateKey);
  wallet.signMessage
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
//                     SUBMIT A SWAP
//////////////////////////////////////////////////////////////*/

export async function submitSwap(
  request: SwapRequest,
  baseUrl: string = AORI_API,
  apiKey?: string
): Promise<SwapResponse> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    
    const response = await axios.post(`${baseUrl}/swap`, {
      orderHash: request.orderHash,
      signature: request.signature,
    }, { headers });

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
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Swap request failed: ${error.response.data}`);
    }
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
  apiKey?: string
): Promise<OrderStatus> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    
    const response = await axios.get(`${baseUrl}/data/status/${orderHash}`, { headers });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Failed to fetch order status: ${error.response.data}`);
    }
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
  apiKey?: string
): Promise<OrderStatus> {
  const {
    onStatusChange,
    onComplete,
    onError,
    interval = 100,
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
        const status = await getOrderStatus(orderHash, baseUrl, apiKey);

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
  apiKey?: string
): Promise<OrderDetails> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    
    const response = await axios.get(`${baseUrl}/data/details/${orderHash}`, { headers });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Failed to fetch order details: ${error.response.data}`);
    }
    throw new Error(`Failed to fetch order details: ${error}`);
  }
}

////////////////////////////////////////////////////////////////*/
//                     QUERY ORDERS
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
  apiKey?: string
): Promise<QueryOrdersResponse> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    
    const response = await axios.get(`${baseUrl}/data/query`, {
      params: params,
      headers
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
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

      if (error.response?.data) {
        throw new Error(`API error: ${error.response.data.message || JSON.stringify(error.response.data)}`);
      }
    }

    throw new Error(`Failed to query orders: ${String(error)}`);
  }
}