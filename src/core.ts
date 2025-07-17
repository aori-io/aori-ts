import { SwapRequest, QuoteRequest, QuoteResponse, ChainInfo, TokenInfo, TypedDataSigner, PollOrderStatusOptions, QueryOrdersParams, WSEvent, SignerType, WebSocketCallbacks, SubscriptionParams } from './types';
import { fetchAllChains, fetchAllTokens, getTokens, getQuote, signOrder, submitSwap, getOrderStatus, pollOrderStatus, getOrderDetails, queryOrders, signReadableOrder } from './helpers';
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
  public tokens: TokenInfo[] = [];
  public apiBaseUrl: string = AORI_API;
  private apiKey?: string;

  // WebSocket
  public wsBaseUrl: string = AORI_WS_API;
  private ws: WebSocket | null = null;

  /**
   * Creates a new Aori instance
   * @param chains The list of supported chains and their configurations
   * @param apiBaseUrl The base URL of the API
   * @param wsBaseUrl The base URL of the WebSocket API
   * @param apiKey Optional API key for authentication
   * @param tokens Optional list of tokens
   */
  private constructor(
    chains: Record<string, ChainInfo>,
    apiBaseUrl: string = AORI_API,
    wsBaseUrl: string = AORI_WS_API,
    apiKey?: string,
    tokens: TokenInfo[] = []
  ) {
    this.apiBaseUrl = apiBaseUrl;
    this.wsBaseUrl = wsBaseUrl.replace(/^http/, 'ws');
    this.apiKey = apiKey;
    this.chains = chains;
    this.tokens = tokens;
  }

  /**
   * Creates a new Aori instance and fetches up to date chain information and contract deployments
   * @param apiBaseUrl The base URL of the API
   * @param wsBaseUrl The base URL of the WebSocket API
   * @param apiKey Optional API key for authentication
   * @param wsOptions Optional WebSocket options
   * @returns A promise that resolves with the Aori instance
   */
  public static async create(apiBaseUrl: string = AORI_API, wsBaseUrl: string = AORI_WS_API, apiKey?: string) {
    const chains = await fetchAllChains(apiBaseUrl, apiKey);
    return new Aori(chains, apiBaseUrl, wsBaseUrl, apiKey);
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
   * Returns all supported chains and their information
   * @returns A record mapping chainKey to ChainInfo for all supported chains
   */
  public getAllChains(): Record<string, ChainInfo> {
    return this.chains;
  }

  /**
   * Loads tokens into the cache from the API
   * @param chain Optional chain identifier to filter by - can be either chainId (number) or chainKey (string)
   * @param options Optional parameters including AbortSignal
   * @returns A promise that resolves when tokens are loaded
   */
  public async loadTokens(chain?: string | number, options: { signal?: AbortSignal } = {}): Promise<void> {
    this.tokens = await fetchAllTokens(this.apiBaseUrl, this.apiKey, { signal: options.signal, chain });
  }

  /**
   * Returns all cached tokens
   * @returns An array of all cached TokenInfo objects
   */
  public getAllTokens(): TokenInfo[] {
    return this.tokens;
  }

  /**
   * Returns tokens for a specific chain from the cache
   * @param chain The chain identifier - can be either chainId (number) or chainKey (string)
   * @returns An array of tokens for the specified chain
   */
  public getTokens(chain: string | number): TokenInfo[] {
    if (typeof chain === 'string') {
      return this.tokens.filter(token => token.chainKey.toLowerCase() === chain.toLowerCase());
    } else {
      return this.tokens.filter(token => token.chainId === chain);
    }
  }

  /**
   * Fetches tokens for a specific chain from the API (bypasses cache)
   * @param chain The chain identifier - can be either chainId (number) or chainKey (string)
   * @param options Optional parameters including AbortSignal
   * @returns An array of tokens for the specified chain
   */
  public async fetchTokens(chain: string | number, options: { signal?: AbortSignal } = {}): Promise<TokenInfo[]> {
    return await getTokens(chain, this.apiBaseUrl, this.apiKey, options);
  }

  /**
   * Signs an order using EIP-712 typed data format
   * @param quoteResponse The quote response containing order details
   * @param signer The wallet client that can sign typed data
   * @param userAddress The address of the user signing the order
   * @returns The signature and orderHash
   */
  public async signReadableOrder(quoteResponse: QuoteResponse, signer: TypedDataSigner, userAddress: string) {
    // Get the specific chain info from our cached chains
    const inputChain = this.chains[quoteResponse.inputChain.toLowerCase()];
    const outputChain = this.chains[quoteResponse.outputChain.toLowerCase()];
    
    // Validate that we have the required chain information
    if (!inputChain) {
      throw new Error(`Input chain '${quoteResponse.inputChain}' not found in cached chains. Available chains: ${Object.keys(this.chains).join(', ')}`);
    }
    
    if (!outputChain) {
      throw new Error(`Output chain '${quoteResponse.outputChain}' not found in cached chains. Available chains: ${Object.keys(this.chains).join(', ')}`);
    }
    
    return await signReadableOrder(
      quoteResponse, 
      signer, 
      userAddress, 
      this.apiBaseUrl, 
      this.apiKey,
      inputChain,
      outputChain
    );
  }

  /**
   * Connect to the Aori WebSocket server
   * @param filter The filter to subscribe to
   * @returns Promise that resolves when connection is established
   */
  public connect(filter: SubscriptionParams = {}, callbacks: WebSocketCallbacks = {}): Promise<void> {
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
          callbacks.onConnect?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const wsEvent: WSEvent = JSON.parse(event.data);
            callbacks.onMessage?.(wsEvent);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          callbacks.onDisconnect?.(event);
        };

        this.ws.onerror = (error) => {
          callbacks.onError?.(error);
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
   * @param options Optional parameters including AbortSignal
   * @returns The quote response
   */
  public async getQuote(request: QuoteRequest, options: { signal?: AbortSignal } = {}): Promise<QuoteResponse> {
    return await getQuote(request, this.apiBaseUrl, this.apiKey, options);
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
   * @param options Optional parameters including AbortSignal
   * @returns The swap response
   */
  public async submitSwap(request: SwapRequest, options: { signal?: AbortSignal } = {}) {
    return await submitSwap(request, this.apiBaseUrl, this.apiKey, options);
  }

  /**
   * Fetches the current status of an order
   * @param orderHash The hash of the order to check
   * @param options Optional parameters including AbortSignal
   * @returns The order status
   */
  public async getOrderStatus(orderHash: string, options: { signal?: AbortSignal } = {}) {
    return await getOrderStatus(orderHash, this.apiBaseUrl, this.apiKey, options);
  }

  /**
   * Polls the order status until it's completed, failed, or times out
   * @param orderHash The hash of the order to poll
   * @param options Polling options and callbacks
   * @param abortOptions Optional parameters including AbortSignal
   * @returns The final order status
   */
  public async pollOrderStatus(orderHash: string, options: PollOrderStatusOptions = {}, abortOptions: { signal?: AbortSignal } = {}) {
    return await pollOrderStatus(orderHash, this.apiBaseUrl, options, this.apiKey, abortOptions);
  }

  /**
   * Fetches detailed information about an order
   * @param orderHash The hash of the order to get details for
   * @param options Optional parameters including AbortSignal
   * @returns The order details
   */
  public async getOrderDetails(orderHash: string, options: { signal?: AbortSignal } = {}) {
    return await getOrderDetails(orderHash, this.apiBaseUrl, this.apiKey, options);
  }

  /**
   * Queries orders with filtering criteria
   * @param params The parameters to filter the orders by
   * @param options Optional parameters including AbortSignal
   * @returns The query results
   */
  public async queryOrders(params: QueryOrdersParams, options: { signal?: AbortSignal } = {}) {
    return await queryOrders(this.apiBaseUrl, params, this.apiKey, options);
  }
}

