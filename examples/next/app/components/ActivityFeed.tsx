'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useAori } from '../providers/AoriProvider'
import type { SubscriptionParams, WebSocketCallbacks } from '@aori/aori-ts'

type ActivityItem = {
  id: string
  type: 'swap' | 'quote' | 'websocket' | 'status' | 'initialization' | 'native-swap'
  status: string
  message: string
  timestamp: Date
  orderHash?: string
  details?: any
}

export function ActivityFeed() {
  const { address, isConnected } = useAccount()
  const aori = useAori()
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const [mounted, setMounted] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_AORI_API_KEY

  // Set mounted to true after component mounts
  useEffect(() => {
    setMounted(true)
  }, [])

  const addActivity = (item: Omit<ActivityItem, 'id'>) => {
    // Only add activity if component is mounted (client-side only)
    if (!mounted) return
    
    const newItem: ActivityItem = {
      ...item,
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`
    }
    setActivity(prev => [newItem, ...prev.slice(0, 99)])
  }

  const clearActivity = () => {
    setActivity([])
  }

  // Simple WebSocket connection effect with reconnection
  useEffect(() => {
    if (!aori || !address || !isConnected || !mounted) return

    addActivity({
      type: 'initialization',
      status: 'completed',
      message: `Aori SDK ready - ${Object.keys(aori.getAllChains()).length} chains, ${aori.getAllTokens().length} tokens`,
      timestamp: new Date()
    })

    const connectWebSocket = async () => {
      try {
        console.log('Attempting WebSocket connection with:', { 
          address, 
          aoriExists: !!aori, 
          hasConnectMethod: aori && typeof aori.connect === 'function',
          wsBaseUrl: aori.wsBaseUrl,
          apiKey: !!apiKey
        })
        
        const filter: SubscriptionParams = {
          offerer: address,
          recipient: address
        }
        
        const callbacks: WebSocketCallbacks = {
          onConnect: () => {
            setWsConnected(true)
            addActivity({
              type: 'websocket',
              status: 'connected',
              message: 'WebSocket connected',
              timestamp: new Date()
            })
          },
          onDisconnect: () => {
            setWsConnected(false)
            addActivity({
              type: 'websocket',
              status: 'disconnected',
              message: 'WebSocket disconnected, reconnecting...',
              timestamp: new Date()
            })
            
            // Simple reconnection after 3 seconds
            setTimeout(() => {
              if (mounted && aori && address && isConnected) {
                connectWebSocket()
              }
            }, 1000)
          },
          onMessage: (event: any) => {
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
            addActivity({
              type: 'websocket',
              status: 'error',
              message: `WebSocket error: ${error?.message || 'Connection failed'}`,
              timestamp: new Date()
            })
          }
        }
        
        if (!aori.connect || typeof aori.connect !== 'function') {
          throw new Error('Aori instance does not have a connect method')
        }
        
        addActivity({
          type: 'websocket',
          status: 'connecting',
          message: 'Establishing WebSocket connection...',
          timestamp: new Date()
        })
        
        console.log('Calling aori.connect with filter:', filter)
        const result = await aori.connect(filter, callbacks)
        console.log('WebSocket connection result:', result)
        
      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
        addActivity({
          type: 'websocket',
          status: 'error',
          message: `WebSocket connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        })
        
        // Retry connection after 1 seconds on failure
        setTimeout(() => {
          if (mounted && aori && address && isConnected) {
            connectWebSocket()
          }
        }, 1000)
      }
    }

    connectWebSocket()

    return () => {
      if (aori) {
        aori.disconnect()
      }
    }
  }, [aori, address, isConnected, mounted])
  return (
    <div>
      <div className="card activity-feed">
        <div className="card-header">
          <h3 className="card-title">Activity Feed ({mounted ? activity.length : 0})</h3>
          {mounted && (
            <button
              onClick={clearActivity}
              className="btn btn-clear"
            >
              Clear
            </button>
          )}
        </div>
        <div className="card-content">
          <div className="activity-scroll">
            {activity.map((item) => (
              <div key={item.id} className="activity-item">
                <div className="activity-item-header">
                  <span className={`activity-status ${
                    item.status === 'error' ? 'error' :
                    item.status === 'completed' || item.status === 'received' || item.status === 'connected' ? 'completed' :
                    item.status === 'starting' || item.status === 'pending' ? 'pending' :
                    item.type === 'native-swap' ? 'native-swap' :
                    'default'
                  }`}>
                    {item.type.toUpperCase()} - {item.status.toUpperCase()}
                  </span>
                  <span className="activity-timestamp">
                    {item.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="activity-message">{item.message}</div>
                {item.orderHash && (
                  <div className="activity-hash">
                    Hash: {item.orderHash.slice(0, 10)}...{item.orderHash.slice(-6)}
                  </div>
                )}
                {item.details && (
                  <pre className="activity-details">
                    {JSON.stringify(item.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
            {activity.length === 0 && (
              <div className="activity-empty">
                {mounted ? (
                  <>
                    No activity yet. Connect your wallet and execute a swap to see updates.
                  </>
                ) : (
                  "Loading activity..."
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 