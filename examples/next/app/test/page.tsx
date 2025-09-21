'use client'

import { SimpleWebSocketTester } from '../components/SimpleWebSocketTester'

// Simple WebSocket test page
export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <SimpleWebSocketTester />
    </div>
  )
}
