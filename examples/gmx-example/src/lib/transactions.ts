/**
 * Transaction Utilities
 * 
 * Helper functions for waiting on transactions and polling for balance changes.
 * These are used throughout the deposit flow to handle async blockchain operations.
 */

import { createPublicClient, http, type Address } from "viem";
import { getChainById } from "./chains";
import { fetchTokenBalance } from "./balances";

/**
 * Wait for a transaction to be confirmed on-chain.
 * 
 * @param txHash - The transaction hash to wait for
 * @param chainId - The chain ID where the transaction was submitted
 */
export async function waitForTransactionConfirmation(
  txHash: `0x${string}`,
  chainId: number
): Promise<void> {
  const chain = getChainById(chainId);
  if (!chain) {
    // Fallback: just wait a fixed time if chain not found
    await new Promise(resolve => setTimeout(resolve, 5000));
    return;
  }

  const client = createPublicClient({ chain, transport: http() });
  await client.waitForTransactionReceipt({ hash: txHash });
}

/**
 * Poll for a token balance increase on a destination chain.
 * Used to detect when a cross-chain swap has completed.
 * 
 * @param tokenAddress - The token to check balance for
 * @param ownerAddress - The wallet address to check
 * @param chainId - The chain to check on
 * @param initialBalance - The balance before the swap (to detect increase)
 * @param onStatusUpdate - Callback for status updates
 * @param maxAttempts - Maximum polling attempts (default 120 = 2 minutes)
 * @returns Object with success status and received amount
 */
export async function pollForBalanceIncrease(
  tokenAddress: Address,
  ownerAddress: Address,
  chainId: number,
  initialBalance: bigint,
  onStatusUpdate: (status: string) => void,
  maxAttempts = 120
): Promise<{ success: boolean; newBalance: bigint; receivedAmount: bigint }> {
  const POLL_INTERVAL_MS = 1000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const elapsedSeconds = attempt * (POLL_INTERVAL_MS / 1000);

    try {
      const currentBalance = await fetchTokenBalance(tokenAddress, ownerAddress, chainId);

      if (currentBalance > initialBalance) {
        const receivedAmount = currentBalance - initialBalance;
        return { success: true, newBalance: currentBalance, receivedAmount };
      }

      onStatusUpdate(`⏳ Waiting for swap to complete (${elapsedSeconds}s)...`);
    } catch {
      onStatusUpdate(`📡 Checking balance (${elapsedSeconds}s)...`);
    }

    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }

  return { success: false, newBalance: 0n, receivedAmount: 0n };
}
