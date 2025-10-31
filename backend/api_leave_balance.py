"""
Endpoints API pour la gestion des soldes de congés
MOZAIK RH - Module de conformité légale

Routes :
- GET /api/leave-balances : Liste tous les soldes
- GET /api/leave-balances/{user_id} : Solde d'un employé
- GET /api/leave-balances/{user_id}/history : Historique transactions
- POST /api/leave-balances/initialize : Initialiser un solde
- POST /api/leave-balances/manual-adjustment : Ajustement manuel (admin)
- POST /api/leave-balances/reintegrate : Réintégrer des congés (admin)
- POST /api/leave-balances/validate : Valider solde avant approbation

Adapté pour MOZAIK RH avec système d'authentification existant
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime

# Imports internes
from models_leave_balance import (
    EmployeeLeaveBalance,
    LeaveTransaction,
    InitializeBalanceRequest,
    ManualAdjustmentRequest,
    ReintegrateLeaveRequest,
    ValidateLeaveRequest
)
from service_leave_balance import LeaveBalanceService

router = APIRouter(prefix="/api/leave-balances", tags=["Leave Balances"])


# ============================================================================
# HELPER : Dépendance Service
# ============================================================================

async def get_leave_balance_service() -> LeaveBalanceService:
    """Retourne une instance du service de gestion des soldes"""
    # Import local pour éviter les dépendances circulaires
    import server
    return LeaveBalanceService(server.db)


# ============================================================================
# ENDPOINTS : Consultation des soldes
# ============================================================================

@router.get("")
async def get_all_balances(
    fiscal_year: Optional[int] = None,
    service: LeaveBalanceService = Depends(get_leave_balance_service)
):
    """
    📊 Récupère tous les soldes de congés
    
    **Query Params** :
    - fiscal_year (optionnel) : Année fiscale (défaut: année en cours)
    
    **Retourne** : Liste des soldes de tous les employés
    """
    balances = await service.get_all_balances(fiscal_year)
    return {"balances": balances}


@router.get("/{user_id}")
async def get_user_balance(
    user_id: str,
    fiscal_year: Optional[int] = None,
    service: LeaveBalanceService = Depends(get_leave_balance_service)
):
    """
    👤 Récupère le solde d'un employé spécifique
    
    **Permissions** : 
    - Employé peut voir son propre solde
    - Manager/Admin peut voir tous les soldes
    
    **Path Params** :
    - user_id : ID de l'employé
    
    **Query Params** :
    - fiscal_year (optionnel) : Année fiscale
    
    **Retourne** : Solde de l'employé
    """
    # Vérification des permissions
    if current_user["role"] not in ["admin", "manager"]:
        if current_user["_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous ne pouvez consulter que votre propre solde"
            )
    
    service = await get_leave_balance_service(db)
    balance = await service.get_balance(user_id, fiscal_year)
    
    if not balance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solde non trouvé"
        )
    
    return BalanceResponse(
        user_id=balance["user_id"],
        ca_balance=balance["ca_balance"],
        rtt_balance=balance["rtt_balance"],
        ct_balance=balance["ct_balance"],
        rec_balance=balance["rec_balance"],
        last_updated=balance["last_updated"],
        fiscal_year=balance["fiscal_year"]
    )


@router.get("/{user_id}/history", response_model=List[TransactionResponse])
async def get_transaction_history(
    user_id: str,
    limit: int = 50,
    db = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    📜 Récupère l'historique des transactions d'un employé
    
    **Permissions** : Employé, Manager, Admin
    
    **Path Params** :
    - user_id : ID de l'employé
    
    **Query Params** :
    - limit : Nombre max de transactions (défaut: 50, max: 100)
    
    **Retourne** : Liste des transactions (plus récentes en premier)
    """
    # Vérification permissions
    if current_user["role"] not in ["admin", "manager"]:
        if current_user["_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès refusé"
            )
    
    if limit > 100:
        limit = 100
    
    service = await get_leave_balance_service(db)
    transactions = await service.get_transaction_history(user_id, limit)
    
    return [
        TransactionResponse(
            _id=str(t["_id"]),
            user_id=t["user_id"],
            operation_type=t["operation_type"],
            leave_type=t["leave_type"],
            amount=t["amount"],
            reason=t["reason"],
            created_at=t["created_at"],
            balance_before=t["balance_before"],
            balance_after=t["balance_after"]
        )
        for t in transactions
    ]


# ============================================================================
# ENDPOINTS : Initialisation et ajustements (Admin)
# ============================================================================

@router.post("/initialize", response_model=BalanceResponse)
async def initialize_balance(
    request: InitializeBalanceRequest,
    db = Depends(get_db),
    current_user = Depends(require_admin)
):
    """
    🆕 Initialise le solde d'un nouvel employé
    
    **Permissions** : Admin uniquement
    
    **Body** :
    ```json
    {
        "user_id": "507f1f77bcf86cd799439011",
        "fiscal_year": 2025,
        "ca_initial": 25.0,
        "rtt_initial": 12.0,
        "ct_initial": 4.0,
        "rec_initial": 0.0
    }
    ```
    
    **Retourne** : Solde créé
    """
    service = await get_leave_balance_service(db)
    
    # Vérifier si le solde existe déjà
    existing = await service.balances_collection.find_one({
        "user_id": request.user_id,
        "fiscal_year": request.fiscal_year
    })
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un solde existe déjà pour cet employé et cette année fiscale"
        )
    
    # Créer le solde
    balance = {
        "user_id": request.user_id,
        "fiscal_year": request.fiscal_year,
        "ca_balance": request.ca_initial,
        "rtt_balance": request.rtt_initial,
        "ct_balance": request.ct_initial,
        "rec_balance": request.rec_initial,
        "last_updated": datetime.utcnow()
    }
    
    result = await service.balances_collection.insert_one(balance)
    balance["_id"] = result.inserted_id
    
    # Créer transaction d'initialisation
    for leave_type, amount in [
        ("CA", request.ca_initial),
        ("RTT", request.rtt_initial),
        ("CT", request.ct_initial),
        ("REC", request.rec_initial)
    ]:
        if amount > 0:
            await service.create_transaction(
                user_id=request.user_id,
                operation_type="ACQUISITION",
                leave_type=leave_type,
                amount=amount,
                reason=f"Initialisation solde {request.fiscal_year}",
                created_by=current_user["_id"],
                balance_before=0.0,
                balance_after=amount
            )
    
    return BalanceResponse(
        user_id=balance["user_id"],
        ca_balance=balance["ca_balance"],
        rtt_balance=balance["rtt_balance"],
        ct_balance=balance["ct_balance"],
        rec_balance=balance["rec_balance"],
        last_updated=balance["last_updated"],
        fiscal_year=balance["fiscal_year"]
    )


@router.post("/manual-adjustment", response_model=BalanceResponse)
async def manual_adjustment(
    request: ManualAdjustmentRequest,
    db = Depends(get_db),
    current_user = Depends(require_admin)
):
    """
    ✏️ Ajustement manuel du solde d'un employé (Admin uniquement)
    
    **Permissions** : Admin uniquement
    
    **Body** :
    ```json
    {
        "user_id": "507f1f77bcf86cd799439011",
        "leave_type": "CA",
        "amount": 5.0,
        "reason": "Correction erreur comptage congés 2024"
    }
    ```
    
    **Retourne** : Solde mis à jour
    """
    service = await get_leave_balance_service(db)
    
    balance = await service.manual_adjustment(
        user_id=request.user_id,
        leave_type=request.leave_type,
        amount=request.amount,
        reason=request.reason,
        admin_user_id=current_user["_id"]
    )
    
    return BalanceResponse(
        user_id=balance["user_id"],
        ca_balance=balance["ca_balance"],
        rtt_balance=balance["rtt_balance"],
        ct_balance=balance["ct_balance"],
        rec_balance=balance["rec_balance"],
        last_updated=balance["last_updated"],
        fiscal_year=balance["fiscal_year"]
    )


# ============================================================================
# ENDPOINTS : Réintégration (Admin)
# ============================================================================

@router.post("/reintegrate", response_model=ReintegrationResponse)
async def reintegrate_leave(
    request: ReintegrationRequest,
    db = Depends(get_db),
    current_user = Depends(require_admin)
):
    """
    🔄 Réintégration manuelle de congés suite à un arrêt maladie
    
    **Permissions** : Admin uniquement
    
    **Scénario** :
    1. Employé avait posé CA du 15 au 19 janvier (5j)
    2. Employé tombe malade du 17 au 19 janvier (3j)
    3. Cet endpoint réintègre 3j de CA
    
    **Body** :
    ```json
    {
        "user_id": "507f1f77bcf86cd799439011",
        "original_absence_id": "507f...",
        "sick_leave_absence_id": "507f...",
        "days_to_reintegrate": 3.0
    }
    ```
    
    **Retourne** : Confirmation et nouveau solde
    """
    service = await get_leave_balance_service(db)
    
    # Récupérer l'absence originale pour connaître le type
    original_absence = await db.absences.find_one({"_id": request.original_absence_id})
    
    if not original_absence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Absence originale non trouvée"
        )
    
    if original_absence["absence_type"] not in ["CA", "RTT", "CT", "REC"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seuls les congés CA, RTT, CT et REC peuvent être réintégrés"
        )
    
    # Effectuer la réintégration
    balance = await service.reintegrate_leave(
        user_id=request.user_id,
        leave_type=original_absence["absence_type"],
        days=request.days_to_reintegrate,
        original_absence_id=request.original_absence_id,
        sick_leave_absence_id=request.sick_leave_absence_id,
        created_by=current_user["_id"]
    )
    
    # Récupérer l'ID de la dernière transaction
    last_transaction = await db.leave_transactions.find_one(
        {"user_id": request.user_id},
        sort=[("created_at", -1)]
    )
    
    balance_field = f"{original_absence['absence_type'].lower()}_balance"
    
    return ReintegrationResponse(
        success=True,
        message=f"{request.days_to_reintegrate} jour(s) de {original_absence['absence_type']} réintégré(s)",
        transaction_id=str(last_transaction["_id"]),
        new_balance=balance[balance_field],
        days_reintegrated=request.days_to_reintegrate
    )


# ============================================================================
# ENDPOINTS : Validation (Utilisé avant approbation)
# ============================================================================

@router.post("/validate")
async def validate_leave_request(
    user_id: str,
    leave_type: str,
    days: float,
    fiscal_year: Optional[int] = None,
    db = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    ✅ Valide qu'un employé a suffisamment de solde pour une demande
    
    **Permissions** : Tous
    
    **Query Params** :
    - user_id : ID de l'employé
    - leave_type : Type de congé (CA, RTT, CT, REC)
    - days : Nombre de jours demandés
    - fiscal_year (optionnel) : Année fiscale
    
    **Retourne** :
    ```json
    {
        "valid": true,
        "message": "Solde suffisant (25.0 jours disponibles)",
        "available": 25.0,
        "requested": 5.0
    }
    ```
    """
    service = await get_leave_balance_service(db)
    
    validation = await service.validate_leave_request(
        user_id=user_id,
        leave_type=leave_type,
        days=days,
        fiscal_year=fiscal_year
    )
    
    return validation


# ============================================================================
# ENDPOINTS : Détection automatique (Hook interne)
# ============================================================================

@router.post("/detect-reintegration/{absence_id}")
async def detect_and_reintegrate(
    absence_id: str,
    db = Depends(get_db),
    current_user = Depends(require_admin)
):
    """
    🤖 Détecte et réintègre automatiquement les congés chevauchés par un arrêt maladie
    
    **Permissions** : Admin uniquement (ou appelé automatiquement par le système)
    
    **Path Params** :
    - absence_id : ID de l'arrêt maladie
    
    **Retourne** : Liste des réintégrations effectuées
    """
    service = await get_leave_balance_service(db)
    
    # Récupérer l'absence
    absence = await db.absences.find_one({"_id": absence_id})
    
    if not absence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Absence non trouvée"
        )
    
    if absence["absence_type"] != "MALADIE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette fonction ne s'applique qu'aux arrêts maladie"
        )
    
    # Détecter et réintégrer
    reintegrations = await service.detect_and_reintegrate(absence)
    
    return {
        "success": True,
        "reintegrations_count": len(reintegrations),
        "details": reintegrations
    }
