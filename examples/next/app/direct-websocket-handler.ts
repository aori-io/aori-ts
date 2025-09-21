import { useState, useEffect, useRef, useCallback } from 'react';
import { SubscriptionParams } from '@aori/aori-ts';

interface AoriStreamProps {
  filter?: SubscriptionParams;
  wsUrl?: string;
  apiKey?: string;
}

// Direct WebSocket connection without Aori SDK
export function useAoriStream({ filter, wsUrl, apiKey }: AoriStreamProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [lastMessage, setLastMessage] = useState<any>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Build WebSocket URL with subscription parameters
  const buildWsUrl = useCallback(() => {
    if (!wsUrl) return null;
    
    const url = new URL('/stream', wsUrl);
    
    // Add API key if provided
    if (apiKey) {
      url.searchParams.append('key', apiKey);
    }
    
    // Add all filter parameters
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value) {
          url.searchParams.append(key, value);
        }
      });
    }
    
    return url.toString();
  }, [wsUrl, apiKey, filter]);

  // Send client pings to keep connection alive (server no longer sends pings)
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    
    heartbeatRef.current = setInterval(() => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        console.log('Connection lost, reconnecting...');
        connect();
      } else {
        try {
          // Send JSON ping to reset server heartbeat timer
          wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          console.log('Sent ping to server');
        } catch (error) {
          console.log('Failed to send ping');
          connect();
        }
      }
    }, 25000); // Send ping every 25 seconds (server timeout is 60s)
  }, []);

  // Reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current || reconnectCount >= 5) return;
    
    const delay = Math.min(1000 * Math.pow(2, reconnectCount), 1000);
    console.log(`Reconnecting in ${delay}ms (attempt ${reconnectCount + 1}/5)`);
    
    reconnectRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setReconnectCount(prev => prev + 1);
        connect();
      }
    }, delay);
  }, [reconnectCount]);

  // Main connection function
  const connect = useCallback(() => {
    const fullWsUrl = buildWsUrl();
    if (!fullWsUrl || !mountedRef.current) return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Clear existing timers
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (reconnectRef.current) clearTimeout(reconnectRef.current);

    console.log('Connecting to:', fullWsUrl);

    try {
      const ws = new WebSocket(fullWsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setReconnectCount(0);
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const data = JSON.parse(event.data);
          console.log('Received message:', data);
          setLastMessage(data);
        } catch (error) {
          console.log('Received raw message:', event.data);
          setLastMessage({ raw: event.data });
        }
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        
        console.log('WebSocket closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        
        setIsConnected(false);
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        
        // Only reconnect if it wasn't a clean close
        if (!event.wasClean || event.code !== 1000) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        if (!mountedRef.current) return;
        
        console.error('WebSocket error:', error);
        setIsConnected(false);
        scheduleReconnect();
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      scheduleReconnect();
    }
  }, [buildWsUrl, startHeartbeat, scheduleReconnect]);

  // Auto-connect when URL is available (empty filter = no filtering, shows all events)
  useEffect(() => {
    if (wsUrl) {
      connect();
    }
    
    return () => {
      mountedRef.current = false;
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [wsUrl, filter, connect]);

  // Manual disconnect
  const disconnect = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    if (wsRef.current) {
      wsRef.current.close();
    }
    setIsConnected(false);
    setReconnectCount(0);
  }, []);

  return {
    isConnected,
    reconnectCount,
    lastMessage,
    connect,
    disconnect,
    websocketUrl: buildWsUrl()
  };
}
