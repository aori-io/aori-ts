export * from './types';
export * from './constants';
export * from './core';
export * from './helpers';

// Named exports for convenient access to native token utilities
export { NATIVE_TOKEN_ADDRESS } from './constants';
export { 
  isNativeToken, 
  isNativeDeposit, 
  executeNativeDeposit, 
  validateNativeDepositResponse, 
  constructNativeDepositTransaction,
  validateContractAddress,
  validateSufficientBalance,
  validateDepositNativeCalldata,
  handleNativeTokenError,
  isNativeSwapResponse,
  isERC20SwapResponse
} from './helpers';
