////////////////////////////////////////////////////////////////*/
//                      SUPPORTED CHAINS
//////////////////////////////////////////////////////////////*/

import { ChainInfo } from ".";

export const CHAINS_MAP: Record<string, ChainInfo> = {
    "ethereum": {
        chainKey: "ethereum",
        chainId: 1,
        eid: 30101,
        address: "0x3C5ee8Ec2E0174cE1B34f140F37C032e43ef41b6",
        blocktime: 12,
    },
    "base": {
        chainKey: "base",
        chainId: 8453,
        eid: 30184,
        address: "0x69F05F7Fb4D7E3C11943392BE5254c9c19c01647",
        blocktime: 2,
    },
    "arbitrum": {
        chainKey: "arbitrum",
        chainId: 42161,
        eid: 30110,
        address: "0x629B94B73229a22051dB15A3122c426aa68D0A87",
        blocktime: 1,
    },
    "optimism": {
        chainKey: "optimism",
        chainId: 10,
        eid: 30111,
        address: "0x684986544162a2c4cE4a6879981a4969b2c19E92",
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
