'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi'
import { useAori } from '../providers/AoriProvider'
import type {
  QuoteRequest,
  QuoteResponse,
  ChainInfo,
  TokenInfo,
  SwapConfig,
  TxExecutor,
  TransactionRequest
} from '@aori/aori-ts'
import { type Address, erc20Abi, parseUnits, maxUint256 } from 'viem'
import { signTypedData, readContract, writeContract, waitForTransactionReceipt, sendTransaction, estimateGas } from 'viem/actions'

type SwapFormData = {
  inputChain: string
  outputChain: string
  inputToken: string
  outputToken: string
  inputAmount: string
}

type SwapStatus = 'idle' | 'getting-quote' | 'checking-approval' | 'approving' | 'signing' | 'submitting' | 'executing-native' | 'completed' | 'error'

export function SwapForm() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChain } = useSwitchChain()
  const aori = useAori()

  // Add mounted state for hydration
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Form state
  const [formData, setFormData] = useState<SwapFormData>({
    inputChain: '',
    outputChain: '',
    inputToken: '',
    outputToken: '',
    inputAmount: ''
  })

  // Quote and status state
  const [quote, setQuote] = useState<QuoteResponse | null>(null)
  const [status, setStatus] = useState<SwapStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [orderHash, setOrderHash] = useState('')
  const [approvalStatus, setApprovalStatus] = useState<{
    isApproved: boolean
    allowance: string
    checking: boolean
  }>({ isApproved: false, allowance: '0', checking: false })


  // Get data from Aori instance
  const chains = aori ? aori.getAllChains() : {}
  const tokens = aori ? aori.getAllTokens() : []
  const chainKeys = Object.keys(chains)

  // Helper functions
  const getTokensByChain = useCallback((chainKey: string): TokenInfo[] => {
    return tokens.filter(token => token.chainKey === chainKey)
  }, [tokens])

  const getTokenInfo = useCallback((tokenAddress: string, chainKey: string): TokenInfo | undefined => {
    return tokens.find(token => token.address === tokenAddress && token.chainKey === chainKey)
  }, [tokens])

  const getChainInfo = useCallback((chainKey: string): ChainInfo | undefined => {
    return chains[chainKey]
  }, [chains])

  const isNativeToken = useCallback((tokenAddress: string): boolean => {
    return aori?.isNativeToken(tokenAddress) || false
  }, [aori])

  const getTokenDecimals = useCallback((tokenInfo: TokenInfo): number => {
    if (isNativeToken(tokenInfo.address)) return 18
    const symbol = tokenInfo.symbol.toUpperCase()
    if (symbol === 'USDC' || symbol === 'USDT') return 6
    if (symbol === 'WETH' || symbol === 'ETH') return 18
    if (symbol === 'WBTC') return 8
    return 18
  }, [isNativeToken])

  // Computed values
  const inputTokenInfo = getTokenInfo(formData.inputToken, formData.inputChain)
  const outputTokenInfo = getTokenInfo(formData.outputToken, formData.outputChain)
  const isInputTokenNative = inputTokenInfo ? isNativeToken(inputTokenInfo.address) : false
  const isNativeSwapFlow = quote ? aori?.isNativeSwap(quote) || false : false
  const isLoading = status !== 'idle' && status !== 'completed' && status !== 'error'
  const outputAmount = quote && outputTokenInfo
    ? (Number(quote.outputAmount) / (10 ** getTokenDecimals(outputTokenInfo))).toFixed(Math.min(getTokenDecimals(outputTokenInfo), 8))
    : ''

  // Form handlers
  const handleInputChange = useCallback(async (field: keyof SwapFormData, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }

      // If changing chains, reset token selection
      if (field === 'inputChain') {
        const chainTokens = getTokensByChain(value)
        newData.inputToken = chainTokens[0]?.address || ''
      } else if (field === 'outputChain') {
        const chainTokens = getTokensByChain(value)
        newData.outputToken = chainTokens[0]?.address || ''
      }

      return newData
    })

    // Switch to input chain when user selects it
    if (field === 'inputChain' && value && isConnected && walletClient) {
      const chainInfo = getChainInfo(value)
      if (chainInfo && walletClient.chain?.id !== chainInfo.chainId) {
        try {
          await switchChain({ chainId: chainInfo.chainId })
        } catch (error) {
          console.error('Failed to switch chain:', error)
          // Don't block the UI if chain switch fails
        }
      }
    }

    // Clear quote and approval status when form changes
    if (field !== 'inputAmount' || value !== formData.inputAmount) {
      setQuote(null)
      setApprovalStatus({ isApproved: false, allowance: '0', checking: false })
    }
  }, [formData.inputAmount, getTokensByChain, isConnected, walletClient, getChainInfo, switchChain])

  const swapTokens = useCallback(() => {
    setFormData(prev => ({
      inputChain: prev.outputChain,
      outputChain: prev.inputChain,
      inputToken: prev.outputToken,
      outputToken: prev.inputToken,
      inputAmount: ''
    }))
    setQuote(null)
  }, [])

  const clearForm = useCallback(async () => {
    const defaultInputChain = chainKeys.find(key => key === 'base') || chainKeys[0]
    const defaultOutputChain = chainKeys.find(key => key === 'arbitrum') || chainKeys[1]

    if (chainKeys.length >= 2) {
      const inputTokens = getTokensByChain(defaultInputChain)
      const outputTokens = getTokensByChain(defaultOutputChain)

      setFormData({
        inputChain: defaultInputChain,
        outputChain: defaultOutputChain,
        inputToken: inputTokens[0]?.address || '',
        outputToken: outputTokens[0]?.address || '',
        inputAmount: ''
      })

      // Switch to the default input chain if connected
      if (isConnected && walletClient && defaultInputChain) {
        const chainInfo = getChainInfo(defaultInputChain)
        if (chainInfo && walletClient.chain?.id !== chainInfo.chainId) {
          try {
            await switchChain({ chainId: chainInfo.chainId })
          } catch (error) {
            console.error('Failed to switch to default chain:', error)
          }
        }
      }
    }

    setQuote(null)
    setStatus('idle')
    setStatusMessage('')
    setOrderHash('')
    setApprovalStatus({ isApproved: false, allowance: '0', checking: false })
      }, [chainKeys, getTokensByChain, isConnected, walletClient, getChainInfo, switchChain])

  // Set default form values when Aori instance is loaded (only after hydration)
  useEffect(() => {
    if (!mounted || !aori || chainKeys.length === 0) return

    if (!formData.inputChain && !formData.outputChain) {
      clearForm()
    }
  }, [mounted, aori, chainKeys, formData.inputChain, formData.outputChain, clearForm])

  const handleGetQuote = useCallback(async () => {
    if (!address || !walletClient || !aori || !inputTokenInfo || !outputTokenInfo) {
      setStatusMessage('Missing requirements for quote')
      return
    }

    try {
      setStatus('getting-quote')
      setStatusMessage('Getting quote...')

      const inputAmountWei = parseUnits(formData.inputAmount, getTokenDecimals(inputTokenInfo)).toString()

      const quoteRequest: QuoteRequest = {
        offerer: address,
        recipient: address,
        inputToken: inputTokenInfo.address,
        outputToken: outputTokenInfo.address,
        inputAmount: inputAmountWei,
        inputChain: formData.inputChain,
        outputChain: formData.outputChain
      }

      const quoteResponse = await aori.getQuote(quoteRequest)
      setQuote(quoteResponse)

      const outputTokenDecimals = getTokenDecimals(outputTokenInfo)
      const outputAmountFormatted = (Number(quoteResponse.outputAmount) / (10 ** outputTokenDecimals)).toFixed(Math.min(outputTokenDecimals, 8))

      const isNativeSwap = aori.isNativeSwap(quoteResponse)

      if (isNativeSwap) {
        setStatusMessage(`Quote received (Native Swap): ${outputAmountFormatted} ${outputTokenInfo.symbol}`)
        setApprovalStatus({ isApproved: true, allowance: 'N/A', checking: false })
      } else {
        setStatusMessage(`Quote received: ${outputAmountFormatted} ${outputTokenInfo.symbol}`)

        // Check token approval for ERC20 tokens only
        const inputChainInfo = getChainInfo(formData.inputChain)
        if (inputChainInfo) {
          await checkTokenApproval(
            inputTokenInfo.address as Address,
            inputChainInfo.address as Address,
            inputAmountWei
          )
        }
      }

      setStatus('idle')

    } catch (error) {
      console.error('Quote failed:', error)
      setStatus('error')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setStatusMessage(`Quote failed: ${errorMessage}`)
    }
  }, [address, walletClient, aori, inputTokenInfo, outputTokenInfo, formData, getTokenDecimals, getChainInfo])

  const checkTokenApproval = async (tokenAddress: Address, spenderAddress: Address, requiredAmount: string) => {
    if (!address || !walletClient) return false

    // Skip approval check for native tokens (ETH)
    if (isNativeToken(tokenAddress)) {
      setApprovalStatus({
        isApproved: true,
        allowance: 'N/A (Native Token)',
        checking: false
      })
      return true
    }

    try {
      setApprovalStatus(prev => ({ ...prev, checking: true }))

      const allowance = await readContract(walletClient, {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, spenderAddress],
      })

      const allowanceString = allowance.toString()
      const isApproved = BigInt(allowanceString) >= BigInt(requiredAmount)

      setApprovalStatus({
        isApproved,
        allowance: allowanceString,
        checking: false
      })

      return isApproved
    } catch (error) {
      console.error('Failed to check token approval:', error)
      setApprovalStatus({ isApproved: false, allowance: '0', checking: false })
      return false
    }
  }

  const handleSwap = useCallback(async () => {
    if (!quote || !address || !walletClient || !aori || !inputTokenInfo || !outputTokenInfo) {
      setStatusMessage('Missing requirements for swap')
      return
    }

    const inputChainInfo = getChainInfo(formData.inputChain)

    if (!inputChainInfo) {
      setStatusMessage('Invalid configuration')
      return
    }
    

    try {
      const isNativeSwap = aori.isNativeSwap(quote)
      const inputAmountWei = parseUnits(formData.inputAmount, getTokenDecimals(inputTokenInfo)).toString()

      if (isNativeSwap) {
        // Native token swap flow - executeSwap will handle submission + execution
        setStatus('executing-native')
        setStatusMessage('Executing native token swap...')

        // Ensure we're on the input chain for native transaction
        if (walletClient.chain?.id !== inputChainInfo.chainId) {
          await switchChain({ chainId: inputChainInfo.chainId })
          // Wait a bit for the chain switch to complete
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

        const txExecutor: TxExecutor = {
          sendTransaction: async (request: TransactionRequest) => {
            const hash = await sendTransaction(walletClient, {
              to: request.to as Address,
              data: request.data as `0x${string}`,
              value: BigInt(request.value),
              gas: request.gasLimit ? BigInt(request.gasLimit) : undefined,
            })

            return {
              hash,
              wait: async () => {
                return await waitForTransactionReceipt(walletClient, { hash })
              }
            }
          },
          estimateGas: async (request: TransactionRequest) => {
            return await estimateGas(walletClient, {
              to: request.to as Address,
              data: request.data as `0x${string}`,
              value: BigInt(request.value),
            })
          }
        }

        const nativeConfig: SwapConfig = {
          type: 'native',
          txExecutor: txExecutor
        }

        const result = await aori.executeSwap(quote, nativeConfig)

        // For native swaps, result is always a TransactionResponse
        if ('success' in result) {
          if (result.success) {
            // Deposit transaction succeeded, now monitor the order status
            setOrderHash(quote.orderHash) // Use the order hash from quote, not the tx hash
            setStatusMessage('Deposit successful! Monitoring swap status...')

            try {
              const finalStatus = await aori.pollOrderStatus(quote.orderHash)
              const statusType = typeof finalStatus === 'object' && 'status' in finalStatus ? finalStatus.status : 'completed'

              // Set UI status based on actual order outcome
              if (statusType === 'failed') {
                setStatus('error')
                setStatusMessage(`Swap failed! Order was not filled.`)
              } else if (statusType === 'completed') {
                setStatus('completed')
                setStatusMessage(`Swap completed successfully!`)
                // Clear form on successful completion
                setFormData(prev => ({ ...prev, inputAmount: '' }))
                setQuote(null)
              } else {
                setStatus('completed')
                setStatusMessage(`Swap ${statusType}!`)
              }
            } catch (pollError) {
              console.error('Status polling failed:', pollError)
              setStatusMessage('Deposit completed, but status monitoring failed')
              setStatus('error') // Changed from 'completed' to 'error' since monitoring failed
            }
          } else {
            throw new Error(result.error || 'Native swap failed')
          }
        } else {
          throw new Error('Unexpected response type for native swap')
        }

      } else {
        // ERC20 token swap flow - executeSwap will handle signing + submission
        setStatus('checking-approval')
        setStatusMessage('Checking token approval...')

        const isApproved = await checkTokenApproval(
          inputTokenInfo.address as Address,
          inputChainInfo.address as Address,
          inputAmountWei
        )

        if (!isApproved) {
          const approvalSuccess = await requestTokenApproval(
            inputTokenInfo.address as Address,
            inputChainInfo.address as Address
          )

          if (!approvalSuccess) {
            setStatus('error')
            setStatusMessage('Token approval failed. Cannot proceed with swap.')
            return
          }
        }

        setStatus('signing')
        setStatusMessage('Signing and submitting swap...')

        const adaptedWalletClient = {
          signTypedData: async (params: any) => {
            if (params.domain && params.domain.chainId) {
              const typedDataChainId = Number(params.domain.chainId)
              const currentChainId = walletClient.chain?.id

              if (currentChainId !== typedDataChainId) {
                await switchChain({ chainId: typedDataChainId })
                await new Promise(resolve => setTimeout(resolve, 1000))
              }
            }

            return await signTypedData(walletClient, {
              account: params.account as Address,
              domain: params.domain,
              types: params.types,
              primaryType: params.primaryType,
              message: params.message,
            })
          },
        }

        const erc20Config: SwapConfig = {

          type: 'erc20',
          signer: adaptedWalletClient,
          userAddress: address
        }

        const result = await aori.executeSwap(quote, erc20Config)

        // For ERC20 swaps, result is a SwapResponse
        if ('orderHash' in result) {
          setOrderHash(result.orderHash)
          setStatusMessage('Monitoring swap status...')

          try {
            const finalStatus = await aori.pollOrderStatus(result.orderHash)
            const statusType = typeof finalStatus === 'object' && 'status' in finalStatus ? finalStatus.status : 'completed'

            // Set UI status based on actual order outcome
            if (statusType === 'failed') {
              setStatus('error')
              setStatusMessage(`Swap failed! Order was not filled.`)
            } else if (statusType === 'completed') {
              setStatus('completed')
              setStatusMessage(`Swap completed successfully!`)
              // Clear form on successful completion
              setFormData(prev => ({ ...prev, inputAmount: '' }))
              setQuote(null)
            } else {
              setStatus('completed')
              setStatusMessage(`Swap ${statusType}!`)
            }
          } catch (pollError) {
            console.error('Status polling failed:', pollError)
            setStatusMessage('Swap submitted, but status monitoring failed')
            setStatus('error') // Changed from 'completed' to 'error' since monitoring failed
          }
        } else {
          throw new Error('Unexpected response type for ERC20 swap')
        }
      }

    } catch (error) {
      console.error('Error in handleSwap:', error)
      setStatus('error')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setStatusMessage(`Swap failed: ${errorMessage}`)
    }
  }, [quote, address, walletClient, aori, inputTokenInfo, outputTokenInfo, formData, getChainInfo, getTokenDecimals, switchChain])

  const requestTokenApproval = async (tokenAddress: Address, spenderAddress: Address) => {
    if (!address || !walletClient) return false

    // Skip approval for native tokens (ETH)
    if (isNativeToken(tokenAddress)) {
      setApprovalStatus({
        isApproved: true,
        allowance: 'N/A (Native Token)',
        checking: false
      })
      return true
    }

    try {
      setStatus('approving')
      setStatusMessage('Requesting token approval...')

      const hash = await writeContract(walletClient, {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spenderAddress, maxUint256],
      })

      setStatusMessage('Waiting for approval confirmation...')

      const receipt = await waitForTransactionReceipt(walletClient, {
        hash,
        confirmations: 1
      })

      if (receipt.status === 'success') {
        setApprovalStatus(prev => ({ ...prev, isApproved: true }))
        setStatusMessage('Token approval confirmed!')
        return true
      } else {
        throw new Error('Approval transaction failed')
      }
    } catch (error) {
      console.error('Token approval failed:', error)
      setStatus('error')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setStatusMessage(`Approval failed: ${errorMessage}`)
      return false
    }
  }

  return (
    <div>
      <div className="card">
      <div className="card-header">
          <h2 className="card-title">Swap</h2>
          {mounted && isConnected && (
            <button
              onClick={clearForm}
              className="btn btn-clear"
            >
              Clear
            </button>
          )}
        </div>
        <div className="card-container">
        {mounted && !isConnected ? (
          <div className="card-content">
            <div className="wallet-connect">
              <svg className="wallet-connect-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="wallet-connect-title">Connect Your Wallet</h3>
              <p className="wallet-connect-subtitle">Connect your wallet to start swapping</p>
            </div>
          </div>
        ) : mounted ? (
          <div className="card-content-spaced">
            {/* From Token */}
            <div className="form-group">
              <label className="form-label">From</label>
              <div className="form-row">
                <select
                  value={formData.inputChain}
                  onChange={(e) => handleInputChange('inputChain', e.target.value)}
                  className="select"
                >
                  {chainKeys.map((chainKey) => (
                    <option key={chainKey} value={chainKey}>
                      {chains[chainKey].chainKey.toUpperCase()}
                    </option>
                  ))}
                </select>
                <select
                  value={formData.inputToken}
                  onChange={(e) => handleInputChange('inputToken', e.target.value)}
                  className="select"
                >
                  {getTokensByChain(formData.inputChain).map((token, index) => (
                    <option key={`input-${formData.inputChain}-${index}-${token.address}`} value={token.address}>
                      {isNativeToken(token.address) ? '⚡ ETH (Native)' : token.symbol}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="0.0"
                  value={formData.inputAmount}
                  onChange={(e) => handleInputChange('inputAmount', e.target.value)}
                  className="input input-flex"
                />
              </div>
            </div>

            {/* Swap Button */}
            <div className="swap-direction-btn">
              <button
                onClick={swapTokens}
                className="btn btn-icon"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
              </button>
            </div>

            {/* To Token */}
            <div className="form-group">
              <label className="form-label">To</label>
              <div className="form-row">
                <select
                  value={formData.outputChain}
                  onChange={(e) => handleInputChange('outputChain', e.target.value)}
                  className="select"
                >
                  {chainKeys.map((chainKey) => (
                    <option key={chainKey} value={chainKey}>
                      {chains[chainKey].chainKey.toUpperCase()}
                    </option>
                  ))}
                </select>
                <select
                  value={formData.outputToken}
                  onChange={(e) => handleInputChange('outputToken', e.target.value)}
                  className="select"
                >
                  {getTokensByChain(formData.outputChain).map((token, index) => (
                    <option key={`output-${formData.outputChain}-${index}-${token.address}`} value={token.address}>
                      {isNativeToken(token.address) ? '⚡ ETH (Native)' : token.symbol}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="0.0"
                  value={outputAmount}
                  readOnly
                  className="input input-flex"
                />
              </div>
            </div>

            {/* Quote Display */}
            {quote && inputTokenInfo && outputTokenInfo && (
              <div className={`quote-display ${isNativeSwapFlow ? 'native' : ''}`}>
                <p className="quote-rate">
                  Rate: 1 {inputTokenInfo.symbol} ({formData.inputChain}) = {outputAmount && formData.inputAmount ? (parseFloat(outputAmount) / parseFloat(formData.inputAmount)).toFixed(Math.min(getTokenDecimals(outputTokenInfo), 8)) : '0'} {outputTokenInfo.symbol} ({formData.outputChain})
                </p>
                {quote.estimatedTime && (
                  <p className="quote-time">
                    Estimated time: {quote.estimatedTime}ms
                  </p>
                )}
                {isNativeSwapFlow && (
                  <p className="quote-native-note">
                    ⚡ Native token swap - deposit will be executed, then monitored for fulfillment
                  </p>
                )}
              </div>
            )}

            {/* Status Message */}
            {statusMessage && (
              <div className={`status-message ${status === 'error' ? 'status-error' :
                  status === 'completed' ? 'status-success' :
                    status === 'executing-native' ? 'status-orange' :
                      'status-info'
                }`}>
                <p>{statusMessage}</p>
              </div>
            )}

            {/* Order Hash */}
            {orderHash && (
              <div className="order-hash">
                <p className="order-hash-label">
                  <strong>{isNativeSwapFlow ? 'Transaction Hash:' : 'Order Hash:'}</strong><br />
                  <code className="order-hash-value">{orderHash}</code>
                </p>
              </div>
            )}

            {/* Approval Status */}
            {quote && !isNativeSwapFlow && (
              <div className={`status-message ${approvalStatus.isApproved ? 'status-success' :
                  approvalStatus.checking ? 'status-info' :
                    'status-warning'
                }`}>
                <p>
                  {approvalStatus.checking ? (
                    <span>🔍 Checking token approval...</span>
                  ) : approvalStatus.isApproved ? (
                    <span>✅ Token approved for spending</span>
                  ) : (
                    <span>⚠️ Token approval required</span>
                  )}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="form-row">
              <button
                onClick={handleGetQuote}
                disabled={!formData.inputToken || !formData.outputToken || !formData.inputAmount || isLoading}
                className="btn btn-primary btn-flex"
              >
                {status === 'getting-quote' ? "Getting Quote..." : "Get Quote"}
              </button>
              <button
                onClick={handleSwap}
                disabled={!quote || isLoading}
                className={`btn btn-flex ${isNativeSwapFlow ? 'btn-orange' : 'btn-secondary'
                  }`}
              >
                {status === 'checking-approval' ? "Checking Approval..." :
                  status === 'approving' ? "Approving Token..." :
                    status === 'signing' ? "Sign Transaction..." :
                      status === 'submitting' ? "Submitting..." :
                        status === 'executing-native' ? "Executing Native Swap..." :
                            isLoading ? "Processing..." :
                              isNativeSwapFlow ? "⚡ Execute Native Swap" : "Swap"}
              </button>
            </div>
          </div>
        ) : (
          <div className="card-content">
            <div className="loading-content">
              Loading...
            </div>
          </div>
        )}
        </div>



      </div>
    </div>
  )
} 