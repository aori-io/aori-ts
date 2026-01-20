import { erc20Abi, createPublicClient, formatUnits, http, type Address } from "viem";
import type { Token } from "./tokens";
import { SUPPORTED_CHAINS, getChainById } from "./chains";

type BalanceResult = {
  token: Token;
  value: bigint;
  decimals: number;
  formatted: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clientCache: Record<number, any> = {};

function getClient(chainId: number) {
  if (clientCache[chainId]) return clientCache[chainId];
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
  if (!chain) return null;
  const client = createPublicClient({ chain, transport: http() });
  clientCache[chainId] = client;
  return client;
}

export async function fetchBalancesForAddress(
  address: `0x${string}`,
  tokens: Token[],
): Promise<BalanceResult[]> {
  const results: BalanceResult[] = [];

  // Filter to tokens on supported chains and group by chainId
  const grouped = tokens.reduce<Record<number, Token[]>>((acc, t) => {
    if (!SUPPORTED_CHAINS.some((c) => c.id === t.chainId)) return acc;
    acc[t.chainId] = acc[t.chainId] || [];
    acc[t.chainId].push(t);
    return acc;
  }, {});

  for (const [cidStr, chainTokens] of Object.entries(grouped)) {
    const chainId = Number(cidStr);
    const client = getClient(chainId);
    if (!client) continue;

    const promises = chainTokens.map(async (token) => {
      const decimals = token.decimals ?? 18;
      try {
        const value = token.address.toLowerCase() ===
          "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
          ? await client.getBalance({ address })
          : await client.readContract({
              address: token.address as `0x${string}`,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [address],
            });
        const formatted = formatUnits(value, decimals);
        return { token, value, decimals, formatted };
      } catch {
        return null;
      }
    });

    const chainBalances = await Promise.all(promises);
    chainBalances
      .filter((b): b is BalanceResult => Boolean(b))
      .forEach((b) => results.push(b));
  }

  return results;
}

// Fetch a specific token balance
export async function fetchTokenBalance(
  tokenAddress: Address,
  ownerAddress: Address,
  chainId: number
): Promise<bigint> {
  const chain = getChainById(chainId);
  if (!chain) return 0n;

  const client = createPublicClient({ chain, transport: http() });

  if (tokenAddress.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
    return await client.getBalance({ address: ownerAddress });
  }

  try {
    const balance = await client.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [ownerAddress],
    });
    return balance as bigint;
  } catch (err) {
    console.error("Failed to fetch token balance:", err);
    return 0n;
  }
}
