////////////////////////////////////////////////////////////////*/
//                      SUPPORTED CHAINS
//////////////////////////////////////////////////////////////*/

import { ChainInfo } from ".";

export const CHAINS_MAP: Record<string, ChainInfo> = {
    "ethereum": {
        chainKey: "ethereum",
        chainId: 1,
        eid: 30101,
        address: "0xBb4c20Cb237f3629d1Afc3ECB3E84148FA426c12",
        blocktime: 12,
    },
    "base": {
        chainKey: "base",
        chainId: 8453,
        eid: 30184,
        address: "0x070Dc8E34196BC8Eec0C71961AF723366aa90cD2",
        blocktime: 2,
    },
    "arbitrum": {
        chainKey: "arbitrum",
        chainId: 42161,
        eid: 30110,
        address: "0x67E786775Bb4056bf13e4F2f1e85ab8ea680fBc2",
        blocktime: 1,
    },
    "optimism": {
        chainKey: "optimism",
        chainId: 10,
        eid: 30111,
        address: "0x10DBCEf04DF1f56030CD3F14E8Fe34047303A107",
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
