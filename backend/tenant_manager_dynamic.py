"""
Tenant Manager Dynamic - MOZAIK RH Multi-Tenant SaaS
Gère l'identification des tenants et les connexions MongoDB dédiées
"""
import os
from typing import Optional
from fastapi import Header, Query, Request, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Base de données centrale pour les configurations tenants
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
central_client = AsyncIOMotorClient(MONGO_URL)
central_db = central_client['mozaik_central']

# Cache des connexions tenants
tenant_connections = {}


class TenantConfig:
    """Configuration d'un tenant"""
    def __init__(self, tenant_id: str, tenant_name: str, db_name: str, status: str = "active"):
        self.tenant_id = tenant_id
        self.tenant_name = tenant_name
        self.db_name = db_name
        self.status = status


async def get_tenant_from_request(
    request: Request,
    x_tenant_id: Optional[str] = Header(None),
    tenant_id: Optional[str] = Query(None)
) -> str:
    """
    Identifier le tenant depuis la requête HTTP
    
    Ordre de priorité:
    1. Header HTTP: X-Tenant-Id
    2. Query parameter: ?tenant_id=xxx
    3. Subdomain: tenant.mozaikrh.com
    
    Args:
        request: FastAPI Request object
        x_tenant_id: Header X-Tenant-Id
        tenant_id: Query parameter tenant_id
    
    Returns:
        str: Tenant ID
    
    Raises:
        HTTPException: Si aucun tenant n'est identifié
    """
    # 1. Vérifier le header HTTP
    if x_tenant_id:
        return x_tenant_id
    
    # 2. Vérifier le query parameter
    if tenant_id:
        return tenant_id
    
    # 3. Extraire depuis le subdomain
    host = request.headers.get("host", "")
    if "." in host:
        subdomain = host.split(".")[0]
        # Ignorer les subdomains standards
        if subdomain not in ["www", "api", "preview", "staging"]:
            return subdomain
    
    # 4. Mode développement: tenant par défaut
    if os.environ.get("ENV") == "development":
        return "aaea-cava"  # Tenant par défaut pour dev
    
    raise HTTPException(
        status_code=400,
        detail="Tenant identification failed. Please provide X-Tenant-Id header or tenant_id parameter."
    )


async def get_tenant_config(tenant_id: str) -> Optional[TenantConfig]:
    """
    Récupérer la configuration d'un tenant depuis la base centrale
    
    Args:
        tenant_id: ID du tenant
    
    Returns:
        TenantConfig ou None si non trouvé
    """
    tenant_doc = await central_db.tenants.find_one({"tenant_id": tenant_id})
    
    if not tenant_doc:
        return None
    
    return TenantConfig(
        tenant_id=tenant_doc["tenant_id"],
        tenant_name=tenant_doc["tenant_name"],
        db_name=tenant_doc["db_name"],
        status=tenant_doc.get("status", "active")
    )


async def get_tenant_db(
    request: Request,
    x_tenant_id: Optional[str] = Header(None),
    tenant_id: Optional[str] = Query(None)
):
    """
    Dependency FastAPI pour obtenir la database MongoDB du tenant actuel
    
    Usage:
        @app.get("/api/users")
        async def get_users(db = Depends(get_tenant_db)):
            users = await db.users.find().to_list(length=100)
            return users
    
    Args:
        request: FastAPI Request
        x_tenant_id: Header X-Tenant-Id
        tenant_id: Query parameter tenant_id
    
    Returns:
        AsyncIOMotorDatabase: Database MongoDB du tenant
    
    Raises:
        HTTPException: Si tenant invalide ou inactif
    """
    # Identifier le tenant
    current_tenant_id = await get_tenant_from_request(request, x_tenant_id, tenant_id)
    
    # Récupérer la configuration du tenant
    tenant_config = await get_tenant_config(current_tenant_id)
    
    if not tenant_config:
        raise HTTPException(
            status_code=404,
            detail=f"Tenant '{current_tenant_id}' not found. Please contact support."
        )
    
    if tenant_config.status != "active":
        raise HTTPException(
            status_code=403,
            detail=f"Tenant '{current_tenant_id}' is {tenant_config.status}. Access denied."
        )
    
    # Vérifier si une connexion existe déjà pour ce tenant (cache)
    if current_tenant_id not in tenant_connections:
        # Créer une nouvelle connexion MongoDB pour ce tenant
        client = AsyncIOMotorClient(MONGO_URL)
        tenant_connections[current_tenant_id] = client[tenant_config.db_name]
        print(f"✅ New MongoDB connection created for tenant: {current_tenant_id} → {tenant_config.db_name}")
    
    return tenant_connections[current_tenant_id]


async def create_tenant(tenant_id: str, tenant_name: str, admin_email: str):
    """
    Créer un nouveau tenant dans le système
    
    Args:
        tenant_id: ID unique du tenant (ex: "aaea-cava")
        tenant_name: Nom d'affichage (ex: "AAEA CAVA")
        admin_email: Email de l'administrateur principal
    
    Returns:
        dict: Configuration du tenant créé
    """
    # Vérifier si le tenant existe déjà
    existing = await central_db.tenants.find_one({"tenant_id": tenant_id})
    if existing:
        raise HTTPException(status_code=400, detail=f"Tenant '{tenant_id}' already exists")
    
    # Nom de la base de données du tenant
    db_name = f"mozaik_{tenant_id.replace('-', '_')}"
    
    # Créer la configuration du tenant
    tenant_doc = {
        "tenant_id": tenant_id,
        "tenant_name": tenant_name,
        "db_name": db_name,
        "admin_email": admin_email,
        "status": "active",
        "created_at": "2025-01-30T00:00:00Z",
        "settings": {
            "max_users": 1000,
            "features": ["planning", "absences", "cse", "analytics"]
        }
    }
    
    # Insérer dans la base centrale
    await central_db.tenants.insert_one(tenant_doc)
    
    # Créer la base de données du tenant (sera créée à la première insertion)
    tenant_db = central_client[db_name]
    
    # Créer un document initial pour initialiser la DB
    await tenant_db.system_info.insert_one({
        "tenant_id": tenant_id,
        "initialized_at": "2025-01-30T00:00:00Z"
    })
    
    print(f"✅ Tenant created: {tenant_id} → {db_name}")
    
    return tenant_doc


# Fonction helper pour les migrations
async def get_all_tenants():
    """Récupérer tous les tenants du système"""
    tenants = []
    async for tenant_doc in central_db.tenants.find({}):
        tenants.append(TenantConfig(
            tenant_id=tenant_doc["tenant_id"],
            tenant_name=tenant_doc["tenant_name"],
            db_name=tenant_doc["db_name"],
            status=tenant_doc.get("status", "active")
        ))
    return tenants
