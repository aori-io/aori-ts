////////////////////////////////////////////////////////////////*/
//                      SUPPORTED CHAINS
//////////////////////////////////////////////////////////////*/

import { ChainInfo } from ".";

export const CHAINS_MAP: Record<string, ChainInfo> = {
    "ethereum": {
        chainKey: "ethereum",
        chainId: 1,
        eid: 30101,
        address: "0x4688291F2DfF8aD881598182A9DBC8c1eA4b1130",
        blocktime: 12,
    },
    "base": {
        chainKey: "base",
        chainId: 8453,
        eid: 30184,
        address: "0x3dDB39211742809309BE73f6FE5DB32E180d2fcE",
        blocktime: 2,
    },
    "arbitrum": {
        chainKey: "arbitrum",
        chainId: 42161,
        eid: 30110,
        address: "0xb959B32fb6F998727A77463042f180E9FDdcf2C6",
        blocktime: 1,
    },
    "optimism": {
        chainKey: "optimism",
        chainId: 10,
        eid: 30111,
        address: "0xc2a08C3458304f421C996e7F00a3978607dd3158",
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

// Helper function to get chain info by EID
export function getChainInfoByEid(eid: number): ChainInfo | undefined {
    return Object.values(CHAINS_MAP).find(chain => chain.eid === eid);
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
