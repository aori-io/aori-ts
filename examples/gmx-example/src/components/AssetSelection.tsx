"use client";

import { chainKeyToLabel } from "@/lib/chains";

export type SwappableSource = {
  key: string;
  symbol: string;
  chainId: number;
  chainKey: string;
  address: string;
  balance: bigint;
  decimals: number;
  formatted: string;
  dollarValue?: number;
  icon?: string | null;
};

type AssetSelectionProps = {
  tokenSearch: string;
  setTokenSearch: (value: string) => void;
  networkFilter: string;
  setNetworkFilter: (value: string) => void;
  uniqueNetworks: string[];
  isConnected: boolean;
  loadingBalances: boolean;
  filteredTokens: SwappableSource[];
  selectedToken: string;
  handleTokenSelect: (token: SwappableSource) => void;
  onClose: () => void;
};

export function AssetSelection({
  tokenSearch,
  setTokenSearch,
  networkFilter,
  setNetworkFilter,
  uniqueNetworks,
  isConnected,
  loadingBalances,
  filteredTokens,
  selectedToken,
  handleTokenSelect,
  onClose,
}: AssetSelectionProps) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-8">
      <div className="rounded-2xl bg-[#1a1b23] p-6 flex flex-col h-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xl font-semibold text-white">Select Asset to Deposit</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="flex items-center gap-2 rounded-lg bg-[#2a2b35] border border-[#3a3b45] px-4 py-3">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={tokenSearch}
              onChange={(e) => setTokenSearch(e.target.value)}
              placeholder="Search"
              className="flex-1 bg-transparent text-white outline-none placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Network Filter Tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setNetworkFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              networkFilter === "all"
                ? "bg-[#2a2b35] text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            All Networks
          </button>
          {uniqueNetworks.map((network) => (
            <button
              key={network}
              onClick={() => setNetworkFilter(network)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                networkFilter === network
                  ? "bg-[#2a2b35] text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-[#627eea] flex items-center justify-center">
                <span className="text-[8px] font-bold text-white">
                  {chainKeyToLabel(network).charAt(0)}
                </span>
              </div>
              {chainKeyToLabel(network)}
            </button>
          ))}
        </div>

        {/* Token List */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {isConnected && loadingBalances ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-[#4f6ef7]" />
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tokens found
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTokens.map((token) => (
                <button
                  key={token.key}
                  onClick={() => handleTokenSelect(token)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition hover:bg-[#2a2b35] ${
                    selectedToken === token.key ? "bg-[#2a2b35]" : ""
                  }`}
                >
                  {/* Token Icon */}
                  <div className="relative">
                    {token.icon ? (
                      <img
                        src={token.icon}
                        alt={token.symbol}
                        className="w-10 h-10 rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center ${token.icon ? 'hidden' : ''}`}>
                      <span className="text-sm font-bold text-white">
                        {token.symbol.charAt(0)}
                      </span>
                    </div>
                    {/* Chain Badge */}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#627eea] border-2 border-[#1a1b23] flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white">
                        {chainKeyToLabel(token.chainKey).charAt(0)}
                      </span>
                    </div>
                  </div>

                  {/* Token Info */}
                  <div className="flex-1 text-left">
                    <div className="font-medium text-white">{token.symbol}</div>
                    <div className="text-sm text-gray-500">{chainKeyToLabel(token.chainKey)}</div>
                  </div>

                  {/* Balance */}
                  <div className="text-right">
                    {token.balance > 0n ? (
                      <>
                        <div className="font-medium text-white">
                          {Number(token.formatted).toFixed(token.decimals === 6 ? 2 : 5)}
                        </div>
                        {token.dollarValue && token.dollarValue > 0 && (
                          <div className="text-sm text-gray-500">
                            ${token.dollarValue.toFixed(2)}
                          </div>
                        )}
                      </>
                    ) : isConnected ? (
                      <div className="text-sm text-gray-600">0</div>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
