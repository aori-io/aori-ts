'use client'

import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { SubscriptionParams } from '@aori/aori-ts'
import { useAoriStream } from '../direct-websocket-handler'

export function DirectWebSocketTester() {
  const { address, isConnected: walletConnected } = useAccount()
  const [messages, setMessages] = useState<Array<{ time: string, message: string, type: 'info' | 'success' | 'error' }>>([])
  const [testAddress, setTestAddress] = useState('')
  const [eventType, setEventType] = useState('')
  
  // Environment variables
  const wsUrl = process.env.NEXT_PUBLIC_AORI_WS_URL || 'wss://api.aori.io'
  const apiKey = process.env.NEXT_PUBLIC_AORI_API_KEY
  
  const effectiveAddress = testAddress || address

  // Build subscription filter
  const filter: SubscriptionParams = {}
  if (effectiveAddress) filter.recipient = effectiveAddress
  if (eventType) filter.eventType = eventType

  // Use direct WebSocket connection
  const { 
    isConnected, 
    reconnectCount, 
    lastMessage, 
    connect, 
    disconnect, 
    websocketUrl 
  } = useAoriStream({ 
    filter, 
    wsUrl, 
    apiKey 
  })

  const addMessage = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString()
    setMessages(prev => [{ time, message, type }, ...prev.slice(0, 49)])
  }

  // Monitor connection state
  useEffect(() => {
    if (isConnected) {
      addMessage('WebSocket connected successfully', 'success')
    } else if (effectiveAddress) {
      addMessage('WebSocket disconnected', 'error')
    }
  }, [isConnected, effectiveAddress])

  // Monitor new messages
  useEffect(() => {
    if (lastMessage) {
      const messageStr = lastMessage.raw || JSON.stringify(lastMessage)
      addMessage(`Received: ${messageStr}`, 'info')
    }
  }, [lastMessage])

  // Monitor reconnection attempts
  useEffect(() => {
    if (reconnectCount > 0) {
      addMessage(`Reconnection attempt ${reconnectCount}`, 'info')
    }
  }, [reconnectCount])

  const clearMessages = () => setMessages([])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-2xl font-bold mb-4">Direct WebSocket Connection</h2>
        
        {/* Connection Status */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <div className="flex-1">
            <div className="font-semibold">
              Status: {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            <div className="text-sm text-gray-600">
              Address: {effectiveAddress ? `${effectiveAddress.slice(0, 6)}...${effectiveAddress.slice(-4)}` : 'Not set'}
            </div>
            {reconnectCount > 0 && (
              <div className="text-sm text-orange-600">
                Reconnection attempts: {reconnectCount}/5
              </div>
            )}
          </div>
        </div>

        {/* Connection URL */}
        <div className="mb-6 p-3 bg-gray-100 rounded text-sm font-mono break-all">
          <strong>WebSocket URL:</strong> {websocketUrl || 'Not configured'}
        </div>

        {/* Subscription Filters */}
        <div className="mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Address Filter (leave blank to use wallet):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testAddress}
                onChange={(e) => setTestAddress(e.target.value)}
                placeholder="0x..."
                className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
              />
              <button 
                onClick={() => setTestAddress('')}
                className="px-3 py-2 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600"
              >
                Clear
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Event Type Filter (optional):
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All events</option>
              <option value="created">Created</option>
              <option value="received">Received</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <button 
            onClick={connect}
            className="p-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
          >
            Reconnect
          </button>
          <button 
            onClick={disconnect}
            className="p-3 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
          >
            Disconnect
          </button>
          <button 
            onClick={clearMessages}
            className="p-3 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
          >
            Clear Log
          </button>
        </div>

        {/* Message Log */}
        <div className="bg-black text-green-400 rounded-lg p-4 font-mono text-sm h-80 overflow-y-auto">
          <div className="flex justify-between items-center mb-2 text-gray-400">
            <span>WebSocket Activity Log</span>
            <span>{messages.length} messages</span>
          </div>
          {messages.length === 0 ? (
            <div className="text-gray-500">Waiting for WebSocket events...</div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`mb-1 ${
                msg.type === 'success' ? 'text-green-400' : 
                msg.type === 'error' ? 'text-red-400' : 
                'text-gray-300'
              }`}>
                <span className="text-gray-500">[{msg.time}]</span> {msg.message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Environment Info */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm">
        <h3 className="font-semibold mb-2">Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div>Wallet Connected: {walletConnected ? 'Yes' : 'No'}</div>
          <div>WebSocket URL: {wsUrl}</div>
          <div>API Key: {apiKey ? 'Set' : 'Not set'}</div>
          <div>Effective Address: {effectiveAddress || 'None'}</div>
        </div>
      </div>
    </div>
  )
}
