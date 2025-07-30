'use client'

import { useAori } from './providers/AoriProvider'
import { SwapForm } from './components/SwapForm'
import { ActivityFeed } from './components/ActivityFeed'
import Image from 'next/image'

function LoadingOverlay({ isVisible, message }: { isVisible: boolean; message: string }) {
  if (!isVisible) return null
  
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-title">{message}</div>
        <div className="loading-subtitle">Loading chains, tokens, and domain info</div>
      </div>
    </div>
  )
}

export default function CryptoSwap() {
  const aori = useAori()
  const isLoading = !aori

  return (
    <div className="page-container">
      <div className="main-container">
        {/* Header */}
        <div className="header">
          <div className="flex items-center gap-6">
            <Image src="/aori-ts.png" alt="Aori Logo" className="h-8 w-auto" width={120} height={60} />
            <p className="text-xl">Next.js Demo</p>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="/cancel" 
              className="btn btn-clear"
            >
              Cancel Test
            </a>
            <w3m-button balance="hide" />
          </div>
        </div>

        {/* Main Content */}
        <div className="grid-layout">
          <SwapForm />
          <ActivityFeed />
        </div>

        {/* Loading Overlay */}
        <LoadingOverlay 
          isVisible={isLoading} 
          message="Initializing Aori SDK..." 
        />
      </div>
    </div>
  )
} 