////////////////////////////////////////////////////////////////*/
//                      SUPPORTED CHAINS
//////////////////////////////////////////////////////////////*/

import { ChainInfo } from ".";

export const CHAINS_MAP: Record<string, ChainInfo> = {
    "ethereum": {
        chainKey: "ethereum",
        chainId: 1,
        eid: 30101,
        address: "0x3DAe550CD4de51928a916C2918712005FdF2868a",
        blocktime: 12,
    },
    "base": {
        chainKey: "base",
        chainId: 8453,
        eid: 30184,
        address: "0xb76F2e06EA55dAD6387785e3838dfc6D48bD5546",
        blocktime: 2,
    },
    "arbitrum": {
        chainKey: "arbitrum",
        chainId: 42161,
        eid: 30110,
        address: "0xc6Ec0cddCbD6D46cd8526B6ac0E9b3ea69e71093",
        blocktime: 1,
    },
    "optimism": {
        chainKey: "optimism",
        chainId: 10,
        eid: 30111,
        address: "0xd49efE0FE627be5C016B55519C9733247deAA6c2",
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
