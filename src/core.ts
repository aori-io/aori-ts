import {
  ChainInfo,
  DomainInfo,
  TokenInfo,
  QuoteRequest,
  QuoteResponse,
  SwapRequest,
  SwapResponse,
  SignerType,
  TypedDataSigner,
  PollOrderStatusOptions,
  QueryOrdersParams,
  SubscriptionParams,
  WebSocketCallbacks,
  OrderDetails,
  TransactionResponse,
  NativeSwapResponse,
  SwapConfig,
  TxExecutor,
  Order,
  CancelOrderResponse,
  CancelTxExecutor,
  WSEvent,
  CancelTx
} from './types'
import { fetchAllChains, getDomain, fetchAllTokens, getTokens, getQuote, signOrder, submitSwap, getOrderStatus, pollOrderStatus, getOrderDetails, queryOrders, signReadableOrder, isNativeToken, isNativeSwap, executeNativeSwap, executeSwap, constructNativeSwapTransaction, parseOrder, getOrder, cancelOrder, canCancel, getCancelTx } from './helpers';
import {
  AORI_API,
  AORI_WS_API,
  NATIVE_TOKEN_ADDRESS
} from './constants';

/**
 * Aori is the main class for interacting with the Aori API
 */
export class Aori {
  // General
  public chains: Record<string, ChainInfo> = {};
  public domain: DomainInfo | null = null;
  public tokens: TokenInfo[] = [];
  public apiBaseUrl: string = AORI_API;
  private apiKey?: string;

  // WebSocket
  public wsBaseUrl: string = AORI_WS_API;
  private ws: WebSocket | null = null;

  /**
   * Creates a new Aori instance
   * @param chains The list of supported chains and their configurations
   * @param domain The domain information for EIP-712 typed data signing
   * @param apiBaseUrl The base URL of the API
   * @param wsBaseUrl The base URL of the WebSocket API
   * @param apiKey Optional API key for authentication
   * @param tokens Optional list of tokens
   */
  private constructor(
    chains: Record<string, ChainInfo>,
    domain: DomainInfo,
    apiBaseUrl: string = AORI_API,
    wsBaseUrl: string = AORI_WS_API,
    apiKey?: string,
    tokens: TokenInfo[] = []
  ) {
    this.apiBaseUrl = apiBaseUrl;
    this.wsBaseUrl = wsBaseUrl.replace(/^http/, 'ws');
    this.apiKey = apiKey;
    this.chains = chains;
    this.domain = domain;
    this.tokens = tokens;
  }

  /**
   * Creates a new Aori instance with optional chain and token data
   * @param apiBaseUrl The base URL of the API
   * @param wsBaseUrl The base URL of the WebSocket API
   * @param apiKey Optional API key for authentication
   * @param loadTokens Optional boolean to load all tokens during initialization. Default: false
   * @param chains Optional chains mapping to use instead of fetching from API. If provided, no API call is made for chains.
   * @param domain Optional domain info for EIP-712. If provided, no API call is made for domain.
   * @returns A promise that resolves with the Aori instance
   * 
   * @example
   * // Standard usage (fetches chains and domain from API)
   * const aori = await Aori.create()
   * 
   * @example
   * // Using pre-defined chains (no API call for chains)
   * const customChains = { ethereum: { chainKey: 'ethereum', chainId: 1, eid: 30101, address: '0x...' } }
   * const aori = await Aori.create(AORI_API, AORI_WS_API, apiKey, false, customChains)
   * 
   * @example
   * // Using custom domain (useful for APIs that don't support domain endpoint)
   * const customDomain = { name: 'Aori', version: '0.3.1', ... }
   * const aori = await Aori.create(AORI_API, AORI_WS_API, apiKey, false, undefined, customDomain)
   * 
   * @example
   * // Load tokens and use custom chains and domain
   * const aori = await Aori.create(AORI_API, AORI_WS_API, apiKey, true, customChains, customDomain)
   */
  public static async create(
    apiBaseUrl: string = AORI_API, 
    wsBaseUrl: string = AORI_WS_API, 
    apiKey?: string,
    loadTokens?: boolean,
    chains?: Record<string, ChainInfo>,
    domain?: DomainInfo
  ) {
    // Use provided chains or fetch from API
    // Use provided domain or fetch from API
    const [resolvedChains, resolvedDomain] = await Promise.all([
      chains ? Promise.resolve(chains) : fetchAllChains(apiBaseUrl, apiKey),
      domain ? Promise.resolve(domain) : getDomain(apiBaseUrl, apiKey)
    ]);

    // Conditionally fetch all tokens
    let tokens: TokenInfo[] = [];
    if (loadTokens === true) {
      tokens = await fetchAllTokens(apiBaseUrl, apiKey);
    }

    return new Aori(resolvedChains, resolvedDomain, apiBaseUrl, wsBaseUrl, apiKey, tokens);
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
   * Returns the cached domain information needed for EIP-712 typed data signing
   * @returns The domain information containing name, version, and type strings
   */
  public getDomain(): DomainInfo | null {
    return this.domain;
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
      outputChain,
      this.domain ?? undefined
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
        // Add /stream path to the WebSocket URL
        const wsUrl = new URL('/stream', this.wsBaseUrl);

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
      // Remove event listeners to prevent memory leaks
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      
      // Close connection if still open
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      
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
   * Fetches order details and converts them to a contract-compliant Order format
   * @param orderHash The hash of the order to get
   * @param options Optional parameters including AbortSignal
   * @returns The contract-compliant order with EIDs resolved from cached chains
   */
  public async getOrder(orderHash: string, options: { signal?: AbortSignal } = {}): Promise<Order> {
    return await getOrder(orderHash, this.chains, this.apiBaseUrl, this.apiKey, options);
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

  /**
   * Cancels an order on the Aori API
   * @param orderHash The hash of the order to cancel
   * @param txExecutor Transaction executor for blockchain operations with optional RPC call capability
   * @param options Optional parameters including AbortSignal
   * @returns The cancel order response
   */
  public async cancelOrder(
    orderHash: string, 
    txExecutor: CancelTxExecutor, 
    options: { signal?: AbortSignal } = {}
  ): Promise<CancelOrderResponse> {
    return await cancelOrder(orderHash, txExecutor, this.apiBaseUrl, this.apiKey, options);
  }

  /**
   * Gets transaction data for cancelling an order from the API
   * @param orderHash The hash of the order to cancel
   * @param options Optional parameters including AbortSignal
   * @returns The cancel transaction data
   */
  public async getCancelTx(orderHash: string, options: { signal?: AbortSignal } = {}): Promise<CancelTx> {
    return await getCancelTx(orderHash, this.apiBaseUrl, this.apiKey, options);
  }

  /**
   * Checks if an order can be cancelled based on its event history
   * An order can be cancelled if it has a "received" event but lacks "completed" or "cancelled" events
   * @param orderHash The hash of the order to check
   * @param options Optional parameters including AbortSignal
   * @returns Promise<boolean> True if the order can be cancelled, false otherwise
   */
  public async canCancel(orderHash: string, options: { signal?: AbortSignal } = {}): Promise<boolean> {
    return await canCancel(orderHash, undefined, this.apiBaseUrl, this.apiKey, options);
  }

  //////////////////////////////////////////////////////////
  //                NATIVE TOKEN UTILITIES
  //////////////////////////////////////////////////////////

  /**
   * Checks if a token address represents a native token (ETH)
   * @param tokenAddress The token address to check
   * @returns True if the address represents a native token
   */
  public isNativeToken(tokenAddress: string): boolean {
    return isNativeToken(tokenAddress);
  }

  /**
   * Gets the native token address constant
   * @returns The native token address
   */
  public getNativeTokenAddress(): string {
    return NATIVE_TOKEN_ADDRESS;
  }

  /**
   * Checks if a quote response indicates a native token deposit
   * @param quoteResponse The quote response to check
   * @returns True if this is a native token deposit
   */
  public isNativeSwap(quoteResponse: QuoteResponse): boolean {
    return isNativeSwap(quoteResponse);
  }

  /**
   * Executes a native token deposit transaction
   * @param nativeResponse The native swap response containing transaction data
   * @param txExecutor The wallet/provider that can execute transactions
   * @param gasLimit Optional gas limit override
   * @returns Transaction response with hash and success status
   */
  public async executeNativeSwap(
    nativeResponse: NativeSwapResponse,
    txExecutor: TxExecutor,
    gasLimit?: string
  ): Promise<TransactionResponse> {
    return await executeNativeSwap(nativeResponse, txExecutor, gasLimit);
  }

  /**
   * Constructs a transaction request from a native swap response
   * @param nativeResponse The native swap response
   * @param gasLimit Optional gas limit override
   * @returns Transaction request ready for execution
   */
  public constructNativeSwapTransaction(
    nativeResponse: NativeSwapResponse,
    gasLimit?: string
  ) {
    return constructNativeSwapTransaction(nativeResponse, gasLimit);
  }

    /**
   * Complete swap flow that handles both ERC20 and native tokens automatically
   * @param quote The quote response from a previous getQuote call
   * @param config Configuration object containing the appropriate parameters for each swap type
   * @param options Optional parameters including AbortSignal
   * @returns TransactionResponse for native tokens (after execution) or SwapResponse for ERC20 tokens
   */
  public async executeSwap(
    quote: QuoteResponse,
    config: SwapConfig,
    options: { signal?: AbortSignal } = {}
  ): Promise<TransactionResponse | SwapResponse> {
    return await executeSwap(quote, config, this.apiBaseUrl, this.apiKey, options);
  }

  /**
   * Converts a QuoteResponse, SwapResponse, or OrderDetails to a contract-compliant Order
   * @param order The quote response, swap response, or order details to convert
   * @returns The contract-compliant order struct with EIDs resolved from cached chains
   */
  public async parseOrder(
    order: QuoteResponse | SwapResponse | OrderDetails
  ): Promise<Order> {
    return await parseOrder(order, this.chains, this.apiBaseUrl, this.apiKey);
  }
 
}

