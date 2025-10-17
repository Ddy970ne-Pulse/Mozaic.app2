"""
WebSocket Manager pour MOZAIK RH
Gestion des connexions temps réel et broadcast des événements
"""
from fastapi import WebSocket
from typing import Dict, Set
import json
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Gestionnaire de connexions WebSocket"""
    
    def __init__(self):
        # Dictionnaire des connexions actives par user_id
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Toutes les connexions (pour broadcast global)
        self.all_connections: Set[WebSocket] = set()
        
    async def connect(self, websocket: WebSocket, user_id: str):
        """Accepter une nouvelle connexion WebSocket"""
        await websocket.accept()
        
        # Ajouter à la liste globale
        self.all_connections.add(websocket)
        
        # Ajouter aux connexions de cet utilisateur
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        
        logger.info(f"✅ WebSocket connected: user_id={user_id}, total_connections={len(self.all_connections)}")
        
    def disconnect(self, websocket: WebSocket, user_id: str):
        """Fermer une connexion WebSocket"""
        # Retirer de la liste globale
        self.all_connections.discard(websocket)
        
        # Retirer des connexions de l'utilisateur
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        logger.info(f"❌ WebSocket disconnected: user_id={user_id}, total_connections={len(self.all_connections)}")
    
    async def send_personal_message(self, message: dict, user_id: str):
        """Envoyer un message à un utilisateur spécifique"""
        if user_id in self.active_connections:
            dead_connections = set()
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to user {user_id}: {str(e)}")
                    dead_connections.add(connection)
            
            # Nettoyer les connexions mortes
            for conn in dead_connections:
                self.disconnect(conn, user_id)
    
    async def broadcast(self, message: dict, exclude_user: str = None):
        """Envoyer un message à tous les utilisateurs connectés"""
        logger.info(f"📡 Broadcasting to {len(self.all_connections)} connections: {message.get('type')}")
        
        dead_connections = set()
        for connection in self.all_connections:
            # Trouver le user_id de cette connexion
            user_id = None
            for uid, conns in self.active_connections.items():
                if connection in conns:
                    user_id = uid
                    break
            
            # Exclure l'utilisateur si demandé
            if exclude_user and user_id == exclude_user:
                continue
            
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting: {str(e)}")
                dead_connections.add(connection)
        
        # Nettoyer les connexions mortes
        for conn in dead_connections:
            for user_id, conns in list(self.active_connections.items()):
                if conn in conns:
                    self.disconnect(conn, user_id)
                    break
    
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

# Instance globale
ws_manager = ConnectionManager()
