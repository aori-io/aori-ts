import { SwapRequest, QuoteRequest, QuoteResponse, ChainInfo, TypedDataSigner, PollOrderStatusOptions, QueryOrdersParams, WSEvent, SignerType, WebSocketOptions, SubscriptionParams } from './types';
import { fetchChains, getQuote, signOrder, submitSwap, getOrderStatus, pollOrderStatus, getOrderDetails, queryOrders, signReadableOrder } from './helpers';
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
  public apiBaseUrl: string = AORI_API;
  private apiKey?: string;

  // WebSocket
  public wsBaseUrl: string = AORI_WS_API;
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
    apiBaseUrl: string = AORI_API,
    wsBaseUrl: string = AORI_WS_API,
    apiKey?: string,
    wsOptions: WebSocketOptions = {}
  ) {
    this.apiBaseUrl = apiBaseUrl;
    this.wsBaseUrl = wsBaseUrl.replace(/^http/, 'ws');
    this.apiKey = apiKey;
    this.chains = chains;
    this.wsOptions = wsOptions;
  }

  /**
   * Creates a new Aori instance and fetches up to date chain information and contract deployments
   * @param apiBaseUrl The base URL of the API
   * @param wsBaseUrl The base URL of the WebSocket API
   * @param apiKey Optional API key for authentication
   * @param wsOptions Optional WebSocket options
   * @returns A promise that resolves with the Aori instance
   */
  public static async create(apiBaseUrl: string = AORI_API, wsBaseUrl: string = AORI_WS_API, apiKey?: string, wsOptions: WebSocketOptions = {}) {
    const chains = await fetchChains(apiBaseUrl, apiKey);
    return new Aori(chains, apiBaseUrl, wsBaseUrl, apiKey, wsOptions);
  }

  /**
   * Returns the chain information for a given chain identifier
   * @param chain The chain identifier - can be either chainId (number) or chainKey (string)
   * @returns The chain information
   */
  public getChain(chain: string | number) {
    if (typeof chain === 'string') {
      return this.chains[chain.toLowerCase()];
    } else {
      return Object.values(this.chains).find(chainInfo => chainInfo.chainId === chain);
    }
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
    return await signReadableOrder(quoteResponse, signer, userAddress, this.apiBaseUrl, this.apiKey, this.chains);
  }

  /**
   * Connect to the Aori WebSocket server
   * @param filter The filter to subscribe to
   * @returns Promise that resolves when connection is established
   */
  public connect(filter: SubscriptionParams = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = new URL(this.wsBaseUrl);

        // Add API key to URL if provided
        if (this.apiKey) {
          wsUrl.searchParams.append('key', this.apiKey);
        }

        // Add filter to URL if provided
        for (const [key, value] of Object.entries(filter)) {
          if (value) {
            wsUrl.searchParams.append(key, value);
          }
        }

        this.ws = new WebSocket(wsUrl.toString());

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
    return await getQuote(request, this.apiBaseUrl, this.apiKey);
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
    return await submitSwap(request, this.apiBaseUrl, this.apiKey);
  }

  /**
   * Fetches the current status of an order
   * @param orderHash The hash of the order to check
   * @returns The order status
   */
  public async getOrderStatus(orderHash: string) {
    return await getOrderStatus(orderHash, this.apiBaseUrl, this.apiKey);
  }

  /**
   * Polls the order status until it's completed, failed, or times out
   * @param orderHash The hash of the order to poll
   * @param options Polling options and callbacks
   * @returns The final order status
   */
  public async pollOrderStatus(orderHash: string, options: PollOrderStatusOptions = {}) {
    return await pollOrderStatus(orderHash, this.apiBaseUrl, options, this.apiKey);
  }

  /**
   * Fetches detailed information about an order
   * @param orderHash The hash of the order to get details for
   * @returns The order details
   */
  public async getOrderDetails(orderHash: string) {
    return await getOrderDetails(orderHash, this.apiBaseUrl, this.apiKey);
  }

  /**
   * Queries orders with filtering criteria
   * @param params The parameters to filter the orders by
   * @returns The query results
   */
  public async queryOrders(params: QueryOrdersParams) {
    return await queryOrders(this.apiBaseUrl, params, this.apiKey);
  }
}

