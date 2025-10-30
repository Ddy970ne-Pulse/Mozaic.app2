"""
WebSocket Routes - MOZAIK RH
Endpoint WebSocket pour communications temps réel
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from jose import jwt, JWTError
from typing import Optional
from dotenv import load_dotenv
from pathlib import Path
import logging
import json
from datetime import datetime
import os

# Load environment variables FIRST
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)
router = APIRouter()

# Import du manager
from websocket_manager import ws_manager

# Security - Load SECRET_KEY (must be set in .env)
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY or SECRET_KEY == 'your-secret-key-change-in-production':
    logger.error("❌ SECRET_KEY not configured for WebSocket authentication")
    raise ValueError("SECRET_KEY must be set to a secure value in environment variables")
ALGORITHM = "HS256"


async def get_current_user_ws(websocket: WebSocket) -> Optional[str]:
    """
    Authentifier l'utilisateur WebSocket via token query param
    URL: ws://domain/api/ws/{user_id}?token=xxx
    """
    try:
        token = websocket.query_params.get("token")
        if not token:
            logger.warning("⚠️ WebSocket connection without token")
            return None
        
        # Vérifier le token JWT
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        
        if user_id is None:
            logger.warning("⚠️ Token valid but no user_id in payload")
            return None
        
        logger.info(f"✅ WebSocket authenticated: user_id={user_id}")
        return user_id
        
    except JWTError as e:
        logger.error(f"❌ JWT Error in WebSocket: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"❌ Error authenticating WebSocket: {str(e)}")
        return None


@router.websocket("/api/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    Endpoint WebSocket principal pour temps réel
    
    URL: wss://domain/api/ws/{user_id}?token=xxx
    
    Messages supportés:
    - ping: keepalive
    - subscribe: s'abonner à un canal
    - broadcast: diffuser un message
    """
    
    # 1. Authentification (optionnelle pour développement)
    # En production, décommenter pour forcer l'auth
    # user_id = await get_current_user_ws(websocket)
    # if not user_id:
    #     logger.warning(f"⚠️ Unauthorized WebSocket: {client_id}")
    #     await websocket.close(code=1008, reason="Unauthorized")
    #     return
    
    # Mode développement: accepter sans auth
    user_id = client_id
    
    # 2. Connexion
    try:
        await ws_manager.connect(websocket, user_id)
    except Exception as e:
        logger.error(f"❌ Failed to connect WebSocket: {str(e)}")
        return
    
    try:
        # 3. Message de bienvenue
        welcome_message = {
            "type": "connected",
            "data": {
                "user_id": user_id,
                "message": "✅ Connecté à MOZAIK RH",
                "timestamp": datetime.utcnow().isoformat(),
                "server_time": datetime.utcnow().strftime("%H:%M:%S")
            }
        }
        await websocket.send_json(welcome_message)
        logger.info(f"📨 Sent welcome message to {user_id}")
        
        # 4. Notifier les autres utilisateurs
        await ws_manager.broadcast({
            "type": "user_connected",
            "data": {"user_id": user_id}
        }, exclude_user=user_id)
        
        # 5. Boucle de réception des messages
        while True:
            # Recevoir un message du client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                message_type = message.get("type", "unknown")
                
                logger.info(f"📨 WebSocket message from {user_id}: {message_type}")
                
                # Gérer différents types de messages
                if message_type == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                
                elif message_type == "pong":
                    # Client répond à notre ping, rien à faire
                    pass
                
                elif message_type == "subscribe":
                    # S'abonner à un canal spécifique
                    channel = message.get("channel")
                    logger.info(f"📡 User {user_id} subscribed to {channel}")
                    await websocket.send_json({
                        "type": "subscribed",
                        "data": {"channel": channel, "status": "success"}
                    })
                
                elif message_type == "broadcast":
                    # Broadcaster un message à tous
                    broadcast_data = message.get("data", {})
                    await ws_manager.broadcast({
                        "type": "message",
                        "from": user_id,
                        "data": broadcast_data
                    }, exclude_user=user_id)
                
                elif message_type == "personal_message":
                    # Message privé à un utilisateur
                    target_user = message.get("to")
                    if target_user:
                        await ws_manager.send_personal_message({
                            "type": "personal_message",
                            "from": user_id,
                            "data": message.get("data")
                        }, target_user)
                
                else:
                    logger.warning(f"⚠️ Unknown message type: {message_type}")
                    await websocket.send_json({
                        "type": "error",
                        "data": {"message": f"Unknown message type: {message_type}"}
                    })
                    
            except json.JSONDecodeError:
                logger.error(f"❌ Invalid JSON from {user_id}: {data}")
                await websocket.send_json({
                    "type": "error",
                    "data": {"message": "Invalid JSON format"}
                })
            except Exception as e:
                logger.error(f"❌ Error processing message from {user_id}: {str(e)}")
    
    except WebSocketDisconnect:
        logger.info(f"🔌 WebSocket disconnected normally: {user_id}")
    
    except Exception as e:
        logger.error(f"❌ WebSocket error for {user_id}: {str(e)}", exc_info=True)
    
    finally:
        # 6. Nettoyage
        ws_manager.disconnect(websocket, user_id)
        
        # 7. Notifier les autres de la déconnexion
        await ws_manager.broadcast({
            "type": "user_disconnected",
            "data": {"user_id": user_id}
        }, exclude_user=user_id)
        
        logger.info(f"🧹 Cleaned up WebSocket for {user_id}")
