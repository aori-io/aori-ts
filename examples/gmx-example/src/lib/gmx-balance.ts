import { createPublicClient, http, encodeAbiParameters, keccak256, type Address } from "viem";
import { arbitrum } from "viem/chains";

// GMX DataStore contract on Arbitrum
const GMX_DATA_STORE_ADDRESS = "0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8" as const;

// DataStore ABI (only what we need for getUint)
const DataStoreABI = [
  {
    inputs: [{ name: "key", type: "bytes32" }],
    name: "getUint",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Hash function for DataStore keys
function hashData(dataTypes: string[], dataValues: (string | bigint)[]): `0x${string}` {
  const abiParameters = dataTypes.map((type) => ({ type }));
  const bytes = encodeAbiParameters(abiParameters, dataValues);
  return keccak256(bytes);
}

function hashString(str: string): `0x${string}` {
  return hashData(["string"], [str]);
}

// GMX key constants
const MULTICHAIN_BALANCE = hashString("MULTICHAIN_BALANCE");

// Generate the balance key for a given account and token
function multichainBalanceKey(account: string, token: string): `0x${string}` {
  return hashData(["bytes32", "address", "address"], [MULTICHAIN_BALANCE, account, token]);
}

// Supported GMX deposit tokens on Arbitrum
const GMX_SUPPORTED_TOKENS: { address: Address; symbol: string; decimals: number }[] = [
  {
    address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
    symbol: "WETH",
    decimals: 18,
  },
  {
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
    symbol: "USDC",
    decimals: 6,
  },
  {
    address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USDT
    symbol: "USDT",
    decimals: 6,
  },
];

interface TokenBalance {
  address: Address;
  symbol: string;
  decimals: number;
  balance: bigint;
  balanceFormatted: string;
  priceUsd: number;
  balanceUsd: number;
}

// Fetch GMX account balances for an account
async function fetchGmxAccountBalances(account: Address): Promise<TokenBalance[]> {
  const client = createPublicClient({
    chain: arbitrum,
    transport: http(),
  });

  // Fetch balances for all supported tokens
  const balancePromises = GMX_SUPPORTED_TOKENS.map(async (token) => {
    const key = multichainBalanceKey(account, token.address);
    
    try {
      const balance = await client.readContract({
        address: GMX_DATA_STORE_ADDRESS,
        abi: DataStoreABI,
        functionName: "getUint",
        args: [key],
      });

      const balanceFormatted = (Number(balance) / 10 ** token.decimals).toString();

      return {
        address: token.address,
        symbol: token.symbol,
        decimals: token.decimals,
        balance,
        balanceFormatted,
        priceUsd: 0, // Will be filled in with prices
        balanceUsd: 0,
      };
    } catch (err) {
      console.error(`Failed to fetch balance for ${token.symbol}:`, err);
      return {
        address: token.address,
        symbol: token.symbol,
        decimals: token.decimals,
        balance: 0n,
        balanceFormatted: "0",
        priceUsd: 0,
        balanceUsd: 0,
      };
    }
  });

  return Promise.all(balancePromises);
}

// Calculate GMX balance with provided prices (from Aori API)
export async function fetchGmxAccountBalanceWithPrices(
  account: Address,
  priceMap?: Map<string, number>
): Promise<{
  tokenBalances: TokenBalance[];
  totalUsd: number;
}> {
  const balances = await fetchGmxAccountBalances(account);

  let totalUsd = 0;
  
  const tokenBalances = balances.map((balance) => {
    // Get price from provided map, or use fallback
    const priceUsd = priceMap?.get(balance.address.toLowerCase()) ?? 
                     priceMap?.get(balance.symbol.toUpperCase()) ??
                     getFallbackPrice(balance.symbol);
    const balanceNum = Number(balance.balance) / 10 ** balance.decimals;
    const balanceUsd = balanceNum * priceUsd;
    totalUsd += balanceUsd;

    return {
      ...balance,
      priceUsd,
      balanceUsd,
    };
  });

  return {
    tokenBalances,
    totalUsd,
  };
}

// Simple fallback prices for when Aori prices aren't available
function getFallbackPrice(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s.includes('USD') || s === 'USDT' || s === 'USDC') return 1;
  if (s === 'ETH' || s === 'WETH') return 3500;
  return 0;
}

// Format USD value
export function formatUsd(value: number | undefined): string {
  if (value === undefined || isNaN(value)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
