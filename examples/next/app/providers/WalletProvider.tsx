'use client'

import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, base, optimism } from '@reown/appkit/networks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import React from 'react'

// 1. Get projectId from https://cloud.reown.com
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "b56e18d47c72ab683b10814fe9495694"

if (!projectId) {
  throw new Error('Project ID is not set. Please set NEXT_PUBLIC_PROJECT_ID environment variable.')
}

// Get the correct URL for development vs production
const getAppUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://aori.io'
}

// 2. Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [mainnet, arbitrum, base, optimism]
})

// 3. Create modal with proper error handling
let appKitInstance: any = null

try {
  appKitInstance = createAppKit({
    adapters: [wagmiAdapter],
    networks: [mainnet, arbitrum, base, optimism],
    projectId,
    metadata: {
      name: 'Aori Swap Example',
      description: 'A simple cross-chain swap application using Aori',
      url: getAppUrl(),
      icons: [`${getAppUrl()}/aori-ts.png`]
    },
    featuredWalletIds: [
      'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
      '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
      '18388be9ac2d02726dbac9777c96efaac06d744b2f6d580fccdd4127a6d01fd1', // Rabby Wallet
    ],
    enableEIP6963: true, // Enable EIP-6963 for better wallet detection
    enableInjected: true, // Enable injected wallet support
    enableWalletConnect: true, // Enable WalletConnect
    enableCoinbase: true // Enable Coinbase Wallet
  })
} catch (error) {
  console.warn('AppKit initialization error (likely due to multiple wallet providers):', error)
}

const queryClient = new QueryClient()

export function WalletProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
} 