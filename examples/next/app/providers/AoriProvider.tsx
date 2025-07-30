'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Aori } from '@aori/aori-ts'

const AoriContext = createContext<Aori | null>(null)

// Initialize Aori instance at module level
const apiKey = process.env.NEXT_PUBLIC_AORI_API_KEY
const apiBaseUrl = process.env.NEXT_PUBLIC_AORI_API_URL || 'https://api.aori.io'
const wsBaseUrl = process.env.NEXT_PUBLIC_AORI_WS_URL || 'wss://api.aori.io'

// Custom domain for testing (useful when API doesn't support domain endpoint)
const customDomain = {
  domainTypeString: "EIP712Domain(string name,string version,address verifyingContract)",
  name: "Aori",
  orderTypeString: "Order(uint128 inputAmount,uint128 outputAmount,address inputToken,address outputToken,uint32 startTime,uint32 endTime,uint32 srcEid,uint32 dstEid,address offerer,address recipient)",
  version: "0.3.1"
}

// Create the promise once at module level
console.log('Initializing Aori with:', { apiBaseUrl, wsBaseUrl, hasApiKey: !!apiKey })

// Define create parameters
const loadTokens = false;
const chains = undefined; // fetch from API
const domain = customDomain; // use custom domain

const aoriPromise = Aori.create(
  apiBaseUrl,
  wsBaseUrl,
  apiKey || undefined,
  loadTokens,
  chains,
  domain
)

export function useAori() {
  const context = useContext(AoriContext)
  return context // Can be null while loading
}

export function AoriProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [aoriInstance, setAoriInstance] = useState<Aori | null>(null)

  useEffect(() => {
    aoriPromise
      .then((instance) => {
        console.log('Aori instance created successfully:', instance)
        setAoriInstance(instance)
      })
      .catch((error) => {
        console.error('Failed to create Aori instance:', error)
      })
  }, [])

  return (
    <AoriContext.Provider value={aoriInstance}>
      {children}
    </AoriContext.Provider>
  )
}
