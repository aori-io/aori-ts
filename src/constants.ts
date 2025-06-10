////////////////////////////////////////////////////////////////*/
//                      SUPPORTED CHAINS
//////////////////////////////////////////////////////////////*/

import { ChainInfo } from ".";

export const CHAINS_MAP: Record<string, ChainInfo> = {
    "ethereum": {
        chainKey: "ethereum",
        chainId: 1,
        eid: 30101,
        address: "0x7DeC965CF240F81299683f48a18ebDBe8B2aCCB5",
    },
    "base": {
        chainKey: "base",
        chainId: 8453,
        eid: 30184,
        address: "0xc23537e825D1f35E50396926A46C935E667c4fEA",
    },
    "arbitrum": {
        chainKey: "arbitrum",
        chainId: 42161,
        eid: 30110,
        address: "0x47fe1299cd36D4153E39D226a7EA2e96F2f644F3",
    },
    "optimism": {
        chainKey: "optimism",
        chainId: 10,
        eid: 30111,
        address: "0xB7E80e3FCD83cBEf76AE05aA42534a1Dc35761A7",
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


