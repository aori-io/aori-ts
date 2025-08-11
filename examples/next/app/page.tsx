'use client'

import { useState } from 'react'
import { useAori } from './AoriProvider'
import { SwapForm } from './components/SwapForm'
import { ActivityFeed } from './components/ActivityFeed'
import CancelOrderModal from './components/CancelOrderModal'
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
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)

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
            <button 
              onClick={() => setIsCancelModalOpen(true)}
              className="btn btn-clear"
            >
              Cancel Demo
            </button>
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

        {/* Cancel Order Modal */}
        <CancelOrderModal 
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
        />
      </div>
    </div>
  )
} 