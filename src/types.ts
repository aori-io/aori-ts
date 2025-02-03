/**
 * TODO: Implement types for: 
 * 
 * - /data
 * - /market
 * - /asset/{address}
 * 
 * - signMessage
 * - signAndSubmitTxn
 * 
 */

export interface AoriOrder { 
    offerer: string;
    recipient: string;
    inputToken: string;
    inputAmount: string;
    outputToken: string;
    startTime: string;
    endTime: string;
}

export interface GetQuoteRequest {
    inputToken: string;
    outputToken: string;
    inputAmount: string;
    chainId: number;
    outputChainId?: number;
}

export interface GetQuoteResponse {
    inputToken: string;
    outputToken: string;
    inputAmount: string;
    outputAmount: string;
    inputChainId: number;
    outputChainId: number;
    calldata: string;
}

export interface SwapGetRequest {
    inputToken: string;
    outputToken: string;
    inputAmount: string;
    inputChainId: number;
    outputChainId?: number;
}

export interface SwapGetResponse {
    inputToken: string;
    outputToken: string;
    inputAmount: string;
    outputAmount: string;
    inputChainId: number;
    outputChainId: number;
    calldata: string;
}

export interface SwapPostRequest {
    inputToken: string;
    outputToken: string;
    inputAmount: string;
    inputChainId: number;
    outputChainId?: number;
}

export interface SwapPostResponse {
    inputToken: string;
    outputToken: string;
    inputAmount: string;
    outputAmount: string;
    inputChainId: number;
    outputChainId: number;
    calldata: string;
}