'use client'

import { useState } from 'react'
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi'
import { useAori } from '../providers/AoriProvider'
import type { CancelTxExecutor, CancelOrderResponse } from '@aori/aori-ts'
import { type Address } from 'viem'
// Removed readContract import - no longer needed with simplified cancellation

type CancelStatus = 'idle' | 'cancelling' | 'completed' | 'error'

// Utility function to safely convert values to decimal strings
function safeToDecimalString(value: string | number | bigint): string {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  
  if (typeof value === 'number') {
    return value.toFixed(0);
  }
  
  if (typeof value === 'string') {
    if (value.includes('e') || value.includes('E')) {
      return Number(value).toFixed(0);
    }
    
    if (value.startsWith('0x')) {
      return BigInt(value).toString();
    }
    
    return value;
  }
  
  return String(value);
}



export default function CancelPage() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChain } = useSwitchChain()
  const aori = useAori()

  const [orderHash, setOrderHash] = useState('')
  const [status, setStatus] = useState<CancelStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [result, setResult] = useState<CancelOrderResponse | null>(null)
  const [cancelTxData, setCancelTxData] = useState<any>(null)
  const [isChainSwitching, setIsChainSwitching] = useState(false)

  const clearForm = () => {
    setOrderHash('')
    setStatus('idle')
    setStatusMessage('')
    setResult(null)
    setCancelTxData(null)
    setIsChainSwitching(false)
  }

  const fillSampleData = () => {
    // Fill with a sample order hash for testing
    setOrderHash('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
  }

  const testGetCancelTx = async () => {
    if (!orderHash || !aori) {
      setStatusMessage('Enter an order hash first')
      return
    }

    try {
      setStatusMessage('Getting cancel transaction data...')
      const cancelTx = await aori.getCancelTx(orderHash)
      setCancelTxData(cancelTx)
      setStatusMessage(`Got cancel data for chain: ${cancelTx.chain}`)
    } catch (error) {
      setStatusMessage(`Failed to get cancel data: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleCancel = async () => {
    if (!orderHash || !address || !walletClient || !aori) {
      setStatusMessage('Missing requirements for cancellation')
      return
    }

    try {
      setStatus('cancelling')
      setStatusMessage('Getting cancellation data from API...')

      // First, get the cancel transaction data to know which chain we need
      let cancelTxData
      try {
        cancelTxData = await aori.getCancelTx(orderHash)
        setCancelTxData(cancelTxData)
      } catch (error) {
        // Preserve the original error message from the server
        const errorMessage = error instanceof Error ? error.message : String(error)
        setStatusMessage(`Failed to get cancel data: ${errorMessage}`)
        throw error // Re-throw to be caught by outer catch block
      }

      // Check if we're on the correct chain
      const requiredChain = aori.getChain(cancelTxData.chain)
      const currentChainId = walletClient.chain?.id

      if (!requiredChain) {
        throw new Error(`Unsupported chain: ${cancelTxData.chain}`)
      }

      const requiredChainId = requiredChain.chainId

      if (currentChainId !== requiredChainId) {
        setStatusMessage(`Switching to ${cancelTxData.chain} network...`)
        setIsChainSwitching(true)
        
        try {
          await switchChain({ chainId: requiredChainId })
          
          // Wait for the wallet client to reflect the chain change
          setStatusMessage('Waiting for chain switch to complete...')
          let attempts = 0
          const maxAttempts = 20 // 10 seconds max (500ms * 20)
          
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500)) // Wait 500ms
            const updatedChainId = walletClient.chain?.id
            
            if (updatedChainId === requiredChainId) {
              setStatusMessage('Network switched successfully. Preparing cancellation...')
              break
            }
            
            attempts++
          }
          
          if (attempts >= maxAttempts) {
            throw new Error(`Chain switch timeout: wallet still on chain ${walletClient.chain?.id}, expected ${requiredChainId}`)
          }
          
        } catch (switchError) {
          setIsChainSwitching(false)
          throw new Error(`Failed to switch to ${cancelTxData.chain}: ${switchError instanceof Error ? switchError.message : String(switchError)}`)
        } finally {
          setIsChainSwitching(false)
        }
      }

      setStatusMessage('Preparing cancellation transaction...')

      // Create CancelTxExecutor with wallet capabilities
      const cancelTxExecutor: CancelTxExecutor = {
        address: address,
        getChainId: async () => {
          return walletClient.chain?.id || 0;
        },
        sendTransaction: async (request) => {
          setStatusMessage('Sending cancellation transaction...')

          const hash = await walletClient.sendTransaction({
            to: request.to as Address,
            data: request.data as `0x${string}`,
            value: BigInt(safeToDecimalString(request.value)),
            gas: request.gasLimit ? BigInt(safeToDecimalString(request.gasLimit)) : undefined,
          })

          return {
            hash,
            wait: async () => {
              setStatusMessage('Waiting for confirmation...')
              const { waitForTransactionReceipt } = await import('viem/actions')
              return await waitForTransactionReceipt(walletClient, { hash })
            }
          }
        },
        estimateGas: async (request) => {
          const { estimateGas } = await import('viem/actions')
          return await estimateGas(walletClient, {
            to: request.to as Address,
            data: request.data as `0x${string}`,
            value: BigInt(safeToDecimalString(request.value)),
          })
        }
      }

      // Execute cancellation using the order hash
      const cancelResult = await aori.cancelOrder(orderHash, cancelTxExecutor)

      setResult(cancelResult)
      if (cancelResult.success) {
        setStatus('completed')
        setStatusMessage(`Cancellation ${cancelResult.isCrossChain ? 'cross-chain ' : ''}successful!`)
      } else {
        setStatus('error')
        setStatusMessage(`Cancellation failed: ${cancelResult.error}`)
      }

    } catch (error) {
      console.error('Cancellation failed:', error)
      setStatus('error')
      setIsChainSwitching(false)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setStatusMessage(`Cancellation failed: ${errorMessage}`)
      setResult({
        success: false,
        txHash: '',
        isCrossChain: false,
        error: errorMessage
      })
    }
  }

  const isLoading = status === 'cancelling' || isChainSwitching
  const canCancel = orderHash.trim().length > 0 && isConnected && !isLoading

  return (
    <div className="page-container">
      <div className="main-container">
        {/* Header */}
        <div className="header">
          <div className="flex items-center gap-6">
            <h1 className="page-title">Cancel Order Test</h1>
          </div>
          <div className="flex items-center gap-4">
            <a
              href='/' className="btn btn-clear"
            >
              ← Back
            </a>
            <w3m-button balance="hide" />
          </div>
        </div>

        {/* Main Content */}
        <div className="grid-layout">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Cancel Order</h2>
              <div className="flex gap-2">
                <button
                  onClick={fillSampleData}
                  className="btn btn-clear btn-sm"
                  disabled={isLoading}
                >
                  Sample Data
                </button>
                <button
                  onClick={clearForm}
                  className="btn btn-clear btn-sm"
                  disabled={isLoading}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="card-container">
              {!isConnected ? (
                <div className="card-content">
                  <div className="wallet-connect">
                    <svg className="wallet-connect-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <h3 className="wallet-connect-title">Connect Your Wallet</h3>
                    <p className="wallet-connect-subtitle">Connect your wallet to cancel orders</p>
                  </div>
                </div>
              ) : (
                <div className="card-content-spaced">
                  {/* Order Hash Input */}
                  <div className="form-group">
                    <label className="form-label">Order Hash</label>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={orderHash}
                      onChange={(e) => setOrderHash(e.target.value)}
                      className="input"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Status Message */}
                  {statusMessage && (
                    <div className={`status-message ${status === 'error' ? 'status-error' :
                        status === 'completed' ? 'status-success' :
                          'status-info'
                      }`}>
                      <p>{statusMessage}</p>
                    </div>
                  )}

                  {/* Cancel Transaction Data Display */}
                  {cancelTxData && (
                    <div className="card">
                      <div className="card-header">
                        <h3 className="card-title">Cancel Transaction Data</h3>
                      </div>
                      <div className="card-content">
                        <div className="space-y-2 text-sm font-mono">
                          <div><strong>Order Hash:</strong> <code className="order-hash-value">{cancelTxData.orderHash}</code></div>
                          <div><strong>Chain:</strong> {cancelTxData.chain}</div>
                          <div><strong>Contract:</strong> <code className="order-hash-value">{cancelTxData.to}</code></div>
                          <div><strong>Value (LayerZero Fee):</strong> {cancelTxData.value === "0" ? "0 ETH (single-chain)" : `${(Number(cancelTxData.value) / 1e18).toFixed(6)} ETH`}</div>
                          <div><strong>Data Length:</strong> {cancelTxData.data.length} characters</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Result Display */}
                  {result && (
                    <div className="card">
                      <div className="card-header">
                        <h3 className="card-title">Cancellation Result</h3>
                      </div>
                      <div className="card-content">
                        <div className="space-y-2 text-sm font-mono">
                          <div><strong>Success:</strong> {result.success ? '✅' : '❌'}</div>
                          <div><strong>Cross-chain:</strong> {result.isCrossChain ? '✅' : '❌'}</div>
                          {result.txHash && (
                            <div><strong>Transaction:</strong> <code className="order-hash-value">{result.txHash}</code></div>
                          )}
                          {result.fee && (
                            <div><strong>LayerZero Fee:</strong> {(Number(result.fee) / 1e18).toFixed(6)} ETH</div>
                          )}
                          {result.error && (
                            <div><strong>Error:</strong> <span className="text-red-400">{result.error}</span></div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={testGetCancelTx}
                      disabled={!orderHash.trim() || isLoading}
                      className="btn btn-clear flex-1"
                    >
                      Get Cancel Data
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={!canCancel}
                      className="btn btn-primary flex-1"
                    >
                      {isChainSwitching ? 'Switching Network...' : 
                       status === 'cancelling' ? 'Cancelling...' : 
                       'Cancel Order'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Debug Info */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Debug Info</h2>
            </div>
            <div className="card-content">
              <div className="text-sm font-mono space-y-2">
                <div><strong>Connected:</strong> {isConnected ? '✅' : '❌'}</div>
                <div><strong>Address:</strong> {address || 'Not connected'}</div>
                <div><strong>Aori SDK:</strong> {aori ? '✅' : '❌'}</div>
                <div><strong>Wallet Client:</strong> {walletClient ? '✅' : '❌'}</div>
                <div><strong>Current Chain:</strong> {walletClient?.chain?.name || 'Unknown'} (ID: {walletClient?.chain?.id || 'Unknown'})</div>
                {cancelTxData && (
                  <div><strong>Chain:</strong> {cancelTxData.chain}</div>
                )}
                <div><strong>Status:</strong> {status}</div>
                {isChainSwitching && (
                  <div className="text-yellow-400"><strong>⚡ Chain Switching:</strong> In progress...</div>
                )}
                <div className="text-yellow-400 text-xs">
                  <strong>⚠️ Security:</strong> Chain validation prevents sending to wrong network
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 