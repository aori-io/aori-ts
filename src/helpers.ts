import { SwapRequest, SwapResponse, QuoteRequest, QuoteResponse, ChainInfo, OrderStatus, QueryOrdersParams, QueryOrdersResponse, OrderDetails, WSEvent } from './types';
import { ethers } from 'ethers';
import axios from 'axios';
import {
  AORI_API,
  AORI_WS_API,
  getChainInfoByKey
} from './constants';

////////////////////////////////////////////////////////////////*/
//                      GET SUPPORTED CHAINS
//////////////////////////////////////////////////////////////*/

/**
* Fetches the list of supported chains and their configurations
* @param baseUrl The base URL of the API
* @returns Promise that resolves with an array of chain information
*/
export async function getChains(
  baseUrl: string = AORI_API,
  apiKey?: string
): Promise<ChainInfo[]> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    
    const response = await axios.get(`${baseUrl}/chains`, { headers });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Failed to fetch chains: ${error.response.data}`);
    }
    throw new Error(`Failed to fetch chains: ${error}`);
  }
}

////////////////////////////////////////////////////////////////*/
//                     REQUEST A QUOTE
//////////////////////////////////////////////////////////////*/

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

export interface SignerType {
  privateKey: string;
}
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
//               SIGN READABLEORDER WITH EIP-712
//////////////////////////////////////////////////////////////*/

/**
 * Interface for wallet clients that can sign typed data (compatible with viem, ethers, etc.)
 */
export interface TypedDataSigner {
  signTypedData: (params: any) => Promise<string>;
}

/**
 * Signs an order using EIP-712 typed data format
 * @param quoteResponse The quote response containing order details
 * @param signer The wallet client that can sign typed data
 * @param userAddress The address of the user signing the order
 * @param baseUrl Optional base URL for the API
 * @returns The signature and orderHash
 */
export async function signReadableOrder(
  quoteResponse: QuoteResponse,
  signer: TypedDataSigner,
  userAddress: string,
  baseUrl: string = AORI_API
): Promise<{ orderHash: string; signature: string }> {
  // Get chain information from the constants
  const inputChainInfo = getChainInfoByKey(quoteResponse.inputChain);
  const outputChainInfo = getChainInfoByKey(quoteResponse.outputChain);

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

////////////////////////////////////////////////////////////////*/
//                   POLL FOR ORDER STATUS
//////////////////////////////////////////////////////////////*/

export interface PollOrderStatusOptions {
  onStatusChange?: (status: OrderStatus) => void;
  onComplete?: (status: OrderStatus) => void;
  onError?: (error: Error) => void;
  interval?: number;
  timeout?: number;
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

////////////////////////////////////////////////////////////////*/
//                     CONNECT TO WEBSOCKET
//////////////////////////////////////////////////////////////*/

export interface WebSocketOptions {
  onMessage?: (event: WSEvent) => void;
  onConnect?: () => void;
  onDisconnect?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
}

export class AoriWebSocket {
  private ws: WebSocket | null = null;
  private options: WebSocketOptions;
  private baseUrl: string;
  private apiKey?: string;

  constructor(
    baseUrl: string = AORI_WS_API, 
    options: WebSocketOptions = {},
    apiKey?: string
  ) {
    this.baseUrl = baseUrl.replace(/^http/, 'ws');
    this.options = options;
    this.apiKey = apiKey;
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
          this.options.onConnect?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const wsEvent: WSEvent = JSON.parse(event.data);
            this.options.onMessage?.(wsEvent);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          this.options.onDisconnect?.(event);
        };

        this.ws.onerror = (error) => {
          this.options.onError?.(error);
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
}






