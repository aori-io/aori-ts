"use client";

/**
 * GMX Cross-Chain Deposit Demo
 * 
 * This page demonstrates how to integrate cross-chain deposits into GMX using:
 * - Aori SDK for cross-chain token swaps
 * - GMX MultichainTransferRouter for deposits
 * 
 * The actual deposit flow logic is in `src/hooks/useDepositFlow.ts`
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { createPublicClient, http, formatUnits } from "viem";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { QuoteResponse } from "@aori/aori-ts";

// Lib imports
import { getChainById, GMX_CHAIN_ID } from "@/lib/chains";
import { fetchBalancesForAddress } from "@/lib/balances";
import { fetchGmxAccountBalanceWithPrices } from "@/lib/gmx-balance";
import {
  type Token,
  AORI_TOKENS_URL,
  ALLOWED_TOKENS_MAP,
  ARBITRUM_OUTPUT_TOKENS,
  DEFAULT_OUTPUT_TOKEN,
} from "@/lib/tokens";

// Components
import { AssetSelection, type SwappableSource } from "@/components/AssetSelection";
import { DepositForm } from "@/components/DepositForm";

// Hooks
import { useDepositFlow, type DepositToken } from "@/hooks/useDepositFlow";

// ============================================================================
// TYPES
// ============================================================================

type ViewState = "form" | "tokenSelect";
type DepositStep = "input" | "preview" | "executing";

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function Home() {
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const queryClient = useQueryClient();

  // ══════════════════════════════════════════════════════════════════════════
  // UI STATE
  // ══════════════════════════════════════════════════════════════════════════
  
  const [view, setView] = useState<ViewState>("form");
  const [step, setStep] = useState<DepositStep>("input");
  const [tokenSearch, setTokenSearch] = useState("");
  const [networkFilter, setNetworkFilter] = useState<string>("all");
  const [inputAmount, setInputAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState<string>(
    `${GMX_CHAIN_ID}:${DEFAULT_OUTPUT_TOKEN.address}`
  );

  // Quote state
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Fee estimate state
  const [txFeeEstimate, setTxFeeEstimate] = useState<number | null>(null);

  const hasInitialized = useRef(false);
  const quoteDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // ══════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ══════════════════════════════════════════════════════════════════════════

  // Fetch Aori tokens metadata
  const { data: rawTokens } = useQuery<Token[]>({
    queryKey: ["aoriTokens"],
    queryFn: async () => {
      const res = await fetch(AORI_TOKENS_URL);
      if (!res.ok) throw new Error("Unable to load Aori tokens");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  // Filter to only allowed tokens and apply our config
  const aoriTokens = useMemo(() => {
    if (!rawTokens) return undefined;
    
    return rawTokens
      .filter((token) => {
        const key = `${token.chainId}:${token.address.toLowerCase()}`;
        return ALLOWED_TOKENS_MAP.has(key);
      })
      .map((token) => {
        const key = `${token.chainId}:${token.address.toLowerCase()}`;
        const configToken = ALLOWED_TOKENS_MAP.get(key);
        if (configToken) {
          return {
            ...token,
            symbol: configToken.symbol,
            icon: configToken.logo_uri || token.icon,
          };
        }
        return token;
      });
  }, [rawTokens]);

  // Fetch Aori chain info (contract addresses)
  const { data: aoriChains } = useQuery({
    queryKey: ["aoriChains"],
    queryFn: async () => {
      const res = await fetch("https://api.aori.io/chains");
      return res.json() as Promise<Array<{ chainId: number; address: string; chainKey: string }>>;
    },
    staleTime: 1000 * 60 * 60,
  });

  // Fetch user's cross-chain balances
  const { data: crossChainBalances, isLoading: loadingBalances } = useQuery({
    queryKey: ["crossChainBalances", address, aoriTokens],
    enabled: !!address && !!aoriTokens,
    queryFn: async () => fetchBalancesForAddress(address as `0x${string}`, aoriTokens ?? []),
    staleTime: 30_000,
  });

  // Build token price map from Aori data
  const tokenPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!aoriTokens) return map;
    
    for (const token of aoriTokens) {
      if (token.price !== undefined && token.price > 0) {
        map.set(token.address.toLowerCase(), token.price);
        map.set(token.symbol.toUpperCase(), token.price);
      }
    }
    return map;
  }, [aoriTokens]);

  // Fetch GMX account balance
  const { data: gmxAccountBalance, isLoading: gmxBalanceLoading } = useQuery({
    queryKey: ["gmxAccountBalance", address, tokenPriceMap.size],
    enabled: !!address,
    queryFn: async () => fetchGmxAccountBalanceWithPrices(address as `0x${string}`, tokenPriceMap),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TOKEN SELECTION LOGIC
  // ══════════════════════════════════════════════════════════════════════════

  const getFallbackPrice = useCallback((symbol: string): number => {
    const s = symbol.toUpperCase();
    if (s.includes('USD') || s === 'USDT' || s === 'USDC' || s === 'USDT0') return 1;
    if (s === 'ETH' || s === 'WETH') return 3500;
    return 0;
  }, []);

  // Build list of tokens with balances
  const MIN_BALANCE_THRESHOLD = 0.00001;
  const nonZeroBalances = useMemo(
    () => (crossChainBalances ?? []).filter((b) => {
      const num = Number(b.formatted);
      return Number.isFinite(num) && num >= MIN_BALANCE_THRESHOLD;
    }),
    [crossChainBalances]
  );

  const swappableSources = useMemo(() => {
    const sources: SwappableSource[] = [];

    for (const b of nonZeroBalances) {
      const price = b.token.price ?? tokenPriceMap.get(b.token.address.toLowerCase()) ?? getFallbackPrice(b.token.symbol);
      const dollarValue = Number(b.formatted) * price;

      sources.push({
        key: `${b.token.chainId}:${b.token.address}`,
        symbol: b.token.symbol,
        chainId: b.token.chainId,
        chainKey: b.token.chainKey,
        address: b.token.address,
        balance: b.value,
        decimals: b.decimals,
        formatted: b.formatted,
        dollarValue,
        icon: b.token.icon,
      });
    }

    sources.sort((a, b) => (b.dollarValue ?? 0) - (a.dollarValue ?? 0));
    return sources;
  }, [nonZeroBalances, tokenPriceMap, getFallbackPrice]);

  // All tokens for display (when not connected)
  const allTokensForDisplay = useMemo(() => {
    if (!aoriTokens) return [];
    
    const balanceMap = new Map<string, SwappableSource>();
    swappableSources.forEach((s) => balanceMap.set(s.key, s));

    return aoriTokens.map((token): SwappableSource => {
      const key = `${token.chainId}:${token.address}`;
      const existingBalance = balanceMap.get(key);
      
      if (existingBalance) return existingBalance;

      return {
        key,
        symbol: token.symbol,
        chainId: token.chainId,
        chainKey: token.chainKey,
        address: token.address,
        balance: 0n,
        decimals: token.decimals ?? 18,
        formatted: "0",
        dollarValue: 0,
        icon: token.icon,
      };
    });
  }, [aoriTokens, swappableSources]);

  const uniqueNetworks = useMemo(() => {
    const networks = new Set<string>();
    allTokensForDisplay.forEach((s) => networks.add(s.chainKey));
    return Array.from(networks);
  }, [allTokensForDisplay]);

  const filteredTokens = useMemo(() => {
    const tokensToFilter = isConnected ? swappableSources : allTokensForDisplay;
    
    return tokensToFilter.filter((source) => {
      const matchesSearch = tokenSearch === "" || 
        source.symbol.toLowerCase().includes(tokenSearch.toLowerCase());
      const matchesNetwork = networkFilter === "all" || source.chainKey === networkFilter;
      return matchesSearch && matchesNetwork;
    });
  }, [isConnected, swappableSources, allTokensForDisplay, tokenSearch, networkFilter]);

  // Auto-select default token
  const DEFAULT_TOKEN_KEY = `${GMX_CHAIN_ID}:${DEFAULT_OUTPUT_TOKEN.address}`;
  
  useEffect(() => {
    if (hasInitialized.current) return;
    if (swappableSources.length > 0) {
      const defaultToken = swappableSources.find(s => s.key === DEFAULT_TOKEN_KEY);
      setSelectedToken(defaultToken ? DEFAULT_TOKEN_KEY : swappableSources[0].key);
      hasInitialized.current = true;
    }
  }, [swappableSources.length, DEFAULT_TOKEN_KEY]);

  const selectedSource = swappableSources.find((s) => s.key === selectedToken);

  // Determine output token for swap
  const outputToken = useMemo(() => {
    if (!selectedSource) return DEFAULT_OUTPUT_TOKEN;
    const symbolKey = selectedSource.symbol.toUpperCase();
    return ARBITRUM_OUTPUT_TOKENS[symbolKey] || DEFAULT_OUTPUT_TOKEN;
  }, [selectedSource]);

  // Check if cross-chain swap is needed
  const needsSwap = useMemo(() => {
    if (!selectedSource) return true;
    return selectedSource.chainId !== GMX_CHAIN_ID;
  }, [selectedSource]);

  // ══════════════════════════════════════════════════════════════════════════
  // DEPOSIT FLOW HOOK
  // ══════════════════════════════════════════════════════════════════════════

  const {
    isExecuting,
    status,
    error,
    executeDeposit,
    fetchSwapQuote,
    setError,
  } = useDepositFlow(aoriChains, tokenPriceMap, () => {
    // On success callback
    setInputAmount("");
    setQuote(null);
    setStep("input");
    queryClient.invalidateQueries({ queryKey: ["crossChainBalances"] });
    queryClient.invalidateQueries({ queryKey: ["gmxAccountBalance"] });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // QUOTE MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════

  const fetchQuote = useCallback(async () => {
    if (!address || !inputAmount || !selectedSource || isExecuting) return;
    if (selectedSource.chainId === GMX_CHAIN_ID) return; // No quote needed

    setQuoteLoading(true);
    setError(null);

    try {
      const sourceToken: DepositToken = {
        address: selectedSource.address,
        symbol: selectedSource.symbol,
        decimals: selectedSource.decimals,
        chainId: selectedSource.chainId,
        chainKey: selectedSource.chainKey,
      };

      const quoteResponse = await fetchSwapQuote(sourceToken, outputToken, inputAmount);
      setQuote(quoteResponse);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get quote");
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [address, inputAmount, selectedSource, isExecuting, outputToken, fetchSwapQuote, setError]);

  // Debounce quote requests
  useEffect(() => {
    if (!inputAmount || !selectedToken || isExecuting) return;

    if (quoteDebounceRef.current) {
      clearTimeout(quoteDebounceRef.current);
    }

    if (!needsSwap && inputAmount) {
      setStep("preview");
      return;
    }

    quoteDebounceRef.current = setTimeout(() => fetchQuote(), 500);

    return () => {
      if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);
    };
  }, [fetchQuote, inputAmount, selectedToken, isExecuting, needsSwap]);

  // Auto-refresh quote before expiry
  useEffect(() => {
    if (!quote || isExecuting || !needsSwap) return;

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = (quote.endTime - now) * 1000;
    const refreshIn = Math.max(timeUntilExpiry - 1000, 1000);

    const id = setTimeout(() => fetchQuote(), refreshIn);
    return () => clearTimeout(id);
  }, [quote, isExecuting, needsSwap, fetchQuote]);

  // ══════════════════════════════════════════════════════════════════════════
  // GAS FEE ESTIMATION
  // ══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const estimateTxFee = async () => {
      if (!selectedSource || !inputAmount || !address) {
        setTxFeeEstimate(null);
        return;
      }

      if (chainId !== selectedSource.chainId) {
        setTxFeeEstimate(null);
        return;
      }

      try {
        const chain = getChainById(selectedSource.chainId);
        if (!chain) return;

        const client = createPublicClient({ chain, transport: http() });
        const gasPrice = await client.getGasPrice();
        const estimatedGasUnits = needsSwap ? 150_000n : 300_000n;
        const gasCostWei = gasPrice * estimatedGasUnits;
        const gasCostEth = Number(formatUnits(gasCostWei, 18));

        const nativeSymbol = chain.nativeCurrency?.symbol?.toUpperCase() ?? "ETH";
        const nativePrice = tokenPriceMap.get(nativeSymbol) ?? tokenPriceMap.get("ETH") ?? 0;

        setTxFeeEstimate(gasCostEth * nativePrice);
      } catch {
        setTxFeeEstimate(null);
      }
    };

    estimateTxFee();
  }, [selectedSource, inputAmount, address, chainId, needsSwap, tokenPriceMap]);

  // ══════════════════════════════════════════════════════════════════════════
  // TOKEN SELECTION HANDLER
  // ══════════════════════════════════════════════════════════════════════════

  const handleTokenSelect = useCallback(async (token: SwappableSource) => {
    setSelectedToken(token.key);
    setQuote(null);
    setTxFeeEstimate(null);
    setStep("input");
    setView("form");
    setTokenSearch("");
    setNetworkFilter("all");

    if (isConnected && chainId !== token.chainId) {
      try {
        await switchChainAsync?.({ chainId: token.chainId });
      } catch (err) {
        console.error("Failed to switch chain:", err);
      }
    }
  }, [isConnected, chainId, switchChainAsync]);

  // ══════════════════════════════════════════════════════════════════════════
  // DEPOSIT HANDLER
  // ══════════════════════════════════════════════════════════════════════════

  const handleDeposit = async () => {
    if (!selectedSource) return;

    setStep("executing");

    const sourceToken: DepositToken = {
      address: selectedSource.address,
      symbol: selectedSource.symbol,
      decimals: selectedSource.decimals,
      chainId: selectedSource.chainId,
      chainKey: selectedSource.chainKey,
    };

    try {
      await executeDeposit(sourceToken, outputToken, inputAmount, quote, needsSwap);
    } catch {
      setStep("input");
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // FEE CALCULATIONS
  // ══════════════════════════════════════════════════════════════════════════

  const inputUsdValue = useMemo(() => {
    if (!inputAmount || !selectedSource) return null;
    const amount = Number(inputAmount);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return selectedSource.dollarValue 
      ? (amount / Number(selectedSource.formatted)) * selectedSource.dollarValue
      : null;
  }, [inputAmount, selectedSource]);

  const outputUsdValue = useMemo(() => {
    if (!quote || !needsSwap) return inputUsdValue;
    const outputAmount = Number(formatUnits(BigInt(quote.outputAmount), outputToken.decimals));
    const outputPrice = tokenPriceMap.get(outputToken.address.toLowerCase()) ?? 
                        tokenPriceMap.get(outputToken.symbol.toUpperCase());
    if (!outputPrice) return null;
    return outputAmount * outputPrice;
  }, [quote, needsSwap, outputToken, tokenPriceMap, inputUsdValue]);

  const depositFee = useMemo(() => {
    if (inputUsdValue === null || outputUsdValue === null) return null;
    return inputUsdValue - outputUsdValue;
  }, [inputUsdValue, outputUsdValue]);

  const currentGmxBalanceUsd = gmxAccountBalance?.totalUsd ?? 0;

  const nextGmxBalanceUsd = useMemo(() => {
    if (outputUsdValue === null) return null;
    const netDeposit = outputUsdValue - (txFeeEstimate ?? 0);
    return currentGmxBalanceUsd + netDeposit;
  }, [currentGmxBalanceUsd, outputUsdValue, txFeeEstimate]);

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  if (view === "tokenSelect") {
    return (
      <AssetSelection
        tokenSearch={tokenSearch}
        setTokenSearch={setTokenSearch}
        networkFilter={networkFilter}
        setNetworkFilter={setNetworkFilter}
        uniqueNetworks={uniqueNetworks}
        isConnected={isConnected}
        loadingBalances={loadingBalances}
        filteredTokens={filteredTokens}
        selectedToken={selectedToken}
        handleTokenSelect={handleTokenSelect}
        onClose={() => {
          setView("form");
          setTokenSearch("");
          setNetworkFilter("all");
        }}
      />
    );
  }

  return (
    <DepositForm
      isConnected={isConnected}
      loadingBalances={loadingBalances}
      selectedSource={selectedSource}
      onOpenTokenSelect={() => setView("tokenSelect")}
      inputAmount={inputAmount}
      setInputAmount={setInputAmount}
      inputUsdValue={inputUsdValue}
      quoteLoading={quoteLoading}
      quote={quote}
      setQuote={setQuote}
      needsSwap={needsSwap}
      depositFee={depositFee}
      txFeeEstimate={txFeeEstimate}
      gmxBalanceLoading={gmxBalanceLoading}
      currentGmxBalanceUsd={currentGmxBalanceUsd}
      nextGmxBalanceUsd={nextGmxBalanceUsd}
      error={error}
      status={status}
      isExecuting={isExecuting}
      isPending={false}
      step={step}
      setStep={setStep}
      handleDeposit={handleDeposit}
    />
  );
}
