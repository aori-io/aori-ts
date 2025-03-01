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

export interface OrderRecord {
    orderHash: string;
    offerer: string;
    recipient: string;
    inputToken: string;
    inputAmount: string;
    inputValueUsd: string;
    outputToken: string;
    outputAmount: string;
    outputValueUsd: string;
    inputChain: string;
    outputChain: string;
    startTime: number;
    endTime: number;
    srcTx?: string;
    dstTx?: string;
    status: string;
    createdAt: number;
    receivedAt?: number;
    filledAt?: number;
    confirmedAt?: number;
    failedAt?: number;
} 

export interface ChainInfo {
    chainKey: string;
    chainId: number;
    eid: number;
    address: string;
    blocktime: number;
}