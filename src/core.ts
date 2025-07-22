import { SwapRequest, QuoteRequest, QuoteResponse, ChainInfo, DomainInfo, TokenInfo, TypedDataSigner, PollOrderStatusOptions, QueryOrdersParams, WSEvent, SignerType, WebSocketCallbacks, SubscriptionParams, TransactionResponse, NativeDepositExecutor, NativeSwapResponse, ERC20SwapResponse } from './types';
import { fetchAllChains, getDomain, fetchAllTokens, getTokens, getQuote, signOrder, submitSwap, getOrderStatus, pollOrderStatus, getOrderDetails, queryOrders, signReadableOrder, isNativeToken, isNativeDeposit, executeNativeDeposit, constructNativeDepositTransaction, isNativeSwapResponse, isERC20SwapResponse } from './helpers';
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
   * Creates a new Aori instance and fetches up to date chain information and contract deployments
   * @param apiBaseUrl The base URL of the API
   * @param wsBaseUrl The base URL of the WebSocket API
   * @param apiKey Optional API key for authentication
   * @param loadTokens Optional boolean to load all tokens during initialization. Default: false
   * @returns A promise that resolves with the Aori instance
   */
  public static async create(
    apiBaseUrl: string = AORI_API, 
    wsBaseUrl: string = AORI_WS_API, 
    apiKey?: string,
    loadTokens?: boolean
  ) {
    // Always fetch chains and domain
    const [chains, domain] = await Promise.all([
      fetchAllChains(apiBaseUrl, apiKey),
      getDomain(apiBaseUrl, apiKey)
    ]);

    // Conditionally fetch all tokens
    let tokens: TokenInfo[] = [];
    if (loadTokens === true) {
      tokens = await fetchAllTokens(apiBaseUrl, apiKey);
    }

    return new Aori(chains, domain, apiBaseUrl, wsBaseUrl, apiKey, tokens);
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
   * Queries orders with filtering criteria
   * @param params The parameters to filter the orders by
   * @param options Optional parameters including AbortSignal
   * @returns The query results
   */
  public async queryOrders(params: QueryOrdersParams, options: { signal?: AbortSignal } = {}) {
    return await queryOrders(this.apiBaseUrl, params, this.apiKey, options);
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
  public isNativeDeposit(quoteResponse: QuoteResponse): boolean {
    return isNativeDeposit(quoteResponse);
  }

  /**
   * Executes a native token deposit transaction
   * @param nativeResponse The native swap response containing transaction data
   * @param executor The wallet/provider that can execute transactions
   * @param gasLimit Optional gas limit override
   * @returns Transaction response with hash and success status
   */
  public async executeNativeDeposit(
    nativeResponse: NativeSwapResponse,
    executor: NativeDepositExecutor,
    gasLimit?: string
  ): Promise<TransactionResponse> {
    return await executeNativeDeposit(nativeResponse, executor, gasLimit);
  }

  /**
   * Constructs a transaction request from a native swap response
   * @param nativeResponse The native swap response
   * @param gasLimit Optional gas limit override
   * @returns Transaction request ready for execution
   */
  public constructNativeDepositTransaction(
    nativeResponse: NativeSwapResponse,
    gasLimit?: string
  ) {
    return constructNativeDepositTransaction(nativeResponse, gasLimit);
  }

  /**
   * Complete native token swap flow - gets quote, signs, submits, and executes transaction
   * @param request The quote request for native token
   * @param signer The signer for order signing (can be empty for native)
   * @param executor The wallet/provider that can execute transactions
   * @param gasLimit Optional gas limit override
   * @param options Optional parameters including AbortSignal
   * @returns Transaction response with hash and success status
   */
  public async executeNativeSwap(
    request: QuoteRequest,
    signer: SignerType | null,
    executor: NativeDepositExecutor,
    gasLimit?: string,
    options: { signal?: AbortSignal } = {}
  ): Promise<TransactionResponse> {
    try {
      // Validate that input token is native
      if (!this.isNativeToken(request.inputToken)) {
        throw new Error(`Input token must be native token (${NATIVE_TOKEN_ADDRESS}) for native swaps`);
      }

      // 1. Get quote
      const quote = await this.getQuote(request, options);

      // 2. Validate it's a native deposit
      if (!this.isNativeDeposit(quote)) {
        throw new Error("Quote response indicates ERC20 deposit, not native deposit");
      }

      // 3. Sign order (will return empty string for native)
      let signature = "";
      if (signer) {
        signature = await this.signOrder(quote, signer);
      }

      // 4. Submit swap
      const swapResponse = await this.submitSwap(
        {
          orderHash: quote.orderHash,
          signature
        },
        options
      );

      // 5. Validate response type
      if (!isNativeSwapResponse(swapResponse)) {
        throw new Error("Expected native_deposit response but received standard ERC20 response");
      }

      // 6. Execute native deposit transaction
      return await this.executeNativeDeposit(swapResponse, executor, gasLimit);

    } catch (error) {
      return {
        success: false,
        txHash: "",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Complete swap flow that handles both ERC20 and native tokens automatically
   * @param request The quote request
   * @param signer The signer for order signing
   * @param executor Optional executor for native token transactions
   * @param gasLimit Optional gas limit override for native transactions
   * @param options Optional parameters including AbortSignal
   * @returns Transaction response or swap response depending on token type
   */
  public async executeSwap(
    request: QuoteRequest,
    signer: SignerType,
    executor?: NativeDepositExecutor,
    gasLimit?: string,
    options: { signal?: AbortSignal } = {}
  ): Promise<TransactionResponse | { swapResponse: ERC20SwapResponse }> {
    // Check if this is a native token swap
    if (this.isNativeToken(request.inputToken)) {
      if (!executor) {
        throw new Error("Executor is required for native token swaps");
      }
      return await this.executeNativeSwap(request, signer, executor, gasLimit, options);
    } else {
      // Standard ERC20 flow
      const quote = await this.getQuote(request, options);
      const signature = await this.signOrder(quote, signer);
      const swapResponse = await this.submitSwap(
        {
          orderHash: quote.orderHash,
          signature
        },
        options
      );

      if (!isERC20SwapResponse(swapResponse)) {
        throw new Error("Unexpected native token response for ERC20 swap request");
      }

      return { swapResponse };
    }
  }
}

