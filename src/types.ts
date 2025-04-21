//========================================================
//        Contract Compliant Order Struct Interface
//========================================================
export interface Order {
    offerer: string;
    recipient: string;
    inputToken: string;
    outputToken: string;
    inputAmount: string | number | bigint;
    inputChain: string;
    outputChain: string;
    startTime: number;
    endTime: number;
    srcEid: number;
    dstEid: number;
}

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

export interface QuoteResponse {
    orderHash: string;
    signingHash: string;
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

//========================================================
//            Swap Request and Response Interfaces
//========================================================

export interface SwapRequest {
    orderHash: string;
    signature: string;
}

export interface SwapResponse {
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

//========================================================
//                Chain Info Interface
//========================================================

export interface ChainInfo {
    chainKey: string;
    chainId: number;
    eid: number;
    address: string;
    blocktime: number;
}

//============================================
//          Order Status Interfaces
//=============================================

export type OrderStatus =
    | { type: 'Pending', status: string, orderHash: string, timestamp: number }
    | { type: 'Received', status: string, orderHash: string, txUrl: string, timestamp: number }
    | { type: 'Completed', status: string, orderHash: string, txUrl: string, timestamp: number }
    | { type: 'Failed', status: string, orderHash: string, error: string, timestamp: number };

export interface OrderPendingStatus {
    type: 'Pending';
    status: string;
    orderHash: string;
    timestamp: number;
}

export interface OrderReceivedStatus {
    type: 'Received';
    status: string;
    orderHash: string;
    txUrl: string;
    timestamp: number;
}

export interface OrderCompletedStatus {
    type: 'Completed';
    status: string;
    orderHash: string;
    txUrl: string;
    timestamp: number;
}

export interface OrderFailedStatus {
    type: 'Failed';
    status: string;
    orderHash: string;
    error: string;
    timestamp: number;
}

//============================================
//         Order Details Interfaces
//=============================================

export interface OrderEvent {
    // orderHash: string; // we don't need this here
    event: string;
    timestamp: number;
}

export interface OrderDetails {
    orderHash: string;
    offerer: string;
    recipient: string;
    inputToken: string;
    inputAmount: string;
    inputChain: string;
    inputTokenPriceUsd: string;
    outputToken: string;
    outputAmount: string;
    outputChain: string;
    outputTokenPriceUsd: string;
    startTime: number;
    endTime: number;
    srcTx: string | null;
    dstTx: string | null;
    timestamp: number;
    apiKey: string | null;
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
    inputTokenPriceUsd: string;
    outputToken: string;
    outputAmount: string;
    outputChain: string;
    outputTokenPriceUsd: string;
    startTime: number;
    endTime: number;
    srcTx: string | null;
    dstTx: string | null;
    timestamp: number;
    status: string;
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
    status?: string; // Pending, Received, Completed, Failed
}

/**
 * WebSocket event types 
 */
export enum WSEventType {
    OrderCreated = "OrderCreated", // A new order has been created (SwapRequest)
    OrderReceived = "OrderReceived", // Tokens have been deposited for an order
    OrderFilled = "OrderFilled", // An order has been filled
    OrderFailed = "OrderFailed", // An order has failed
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