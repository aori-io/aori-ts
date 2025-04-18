//========================================================
//            Contract Compliant Order Struct 
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
//            Quote Request and Response Interfaces
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
    | { type: 'Quoted', status: string, orderHash: string, timestamp: number }
    | { type: 'Pending', status: string, orderHash: string, timestamp: number }
    | { type: 'Received', status: string, orderHash: string, txUrl: string, timestamp: number }
    | { type: 'Completed', status: string, orderHash: string, txUrl: string, timestamp: number }
    | { type: 'Failed', status: string, orderHash: string, error: string, timestamp: number };

export interface OrderQuotedStatus {
    type: 'Quoted';
    status: string;
    orderHash: string;
    timestamp: number;
}

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
export interface OrderRecord {
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
}

/**
 * Query parameters for filtering orders
 * Corresponds to Rust's QueryOrdersRequest
 */
export interface QueryOrdersParams {
    orderHash?: string;
    offerer?: string;
    recipient?: string;
    inputToken?: string;
    // inputAmount?: string;
    inputChain?: string;
    outputToken?: string;
    // outputAmount?: string;
    outputChain?: string;
    srctx?: string;
    dstTx?: string;
    status?: string; // Pending, Received, Filled, Confirmed, Failed
    minTime?: number; // Unix timestamp, start of filter range by created_at
    maxTime?: number; // Unix timestamp, end of filter range by created_at
    page?: number; // Page number (1-based)
    limit?: number; // Number of records per page
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
 * Corresponds to Rust's QueryOrdersResponse
 */
export interface QueryOrdersResponse {
    orders: OrderRecord[];
    pagination: PaginationMetadata;
}

//============================================
//         WebSocket Interfaces
//=============================================

export interface SubscriptionParams {
    order_hash?: string;
    offerer?: string;
    recipient?: string;
    inputToken?: string;
    inputChain?: string;
    outputToken?: string;
    outputChain?: string;
    srctx?: string;
    dstTx?: string;
    status?: string; // Pending, Received, Filled, Confirmed, Failed
    minTime?: number; // Unix timestamp, start of filter range by created_at
    maxTime?: number; // Unix timestamp, end of filter range by created_at
    page?: number; // Page number (1-based)
    limit?: number; // Number of records per page
}

export interface EventParams {
    order_hash?: string;
    offerer?: string;
    recipient?: string;
    inputToken?: string;
    inputChain?: string;
    outputToken?: string;
    outputChain?: string;
    srctx?: string;
    dstTx?: string;
    status?: string; // Pending, Received, Filled, Confirmed, Failed
    minTime?: number; // Unix timestamp, start of filter range by created_at
    maxTime?: number; // Unix timestamp, end of filter range by created_at
    page?: number; // Page number (1-based)
    limit?: number; // Number of records per page
}