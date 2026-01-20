import { erc20Abi, createPublicClient, http, type Address } from "viem";
import { getChainById } from "./chains";

// Check existing allowance on-chain
export async function checkAllowance(
  tokenAddress: Address,
  ownerAddress: Address,
  spenderAddress: Address,
  chainId: number
): Promise<bigint> {
  const chain = getChainById(chainId);
  if (!chain) return 0n;

  const client = createPublicClient({ chain, transport: http() });

  try {
    const allowance = await client.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "allowance",
      args: [ownerAddress, spenderAddress],
    });
    return allowance as bigint;
  } catch (err) {
    console.error("Failed to check allowance:", err);
    return 0n;
  }
}
