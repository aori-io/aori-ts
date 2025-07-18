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

// 2. Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [mainnet, arbitrum, base, optimism]
})

// 3. Create modal
createAppKit({
  adapters: [wagmiAdapter],
  networks: [mainnet, arbitrum, base, optimism],
  projectId,
  metadata: {
    name: 'Aori Swap Example',
    description: 'A simple cross-chain swap application using Aori',
    url: 'https://aori.io',
    icons: ['https://aori.io/favicon.ico']
  }
})

const queryClient = new QueryClient()

export function AppKitProvider({ 
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