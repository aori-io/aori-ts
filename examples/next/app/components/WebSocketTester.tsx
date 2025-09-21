'use client'

import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useAori } from '../AoriProvider'
import { useAoriStream } from '../websocket-handler'

// Test component to validate WebSocket heartbeat functionality
export function WebSocketTester() {
  const { address, isConnected: walletConnected } = useAccount()
  const aori = useAori()
  const [messages, setMessages] = useState<Array<{ time: string, message: string, type: 'info' | 'success' | 'error' | 'heartbeat' }>>([])
  const [testAddress, setTestAddress] = useState('')
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 Debug - WebSocketTester state:', {
      aori: !!aori,
      address: address,
      walletConnected,
      testAddress,
      effectiveAddress: testAddress || address,
      wsBaseUrl: process.env.NEXT_PUBLIC_AORI_WS_URL,
      apiBaseUrl: process.env.NEXT_PUBLIC_AORI_API_URL
    })
  }, [aori, address, walletConnected, testAddress])
  
  // Use our heartbeat hook
  const { isConnected, reconnectCount, connect, disconnect } = useAoriStream({ 
    aori, 
    address: testAddress || address 
  })

  // Use the provided address or allow manual override for testing
  const effectiveAddress = testAddress || address

  const addMessage = (message: string, type: 'info' | 'success' | 'error' | 'heartbeat' = 'info') => {
    const time = new Date().toLocaleTimeString()
    setMessages(prev => [{ time, message, type }, ...prev.slice(0, 49)]) // Keep last 50 messages
  }

  // Monitor connection state changes
  useEffect(() => {
    console.log('Connection state changed:', { isConnected, aori: !!aori, address: effectiveAddress })
    if (isConnected) {
      addMessage('✅ WebSocket connected successfully!', 'success')
    } else if (aori && effectiveAddress) {
      addMessage('❌ WebSocket disconnected', 'error')
    }
  }, [isConnected, aori, effectiveAddress])

  // Monitor reconnection attempts
  useEffect(() => {
    if (reconnectCount > 0) {
      addMessage(`🔄 Reconnection attempt #${reconnectCount}`, 'info')
    }
  }, [reconnectCount])

  // Simulate various test scenarios
  const testScenarios = {
    forceReconnect: () => {
      addMessage('🧪 Test: Forcing reconnection...', 'info')
      disconnect()
      setTimeout(() => connect(), 1000)
    },
    
    testWithDifferentAddress: () => {
      const testAddr = '0x1234567890123456789012345678901234567890'
      setTestAddress(testAddr)
      addMessage(`🧪 Test: Switching to test address ${testAddr.slice(0, 10)}...`, 'info')
    },
    
    clearTestAddress: () => {
      setTestAddress('')
      addMessage('🧪 Test: Restored to wallet address', 'info')
    },

    simulateNetworkIssue: () => {
      addMessage('🧪 Test: Simulating network issue (disconnect for 5 seconds)', 'info')
      disconnect()
      setTimeout(() => {
        addMessage('🧪 Test: Network restored, reconnecting...', 'info')
        connect()
      }, 5000)
    }
  }

  const clearMessages = () => setMessages([])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-2xl font-bold mb-4">🧪 WebSocket Heartbeat Tester</h2>
        
        {/* Connection Status */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <div className="flex-1">
            <div className="font-semibold">
              Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
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

        {/* Manual Address Override */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Test Address Override (leave blank to use wallet):
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
              onClick={testScenarios.clearTestAddress}
              className="px-3 py-2 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Test Scenarios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <button 
            onClick={testScenarios.forceReconnect}
            className="p-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
          >
            🔄 Test Reconnection
          </button>
          <button 
            onClick={testScenarios.testWithDifferentAddress}
            className="p-3 bg-purple-500 text-white rounded-md hover:bg-purple-600 text-sm"
          >
            🎯 Test Different Address
          </button>
          <button 
            onClick={testScenarios.simulateNetworkIssue}
            className="p-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-sm"
          >
            📡 Simulate Network Issue
          </button>
          <button 
            onClick={clearMessages}
            className="p-3 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
          >
            🧹 Clear Messages
          </button>
        </div>

        {/* Real-time Message Log */}
        <div className="bg-black text-green-400 rounded-lg p-4 font-mono text-sm h-80 overflow-y-auto">
          <div className="flex justify-between items-center mb-2 text-gray-400">
            <span>📝 Real-time WebSocket Log</span>
            <span>{messages.length} messages</span>
          </div>
          {messages.length === 0 ? (
            <div className="text-gray-500">Waiting for WebSocket events...</div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`mb-1 ${
                msg.type === 'success' ? 'text-green-400' : 
                msg.type === 'error' ? 'text-red-400' : 
                msg.type === 'heartbeat' ? 'text-blue-400' : 
                'text-gray-300'
              }`}>
                <span className="text-gray-500">[{msg.time}]</span> {msg.message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Testing Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">🔍 How to Test</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div><strong>1. Basic Connection:</strong> Connect your wallet and watch the status change</div>
          <div><strong>2. Heartbeat:</strong> Wait 30 seconds to see heartbeat messages in your server logs</div>
          <div><strong>3. Reconnection:</strong> Click "Test Reconnection" to see exponential backoff</div>
          <div><strong>4. Network Issues:</strong> Click "Simulate Network Issue" to test recovery</div>
          <div><strong>5. Server Restart:</strong> Restart your server and watch auto-reconnection</div>
          <div><strong>6. Browser DevTools:</strong> Open Network tab to see WebSocket frames</div>
        </div>
      </div>

      {/* Environment Info */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm">
        <h3 className="font-semibold mb-2">🔧 Environment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div>Wallet Connected: {walletConnected ? '✅' : '❌'}</div>
          <div>Aori Instance: {aori ? '✅' : '❌'}</div>
          <div>WebSocket URL: {process.env.NEXT_PUBLIC_AORI_WS_URL || 'Not set'}</div>
          <div>API Key: {process.env.NEXT_PUBLIC_AORI_API_KEY ? '✅ Set' : '❌ Not set'}</div>
        </div>
      </div>
    </div>
  )
}
