// Token type with metadata from Aori API
export type Token = {
  symbol: string;
  name?: string;
  address: string;
  chainId: number;
  chainKey: string;
  decimals?: number;
  price?: number;
  icon?: string | null;
};

// Allowed tokens configuration (replaces tokens.json)
export const ALLOWED_TOKENS: Record<string, TokenConfig[]> = {
  "1": [
    { symbol: "ETH", address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18, logo_uri: "https://cryptologos.cc/logos/ethereum-eth-logo.svg" },
    { symbol: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18, logo_uri: "https://cryptologos.cc/logos/ethereum-eth-logo.svg" },
    { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, logo_uri: "https://token-media.defined.fi/42161_0xaf88d065e77c8cc2239327c5edb3a432268e5831_large.png" },
    { symbol: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, logo_uri: "https://docs.usdt0.to/~gitbook/image?url=https%3A%2F%2F2344189142-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FHytE5q346VLLbrVSUNpY%252Fuploads%252FGbQORpmUVLWNsJ7ksM7b%252FLogo%2520USDT0%2520Png%2520512x512.png%3Falt%3Dmedia%26token%3D4c4f40e2-ade3-4f89-9443-cda9fe9b65a9&width=768&dpr=2&quality=100&sign=d78a4720&sv=2" },
  ],
  "10": [
    { symbol: "ETH", address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18, logo_uri: "https://cryptologos.cc/logos/ethereum-eth-logo.svg" },
    { symbol: "WETH", address: "0x4200000000000000000000000000000000000006", decimals: 18, logo_uri: "https://cryptologos.cc/logos/ethereum-eth-logo.svg" },
    { symbol: "USDC", address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6, logo_uri: "https://token-media.defined.fi/42161_0xaf88d065e77c8cc2239327c5edb3a432268e5831_large.png" },
    { symbol: "USDT", address: "0x01bFF41798a0BcF287b996046Ca68b395DbC1071", decimals: 6, logo_uri: "https://docs.usdt0.to/~gitbook/image?url=https%3A%2F%2F2344189142-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FHytE5q346VLLbrVSUNpY%252Fuploads%252FGbQORpmUVLWNsJ7ksM7b%252FLogo%2520USDT0%2520Png%2520512x512.png%3Falt%3Dmedia%26token%3D4c4f40e2-ade3-4f89-9443-cda9fe9b65a9&width=768&dpr=2&quality=100&sign=d78a4720&sv=2" },
  ],
  "42161": [
    { symbol: "ETH", address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18, logo_uri: "https://cryptologos.cc/logos/ethereum-eth-logo.svg" },
    { symbol: "WETH", address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", decimals: 18, logo_uri: "https://cryptologos.cc/logos/ethereum-eth-logo.svg" },
    { symbol: "USDC", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6, logo_uri: "https://token-media.defined.fi/42161_0xaf88d065e77c8cc2239327c5edb3a432268e5831_large.png" },
    { symbol: "USDT", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6, logo_uri: "https://docs.usdt0.to/~gitbook/image?url=https%3A%2F%2F2344189142-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FHytE5q346VLLbrVSUNpY%252Fuploads%252FGbQORpmUVLWNsJ7ksM7b%252FLogo%2520USDT0%2520Png%2520512x512.png%3Falt%3Dmedia%26token%3D4c4f40e2-ade3-4f89-9443-cda9fe9b65a9&width=768&dpr=2&quality=100&sign=d78a4720&sv=2" },
  ],
  "8453": [
    { symbol: "ETH", address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18, logo_uri: "https://cryptologos.cc/logos/ethereum-eth-logo.svg" },
    { symbol: "WETH", address: "0x4200000000000000000000000000000000000006", decimals: 18, logo_uri: "https://cryptologos.cc/logos/ethereum-eth-logo.svg" },
    { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6, logo_uri: "https://token-media.defined.fi/42161_0xaf88d065e77c8cc2239327c5edb3a432268e5831_large.png" },
    { symbol: "USDT", address: "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2", decimals: 6, logo_uri: "https://docs.usdt0.to/~gitbook/image?url=https%3A%2F%2F2344189142-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FHytE5q346VLLbrVSUNpY%252Fuploads%252FGbQORpmUVLWNsJ7ksM7b%252FLogo%2520USDT0%2520Png%2520512x512.png%3Falt%3Dmedia%26token%3D4c4f40e2-ade3-4f89-9443-cda9fe9b65a9&width=768&dpr=2&quality=100&sign=d78a4720&sv=2" },
  ],
  "56": [
    { symbol: "WETH", address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", decimals: 18, logo_uri: "https://cryptologos.cc/logos/ethereum-eth-logo.svg" },
    { symbol: "USDC", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18, logo_uri: "https://token-media.defined.fi/42161_0xaf88d065e77c8cc2239327c5edb3a432268e5831_large.png" },
    { symbol: "USDT", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18, logo_uri: "https://docs.usdt0.to/~gitbook/image?url=https%3A%2F%2F2344189142-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FHytE5q346VLLbrVSUNpY%252Fuploads%252FGbQORpmUVLWNsJ7ksM7b%252FLogo%2520USDT0%2520Png%2520512x512.png%3Falt%3Dmedia%26token%3D4c4f40e2-ade3-4f89-9443-cda9fe9b65a9&width=768&dpr=2&quality=100&sign=d78a4720&sv=2" },
  ],
};

export type TokenConfig = {
  symbol: string;
  address: string;
  decimals: number;
  logo_uri?: string;
};

// Build allowed tokens lookup map (chainId:address -> config)
export const ALLOWED_TOKENS_MAP = new Map<string, TokenConfig>();
for (const [chainId, tokens] of Object.entries(ALLOWED_TOKENS)) {
  for (const token of tokens) {
    const key = `${chainId}:${token.address.toLowerCase()}`;
    ALLOWED_TOKENS_MAP.set(key, token);
  }
}

// Aori API URL for fetching tokens with metadata
export const AORI_TOKENS_URL = "https://api.aori.io/tokens?metadata=true";

// Output token config for Arbitrum (includes chain info for deposit flow)
export type OutputTokenConfig = TokenConfig & {
  chainId: number;
  chainKey: string;
};

// Arbitrum output tokens for GMX deposits (keyed by input symbol)
// All output tokens are on Arbitrum (chainId: 42161)
export const ARBITRUM_OUTPUT_TOKENS: Record<string, OutputTokenConfig> = {
  ETH: { symbol: "WETH", address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", decimals: 18, chainId: 42161, chainKey: "arbitrum" },
  WETH: { symbol: "WETH", address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", decimals: 18, chainId: 42161, chainKey: "arbitrum" },
  USDC: { symbol: "USDC", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6, chainId: 42161, chainKey: "arbitrum" },
  USDT: { symbol: "USDT", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6, chainId: 42161, chainKey: "arbitrum" },
  USDT0: { symbol: "USDT", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6, chainId: 42161, chainKey: "arbitrum" },
};

export const DEFAULT_OUTPUT_TOKEN = ARBITRUM_OUTPUT_TOKENS.USDC;

// Get the output token for a given input symbol (for cross-chain swaps to Arbitrum)
export function getOutputToken(inputSymbol: string): TokenConfig {
  const key = inputSymbol.toUpperCase();
  return ARBITRUM_OUTPUT_TOKENS[key] ?? DEFAULT_OUTPUT_TOKEN;
}

// Check if a token address is allowed
export function isAllowedToken(chainId: number, address: string): boolean {
  const key = `${chainId}:${address.toLowerCase()}`;
  return ALLOWED_TOKENS_MAP.has(key);
}

// Get token config from allowed list
export function getAllowedTokenConfig(chainId: number, address: string): TokenConfig | undefined {
  const key = `${chainId}:${address.toLowerCase()}`;
  return ALLOWED_TOKENS_MAP.get(key);
}
