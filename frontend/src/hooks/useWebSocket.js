import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook personnalisé pour WebSocket temps réel
 * Gère la connexion, reconnexion automatique et événements
 */
const useWebSocket = (userId, onMessage) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const reconnectDelay = 3000; // 3 secondes

  const connect = useCallback(() => {
    if (!userId) {
      console.warn('⚠️ No userId provided, skipping WebSocket connection');
      return;
    }

    // Ne pas reconnecter si déjà connecté
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Construire l'URL WebSocket basée sur REACT_APP_BACKEND_URL
      const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
      
      // Remplacer http/https par ws/wss
      const wsUrl = backendUrl.replace(/^http/, 'ws') + `/ws/${userId}`;
      
      console.log('🔌 Connecting to WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // Heartbeat toutes les 30 secondes
        const heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);
        
        ws.heartbeatInterval = heartbeatInterval;
      };

      ws.onmessage = (event) => {
        try {
          // Ignorer les pongs
          if (event.data === 'pong') return;
          
          const message = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', message.type);
          
          setLastMessage(message);
          
          // Appeler le callback avec le message
          if (onMessage) {
            onMessage(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        
        // Nettoyer le heartbeat
        if (ws.heartbeatInterval) {
          clearInterval(ws.heartbeatInterval);
        }
        
        // Tenter une reconnexion automatique
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          console.log(`🔄 Attempting reconnection (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else {
          console.error('❌ Max reconnection attempts reached');
        }
      };

      wsRef.current = ws;
      
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, [userId, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      if (wsRef.current.heartbeatInterval) {
        clearInterval(wsRef.current.heartbeatInterval);
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  // Connexion au montage du composant
  useEffect(() => {
    connect();
    
    // Nettoyage à la déconnexion
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    reconnect: connect,
    disconnect
  };
};

export default useWebSocket;
