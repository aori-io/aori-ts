// Examples for getting a Same-Chain Quote

import { Swap } from "../src/swap";
import { SwapGetRequest } from "../src/types";

async function exampleGetQuote() {
    const swap = new Swap();
    const request: SwapGetRequest = {
        inputToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        inputAmount: '10000000', // 10 USDC
        outputToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
        inputChainId: 1, // ETH mainnet
        outputChainId: 1, // Optional, same as inputChainId for same-chain quote
    };
    const response = await swap.getQuote(request);
    console.log("Quote Response:", response);

    return response;
}