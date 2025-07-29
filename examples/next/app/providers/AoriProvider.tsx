'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Aori } from '@aori/aori-ts'

const AoriContext = createContext<Aori | null>(null)

// Initialize Aori instance at module level
const apiKey = process.env.NEXT_PUBLIC_AORI_API_KEY
const apiBaseUrl = process.env.NEXT_PUBLIC_AORI_API_URL || 'https://dev.api.aori.io'
const wsBaseUrl = process.env.NEXT_PUBLIC_AORI_WS_URL || 'wss://dev.api.aori.io'

// Create the promise once at module level
console.log('Initializing Aori with:', { apiBaseUrl, wsBaseUrl, hasApiKey: !!apiKey })
const aoriPromise = Aori.create(
  apiBaseUrl,
  wsBaseUrl,
  apiKey || undefined,
  true // loadTokens = true
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
