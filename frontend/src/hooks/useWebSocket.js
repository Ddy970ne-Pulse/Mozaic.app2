import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook WebSocket avec heartbeat, authentification et reconnexion automatique
 * 
 * Usage:
 * const { isConnected, lastMessage, sendMessage } = useWebSocket(userId);
 */
export const useWebSocket = (userId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const heartbeatIntervalRef = useRef(null);

  const connect = useCallback(() => {
    if (!userId) {
      console.warn('⚠️ Cannot connect WebSocket: missing userId');
      return;
    }

    // Construire l'URL WebSocket
    const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
    const wsProtocol = backendUrl.startsWith('https') ? 'wss:' : 'ws:';
    const wsHost = backendUrl.replace(/^https?:\/\//, '');
    
    // Obtenir le token (optionnel pour développement)
    const token = localStorage.getItem('token');
    const wsUrl = token 
      ? `${wsProtocol}//${wsHost}/api/ws/${userId}?token=${token}`
      : `${wsProtocol}//${wsHost}/api/ws/${userId}`;
    
    console.log(`🔌 Connecting to WebSocket: ${wsProtocol}//${wsHost}/api/ws/${userId}`);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Démarrer le heartbeat client-side (pong en réponse aux pings)
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000); // 25 secondes (moins que le serveur)
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Ne pas logger les pings/pongs pour éviter le spam
          if (message.type !== 'ping' && message.type !== 'pong') {
            console.log('📨 WebSocket message:', message.type, message);
          }
          
          if (message.type === 'ping') {
            // Répondre au ping du serveur
            ws.send(JSON.stringify({ type: 'pong' }));
          } else if (message.type === 'pong') {
            // Serveur a répondu à notre ping, tout va bien
          } else if (message.type === 'connected') {
            // Message de bienvenue
            console.log('🎉 WebSocket connection confirmed:', message.data.message);
          } else {
            // Autres messages
            setLastMessage(message);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed: ${event.code}${event.reason ? ' - ' + event.reason : ''}`);
        setIsConnected(false);
        
        // Arrêter le heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Reconnexion automatique avec backoff exponentiel
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`🔄 Attempting reconnection (${reconnectAttempts.current}/${maxReconnectAttempts}) in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error('❌ Max reconnection attempts reached');
        }
      };

      wsRef.current = ws;
      
    } catch (error) {
      console.error('❌ Error creating WebSocket:', error);
    }
  }, [userId]);

  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      console.log('📤 Sent message:', message.type);
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message');
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting WebSocket...');
    
    // Arrêter les tentatives de reconnexion
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Arrêter le heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    // Fermer la connexion
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (userId) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    disconnect,
    reconnect: connect
  };
};

export default useWebSocket;
