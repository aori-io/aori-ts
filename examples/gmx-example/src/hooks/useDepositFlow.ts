/**
 * useDepositFlow - Complete Cross-Chain Deposit Flow Hook
 * 
 * This hook encapsulates the entire flow for depositing tokens into GMX:
 * 
 * FLOW OVERVIEW:
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * SAME-CHAIN (Token already on Arbitrum):
 *   Step 1: Approve token for GMX SyntheticsRouter (if needed)
 *   Step 2: Execute GMX deposit via MultichainTransferRouter
 * 
 * CROSS-CHAIN (Token on another chain):
 *   Step 1: Get quote from Aori for the cross-chain swap
 *   Step 2: Approve source token for Aori contract (if ERC20)
 *   Step 3: Sign and submit swap order to Aori
 *   Step 4: Wait for output token to arrive on Arbitrum
 *   Step 5: Approve output token for GMX SyntheticsRouter
 *   Step 6: Execute GMX deposit via MultichainTransferRouter
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from "react";
import { useAccount, useSwitchChain, useWalletClient, useWriteContract } from "wagmi";
import { erc20Abi, formatUnits, parseUnits, type Address } from "viem";
import { getQuote, signReadableOrder, submitSwap, isNativeToken as checkNativeToken } from "@aori/aori-ts";
import type { QuoteResponse } from "@aori/aori-ts";

import { getChainById, chainKeyToLabel, GMX_CHAIN_ID, GMX_CHAIN_KEY } from "@/lib/chains";
import { checkAllowance } from "@/lib/allowances";
import { fetchTokenBalance } from "@/lib/balances";
import { waitForTransactionConfirmation, pollForBalanceIncrease } from "@/lib/transactions";
import {
  GMX_MULTICHAIN_TRANSFER_ROUTER,
  GMX_SYNTHETICS_ROUTER,
  buildGmxDepositCalldata,
  isNativeToken as isGmxNativeToken,
} from "@/lib/gmx-deposit";
import { fetchGmxAccountBalanceWithPrices } from "@/lib/gmx-balance";

// ============================================================================
// TYPES
// ============================================================================

export type DepositToken = {
  address: string;
  symbol: string;
  decimals: number;
  chainId: number;
  chainKey: string;
};

export type DepositFlowState = {
  isExecuting: boolean;
  status: string | null;
  error: string | null;
};

export type AoriChainInfo = {
  chainId: number;
  address: string;
  chainKey: string;
};

// ============================================================================
// HOOK
// ============================================================================

export function useDepositFlow(
  aoriChains: AoriChainInfo[] | undefined,
  tokenPriceMap: Map<string, number>,
  onSuccess?: () => void
) {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();

  // Flow state
  const [isExecuting, setIsExecuting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ══════════════════════════════════════════════════════════════════════════
  // STEP: Approve Token for Spender
  // ══════════════════════════════════════════════════════════════════════════
  const approveTokenIfNeeded = useCallback(async (
    tokenAddress: Address,
    spenderAddress: Address,
    amount: bigint,
    tokenSymbol: string,
    targetChainId: number
  ): Promise<void> => {
    setStatus(`Checking ${tokenSymbol} approval...`);
    
    const currentAllowance = await checkAllowance(
      tokenAddress,
      address as Address,
      spenderAddress,
      targetChainId
    );

    if (currentAllowance >= amount) {
      return; // Already approved
    }

    setStatus(`Approving ${tokenSymbol}...`);
    
    // Approve max amount so users don't need to re-approve for future deposits
    const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    
    const approveHash = await writeContractAsync({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [spenderAddress, MAX_UINT256],
      chainId: targetChainId,
    });

    setStatus(`Waiting for approval confirmation...`);
    await waitForTransactionConfirmation(approveHash, targetChainId);

    // Verify approval propagated
    setStatus(`Verifying approval...`);
    let verified = false;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const newAllowance = await checkAllowance(
        tokenAddress,
        address as Address,
        spenderAddress,
        targetChainId
      );
      if (newAllowance >= amount) {
        verified = true;
        break;
      }
    }

    if (!verified) {
      throw new Error("Approval confirmed but not detected on-chain. Please try again.");
    }

    setStatus(`✓ Approval verified!`);
    await new Promise(r => setTimeout(r, 500));
  }, [address, writeContractAsync]);

  // ══════════════════════════════════════════════════════════════════════════
  // STEP: Execute Aori Cross-Chain Swap
  // ══════════════════════════════════════════════════════════════════════════
  const executeAoriSwap = useCallback(async (
    quote: QuoteResponse,
    sourceToken: DepositToken,
    inputAmount: string
  ): Promise<bigint> => {
    if (!walletClient || !address || !aoriChains) {
      throw new Error("Missing required data for swap");
    }

    const sourceChainId = sourceToken.chainId;
    const sourceChain = chainKeyToLabel(sourceToken.chainKey);
    const destChain = chainKeyToLabel(GMX_CHAIN_KEY);
    const inputTokenAddress = sourceToken.address as Address;
    const isNativeInput = checkNativeToken(inputTokenAddress);

    // Ensure we're on the source chain
    if (chainId !== sourceChainId) {
      setStatus(`Switching to ${sourceChain}...`);
      await switchChainAsync?.({ chainId: sourceChainId });
    }

    // Get Aori contract address for this chain
    const chainInfo = aoriChains.find((c) => c.chainId === sourceChainId);
    if (!chainInfo?.address) {
      throw new Error(`Aori contract not found for chain ${sourceChainId}`);
    }
    const aoriContract = chainInfo.address as Address;
    const swapAmount = parseUnits(inputAmount, sourceToken.decimals);

    // Step: Approve source token for Aori (if ERC20)
    if (!isNativeInput) {
      await approveTokenIfNeeded(
        inputTokenAddress,
        aoriContract,
        swapAmount,
        sourceToken.symbol,
        sourceChainId
      );
    }

    // Step: Submit swap order
    if (isNativeInput) {
      // Native token swap - submit and execute transaction
      setStatus(`Submitting swap...`);
      const swapRes = await submitSwap(
        { orderHash: quote.orderHash, signature: "" },
        "https://api.aori.io"
      );

      if ('to' in swapRes && 'data' in swapRes && 'value' in swapRes) {
        setStatus(`Executing swap transaction...`);
        const txHash = await walletClient.sendTransaction({
          to: swapRes.to as Address,
          data: swapRes.data as `0x${string}`,
          value: BigInt(swapRes.value),
          chain: walletClient.chain,
        });
        await waitForTransactionConfirmation(txHash, sourceChainId);
      }
    } else {
      // ERC20 swap - sign typed data and submit
      setStatus(`Sign the swap order...`);
      const signerAdapter = {
        signTypedData: async (params: unknown) => {
          return await walletClient.signTypedData(
            params as Parameters<typeof walletClient.signTypedData>[0]
          );
        },
      };
      const { orderHash, signature } = await signReadableOrder(quote, signerAdapter, address);

      setStatus(`Submitting swap to Aori...`);
      await submitSwap({ orderHash, signature }, "https://api.aori.io");
    }

    // Step: Wait for output token to arrive on Arbitrum
    setStatus(`⏳ Waiting for tokens to arrive on ${destChain}...`);

    const outputTokenAddress = quote.outputToken as Address;
    const initialBalance = await fetchTokenBalance(
      outputTokenAddress,
      address as Address,
      GMX_CHAIN_ID
    );

    const result = await pollForBalanceIncrease(
      outputTokenAddress,
      address as Address,
      GMX_CHAIN_ID,
      initialBalance,
      (msg) => setStatus(msg)
    );

    if (!result.success) {
      throw new Error("Swap timed out. Check Aoriscan for order status.");
    }

    return result.receivedAmount;
  }, [walletClient, address, chainId, aoriChains, switchChainAsync, approveTokenIfNeeded]);

  // ══════════════════════════════════════════════════════════════════════════
  // STEP: Execute GMX Deposit
  // ══════════════════════════════════════════════════════════════════════════
  const executeGmxDeposit = useCallback(async (
    tokenAddress: string,
    tokenSymbol: string,
    amount: bigint
  ): Promise<void> => {
    if (!address || !walletClient) {
      throw new Error("Wallet not connected");
    }

    // Ensure we're on Arbitrum
    if (chainId !== GMX_CHAIN_ID) {
      setStatus(`Switching to Arbitrum...`);
      await switchChainAsync?.({ chainId: GMX_CHAIN_ID });
    }

    const isNative = isGmxNativeToken(tokenAddress);

    // Approve for GMX SyntheticsRouter (if ERC20)
    // Note: MultichainTransferRouter uses SyntheticsRouter to pull tokens
    if (!isNative) {
      await approveTokenIfNeeded(
        tokenAddress as Address,
        GMX_SYNTHETICS_ROUTER,
        amount,
        tokenSymbol,
        GMX_CHAIN_ID
      );
    }

    // Get initial GMX balance before deposit
    const initialBalance = await fetchGmxAccountBalanceWithPrices(address as Address, tokenPriceMap);
    const initialTotalUsd = initialBalance.totalUsd;

    const amountFormatted = formatUnits(amount, isNative ? 18 : 6); // Simplified for demo
    setStatus(`Depositing ${amountFormatted} ${tokenSymbol} to GMX...`);

    // Build multicall data for GMX deposit
    const { calldata, value } = buildGmxDepositCalldata(tokenAddress, amount, address as Address);

    // Execute deposit transaction
    const txHash = await walletClient.sendTransaction({
      to: GMX_MULTICHAIN_TRANSFER_ROUTER,
      data: calldata,
      value,
      chain: getChainById(GMX_CHAIN_ID),
    });

    setStatus(`Waiting for deposit confirmation...`);
    await waitForTransactionConfirmation(txHash, GMX_CHAIN_ID);

    // Poll for GMX balance increase
    setStatus(`Confirming deposit...`);
    
    const POLL_INTERVAL_MS = 1000;
    const MAX_ATTEMPTS = 30; // 30 seconds timeout
    
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const currentBalance = await fetchGmxAccountBalanceWithPrices(address as Address, tokenPriceMap);
      
      if (currentBalance.totalUsd > initialTotalUsd) {
        const increase = currentBalance.totalUsd - initialTotalUsd;
        setStatus(`✅ Success! $${increase.toFixed(2)} deposited to your GMX Account.`);
        return;
      }
      
      // Keep showing "Confirming deposit..." without the counter for cleaner UX
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }

    // Transaction confirmed but balance not updated yet - still consider success
    setStatus(`✅ Deposit confirmed! ${amountFormatted} ${tokenSymbol} sent to GMX Account.`);
  }, [address, walletClient, chainId, switchChainAsync, approveTokenIfNeeded, tokenPriceMap]);

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN ENTRY POINT: Execute Deposit
  // ══════════════════════════════════════════════════════════════════════════
  const executeDeposit = useCallback(async (
    sourceToken: DepositToken,
    outputToken: DepositToken,
    inputAmount: string,
    quote: QuoteResponse | null,
    needsSwap: boolean
  ): Promise<void> => {
    if (!walletClient || !address) {
      throw new Error("Wallet not connected");
    }

    setError(null);
    setStatus(null);
    setIsExecuting(true);

    try {
      if (needsSwap) {
        // ════════════════════════════════════════════════════════════════════
        // CROSS-CHAIN FLOW: Swap via Aori → Deposit to GMX
        // ════════════════════════════════════════════════════════════════════
        if (!quote) {
          throw new Error("Quote required for cross-chain deposit");
        }

        // Execute cross-chain swap and get received amount
        const receivedAmount = await executeAoriSwap(quote, sourceToken, inputAmount);
        
        const receivedFormatted = formatUnits(receivedAmount, outputToken.decimals);
        setStatus(`✓ Received ${receivedFormatted} ${outputToken.symbol}. Depositing to GMX...`);

        // Deposit received tokens to GMX
        await executeGmxDeposit(
          outputToken.address,
          outputToken.symbol,
          receivedAmount
        );
      } else {
        // ════════════════════════════════════════════════════════════════════
        // SAME-CHAIN FLOW: Direct deposit to GMX (already on Arbitrum)
        // ════════════════════════════════════════════════════════════════════
        const depositAmount = parseUnits(inputAmount, sourceToken.decimals);
        
        await executeGmxDeposit(
          sourceToken.address,
          sourceToken.symbol,
          depositAmount
        );
      }

      // Wait 5 seconds to let user see success message before resetting form
      await new Promise(r => setTimeout(r, 5000));
      setStatus(null); // Clear status before resetting form
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      setError(message);
      throw err;
    } finally {
      setIsExecuting(false);
    }
  }, [walletClient, address, executeAoriSwap, executeGmxDeposit, onSuccess]);

  // ══════════════════════════════════════════════════════════════════════════
  // QUOTE FETCHING
  // ══════════════════════════════════════════════════════════════════════════
  const fetchSwapQuote = useCallback(async (
    sourceToken: DepositToken,
    outputToken: DepositToken,
    inputAmount: string
  ): Promise<QuoteResponse> => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    const inputAmountParsed = parseUnits(inputAmount, sourceToken.decimals).toString();

    return await getQuote({
      offerer: address,
      recipient: address,
      inputToken: sourceToken.address,
      outputToken: outputToken.address,
      inputAmount: inputAmountParsed,
      inputChain: sourceToken.chainKey,
      outputChain: GMX_CHAIN_KEY,
    });
  }, [address]);

  return {
    // State
    isExecuting,
    status,
    error,
    
    // Actions
    executeDeposit,
    fetchSwapQuote,
    
    // Utilities
    setError,
    setStatus,
  };
}
