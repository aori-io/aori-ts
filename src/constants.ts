////////////////////////////////////////////////////////////////*/
//                      SUPPORTED CHAINS
//////////////////////////////////////////////////////////////*/

import { ChainInfo } from ".";

export const CHAINS_MAP: Record<string, ChainInfo> = {
    "ethereum": {
        chainKey: "ethereum",
        chainId: 1,
        eid: 30101,
        address: "0x98AD96Ef787ba5180814055039F8E37d98ADea63",
    },
    "base": {
        chainKey: "base",
        chainId: 8453,
        eid: 30184,
        address: "0xFfe691A6dDb5D2645321e0a920C2e7Bdd00dD3D8",
    },
    "arbitrum": {
        chainKey: "arbitrum",
        chainId: 42161,
        eid: 30110,
        address: "0xFfe691A6dDb5D2645321e0a920C2e7Bdd00dD3D8",
    },
    "optimism": {
        chainKey: "optimism",
        chainId: 10,
        eid: 30111,
        address: "0xFfe691A6dDb5D2645321e0a920C2e7Bdd00dD3D8",
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
//                            URLS
//////////////////////////////////////////////////////////////*/

export const AORI_WS_API: string = "wss://api.aori.io";
export const AORI_API: string = "https://api.aori.io";


