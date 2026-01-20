"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { chainKeyToLabel, GMX_CHAIN_KEY } from "@/lib/chains";
import { DEFAULT_OUTPUT_TOKEN } from "@/lib/tokens";
import { formatUsd } from "@/lib/gmx-balance";
import type { SwappableSource } from "./AssetSelection";
import type { QuoteResponse } from "@aori/aori-ts";

type DepositFormProps = {
  // Connection state
  isConnected: boolean;
  loadingBalances: boolean;

  // Selected token
  selectedSource: SwappableSource | undefined;
  onOpenTokenSelect: () => void;

  // Input state
  inputAmount: string;
  setInputAmount: (value: string) => void;
  inputUsdValue: number | null;

  // Quote state
  quoteLoading: boolean;
  quote: QuoteResponse | null;
  setQuote: (quote: QuoteResponse | null) => void;
  needsSwap: boolean;

  // Fee estimates
  depositFee: number | null;
  txFeeEstimate: number | null;

  // GMX balance
  gmxBalanceLoading: boolean;
  currentGmxBalanceUsd: number;
  nextGmxBalanceUsd: number | null;

  // Execution state
  error: string | null;
  status: string | null;
  isExecuting: boolean;
  isPending: boolean;
  step: "input" | "preview" | "executing";
  setStep: (step: "input" | "preview" | "executing") => void;

  // Actions
  handleDeposit: () => void;
};

export function DepositForm({
  isConnected,
  loadingBalances,
  selectedSource,
  onOpenTokenSelect,
  inputAmount,
  setInputAmount,
  inputUsdValue,
  quoteLoading,
  quote,
  setQuote,
  needsSwap,
  depositFee,
  txFeeEstimate,
  gmxBalanceLoading,
  currentGmxBalanceUsd,
  nextGmxBalanceUsd,
  error,
  status,
  isExecuting,
  isPending,
  step,
  setStep,
  handleDeposit,
}: DepositFormProps) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-8">
      {/* Card Container */}
      <div className="rounded-2xl bg-[#1a1b23] p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="text-xl font-semibold text-white">Deposit to GMX Account</span>
          </div>
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
              const connected = mounted && account && chain;
              return (
                <button
                  onClick={connected ? openAccountModal : openConnectModal}
                  className="text-gray-400 hover:text-white transition"
                >
                  {connected ? (
                    <span className="text-sm font-medium">{account.displayName}</span>
                  ) : (
                    <span className="text-sm text-[#4f6ef7]">Connect</span>
                  )}
                </button>
              );
            }}
          </ConnectButton.Custom>
        </div>

        {/* Asset Selector - Click to open token selection */}
        <div className="mb-6">
          <label className="text-sm text-gray-400 mb-2 block">Asset</label>
          <button
            onClick={onOpenTokenSelect}
            disabled={isExecuting}
            className="w-full flex items-center justify-between rounded-lg bg-[#2a2b35] border border-[#3a3b45] px-4 py-3 transition hover:border-[#4f6ef7] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnected && loadingBalances ? (
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-[#4f6ef7]" />
                <span className="text-gray-400">Loading...</span>
              </div>
            ) : selectedSource ? (
              <div className="flex items-center gap-3">
                <div className="relative">
                  {selectedSource.icon ? (
                    <img
                      src={selectedSource.icon}
                      alt={selectedSource.symbol}
                      className="w-8 h-8 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center ${selectedSource.icon ? 'hidden' : ''}`}>
                    <span className="text-xs font-bold text-white">
                      {selectedSource.symbol.charAt(0)}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#627eea] border-2 border-[#2a2b35] flex items-center justify-center">
                    <span className="text-[6px] font-bold text-white">
                      {chainKeyToLabel(selectedSource.chainKey).charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-medium text-white">{selectedSource.symbol}</div>
                  <div className="text-xs text-gray-500">{chainKeyToLabel(selectedSource.chainKey)}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">U</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#28a0f0] border-2 border-[#2a2b35] flex items-center justify-center">
                    <span className="text-[6px] font-bold text-white">A</span>
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-medium text-white">{DEFAULT_OUTPUT_TOKEN.symbol}</div>
                  <div className="text-xs text-gray-500">{chainKeyToLabel(GMX_CHAIN_KEY)}</div>
                </div>
              </div>
            )}
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Deposit Amount */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-gray-400">Deposit</label>
            <span className="text-sm text-gray-400">
              Available: {selectedSource ? `${Number(selectedSource.formatted).toFixed(2)} ${selectedSource.symbol}` : "—"}
            </span>
          </div>
          <div className={`flex items-center rounded-lg bg-[#2a2b35] border px-4 py-3 transition ${
            inputAmount ? 'border-[#4f6ef7]' : 'border-[#3a3b45]'
          }`}>
            <input
              type="number"
              min="0"
              step="any"
              value={inputAmount}
              onChange={(e) => {
                setInputAmount(e.target.value);
                setQuote(null);
                setStep("input");
              }}
              className="flex-1 bg-transparent text-xl font-medium text-white outline-none placeholder:text-gray-600"
              placeholder="0"
              disabled={!isConnected || isExecuting || !selectedSource}
            />
            <div className="flex items-center gap-2 ">
              <span className="text-gray-400">{selectedSource?.symbol || "—"}</span>
              <button
                onClick={() => {
                  if (selectedSource) {
                    setInputAmount(selectedSource.formatted);
                    setQuote(null);
                    setStep("input");
                  }
                }}
                disabled={!isConnected || isExecuting || !selectedSource}
                className="px-3 py-1 rounded-md bg-[#3a3b45] text-sm text-white hover:bg-[#4a4b55] disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Max
              </button>
            </div>
          </div>
          {inputUsdValue && (
            <p className="mt-2 text-sm text-gray-500">${inputUsdValue.toFixed(2)}</p>
          )}
        </div>

        {/* Quote loading */}
        {quoteLoading && (
          <div className="flex items-center gap-2 mb-6 text-sm text-gray-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-[#4f6ef7]" />
            Getting best rate...
          </div>
        )}

        {/* Info Section */}
        <div className="space-y-3 mb-6 pt-4 border-t border-[#2a2b35]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Estimated Time</span>
            <span className="text-white">
              {needsSwap ? (quote ? `~${Math.round(quote.estimatedTime / 1000)}s` : "...") : "<10s"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Deposit Fee</span>
            <span className="text-white">
              {depositFee === null ? "..." : depositFee <= 0 ? "$0.00" : `-$${depositFee.toFixed(6).replace(/\.?0+$/, "")}`}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Network Fee</span>
            <span className="text-white">
              {txFeeEstimate === null ? "..." : `$${txFeeEstimate.toFixed(6).replace(/\.?0+$/, "")}`}
            </span>
          </div>

          {/* GMX Balance */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">GMX Balance</span>
            <span className="text-white">
              {gmxBalanceLoading ? (
                <span className="text-gray-500">Loading...</span>
              ) : nextGmxBalanceUsd !== null ? (
                <span className="inline-flex items-center gap-1">
                  <span className="text-gray-400">{formatUsd(currentGmxBalanceUsd)}</span>
                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-white">{formatUsd(nextGmxBalanceUsd)}</span>
                </span>
              ) : (
                formatUsd(currentGmxBalanceUsd)
              )}
            </span>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Status display */}
        {status && !error && (
          <div className="mb-4 rounded-lg bg-[#4f6ef7]/10 border border-[#4f6ef7]/30 p-3 text-sm text-[#4f6ef7]">
            {status}
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={handleDeposit}
          disabled={
            !isConnected ||
            !inputAmount ||
            !selectedSource ||
            isExecuting ||
            isPending ||
            (needsSwap && !quote && step !== "preview") ||
            quoteLoading
          }
          className="w-full rounded-lg bg-[#4f6ef7] py-4 text-lg font-semibold text-white transition hover:bg-[#5d7bf8] disabled:cursor-not-allowed disabled:bg-[#2a2b35] disabled:text-gray-500"
        >
          {isExecuting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Processing...
            </span>
          ) : !isConnected ? (
            "Connect Wallet"
          ) : !selectedSource ? (
            "Select an asset"
          ) : !inputAmount ? (
            "Enter amount"
          ) : needsSwap && !quote ? (
            "Getting quote..."
          ) : (
            `Deposit ${selectedSource.symbol}`
          )}
        </button>
      </div>
    </div>
  );
}
