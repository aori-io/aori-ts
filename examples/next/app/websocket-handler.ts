import { useState, useEffect, useRef, useCallback } from 'react';
import { Aori, SubscriptionParams } from '@aori/aori-ts';

interface UseAoriStreamProps {
  aori: Aori | null;
  address?: string;
}

// Simple WebSocket hook with heartbeat for actix-web servers
export function useAoriStream({ aori, address }: UseAoriStreamProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Monitor connection health every 30 seconds
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    
    heartbeatRef.current = setInterval(() => {
      if (!aori?.isConnected()) {
        console.log('Connection lost, reconnecting...');
        connect();
      }
    }, 10000); // 10 seconds
  }, [aori]);

  // Simple reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current || reconnectCount >= 5) return;
    
    const delay = Math.min(1000 * Math.pow(2, reconnectCount), 30000);
    console.log(`Reconnecting in ${delay}ms (attempt ${reconnectCount + 1}/5)`);
    
    reconnectRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setReconnectCount(prev => prev + 1);
        connect();
      }
    }, delay);
  }, [reconnectCount]);

  // Main connection function
  const connect = useCallback(async () => {
    if (!aori || !address || !mountedRef.current) return;

    try {
      // Clear existing timers
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);

      const filter: SubscriptionParams = { recipient: address };
      
      await aori.connect(filter, {
        onConnect: () => {
          console.log('✅ Connected to WebSocket');
          setIsConnected(true);
          setReconnectCount(0);
          startHeartbeat();
        },
        
        onMessage: (event) => {
          // Handle your order events here
          console.log('📨 Received:', event.eventType || 'message');
        },
        
        onDisconnect: () => {
          console.log('❌ WebSocket disconnected');
          setIsConnected(false);
          if (heartbeatRef.current) clearInterval(heartbeatRef.current);
          scheduleReconnect();
        },
        
        onError: (error) => {
          console.log('🚨 WebSocket error:', error);
          setIsConnected(false);
          scheduleReconnect();
        }
      });
      
    } catch (error) {
      console.log('Connection failed:', error);
      scheduleReconnect();
    }
  }, [aori, address, startHeartbeat, scheduleReconnect]);

  // Auto-connect when ready
  useEffect(() => {
    if (aori && address) {
      connect();
    }
    
    return () => {
      mountedRef.current = false;
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      aori?.disconnect();
    };
  }, [aori, address, connect]);

  return {
    isConnected,
    reconnectCount,
    connect,
    disconnect: () => aori?.disconnect()
  };
}
