"""
WebSocket Manager pour MOZAIK RH
Gestion centralisée des connexions WebSocket temps réel
Version améliorée avec heartbeat, thread-safety et gestion d'erreurs robuste
"""
from fastapi import WebSocket
from typing import Dict, Set, Optional
import json
import logging
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Gestionnaire de connexions WebSocket avec:
    - Heartbeat automatique (ping/pong)
    - Thread-safety avec asyncio.Lock
    - Nettoyage automatique des connexions mortes
    - Broadcast ciblé et global
    """
    
    def __init__(self):
        # user_id -> Set[WebSocket]
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Toutes les connexions actives
        self.all_connections: Set[WebSocket] = set()
        # Lock pour éviter les race conditions
        self._lock = asyncio.Lock()
        # Task heartbeat
        self._heartbeat_task: Optional[asyncio.Task] = None
        # Intervalle heartbeat en secondes
        self._heartbeat_interval = 30
        
    async def connect(self, websocket: WebSocket, user_id: str):
        """
        Accepter et enregistrer une nouvelle connexion WebSocket
        Thread-safe avec asyncio.Lock
        """
        await websocket.accept()
        
        async with self._lock:
            self.all_connections.add(websocket)
            
            if user_id not in self.active_connections:
                self.active_connections[user_id] = set()
            self.active_connections[user_id].add(websocket)
        
        logger.info(
            f"✅ WebSocket connected: user_id={user_id}, "
            f"total_connections={len(self.all_connections)}, "
            f"user_connections={len(self.active_connections[user_id])}"
        )
        
        # Démarrer le heartbeat si pas déjà actif
        if not self._heartbeat_task or self._heartbeat_task.done():
            self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
            logger.info("💓 Heartbeat loop started")
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        """
        Déconnecter et nettoyer une connexion WebSocket
        """
        self.all_connections.discard(websocket)
        
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            # Nettoyer l'entrée user si plus aucune connexion
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        logger.info(
            f"❌ WebSocket disconnected: user_id={user_id}, "
            f"remaining_connections={len(self.all_connections)}"
        )
    
    async def _heartbeat_loop(self):
        """
        Boucle de heartbeat pour maintenir les connexions vivantes
        Envoie des pings toutes les 30 secondes et nettoie les connexions mortes
        """
        logger.info(f"💓 Starting heartbeat loop (interval: {self._heartbeat_interval}s)")
        
        while self.all_connections:
            await asyncio.sleep(self._heartbeat_interval)
            
            if not self.all_connections:
                break
            
            logger.debug(f"💓 Sending heartbeat to {len(self.all_connections)} connections")
            
            dead_connections = []
            async with self._lock:
                for connection in list(self.all_connections):
                    try:
                        await connection.send_json({
                            "type": "ping",
                            "timestamp": datetime.utcnow().isoformat()
                        })
                    except Exception as e:
                        logger.warning(f"⚠️ Dead connection detected during heartbeat: {str(e)}")
                        dead_connections.append(connection)
            
            # Nettoyer les connexions mortes (en dehors du lock)
            for conn in dead_connections:
                await self._cleanup_dead_connection(conn)
            
            if dead_connections:
                logger.info(f"🧹 Cleaned up {len(dead_connections)} dead connections")
        
        self._heartbeat_task = None
        logger.info("💓 Heartbeat loop stopped (no more connections)")
    
    async def _cleanup_dead_connection(self, connection: WebSocket):
        """Nettoyer une connexion morte"""
        for user_id, conns in list(self.active_connections.items()):
            if connection in conns:
                self.disconnect(connection, user_id)
                logger.info(f"🧹 Cleaned up dead connection for user: {user_id}")
                break
    
    def _get_user_for_connection(self, connection: WebSocket) -> Optional[str]:
        """Trouver le user_id d'une connexion"""
        for user_id, conns in self.active_connections.items():
            if connection in conns:
                return user_id
        return None
    
    async def send_personal_message(self, message: dict, user_id: str):
        """
        Envoyer un message à un utilisateur spécifique
        Thread-safe avec gestion robuste des erreurs
        """
        async with self._lock:
            if user_id not in self.active_connections:
                logger.warning(f"⚠️ User {user_id} not connected, cannot send message")
                return
            
            connections = list(self.active_connections[user_id])
        
        # Envoyer en dehors du lock pour éviter les blocages
        dead_connections = []
        for connection in connections:
            try:
                await connection.send_json(message)
                logger.debug(f"📤 Message sent to user {user_id}: {message.get('type')}")
            except Exception as e:
                logger.error(f"❌ Error sending to user {user_id}: {str(e)}")
                dead_connections.append(connection)
        
        # Nettoyer les connexions mortes
        for conn in dead_connections:
            await self._cleanup_dead_connection(conn)
    
    async def broadcast(self, message: dict, exclude_user: str = None):
        """
        Envoyer un message à tous les utilisateurs connectés
        Thread-safe avec gestion robuste des erreurs
        """
        async with self._lock:
            connections_to_send = []
            for connection in list(self.all_connections):
                # Trouver le user_id de cette connexion
                user_id = self._get_user_for_connection(connection)
                
                # Exclure l'utilisateur si demandé
                if exclude_user and user_id == exclude_user:
                    continue
                
                connections_to_send.append((connection, user_id))
        
        logger.info(f"📡 Broadcasting to {len(connections_to_send)} connections: {message.get('type')}")
        
        # Envoyer en dehors du lock pour éviter les blocages
        dead_connections = []
        for connection, user_id in connections_to_send:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"❌ Error broadcasting to user {user_id}: {str(e)}")
                dead_connections.append(connection)
        
        # Nettoyer les connexions mortes
        for conn in dead_connections:
            await self._cleanup_dead_connection(conn)
        
        if dead_connections:
            logger.info(f"🧹 Cleaned up {len(dead_connections)} dead connections during broadcast")
    
    async def broadcast_absence_created(self, absence_data: dict, creator_id: str):
        """Notifier tous les utilisateurs qu'une absence a été créée"""
        await self.broadcast({
            "type": "absence_created",
            "data": absence_data
        }, exclude_user=creator_id)
    
    async def broadcast_absence_updated(self, absence_data: dict, updater_id: str):
        """Notifier tous les utilisateurs qu'une absence a été modifiée"""
        await self.broadcast({
            "type": "absence_updated",
            "data": absence_data
        }, exclude_user=updater_id)
    
    async def broadcast_absence_deleted(self, absence_id: str, deleter_id: str):
        """Notifier tous les utilisateurs qu'une absence a été supprimée"""
        await self.broadcast({
            "type": "absence_deleted",
            "data": {"id": absence_id}
        }, exclude_user=deleter_id)
    
    async def broadcast_user_connected(self, user_name: str):
        """Notifier qu'un utilisateur s'est connecté"""
        await self.broadcast({
            "type": "user_connected",
            "data": {"name": user_name}
        })
    
    def get_connected_users_count(self) -> int:
        """Retourner le nombre d'utilisateurs connectés"""
        return len(self.active_connections)
    
    def get_connection_stats(self) -> dict:
        """Retourner les statistiques de connexion"""
        return {
            "total_connections": len(self.all_connections),
            "connected_users": len(self.active_connections),
            "heartbeat_active": self._heartbeat_task is not None and not self._heartbeat_task.done(),
            "connections_per_user": {
                user_id: len(conns) 
                for user_id, conns in self.active_connections.items()
            }
        }
    
    async def shutdown(self):
        """
        Arrêt propre du gestionnaire de connexions
        Ferme toutes les connexions et arrête le heartbeat
        """
        logger.info("🔄 Shutting down WebSocket manager...")
        
        # Arrêter le heartbeat
        if self._heartbeat_task and not self._heartbeat_task.done():
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass
            logger.info("💓 Heartbeat task cancelled")
        
        # Fermer toutes les connexions
        async with self._lock:
            connections_to_close = list(self.all_connections)
        
        for connection in connections_to_close:
            try:
                await connection.close(code=1001, reason="Server shutdown")
            except Exception as e:
                logger.warning(f"⚠️ Error closing connection during shutdown: {str(e)}")
        
        # Nettoyer les structures de données
        async with self._lock:
            self.all_connections.clear()
            self.active_connections.clear()
        
        logger.info("✅ WebSocket manager shutdown complete")

# Instance globale
ws_manager = ConnectionManager()
