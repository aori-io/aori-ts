

//========================================================
//          Quote Request and Response Interfaces
//========================================================

export interface QuoteRequest {
    offerer: string;
    recipient: string;
    inputToken: string;
    outputToken: string;
    inputAmount: string | number | bigint;
    inputChain: string;
    outputChain: string;
}

// Base interface for common quote response fields
export interface QuoteResponseBase {
    orderHash: string;
    offerer: string;
    recipient: string;
    inputToken: string;
    outputToken: string;
    inputAmount: string;
    outputAmount: string;
    inputChain: string;
    outputChain: string;
    startTime: number;
    endTime: number;
    estimatedTime: number;
}

// ERC20 quote response (includes signing hash for EIP-712 signature)
export interface ERC20QuoteResponse extends QuoteResponseBase {
    signingHash: string;
}

// Native quote response (no signature required)
export interface NativeQuoteResponse extends QuoteResponseBase {
    // No additional fields - no signature needed for native swaps
}

// Union type for quote responses - discriminated by presence of signingHash field
export type QuoteResponse = ERC20QuoteResponse | NativeQuoteResponse;

//========================================================
//            Swap Request and Response Interfaces
//========================================================

export interface SwapRequest {
    orderHash: string;
    signature: string;
}

// Base interface for common swap response fields
export interface SwapResponseBase {
    orderHash: string;
    offerer: string;
    recipient: string;
    inputToken: string;
    outputToken: string;
    inputAmount: string;
    outputAmount: string;
    inputChain: string;
    outputChain: string;
    startTime: number;
    endTime: number;
    status: string;
    createdAt: number;
}

// ERC20 deposit response (standard flow)
export interface ERC20SwapResponse extends SwapResponseBase {
    // No additional fields - just the base response
}

// Native deposit response (requires user transaction execution)
export interface NativeSwapResponse extends SwapResponseBase {
    to: string;        // Contract address to call
    data: string;      // Transaction calldata (hex encoded)
    value: string;     // Native token amount (wei, same as inputAmount)
}

// Union type for swap responses - discriminated by presence of to/data/value fields
export type SwapResponse = ERC20SwapResponse | NativeSwapResponse;

// Enhanced swap response that may include transaction details for executed native deposits
export type EnhancedSwapResponse = SwapResponse & {
    transaction?: TransactionResponse; // Present when native deposit was automatically executed
};

//========================================================
//            Execute Swap Configuration Types
//========================================================

export interface ERC20SwapConfig {
    type: 'erc20';
    signer: TypedDataSigner;
    userAddress: string;
}

export interface TxExecutor {
    sendTransaction(request: TransactionRequest): Promise<{ hash: string; wait(): Promise<any> }>;
    estimateGas?(request: TransactionRequest): Promise<bigint>;
}

export interface NativeSwapConfig {
    type: 'native';
    txExecutor: TxExecutor;
    gasLimit?: string;
}

export type SwapConfig = ERC20SwapConfig | NativeSwapConfig;

//========================================================
//            Contract-Compliant Order Types
//========================================================

export interface Order {
    inputAmount: string;
    outputAmount: string;
    inputToken: string;
    outputToken: string;
    startTime: number;
    endTime: number;
    srcEid: number;
    dstEid: number;
    offerer: string;
    recipient: string;
}


//========================================================
//            Native Token Transaction Interfaces
//========================================================

export interface TransactionRequest {
    to: string;
    data: string;
    value: string;
    gasLimit?: string;
}

export interface TransactionResponse {
    success: boolean;
    txHash: string;
    error?: string;
}



//========================================================
//                Chain Info Interface
//========================================================

export interface ChainInfo {
    chainKey: string;
    chainId: number;
    eid: number;
    address: string;
}

//========================================================
//                Domain Info Interface
//========================================================

export interface DomainInfo {
    domainTypeString: string;
    name: string;
    orderTypeString: string;
    version: string;
}

//========================================================
//                Token Info Interface
//========================================================

export interface TokenInfo {
    symbol: string;
    address: string;
    chainId: number;
    chainKey: string;
}

//============================================
//          Order Status Interfaces
//=============================================

export type OrderStatus =
    | { status: 'pending', timestamp: number }
    | { status: 'received', txHash: string, txUrl: string, timestamp: number }
    | { status: 'completed', txHash: string, txUrl: string, timestamp: number }
    | { status: 'failed', error: string, timestamp: number };

export interface OrderPendingStatus {
    status: "pending";
    orderHash: string;
    timestamp: number;
}

export interface OrderReceivedStatus {
    status: "received";
    txHash: string;
    txUrl: string;
    timestamp: number;
}

export interface OrderCompletedStatus {
    status: "completed";
    txHash: string;
    txUrl: string;
    timestamp: number;
}

export interface OrderFailedStatus {
    status: "failed";
    error: string;
    timestamp: number;
}

//============================================
//         Order Details Interfaces
//=============================================

export interface OrderEvent {
    eventType: string; // created, received, completed, failed
    timestamp: number;
}

export interface OrderDetails {
    orderHash: string;
    offerer: string;
    recipient: string;
    inputToken: string;
    inputAmount: string;
    inputChain: string;
    inputTokenValueUsd: string;
    outputToken: string;
    outputAmount: string;
    outputChain: string;
    outputTokenValueUsd: string;
    startTime: number;
    endTime: number;
    srcTx: string | null;
    dstTx: string | null;
    timestamp: number;
    events: OrderEvent[];
}

//========================================================
//            Query Orders Interfaces
//========================================================


/**
 * Query parameters for filtering orders
 */
export interface QueryOrdersParams {
    orderHash?: string;
    offerer?: string;
    recipient?: string;
    inputToken?: string;
    inputChain?: string;
    outputToken?: string;
    minValue?: string; // min value of usd value range
    maxValue?: string; // max value of usd value range
    outputChain?: string;
    srctx?: string;
    dstTx?: string;
    status?: string; // Pending, Received, Completed, Failed
    minTime?: number; // Unix timestamp, start of filter range by created_at
    maxTime?: number; // Unix timestamp, end of filter range by created_at
    page?: number; // Page number (1-based)
    limit?: number; // Number of records per page
}


/**
 * Single result of querying orders
 */
export interface OrderQueryResult {
    orderHash: string;
    offerer: string;
    recipient: string;
    inputToken: string;
    inputAmount: string;
    inputChain: string;
    inputTokenValueUsd: string;
    outputToken: string;
    outputAmount: string;
    outputChain: string;
    outputTokenValueUsd: string;
    startTime: number;
    endTime: number;
    srcTx: string | null;
    dstTx: string | null;
    timestamp: number; // timestamp of most recent event   
    status: string; // Pending, Received, Completed, Failed
}

/**
 * Pagination metadata for query responses
 */
export interface PaginationMetadata {
    currentPage: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
}

/**
 * Response from querying orders
 */
export interface QueryOrdersResponse {
    orders: OrderQueryResult[];
    pagination: PaginationMetadata;
}

//============================================
//         WebSocket Interfaces
//=============================================

/**
 * Parameters for filtering WebSocket event subscriptions
 */
export interface SubscriptionParams {
    orderHash?: string;
    offerer?: string;
    recipient?: string;
    inputToken?: string;
    inputChain?: string;
    outputToken?: string;
    outputChain?: string;
    eventType?: string; // created, received, completed, failed
}

/**
 * WebSocket event types 
 */
export enum WSEventType {
    Created = "created",
    Received = "received", 
    Completed = "completed",
    Failed = "failed"
}

/**
 * WebSocket order payload
 */
export interface WSOrder {
    orderHash: string;
    offerer: string;
    recipient: string;
    inputToken: string;
    inputAmount: string;
    inputChain: string;
    outputToken: string;
    outputAmount: string;
    outputChain: string;
    startTime: number;
    srcTx: string;
    dstTx: string;
    endTime: number;
}

/**
 * WebSocket event payload
 */
export interface WSEvent {
    /** Type of WebSocket event */
    eventType: WSEventType;
    /** Unix timestamp when the event was created */
    timestamp: number;
    /** Order record data */
    order: WSOrder;
}

/**
 * Interface for wallet clients that can sign typed data (compatible with viem, ethers, etc.)
 */
export interface TypedDataSigner {
  signTypedData: (params: any) => Promise<string>;
}

/**
 * Interface for wallet clients that can sign messages (compatible with viem, ethers, etc.)
 */
export interface SignerType {
    privateKey: string;
}

/**
 * Interface for WebSocket options
 */
export interface WebSocketCallbacks {
    onMessage?: (event: WSEvent) => void;
    onConnect?: () => void;
    onDisconnect?: (event: CloseEvent) => void;
    onError?: (error: Event) => void;
}

/**
 * Interface for polling order status options
 */
export interface PollOrderStatusOptions {
    onStatusChange?: (status: OrderStatus) => void;
    onComplete?: (status: OrderStatus) => void;
    onError?: (error: Error) => void;
    interval?: number;
    timeout?: number;
}