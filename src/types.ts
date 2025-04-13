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
    exclusiveSolverDuration: number;
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
//       Order Details Interfaces
//=============================================

export interface OrderEventRecord {
    order_hash: string;
    event: string;
    timestamp: number;
}

export interface OrderRecord {
    order_hash: string;
    offerer: string;
    recipient: string;
    input_token: string;
    input_amount: string;
    input_chain: string;
    input_token_price_usd: string;
    output_token: string;
    output_amount: string;
    output_chain: string;
    output_token_price_usd: string;
    start_time: number;
    end_time: number;
    src_tx: string | null;
    dst_tx: string | null;
    timestamp: number;
    api_key: string | null;
    events: OrderEventRecord[];
}

//========================================================
//            Query Orders Interfaces
//========================================================

/**
 * Query parameters for filtering orders
 * Corresponds to Rust's QueryOrdersRequest
 */
export interface QueryOrdersRequest {
    order_hash?: string;
    offerer?: string;
    recipient?: string;
    input_token?: string;
    input_amount?: string;
    input_chain?: string;
    output_token?: string;
    output_amount?: string;
    output_chain?: string;
    src_tx?: string;
    dst_tx?: string;
    status?: string; // Pending, Received, Filled, Confirmed, Failed
    min_time?: number; // Unix timestamp, start of filter range by created_at
    max_time?: number; // Unix timestamp, end of filter range by created_at
    page?: number; // Page number (1-based)
    limit?: number; // Number of records per page
  }
  
  /**
   * Pagination metadata for query responses
   */
  export interface PaginationMetadata {
    current_page: number;
    limit: number;
    total_records: number;
    total_pages: number;
  }
  
  /**
   * Response from querying orders
   * Corresponds to Rust's QueryOrdersResponse
   */
  export interface QueryOrdersResponse {
    orders: OrderRecord[];
    pagination: PaginationMetadata;
  }