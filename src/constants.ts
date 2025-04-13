////////////////////////////////////////////////////////////////*/
//                      SUPPORTED CHAINS
//////////////////////////////////////////////////////////////*/

import { ChainInfo } from ".";

export const CHAINS_MAP: Record<string, ChainInfo> = {
    "ethereum": {
        chainKey: "ethereum",
        chainId: 1,
        eid: 30101,
        address: "0xe8820573Bb2d748Dc86C381b2c4bC3cFdFabf30A",
        blocktime: 12,
    },
    "base": {
        chainKey: "base",
        chainId: 8453,
        eid: 30184,
        address: "0x21FC19BE519fB20e9182aDF3Ca0C2Ef625aB1647",
        blocktime: 2,
    },
    "arbitrum": {
        chainKey: "arbitrum",
        chainId: 42161,
        eid: 30110,
        address: "0x708a4498dA06b133f73Ee6107F1737015372cb76",
        blocktime: 1,
    },
    "optimism": {
        chainKey: "optimism",
        chainId: 10,
        eid: 30111,
        address: "0xbfd66f36aCa484802387a8e484BCe4630A1da764",
        blocktime: 2,
    }
};

// Helper function to get chain info by chain ID
export function getChainInfoById(chainId: number): ChainInfo | undefined {
    return Object.values(CHAINS_MAP).find(chain => chain.chainId === chainId);
}

// Helper function to get chain info by chain key
export function getChainInfoByKey(chainKey: string): ChainInfo | undefined {
    return CHAINS_MAP[chainKey.toLowerCase()];
}

//////////////////////////////////////////////////////////////*/
//                      WEBSOCKET URLS
//////////////////////////////////////////////////////////////*/

export const AORI_WS_API: string = "wss://api.aori.io";
export const AORI_WS_DEVELOPMENT_API: string = "wss://dev.api.aori.io";

//////////////////////////////////////////////////////////////*/
//                      HTTP POST URLS
//////////////////////////////////////////////////////////////*/

// Main Aori API for facilitating CRUD operations
export const AORI_API: string = "https://api.aori.io";
export const AORI_DEVELOPMENT_API: string = "https://dev.api.aori.io";
