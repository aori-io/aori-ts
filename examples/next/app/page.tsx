'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi'
import {
  Aori,
  type QuoteRequest,
  type SwapRequest,
  type QuoteResponse,
  type SubscriptionParams,
  type WebSocketCallbacks,
  type ChainInfo,
  type TokenInfo,
  type NativeDepositExecutor,
  type TransactionRequest,
  NATIVE_TOKEN_ADDRESS
} from '@aori/aori-ts'
import { type Address, erc20Abi, parseUnits, maxUint256, parseEther } from 'viem'
import { signTypedData, readContract, writeContract, waitForTransactionReceipt, sendTransaction, estimateGas } from 'viem/actions'

type SwapFormData = {
  inputChain: string
  outputChain: string
  inputToken: string
  outputToken: string
  inputAmount: string
}

type SwapStatus = 'idle' | 'getting-quote' | 'checking-approval' | 'approving' | 'signing' | 'submitting' | 'executing-native' | 'completed' | 'error'

type ActivityItem = {
  id: string
  type: 'swap' | 'quote' | 'websocket' | 'status' | 'initialization' | 'native-deposit'
  status: string
  message: string
  timestamp: Date
  orderHash?: string
  details?: any
}

export default function CryptoSwap() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChain } = useSwitchChain()
  
  // Add mounted state to prevent hydration issues
  const [mounted, setMounted] = useState(false)
  
  // Aori instance and data
  const [aori, setAori] = useState<Aori | null>(null)
  const [chains, setChains] = useState<Record<string, ChainInfo>>({})
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [isInitializing, setIsInitializing] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<SwapFormData>({
    inputChain: '',
    outputChain: '',
    inputToken: '',
    outputToken: '',
    inputAmount: ''
  })

  const [quote, setQuote] = useState<QuoteResponse | null>(null)
  const [status, setStatus] = useState<SwapStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [orderHash, setOrderHash] = useState('')
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const [approvalStatus, setApprovalStatus] = useState<{
    isApproved: boolean
    allowance: string
    checking: boolean
  }>({ isApproved: false, allowance: '0', checking: false })
  
  const apiKey = process.env.NEXT_PUBLIC_AORI_API_KEY
  const hasApiKey = apiKey && apiKey !== 'your_aori_api_key_here'
  
  // API URLs from environment variables with fallbacks
  const apiBaseUrl = process.env.NEXT_PUBLIC_AORI_API_URL || 'https://api.aori.io'
  const wsBaseUrl = process.env.NEXT_PUBLIC_AORI_WS_URL || 'wss://api.aori.io'

  // Set mounted to true after component mounts
  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize Aori instance once
  useEffect(() => {
    if (!mounted) return

    const initializeAori = async () => {
      try {
        setIsInitializing(true)
        setInitError(null)
        
        addActivity({
          type: 'initialization',
          status: 'starting',
          message: 'Initializing Aori SDK...',
          timestamp: new Date()
        })

        // Create Aori instance with chains, domain, and tokens
        const aoriInstance = await Aori.create(
          apiBaseUrl, 
          wsBaseUrl, 
          apiKey || undefined,
          true // loadTokens = true
        )
        
        setAori(aoriInstance)
        
        // Get cached chains and tokens
        const chainsData = aoriInstance.getAllChains()
        const tokensData = aoriInstance.getAllTokens()
        
        setChains(chainsData)
        setTokens(tokensData)
        
        // Set default form values based on available chains/tokens
        const chainKeys = Object.keys(chainsData)
        if (chainKeys.length >= 2) {
          const defaultInputChain = chainKeys.find(key => key === 'base') || chainKeys[0]
          const defaultOutputChain = chainKeys.find(key => key === 'arbitrum') || chainKeys[1]
          
          // Find USDC tokens for default chains
          const inputTokens = tokensData.filter(token => token.chainKey === defaultInputChain)
          const outputTokens = tokensData.filter(token => token.chainKey === defaultOutputChain)
          
          const defaultInputToken = inputTokens.find(token => token.symbol === 'USDC')?.address || (inputTokens[0]?.address || '')
          const defaultOutputToken = outputTokens.find(token => token.symbol === 'USDC')?.address || (outputTokens[0]?.address || '')
          
          setFormData({
            inputChain: defaultInputChain,
            outputChain: defaultOutputChain,
            inputToken: defaultInputToken,
            outputToken: defaultOutputToken,
            inputAmount: ''
          })
        }
        
        addActivity({
          type: 'initialization',
          status: 'completed',
          message: `Loaded ${chainKeys.length} chains and ${tokensData.length} tokens`,
          timestamp: new Date(),
          details: {
            chains: chainKeys,
            tokenCount: tokensData.length
          }
        })
        
      } catch (error) {
        console.error('Failed to initialize Aori:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        setInitError(errorMessage)
        
        addActivity({
          type: 'initialization',
          status: 'error',
          message: `Initialization failed: ${errorMessage}`,
          timestamp: new Date()
        })
      } finally {
        setIsInitializing(false)
      }
    }

    initializeAori()
  }, [mounted, apiKey, apiBaseUrl, wsBaseUrl])

  // WebSocket connection after Aori is initialized and user is connected
  useEffect(() => {
    if (!aori || !address || !isConnected || !mounted) return

    const connectWebSocket = async () => {
      try {
        const filter: SubscriptionParams = {
          offerer: address,
          recipient: address
        }
        
        const callbacks: WebSocketCallbacks = {
          onConnect: () => {
            if (mounted) {
              setWsConnected(true)
              addActivity({
                type: 'websocket',
                status: 'connected',
                message: 'WebSocket connected',
                timestamp: new Date()
              })
            }
          },
          onDisconnect: () => {
            if (mounted) {
              setWsConnected(false)
              addActivity({
                type: 'websocket',
                status: 'disconnected',
                message: 'WebSocket disconnected',
                timestamp: new Date()
              })
            }
          },
          onMessage: (event: any) => {
            if (!mounted) return
            
            addActivity({
              type: 'websocket',
              status: event.eventType || 'update',
              message: `Order ${event.eventType || 'update'}: ${event.order?.orderHash?.slice(0, 10)}...`,
              timestamp: new Date(),
              orderHash: event.order?.orderHash,
              details: event
            })
          },
          onError: (error: any) => {
            console.error('WebSocket error:', error)
            if (mounted) {
              addActivity({
                type: 'websocket',
                status: 'error',
                message: `WebSocket error: ${error?.message || 'Connection failed'}`,
                timestamp: new Date()
              })
            }
          }
        }
        
        await aori.connect(filter, callbacks)
      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
        if (mounted) {
          addActivity({
            type: 'websocket',
            status: 'error',
            message: `WebSocket connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date()
          })
        }
      }
    }

    connectWebSocket()

    return () => {
      if (aori) {
        aori.disconnect()
      }
    }
  }, [aori, address, isConnected, mounted])

  const addActivity = (item: Omit<ActivityItem, 'id'>) => {
    if (!mounted) return
    
    const newItem: ActivityItem = {
      ...item,
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`
    }
    setActivity(prev => [newItem, ...prev.slice(0, 99)])
  }

  // Helper functions using Aori instance data
  const getTokensByChain = (chainKey: string): TokenInfo[] => {
    return tokens.filter(token => token.chainKey === chainKey)
  }

  const getTokenInfo = (tokenAddress: string, chainKey: string): TokenInfo | undefined => {
    return tokens.find(token => token.address === tokenAddress && token.chainKey === chainKey)
  }

  const getChainInfo = (chainKey: string): ChainInfo | undefined => {
    return chains[chainKey]
  }

  // Check if a token is a native token
  const isNativeToken = (tokenAddress: string): boolean => {
    return aori?.isNativeToken(tokenAddress) || false
  }

  // Helper function to get token decimals (fallback for common tokens)
  const getTokenDecimals = (tokenInfo: TokenInfo): number => {
    // For native tokens, always use 18 decimals
    if (isNativeToken(tokenInfo.address)) return 18
    
    // Common token decimals mapping
    const symbol = tokenInfo.symbol.toUpperCase()
    if (symbol === 'USDC' || symbol === 'USDT') return 6
    if (symbol === 'WETH' || symbol === 'ETH') return 18
    if (symbol === 'WBTC') return 8
    // Default to 18 for unknown tokens
    return 18
  }

  // Create native deposit executor from wallet client
  const createNativeDepositExecutor = (): NativeDepositExecutor | null => {
    if (!walletClient) return null

    return {
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
  }

  const handleInputChange = (field: keyof SwapFormData, value: string) => {
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
    
    // Clear quote and approval status when form changes
    if (field !== 'inputAmount' || value !== formData.inputAmount) {
      setQuote(null)
      setApprovalStatus({ isApproved: false, allowance: '0', checking: false })
    }
  }

  const swapTokens = () => {
    setFormData(prev => ({
      inputChain: prev.outputChain,
      outputChain: prev.inputChain,
      inputToken: prev.outputToken,
      outputToken: prev.inputToken,
      inputAmount: ''
    }))
    setQuote(null)
  }

  const clearForm = () => {
    const chainKeys = Object.keys(chains)
    if (chainKeys.length >= 2) {
      const defaultInputChain = chainKeys.find(key => key === 'base') || chainKeys[0]
      const defaultOutputChain = chainKeys.find(key => key === 'arbitrum') || chainKeys[1]
      
      const inputTokens = getTokensByChain(defaultInputChain)
      const outputTokens = getTokensByChain(defaultOutputChain)
      
      setFormData({
        inputChain: defaultInputChain,
        outputChain: defaultOutputChain,
        inputToken: inputTokens[0]?.address || '',
        outputToken: outputTokens[0]?.address || '',
        inputAmount: ''
      })
    }
    
    setQuote(null)
    setStatus('idle')
    setStatusMessage('')
    setOrderHash('')
    setApprovalStatus({ isApproved: false, allowance: '0', checking: false })
  }

  const checkTokenApproval = async (tokenAddress: Address, spenderAddress: Address, requiredAmount: string) => {
    if (!address || !walletClient) return false

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

      addActivity({
        type: 'status',
        status: isApproved ? 'approved' : 'needs-approval',
        message: `Token approval check: ${isApproved ? 'Sufficient allowance' : 'Approval needed'}`,
        timestamp: new Date(),
        details: {
          allowance: allowanceString,
          required: requiredAmount,
          tokenAddress,
          spenderAddress
        }
      })

      return isApproved
    } catch (error) {
      console.error('Failed to check token approval:', error)
      setApprovalStatus({ isApproved: false, allowance: '0', checking: false })
      
      addActivity({
        type: 'status',
        status: 'error',
        message: `Approval check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      })
      
      return false
    }
  }

  const requestTokenApproval = async (tokenAddress: Address, spenderAddress: Address) => {
    if (!address || !walletClient) return false

    try {
      setStatus('approving')
      setStatusMessage('Requesting token approval...')

      // Switch to the input chain for approval
      const inputChainInfo = getChainInfo(formData.inputChain)
      if (inputChainInfo) {
        await switchChain({ chainId: inputChainInfo.chainId })
      }

      const hash = await writeContract(walletClient, {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spenderAddress, maxUint256],
      })

      setStatusMessage('Waiting for approval confirmation...')
      
      addActivity({
        type: 'status',
        status: 'pending',
        message: 'Approval transaction submitted',
        timestamp: new Date(),
        orderHash: hash
      })

      const receipt = await waitForTransactionReceipt(walletClient, {
        hash,
        confirmations: 1
      })

      if (receipt.status === 'success') {
        setApprovalStatus(prev => ({ ...prev, isApproved: true }))
        setStatusMessage('Token approval confirmed!')
        
        addActivity({
          type: 'status',
          status: 'confirmed',
          message: 'Token approval confirmed',
          timestamp: new Date(),
          orderHash: hash
        })
        
        return true
      } else {
        throw new Error('Approval transaction failed')
      }
    } catch (error) {
      console.error('Token approval failed:', error)
      setStatus('error')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setStatusMessage(`Approval failed: ${errorMessage}`)
      
      addActivity({
        type: 'status',
        status: 'error',
        message: `Approval failed: ${errorMessage}`,
        timestamp: new Date()
      })
      
      return false
    }
  }

  const handleGetQuote = async () => {
    if (!address || !walletClient || !aori) {
      setStatusMessage('Missing requirements for quote')
      return
    }

    const inputTokenInfo = getTokenInfo(formData.inputToken, formData.inputChain)
    const outputTokenInfo = getTokenInfo(formData.outputToken, formData.outputChain)
    
    if (!inputTokenInfo || !outputTokenInfo) {
      setStatusMessage('Invalid token configuration')
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
      
      const outputAmount = (BigInt(quoteResponse.outputAmount) * BigInt(10 ** 6)) / BigInt(10 ** getTokenDecimals(outputTokenInfo))
      const outputAmountFormatted = (Number(outputAmount) / 10 ** 6).toFixed(6)
      
      // Check if this is a native token deposit
      const isNativeDeposit = aori.isNativeDeposit(quoteResponse)
      
      if (isNativeDeposit) {
        setStatusMessage(`Quote received (Native Deposit): ${outputAmountFormatted} ${outputTokenInfo.symbol}`)
        setApprovalStatus({ isApproved: true, allowance: 'N/A', checking: false }) // Native tokens don't need approval
        
        addActivity({
          type: 'quote',
          status: 'received',
          message: `Native deposit quote: ${formData.inputAmount} ETH → ${outputAmountFormatted} ${outputTokenInfo.symbol}`,
          timestamp: new Date(),
          details: {
            isNativeDeposit: true,
            inputChain: formData.inputChain,
            outputChain: formData.outputChain,
            inputAmount: inputAmountWei,
            outputAmount: quoteResponse.outputAmount,
            inputToken: inputTokenInfo.symbol,
            outputToken: outputTokenInfo.symbol
          }
        })
      } else {
        setStatusMessage(`Quote received: ${outputAmountFormatted} ${outputTokenInfo.symbol}`)
        
        addActivity({
          type: 'quote',
          status: 'received',
          message: `Quote: ${formData.inputAmount} ${inputTokenInfo.symbol} → ${outputAmountFormatted} ${outputTokenInfo.symbol}`,
          timestamp: new Date(),
          details: {
            isNativeDeposit: false,
            inputChain: formData.inputChain,
            outputChain: formData.outputChain,
            inputAmount: inputAmountWei,
            outputAmount: quoteResponse.outputAmount,
            inputToken: inputTokenInfo.symbol,
            outputToken: outputTokenInfo.symbol
          }
        })

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
      
      addActivity({
        type: 'quote',
        status: 'error',
        message: `Quote failed: ${errorMessage}`,
        timestamp: new Date()
      })
    }
  }

  const handleSwap = async () => {
    if (!quote || !address || !walletClient || !aori) {
      setStatusMessage('Missing requirements for swap')
      return
    }

    const inputTokenInfo = getTokenInfo(formData.inputToken, formData.inputChain)
    const outputTokenInfo = getTokenInfo(formData.outputToken, formData.outputChain)
    const inputChainInfo = getChainInfo(formData.inputChain)
    
    if (!inputTokenInfo || !outputTokenInfo || !inputChainInfo) {
      setStatusMessage('Invalid configuration')
      return
    }

    try {
      const isNativeDeposit = aori.isNativeDeposit(quote)
      const inputAmountWei = parseUnits(formData.inputAmount, getTokenDecimals(inputTokenInfo)).toString()

      if (isNativeDeposit) {
        // Native token swap flow
        setStatus('executing-native')
        setStatusMessage('Executing native token deposit...')

        // Switch to input chain for native transaction
        await switchChain({ chainId: inputChainInfo.chainId })

        const executor = createNativeDepositExecutor()
        if (!executor) {
          throw new Error('Failed to create native deposit executor')
        }

        addActivity({
          type: 'native-deposit',
          status: 'starting',
          message: 'Starting native token deposit execution',
          timestamp: new Date(),
          details: {
            inputAmount: inputAmountWei,
            inputToken: 'ETH',
            outputToken: outputTokenInfo.symbol
          }
        })

        // Use the unified executeSwap method for native tokens
        const quoteRequest: QuoteRequest = {
          offerer: address,
          recipient: address,
          inputToken: inputTokenInfo.address,
          outputToken: outputTokenInfo.address,
          inputAmount: inputAmountWei,
          inputChain: formData.inputChain,
          outputChain: formData.outputChain
        }

        const result = await aori.executeSwap(
          quoteRequest,
          { privateKey: '' }, // Empty signer for native deposits
          executor
        )

        if ('txHash' in result) {
          // Native transaction result
          if (result.success) {
            setStatus('completed')
            setStatusMessage('Native deposit completed successfully!')
            setOrderHash(result.txHash)

            addActivity({
              type: 'native-deposit',
              status: 'completed',
              message: `Native deposit completed: ${result.txHash}`,
              timestamp: new Date(),
              orderHash: result.txHash,
              details: result
            })
          } else {
            throw new Error(result.error || 'Native deposit failed')
          }
        } else {
          throw new Error('Unexpected response type for native deposit')
        }

      } else {
        // ERC20 token swap flow
        setStatus('checking-approval')
        setStatusMessage('Checking token approval...')

        // Check current approval
        const isApproved = await checkTokenApproval(
          inputTokenInfo.address as Address,
          inputChainInfo.address as Address,
          inputAmountWei
        )

        // Request approval if needed
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
        setStatusMessage('Please sign the transaction in your wallet...')

        // Switch to input chain for signing
        await switchChain({ chainId: inputChainInfo.chainId })

        // Create adapted wallet client for viem compatibility
        const adaptedWalletClient = {
          signTypedData: async (params: any) => {
            // Check if we need to switch chains based on the domain chainId
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

        // Sign the order using the Aori instance
        const result = await aori.signReadableOrder(
          quote,
          adaptedWalletClient,
          address
        )

        setStatus('submitting')
        setStatusMessage('Submitting swap...')

        const swapRequest: SwapRequest = {
          orderHash: result.orderHash,
          signature: result.signature,
        }

        const swapResponse = await aori.submitSwap(swapRequest)
        setOrderHash(swapResponse.orderHash)
        
        const outputAmount = (BigInt(quote.outputAmount) * BigInt(10 ** 6)) / BigInt(10 ** getTokenDecimals(outputTokenInfo))
        const outputAmountFormatted = (Number(outputAmount) / 10 ** 6).toFixed(6)
        
        addActivity({
          type: 'swap',
          status: 'submitted',
          message: `Swap submitted: ${formData.inputAmount} ${inputTokenInfo.symbol} → ${outputAmountFormatted} ${outputTokenInfo.symbol}`,
          timestamp: new Date(),
          orderHash: swapResponse.orderHash,
          details: {
            inputChain: formData.inputChain,
            outputChain: formData.outputChain,
            inputAmount: inputAmountWei,
            outputAmount: quote.outputAmount,
            inputToken: inputTokenInfo.symbol,
            outputToken: outputTokenInfo.symbol
          }
        })

        // Monitor status using Aori instance
        setStatusMessage('Monitoring swap status...')
        
        try {
          const finalStatus = await aori.pollOrderStatus(swapResponse.orderHash)

          setStatus('completed')
          const statusType = typeof finalStatus === 'object' && 'status' in finalStatus ? finalStatus.status : 'completed'
          setStatusMessage(`Swap ${statusType}!`)
          
          addActivity({
            type: 'swap',
            status: statusType,
            message: `Swap ${statusType}: ${swapResponse.orderHash.slice(0, 10)}...`,
            timestamp: new Date(),
            orderHash: swapResponse.orderHash
          })
        } catch (pollError) {
          console.error('Status polling failed:', pollError)
          setStatusMessage('Swap submitted, but status monitoring failed')
          setStatus('completed')
        }
      }

      // Reset form
      setFormData(prev => ({ ...prev, inputAmount: '' }))
      setQuote(null)

    } catch (error) {
      console.error('Error in handleSwap:', error)
      setStatus('error')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setStatusMessage(`Swap failed: ${errorMessage}`)
      
      addActivity({
        type: 'swap',
        status: 'error',
        message: `Swap failed: ${errorMessage}`,
        timestamp: new Date()
      })
    }
  }

  const isLoading = status !== 'idle' && status !== 'completed' && status !== 'error'
  const inputTokenInfo = getTokenInfo(formData.inputToken, formData.inputChain)
  const outputTokenInfo = getTokenInfo(formData.outputToken, formData.outputChain)
  const outputAmount = quote && outputTokenInfo 
    ? ((BigInt(quote.outputAmount) * BigInt(10 ** 6)) / BigInt(10 ** getTokenDecimals(outputTokenInfo)) / BigInt(10 ** 6)).toString()
    : ''

  // Check if current selection is native token
  const isInputTokenNative = inputTokenInfo ? isNativeToken(inputTokenInfo.address) : false
  const isNativeDepositFlow = quote ? aori?.isNativeDeposit(quote) || false : false

  // Prevent hydration issues by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-zinc-300">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  // Show initialization state
  if (isInitializing || initError) {
    return (
      <div className="min-h-screen bg-zinc-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              {isInitializing ? (
                <>
                  <div className="text-zinc-300 mb-2">Initializing Aori SDK...</div>
                  <div className="text-sm text-zinc-400">Loading chains, tokens, and domain info</div>
                </>
              ) : (
                <>
                  <div className="text-red-400 mb-2">Initialization Failed</div>
                  <div className="text-sm text-zinc-300">{initError}</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const chainKeys = Object.keys(chains)

  return (
    <div className="min-h-screen bg-zinc-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Aori Cross-Chain Swap</h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="text-sm text-zinc-300">
                {wsConnected ? '🟢 WebSocket Connected' : '🔴 WebSocket Disconnected'}
              </div>
              <div className="text-sm text-zinc-300">
                {hasApiKey ? '🔑 API Key Active' : '🔓 No API Key'}
              </div>
              <div className="text-sm text-zinc-300">
                📊 {chainKeys.length} chains, {tokens.length} tokens
              </div>
              {isInputTokenNative && (
                <div className="text-sm text-orange-300">
                  ⚡ Native Token Mode
                </div>
              )}
            </div>
          </div>
          <w3m-button />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Swap Interface */}
          <div className="space-y-6">
            <div className="border-2 border-zinc-600 bg-zinc-800/90 shadow-lg backdrop-blur-lg">
              <div className="p-6 pb-0 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white">Cross-Chain Swap</h2>
                {isConnected && (
                  <button
                    onClick={clearForm}
                    className="text-sm px-3 py-1 text-zinc-300 border border-zinc-500 hover:bg-zinc-700 hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              
              {!isConnected ? (
                <div className="p-6 text-center">
                  <div className="text-zinc-400 mb-4">
                    <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <h3 className="text-lg font-medium">Connect Your Wallet</h3>
                    <p className="mt-2">Connect your wallet to start swapping</p>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {/* From Token */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-200">From</label>
                    <div className="flex gap-2">
                      <select
                        value={formData.inputChain}
                        onChange={(e) => handleInputChange('inputChain', e.target.value)}
                        className="w-32 px-3 py-2 border border-zinc-600 bg-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
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
                        className="w-32 px-3 py-2 border border-zinc-600 bg-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
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
                        className="flex-1 px-3 py-2 border border-zinc-600 bg-zinc-700 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                    {isInputTokenNative && (
                      <div className="text-xs text-orange-300 bg-orange-900/20 border border-orange-600 p-2">
                        ⚡ Native token selected - no approval required, direct transaction execution
                      </div>
                    )}
                  </div>

                  {/* Swap Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={swapTokens}
                      className="p-2 border border-zinc-600 bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-200">To</label>
                    <div className="flex gap-2">
                      <select
                        value={formData.outputChain}
                        onChange={(e) => handleInputChange('outputChain', e.target.value)}
                        className="w-32 px-3 py-2 border border-zinc-600 bg-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
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
                        className="w-32 px-3 py-2 border border-zinc-600 bg-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      >
                        {getTokensByChain(formData.outputChain).map(token => (
                          <option key={`output-${formData.outputChain}-${token.address}`} value={token.address}>
                            {isNativeToken(token.address) ? '⚡ ETH (Native)' : token.symbol}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="0.0"
                        value={outputAmount}
                        readOnly
                        className="flex-1 px-3 py-2 border border-zinc-600 bg-zinc-800 text-white placeholder-zinc-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Quote Display */}
                  {quote && inputTokenInfo && outputTokenInfo && (
                    <div className={`p-3 border ${isNativeDepositFlow ? 'border-orange-500 bg-orange-900/20' : 'border-zinc-600 bg-zinc-800'}`}>
                      <p className="text-sm text-zinc-200">
                        Rate: 1 {inputTokenInfo.symbol} ({formData.inputChain}) = {outputAmount && formData.inputAmount ? (parseFloat(outputAmount) / parseFloat(formData.inputAmount)).toFixed(6) : '0'} {outputTokenInfo.symbol} ({formData.outputChain})
                      </p>
                      {quote.estimatedTime && (
                        <p className="text-xs text-zinc-400 mt-1">
                          Estimated time: {quote.estimatedTime}ms
                        </p>
                      )}
                      {isNativeDepositFlow && (
                        <p className="text-xs text-orange-300 mt-1">
                          ⚡ Native token deposit - transaction will be executed directly
                        </p>
                      )}
                    </div>
                  )}

                  {/* Status Message */}
                  {statusMessage && (
                    <div className={`p-3 border ${
                      status === 'error' ? 'border-red-500 bg-red-900/20 text-red-300' :
                      status === 'completed' ? 'border-green-500 bg-green-900/20 text-green-300' :
                      status === 'executing-native' ? 'border-orange-500 bg-orange-900/20 text-orange-300' :
                      'border-blue-500 bg-blue-900/20 text-blue-300'
                    }`}>
                      <p className="text-sm">{statusMessage}</p>
                    </div>
                  )}

                  {/* Order Hash */}
                  {orderHash && (
                    <div className="p-3 border border-zinc-600 bg-zinc-800">
                      <p className="text-xs text-zinc-200">
                        <strong>{isNativeDepositFlow ? 'Transaction Hash:' : 'Order Hash:'}</strong><br />
                        <code className="text-xs break-all">{orderHash}</code>
                      </p>
                    </div>
                  )}

                  {/* Approval Status */}
                  {quote && !isNativeDepositFlow && (
                    <div className={`p-3 border ${
                      approvalStatus.isApproved ? 'border-green-500 bg-green-900/20' :
                      approvalStatus.checking ? 'border-blue-500 bg-blue-900/20' :
                      'border-yellow-500 bg-yellow-900/20'
                    }`}>
                      <p className="text-sm font-medium">
                        {approvalStatus.checking ? (
                          <span className="text-blue-300">🔍 Checking token approval...</span>
                        ) : approvalStatus.isApproved ? (
                          <span className="text-green-300">✅ Token approved for spending</span>
                        ) : (
                          <span className="text-yellow-300">⚠️ Token approval required</span>
                        )}
                      </p>
                      {approvalStatus.allowance !== '0' && !approvalStatus.checking && (
                        <p className="text-xs text-zinc-400 mt-1">
                          Current allowance: {approvalStatus.allowance}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Native Token Status */}
                  {quote && isNativeDepositFlow && (
                    <div className="p-3 border border-orange-500 bg-orange-900/20">
                      <p className="text-sm font-medium">
                        <span className="text-orange-300">⚡ Native token deposit ready - no approval needed</span>
                      </p>
                      <p className="text-xs text-orange-300 mt-1">
                        Transaction will be executed directly from your wallet
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleGetQuote}
                      disabled={!formData.inputToken || !formData.outputToken || !formData.inputAmount || isLoading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                    >
                      {status === 'getting-quote' ? "Getting Quote..." : "Get Quote"}
                    </button>
                    <button
                      onClick={handleSwap}
                      disabled={!quote || isLoading}
                      className={`flex-1 px-4 py-2 border border-zinc-600 text-white hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${
                        isNativeDepositFlow ? 'bg-orange-600 hover:bg-orange-700' : 'bg-zinc-700'
                      }`}
                    >
                      {status === 'checking-approval' ? "Checking Approval..." :
                       status === 'approving' ? "Approving Token..." :
                       status === 'signing' ? "Sign Transaction..." :
                       status === 'submitting' ? "Submitting..." :
                       status === 'executing-native' ? "Executing Native Deposit..." :
                       isLoading ? "Processing..." : 
                       isNativeDepositFlow ? "⚡ Execute Native Deposit" : "Swap"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="space-y-6">
            <div className="border-2 border-zinc-600 bg-zinc-800/90 shadow-lg backdrop-blur-lg h-[600px]">
              <div className="p-6 pb-0 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Activity Feed ({activity.length})</h3>
                <button
                  onClick={() => setActivity([])}
                  className="text-sm px-3 py-1 text-zinc-300 border border-zinc-500 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="p-6">
                <div className="h-[500px] overflow-y-auto space-y-2 font-mono text-xs">
                  {activity.map((item) => (
                    <div key={item.id} className="p-3 border border-zinc-600 bg-zinc-800">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`font-semibold ${
                          item.status === 'error' ? 'text-red-400' :
                          item.status === 'completed' || item.status === 'received' || item.status === 'connected' ? 'text-green-400' :
                          item.status === 'starting' || item.status === 'pending' ? 'text-blue-400' :
                          item.type === 'native-deposit' ? 'text-orange-400' :
                          'text-zinc-300'
                        }`}>
                          {item.type.toUpperCase()} - {item.status.toUpperCase()}
                        </span>
                        <span className="text-zinc-400 text-xs">
                          {item.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-zinc-200 mb-2">{item.message}</div>
                      {item.orderHash && (
                        <div className="text-zinc-400 text-xs">
                          Hash: {item.orderHash.slice(0, 10)}...{item.orderHash.slice(-6)}
                        </div>
                      )}
                      {item.details && (
                        <pre className="text-xs text-zinc-400 mt-2 whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {JSON.stringify(item.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                  {activity.length === 0 && (
                    <div className="text-center text-zinc-400 mt-8">
                      No activity yet. Connect your wallet and execute a swap to see updates.
                      {!hasApiKey && (
                        <div className="mt-2 text-xs">
                          💡 Add an API key for enhanced features and rate limits.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 