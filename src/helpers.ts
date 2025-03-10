import { SwapRequest, SwapResponse, QuoteRequest, QuoteResponse, OrderRecord, ChainInfo } from './types';
import { ethers } from 'ethers';
import { 
  AORI_API,
  AORI_WS_API,
  getChainInfoByKey
} from './constants';


////////////////////////////////////////////////////////////////*/
//                     REQUEST A QUOTE
//////////////////////////////////////////////////////////////*/

export async function getQuote(
  request: QuoteRequest,
  baseUrl: string = AORI_API
): Promise<QuoteResponse> {
  const response = await fetch(`${baseUrl}/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...request,
      inputAmount: request.inputAmount.toString(), // Convert any number type to string
    }),
  });

  if (!response.ok) {
    throw new Error(`Quote request failed: ${await response.text()}`);
  }

  return await response.json();
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
 * @returns The signature and orderHash
 */
export async function signReadableOrder(
  quoteResponse: QuoteResponse,
  signer: TypedDataSigner,
  userAddress: string
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
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" }
    ],
    Order: [
      { name: "offerer", type: "address" },
      { name: "recipient", type: "address" },
      { name: "inputToken", type: "address" },
      { name: "outputToken", type: "address" },
      { name: "exclusiveSolver", type: "address" },
      { name: "inputAmount", type: "uint256" },
      { name: "outputAmount", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "endTime", type: "uint256" },
      { name: "srcEid", type: "uint32" },
      { name: "dstEid", type: "uint32" },
      { name: "exclusiveSolverDuration", type: "uint16" }
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
    exclusiveSolver: quoteResponse.exclusiveSolver,
    inputAmount: BigInt(quoteResponse.inputAmount),
    outputAmount: BigInt(quoteResponse.outputAmount),
    startTime: BigInt(Number(startTimeStr)),
    endTime: BigInt(Number(endTimeStr)),
    srcEid: inputChainInfo.eid,
    dstEid: outputChainInfo.eid,
    exclusiveSolverDuration: quoteResponse.exclusiveSolverDuration,
  };
  
  // Create the domain object
  const domain = {
    name: "Aori",
    version: "1",
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
  baseUrl: string = AORI_API
): Promise<SwapResponse> {
  const response = await fetch(`${baseUrl}/swap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderHash: request.orderHash,
      signature: request.signature,
    }),
  });

  if (!response.ok) {
    throw new Error(`Swap request failed: ${await response.text()}`);
  }

  const data = await response.json();
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

////////////////////////////////////////////////////////////////*/
//                     CONNECT TO WEBSOCKET
//////////////////////////////////////////////////////////////*/

export interface WebSocketOptions {
    onMessage?: (order: OrderRecord) => void;
    onConnect?: () => void;
    onDisconnect?: (event: CloseEvent) => void;
    onError?: (error: Event) => void;
}

export class AoriWebSocket {
    private ws: WebSocket | null = null;
    private options: WebSocketOptions;
    private baseUrl: string;

    constructor(baseUrl: string = AORI_WS_API, options: WebSocketOptions = {}) {
        this.baseUrl = baseUrl.replace('http', 'ws');
        this.options = options;
    }

    /**
     * Connect to the Aori WebSocket server
     * @returns Promise that resolves when connection is established
     */
    public connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(`${this.baseUrl}/ws`);

                this.ws.onopen = () => {
                    this.options.onConnect?.();
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const order: OrderRecord = JSON.parse(event.data);
                        this.options.onMessage?.(order);
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

////////////////////////////////////////////////////////////////*/
//                   POLL FOR ORDER STATUS
//////////////////////////////////////////////////////////////*/

export interface PollOrderStatusOptions {
    onStatusChange?: (status: string, order: OrderRecord) => void;
    onComplete?: (order: OrderRecord) => void;
    onError?: (error: Error) => void;
    interval?: number;
    timeout?: number;
}

/**
 * Polls the order status until it's filled and has a destination transaction hash
 * @param orderHash The hash of the order to poll
 * @param baseUrl The base URL of the API
 * @param options Polling options and callbacks
 * @returns A promise that resolves with the final order status
 */
export async function pollOrderStatus(
    orderHash: string,
    baseUrl: string = AORI_API,
    options: PollOrderStatusOptions = {}
): Promise<OrderRecord> {
    const {
        onStatusChange,
        onComplete,
        onError,
        interval = 150,
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

                const response = await fetch(`${baseUrl}/swap/${orderHash}`);
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch order status: ${await response.text()}`);
                }

                const order: OrderRecord = await response.json();

                // Notify if status has changed
                if (order.status !== lastStatus) {
                    lastStatus = order.status;
                    onStatusChange?.(order.status, order);
                }

                // FIXED: Check for completed, failed, or src_failed status
                if (order.status === 'completed' || order.status === 'failed' || order.status === 'src_failed') {
                    onComplete?.(order);
                    resolve(order);
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
//                      GET SUPPORTED CHAINS
//////////////////////////////////////////////////////////////*/

/**
* Fetches the list of supported chains and their configurations
* @param baseUrl The base URL of the API
* @returns Promise that resolves with an array of chain information
*/
export async function getChains(
  baseUrl: string = AORI_API
): Promise<ChainInfo[]> {
  const response = await fetch(`${baseUrl}/chains`);

  if (!response.ok) {
      throw new Error(`Failed to fetch chains: ${await response.text()}`);
  }

  const chains: ChainInfo[] = await response.json();
  return chains;
} 
