import { encodeFunctionData, type Address } from "viem";

// GMX Arbitrum Contract Addresses
export const GMX_MULTICHAIN_TRANSFER_ROUTER = "0xfaBEb65bB877600be3A2C2a03aA56a95F9f845B9" as const;
export const GMX_SYNTHETICS_ROUTER = "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6" as const; // Approval spender for same-chain deposits

// Internal constants
const GMX_MULTICHAIN_VAULT = "0xCeaadFAf6A8C489B250e407987877c5fDfcDBE6E" as const;
const WETH_ARBITRUM = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as const;
const NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as const;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// MultichainTransferRouter ABI (minimal subset needed for deposits)
const MultichainTransferRouterABI = [
  {
    name: "multicall",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "data", type: "bytes[]" }],
    outputs: [{ name: "results", type: "bytes[]" }],
  },
  {
    name: "sendWnt",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "receiver", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "sendTokens",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "token", type: "address" },
      { name: "receiver", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "bridgeIn",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "account", type: "address" },
      { name: "token", type: "address" },
    ],
    outputs: [],
  },
] as const;

/**
 * Checks if a token address represents native ETH
 */
export function isNativeToken(tokenAddress: string): boolean {
  const addr = tokenAddress.toLowerCase();
  return (
    addr === NATIVE_TOKEN_ADDRESS.toLowerCase() ||
    addr === ZERO_ADDRESS.toLowerCase()
  );
}

/**
 * Builds the multicall data for a native ETH deposit to GMX
 * This wraps ETH and bridges it into the GMX account
 */
function buildNativeDepositCalldata(amount: bigint, account: Address): `0x${string}` {
  const sendWntData = encodeFunctionData({
    abi: MultichainTransferRouterABI,
    functionName: "sendWnt",
    args: [GMX_MULTICHAIN_VAULT, amount],
  });

  const bridgeInData = encodeFunctionData({
    abi: MultichainTransferRouterABI,
    functionName: "bridgeIn",
    args: [account, WETH_ARBITRUM],
  });

  return encodeFunctionData({
    abi: MultichainTransferRouterABI,
    functionName: "multicall",
    args: [[sendWntData, bridgeInData]],
  });
}

/**
 * Builds the multicall data for an ERC20 token deposit to GMX
 * This sends tokens to the vault and bridges them into the GMX account
 */
function buildTokenDepositCalldata(
  tokenAddress: Address,
  amount: bigint,
  account: Address
): `0x${string}` {
  const sendTokensData = encodeFunctionData({
    abi: MultichainTransferRouterABI,
    functionName: "sendTokens",
    args: [tokenAddress, GMX_MULTICHAIN_VAULT, amount],
  });

  const bridgeInData = encodeFunctionData({
    abi: MultichainTransferRouterABI,
    functionName: "bridgeIn",
    args: [account, tokenAddress],
  });

  return encodeFunctionData({
    abi: MultichainTransferRouterABI,
    functionName: "multicall",
    args: [[sendTokensData, bridgeInData]],
  });
}

/**
 * Returns the appropriate calldata for a GMX deposit based on token type
 */
export function buildGmxDepositCalldata(
  tokenAddress: string,
  amount: bigint,
  account: Address
): { calldata: `0x${string}`; value: bigint } {
  if (isNativeToken(tokenAddress)) {
    return {
      calldata: buildNativeDepositCalldata(amount, account),
      value: amount, // Native ETH is sent as msg.value
    };
  } else {
    return {
      calldata: buildTokenDepositCalldata(tokenAddress as Address, amount, account),
      value: 0n, // No ETH value for ERC20 deposits
    };
  }
}
