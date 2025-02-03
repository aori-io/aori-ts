import { AORI_HTTP_API } from "./constants";
import { SwapGetRequest, SwapGetResponse, SwapPostRequest, SwapPostResponse } from "./types";

/**
 * TODO: Implement swap functions and quote functions
 * 
 * - function getQuote
 * - function submitSwap
 * 
 */

export class Swap {
    private httpProvider: typeof AORI_HTTP_API;

    constructor() {
        this.httpProvider = AORI_HTTP_API;
    }

    async getQuote(request: SwapGetRequest): Promise<SwapGetResponse> {
        const url = `${this.httpProvider}/swap`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`Error fetching quote: ${response.statusText}`);
        }

        const data: SwapGetResponse = await response.json();
        return data;
    }

    async submitSwap(request: SwapPostRequest): Promise<SwapPostResponse> {
        const url = `${this.httpProvider}/swap`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`Error submitting Swap: ${response.statusText}`);
        }

        const data: SwapGetResponse = await response.json();
        return data;
    }
}