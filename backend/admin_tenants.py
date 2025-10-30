"""
Admin Tenants API - MOZAIK RH Multi-Tenant SaaS
Endpoints pour super-admins pour gérer les tenants
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from tenant_manager_dynamic import central_db, create_tenant, get_all_tenants


# Router pour les endpoints admin
admin_router = APIRouter(prefix="/api/admin/tenants", tags=["admin-tenants"])


# ==================== MODELS ====================

class TenantCreate(BaseModel):
    """Modèle pour création d'un tenant"""
    tenant_id: str  # Ex: "aaea-cava"
    tenant_name: str  # Ex: "AAEA CAVA"
    admin_email: EmailStr
    max_users: int = 1000
    features: List[str] = ["planning", "absences", "cse", "analytics"]


class TenantUpdate(BaseModel):
    """Modèle pour mise à jour d'un tenant"""
    tenant_name: Optional[str] = None
    admin_email: Optional[EmailStr] = None
    status: Optional[str] = None  # "active", "suspended", "inactive"
    max_users: Optional[int] = None
    features: Optional[List[str]] = None


class TenantResponse(BaseModel):
    """Modèle de réponse pour un tenant"""
    tenant_id: str
    tenant_name: str
    db_name: str
    admin_email: str
    status: str
    created_at: str
    settings: dict


# ==================== AUTH HELPER ====================

async def verify_super_admin(x_super_admin_key: Optional[str] = Header(None)):
    """
    Vérifier que la requête provient d'un super-admin
    
    Pour l'instant, utilise une clé simple. En production, utiliser OAuth2/JWT.
    """
    import os
    SUPER_ADMIN_KEY = os.environ.get("SUPER_ADMIN_KEY", "superadmin-secret-key-2025")
    
    if not x_super_admin_key or x_super_admin_key != SUPER_ADMIN_KEY:
        raise HTTPException(
            status_code=403,
            detail="Super admin access required. Provide X-Super-Admin-Key header."
        )
    return True


# ==================== ENDPOINTS ====================

@admin_router.post("/", response_model=TenantResponse, dependencies=[Depends(verify_super_admin)])
async def create_new_tenant(tenant_data: TenantCreate):
    """
    Créer un nouveau tenant dans le système
    
    **Requiert**: Header `X-Super-Admin-Key`
    
    **Exemple**:
    ```json
    {
      "tenant_id": "aaea-cava",
      "tenant_name": "AAEA CAVA",
      "admin_email": "admin@aaea-gpe.fr",
      "max_users": 100,
      "features": ["planning", "absences"]
    }
    ```
    """
    try:
        # Créer le tenant
        tenant_doc = await create_tenant(
            tenant_id=tenant_data.tenant_id,
            tenant_name=tenant_data.tenant_name,
            admin_email=tenant_data.admin_email
        )
        
        # Mettre à jour les settings si fournis
        if tenant_data.max_users != 1000 or tenant_data.features != ["planning", "absences", "cse", "analytics"]:
            await central_db.tenants.update_one(
                {"tenant_id": tenant_data.tenant_id},
                {"$set": {
                    "settings.max_users": tenant_data.max_users,
                    "settings.features": tenant_data.features
                }}
            )
            tenant_doc["settings"]["max_users"] = tenant_data.max_users
            tenant_doc["settings"]["features"] = tenant_data.features
        
        # Nettoyer le _id pour la réponse
        tenant_doc.pop("_id", None)
        
        return TenantResponse(**tenant_doc)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating tenant: {str(e)}")


@admin_router.get("/", response_model=List[TenantResponse], dependencies=[Depends(verify_super_admin)])
async def list_all_tenants():
    """
    Lister tous les tenants du système
    
    **Requiert**: Header `X-Super-Admin-Key`
    """
    tenants = []
    async for tenant_doc in central_db.tenants.find({}):
        # Nettoyer le _id
        tenant_doc.pop("_id", None)
        tenants.append(TenantResponse(**tenant_doc))
    
    return tenants


@admin_router.get("/{tenant_id}", response_model=TenantResponse, dependencies=[Depends(verify_super_admin)])
async def get_tenant_details(tenant_id: str):
    """
    Récupérer les détails d'un tenant spécifique
    
    **Requiert**: Header `X-Super-Admin-Key`
    """
    tenant_doc = await central_db.tenants.find_one({"tenant_id": tenant_id})
    
    if not tenant_doc:
        raise HTTPException(status_code=404, detail=f"Tenant '{tenant_id}' not found")
    
    # Nettoyer le _id
    tenant_doc.pop("_id", None)
    
    return TenantResponse(**tenant_doc)


@admin_router.put("/{tenant_id}", response_model=TenantResponse, dependencies=[Depends(verify_super_admin)])
async def update_tenant(tenant_id: str, tenant_update: TenantUpdate):
    """
    Mettre à jour un tenant existant
    
    **Requiert**: Header `X-Super-Admin-Key`
    
    **Exemple**:
    ```json
    {
      "status": "suspended",
      "max_users": 50
    }
    ```
    """
    # Vérifier que le tenant existe
    existing = await central_db.tenants.find_one({"tenant_id": tenant_id})
    if not existing:
        raise HTTPException(status_code=404, detail=f"Tenant '{tenant_id}' not found")
    
    # Préparer les updates
    update_data = {}
    if tenant_update.tenant_name:
        update_data["tenant_name"] = tenant_update.tenant_name
    if tenant_update.admin_email:
        update_data["admin_email"] = tenant_update.admin_email
    if tenant_update.status:
        if tenant_update.status not in ["active", "suspended", "inactive"]:
            raise HTTPException(status_code=400, detail="Status must be 'active', 'suspended', or 'inactive'")
        update_data["status"] = tenant_update.status
    if tenant_update.max_users:
        update_data["settings.max_users"] = tenant_update.max_users
    if tenant_update.features:
        update_data["settings.features"] = tenant_update.features
    
    # Mettre à jour dans la base
    if update_data:
        update_data["updated_at"] = datetime.now().isoformat()
        await central_db.tenants.update_one(
            {"tenant_id": tenant_id},
            {"$set": update_data}
        )
    
    # Récupérer le tenant mis à jour
    updated_tenant = await central_db.tenants.find_one({"tenant_id": tenant_id})
    updated_tenant.pop("_id", None)
    
    return TenantResponse(**updated_tenant)


@admin_router.delete("/{tenant_id}", dependencies=[Depends(verify_super_admin)])
async def delete_tenant(tenant_id: str, confirm: bool = False):
    """
    Supprimer un tenant (DANGEREUX - Supprime toutes les données)
    
    **Requiert**: Header `X-Super-Admin-Key` + Query parameter `confirm=true`
    
    **ATTENTION**: Cette action est IRREVERSIBLE et supprime toutes les données du tenant.
    """
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Deletion requires confirmation. Add ?confirm=true to the request."
        )
    
    # Vérifier que le tenant existe
    tenant_doc = await central_db.tenants.find_one({"tenant_id": tenant_id})
    if not tenant_doc:
        raise HTTPException(status_code=404, detail=f"Tenant '{tenant_id}' not found")
    
    db_name = tenant_doc["db_name"]
    
    # Supprimer la base de données du tenant
    from motor.motor_asyncio import AsyncIOMotorClient
    import os
    MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(MONGO_URL)
    await client.drop_database(db_name)
    
    # Supprimer la configuration du tenant
    await central_db.tenants.delete_one({"tenant_id": tenant_id})
    
    return {
        "status": "deleted",
        "tenant_id": tenant_id,
        "db_name": db_name,
        "message": f"Tenant '{tenant_id}' and all associated data have been permanently deleted."
    }


@admin_router.get("/{tenant_id}/stats", dependencies=[Depends(verify_super_admin)])
async def get_tenant_stats(tenant_id: str):
    """
    Obtenir les statistiques d'un tenant
    
    **Requiert**: Header `X-Super-Admin-Key`
    """
    # Vérifier que le tenant existe
    tenant_doc = await central_db.tenants.find_one({"tenant_id": tenant_id})
    if not tenant_doc:
        raise HTTPException(status_code=404, detail=f"Tenant '{tenant_id}' not found")
    
    db_name = tenant_doc["db_name"]
    
    # Se connecter à la DB du tenant
    from motor.motor_asyncio import AsyncIOMotorClient
    import os
    MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(MONGO_URL)
    tenant_db = client[db_name]
    
    # Compter les documents dans les collections principales
    stats = {
        "tenant_id": tenant_id,
        "tenant_name": tenant_doc["tenant_name"],
        "status": tenant_doc["status"],
        "collections": {}
    }
    
    # Collections à compter
    collections = ["users", "absences", "absence_requests", "notifications", "leave_balances"]
    
    for collection_name in collections:
        count = await tenant_db[collection_name].count_documents({})
        stats["collections"][collection_name] = count
    
    return stats
