'use client'

import React, { useState, useEffect, useRef } from 'react'

export function SimpleWebSocketTester() {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<string[]>([])
  const [wsUrl, setWsUrl] = useState('ws://localhost:8080/stream')
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)

  const addMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setMessages(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)])
  }

  const startHeartbeat = () => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    
    heartbeatRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          // Send a simple ping message to keep connection alive
          wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
          addMessage('💓 Sent ping')
        } catch (error) {
          addMessage('❌ Failed to send ping')
        }
      }
    }, 1000) // Every 30 seconds
  }

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }

  const connect = () => {
    if (wsRef.current) {
      wsRef.current.close()
    }

    try {
      console.log('Connecting to:', wsUrl)
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        addMessage('✅ Connected to WebSocket')
        startHeartbeat()
      }

      ws.onmessage = (event) => {
        const data = event.data
        
        // Check if it's a pong response
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'pong') {
            addMessage('🏓 Received pong')
            return
          }
        } catch (e) {
          // Not JSON, treat as regular message
        }
        
        addMessage(`📨 ${data}`)
      }

      ws.onclose = (event) => {
        setIsConnected(false)
        stopHeartbeat()
        const reason = event.reason || 'No reason'
        const codeExplanation = event.code === 1006 ? ' (abnormal closure - likely timeout)' : ''
        addMessage(`❌ Disconnected (${event.code}${codeExplanation}: ${reason})`)
      }

      ws.onerror = (error) => {
        addMessage('🚨 WebSocket error occurred')
        console.error('WebSocket error:', error)
      }

    } catch (error) {
      addMessage('💥 Failed to create WebSocket connection')
      console.error('Connection error:', error)
    }
  }

  const disconnect = () => {
    stopHeartbeat()
    if (wsRef.current) {
      wsRef.current.close()
    }
  }

  const clearMessages = () => {
    setMessages([])
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHeartbeat()
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Simple WebSocket Tester</h1>
      
      {/* Connection Controls */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">WebSocket URL:</label>
          <input
            type="text"
            value={wsUrl}
            onChange={(e) => setWsUrl(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded text-sm font-mono"
            placeholder="ws://localhost:8080/stream"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={connect}
            disabled={isConnected}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
          >
            {isConnected ? '🟢 Connected' : '🔵 Connect'}
          </button>
          
          <button
            onClick={disconnect}
            disabled={!isConnected}
            className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-400"
          >
            🛑 Disconnect
          </button>
          
          <button
            onClick={clearMessages}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            🧹 Clear
          </button>
        </div>
      </div>

      {/* Status */}
      <div className={`p-3 rounded text-sm font-medium ${
        isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        Status: {isConnected ? 'Connected' : 'Disconnected'}
      </div>

      {/* Message Log */}
      <div className="bg-black text-green-400 rounded p-4 h-80 overflow-y-auto font-mono text-sm">
        <div className="mb-2 text-gray-400">
          📝 Messages ({messages.length})
        </div>
        {messages.length === 0 ? (
          <div className="text-gray-500">No messages yet...</div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className="mb-1">
              {msg}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
