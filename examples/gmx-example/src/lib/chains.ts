import type { Chain } from "viem";
import { arbitrum, base, mainnet, optimism, bsc } from "wagmi/chains";

// Supported chains for the app
export const SUPPORTED_CHAINS: Chain[] = [mainnet, arbitrum, base, optimism, bsc];

const CHAIN_LABELS: Record<string, string> = {
  ethereum: "Ethereum",
  arbitrum: "Arbitrum",
  base: "Base",
  optimism: "Optimism",
  bsc: "BSC",
};

export function getChainById(id: number): Chain | undefined {
  return SUPPORTED_CHAINS.find((c) => c.id === id);
}

export function chainKeyToLabel(key: string): string {
  return CHAIN_LABELS[key] ?? key;
}

// GMX Arbitrum settings
export const GMX_CHAIN_ID = 42161;
export const GMX_CHAIN_KEY = "arbitrum";
