'use client'

import { useState } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { useAori } from '../providers/AoriProvider'
import type { CancelTxExecutor, CancelOrderResponse } from '@aori/aori-ts'
import { safeToDecimalString } from '@aori/aori-ts'
import { type Address } from 'viem'
import { readContract } from 'viem/actions'

type CancelStatus = 'idle' | 'cancelling' | 'completed' | 'error'

export default function CancelPage() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const aori = useAori()

  const [orderHash, setOrderHash] = useState('')
  const [status, setStatus] = useState<CancelStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [result, setResult] = useState<CancelOrderResponse | null>(null)

  const clearForm = () => {
    setOrderHash('')
    setStatus('idle')
    setStatusMessage('')
    setResult(null)
  }

  const fillSampleData = () => {
    // Fill with a sample order hash for testing
    setOrderHash('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
  }

  const handleCancel = async () => {
    if (!orderHash || !address || !walletClient || !aori) {
      setStatusMessage('Missing requirements for cancellation')
      return
    }

    try {
      setStatus('cancelling')
      setStatusMessage('Preparing cancellation...')

             // Create CancelTxExecutor with wallet capabilities
       const cancelTxExecutor: CancelTxExecutor = {
         address: address,
         getChainId: async () => {
           return walletClient.chain?.id || 0;
         },
         sendTransaction: async (request) => {
           setStatusMessage('Sending transaction...')
           
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
         },
         call: async (request) => {
           setStatusMessage('Getting LayerZero fee quote...')
           
           // Use readContract for the static call
           return await readContract(walletClient, {
             address: request.to as Address,
             abi: [], // We're doing a raw call, so ABI is not needed
             functionName: '', // Not needed for raw calls
             args: [],
             // @ts-ignore - viem supports raw data calls even without ABI
             data: request.data as `0x${string}`
           }) as string
         }
       }

      setStatusMessage('Executing cancellation...')
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

  const isLoading = status === 'cancelling'
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
            <button
              onClick={() => window.history.back()}
              className="btn btn-clear"
            >
              ← Back
            </button>
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
                    <div className={`status-message ${
                      status === 'error' ? 'status-error' :
                      status === 'completed' ? 'status-success' :
                      'status-info'
                    }`}>
                      <p>{statusMessage}</p>
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

                  {/* Action Button */}
                  <button
                    onClick={handleCancel}
                    disabled={!canCancel}
                    className="btn btn-primary"
                  >
                    {isLoading ? 'Cancelling...' : 'Cancel Order'}
                  </button>

                                     {/* Instructions */}
                   <div className="status-message status-info">
                     <div className="text-sm">
                       <p><strong>Instructions:</strong></p>
                       <ul className="list-disc list-inside mt-2 space-y-1">
                         <li>Enter a valid order hash from a previous swap</li>
                         <li>The function will automatically detect single-chain vs cross-chain</li>
                         <li>For cross-chain cancellations, LayerZero fees will be estimated</li>
                         <li>Make sure you have ETH for gas fees (and LayerZero fees if cross-chain)</li>
                         <li><strong>⚠️ IMPORTANT:</strong> Your wallet must be connected to the correct chain (source chain for single-chain orders, destination chain for cross-chain orders)</li>
                         <li>The function will validate the chain and throw an error if you're on the wrong chain</li>
                       </ul>
                     </div>
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
                 <div><strong>Status:</strong> {status}</div>
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