"""
API Endpoints pour la gestion des soldes de congés et réintégrations
FastAPI + MongoDB (Motor)
"""

from fastapi import APIRouter, HTTPException, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime
import logging

from leave_balance_models import (
    EmployeeLeaveBalance,
    LeaveTransaction,
    DeductLeaveRequest,
    ReintegrateLeaveRequest,
    GrantLeaveRequest,
    LeaveBalanceResponse,
    LeaveTransactionResponse
)

logger = logging.getLogger(__name__)

# Router à ajouter dans votre server.py
leave_balance_router = APIRouter(prefix="/api/leave-balance", tags=["Leave Balance"])


# === DÉPENDANCE : Récupérer la base MongoDB ===
# À adapter selon votre implémentation actuelle dans server.py

async def get_db() -> AsyncIOMotorDatabase:
    """
    Récupère l'instance MongoDB.
    À remplacer par votre logique actuelle (ex: app.state.db ou dependency_injector)
    """
    from server import db  # Import depuis votre server.py
    return db


# === UTILITAIRES ===

async def get_or_create_balance(
    db: AsyncIOMotorDatabase, 
    employee_id: str, 
    year: int = None
) -> EmployeeLeaveBalance:
    """
    Récupère ou crée le solde de congés d'un employé pour une année.
    """
    if year is None:
        year = datetime.now().year
    
    # Chercher le solde existant
    balance_doc = await db.leave_balances.find_one({
        "employee_id": employee_id,
        "year": year
    })
    
    if balance_doc:
        return EmployeeLeaveBalance(**balance_doc)
    
    # Créer un nouveau solde avec valeurs par défaut
    new_balance = EmployeeLeaveBalance(
        employee_id=employee_id,
        year=year
    )
    
    await db.leave_balances.insert_one(new_balance.model_dump(by_alias=True))
    logger.info(f"✅ Solde créé pour employee_id={employee_id}, year={year}")
    
    return new_balance


async def update_balance(
    db: AsyncIOMotorDatabase,
    employee_id: str,
    leave_type: str,
    operation: str,
    amount: float
) -> dict:
    """
    Met à jour le solde d'un type de congé.
    Retourne le solde avant et après la mise à jour.
    """
    year = datetime.now().year
    balance = await get_or_create_balance(db, employee_id, year)
    
    # Mapper leave_type vers les champs du modèle
    field_map = {
        "CA": ("ca_balance", "ca_taken", "ca_reintegrated"),
        "CP": ("cp_balance", "cp_taken", "cp_reintegrated"),
        "CT": ("ct_balance", "ct_taken", "ct_reintegrated"),
        "RTT": ("rtt_balance", "rtt_taken", "rtt_reintegrated"),
        "REC": ("rec_balance", "rec_taken", "rec_reintegrated"),
        "CEX": ("cex_balance", "cex_taken", "cex_reintegrated")
    }
    
    if leave_type not in field_map:
        raise ValueError(f"Type de congé invalide : {leave_type}")
    
    balance_field, taken_field, reintegrated_field = field_map[leave_type]
    
    # Récupérer les valeurs actuelles
    balance_before = getattr(balance, balance_field)
    taken_before = getattr(balance, taken_field)
    reintegrated_before = getattr(balance, reintegrated_field)
    
    # Calculer les nouvelles valeurs selon l'opération
    if operation == "deduct":
        # Déduction : diminue le solde, augmente taken
        new_balance = balance_before - amount
        new_taken = taken_before + amount
        new_reintegrated = reintegrated_before
        
        if new_balance < 0:
            raise ValueError(
                f"Solde insuffisant pour {leave_type} : "
                f"disponible={balance_before}, demandé={amount}"
            )
    
    elif operation == "reintegrate":
        # Réintégration : augmente le solde, diminue taken, augmente reintegrated
        new_balance = balance_before + amount
        new_taken = taken_before - amount
        new_reintegrated = reintegrated_before + amount
    
    elif operation == "grant":
        # Attribution : augmente le solde directement (sans toucher taken)
        new_balance = balance_before + amount
        new_taken = taken_before
        new_reintegrated = reintegrated_before
    
    elif operation == "correction":
        # Correction : ajuste le solde directement
        new_balance = balance_before + amount
        new_taken = taken_before
        new_reintegrated = reintegrated_before
    
    else:
        raise ValueError(f"Opération invalide : {operation}")
    
    # Mettre à jour dans MongoDB
    await db.leave_balances.update_one(
        {"employee_id": employee_id, "year": year},
        {
            "$set": {
                balance_field: new_balance,
                taken_field: new_taken,
                reintegrated_field: new_reintegrated,
                "last_updated": datetime.utcnow()
            }
        }
    )
    
    logger.info(
        f"💾 {leave_type} mis à jour : employee={employee_id}, "
        f"operation={operation}, amount={amount}, "
        f"balance={balance_before:.1f} → {new_balance:.1f}"
    )
    
    return {
        "balance_before": balance_before,
        "balance_after": new_balance
    }


async def create_transaction(
    db: AsyncIOMotorDatabase,
    employee_id: str,
    leave_type: str,
    operation: str,
    amount: float,
    balance_before: float,
    balance_after: float,
    reason: str,
    related_absence_id: Optional[str] = None,
    interrupting_absence_id: Optional[str] = None,
    created_by: Optional[str] = None,
    is_automatic: bool = True
) -> LeaveTransaction:
    """
    Crée une transaction dans l'historique.
    """
    transaction = LeaveTransaction(
        employee_id=employee_id,
        leave_type=leave_type,
        operation=operation,
        amount=amount,
        balance_before=balance_before,
        balance_after=balance_after,
        reason=reason,
        related_absence_id=related_absence_id,
        interrupting_absence_id=interrupting_absence_id,
        created_by=created_by,
        is_automatic=is_automatic
    )
    
    await db.leave_transactions.insert_one(transaction.model_dump(by_alias=True))
    
    logger.info(f"📝 Transaction créée : {transaction.id} - {reason}")
    
    return transaction


# === ENDPOINTS API ===

@leave_balance_router.get("/{employee_id}", response_model=LeaveBalanceResponse)
async def get_leave_balance(
    employee_id: str,
    year: Optional[int] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Récupère les soldes de congés d'un employé pour une année.
    
    **Paramètres** :
    - `employee_id` : ID de l'employé
    - `year` : Année (optionnel, par défaut année en cours)
    
    **Retour** :
    ```json
    {
        "employee_id": "507f...",
        "year": 2025,
        "balances": {
            "CA": 19.0,
            "RTT": 12.0,
            "REC": 2.5,
            ...
        },
        "last_updated": "2025-01-12T10:30:00Z"
    }
    ```
    """
    try:
        balance = await get_or_create_balance(db, employee_id, year)
        
        return LeaveBalanceResponse(
            employee_id=employee_id,
            year=balance.year,
            balances={
                "CA": balance.ca_balance,
                "CP": balance.cp_balance,
                "CT": balance.ct_balance,
                "RTT": balance.rtt_balance,
                "REC": balance.rec_balance,
                "CEX": balance.cex_balance
            },
            last_updated=balance.last_updated
        )
    
    except Exception as e:
        logger.error(f"❌ Erreur get_leave_balance : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@leave_balance_router.post("/deduct")
async def deduct_leave(
    request: DeductLeaveRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Décompte des jours lors de la pose d'une absence.
    
    **Body** :
    ```json
    {
        "employee_id": "507f...",
        "leave_type": "CA",
        "days": 10.0,
        "absence_id": "507f...",
        "reason": "Congés été 2025"
    }
    ```
    
    **Retour** :
    ```json
    {
        "success": true,
        "balance_before": 25.0,
        "balance_after": 15.0,
        "transaction_id": "507f..."
    }
    ```
    """
    try:
        # Vérifier que l'absence existe
        absence = await db.absences.find_one({"_id": request.absence_id})
        if not absence:
            raise HTTPException(
                status_code=404,
                detail=f"Absence non trouvée : {request.absence_id}"
            )
        
        # Mettre à jour le solde
        result = await update_balance(
            db,
            request.employee_id,
            request.leave_type,
            "deduct",
            request.days
        )
        
        # Créer la transaction
        reason = request.reason or f"Pose {request.leave_type} : {request.days} jour(s)"
        transaction = await create_transaction(
            db,
            request.employee_id,
            request.leave_type,
            "deduct",
            request.days,
            result["balance_before"],
            result["balance_after"],
            reason,
            related_absence_id=request.absence_id,
            is_automatic=True
        )
        
        return {
            "success": True,
            "balance_before": result["balance_before"],
            "balance_after": result["balance_after"],
            "transaction_id": transaction.id
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Erreur deduct_leave : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@leave_balance_router.post("/reintegrate")
async def reintegrate_leave(
    request: ReintegrateLeaveRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Réintègre des jours suite à une interruption (ex: arrêt maladie pendant CA).
    
    **Body** :
    ```json
    {
        "employee_id": "507f...",
        "leave_type": "CA",
        "days": 4.0,
        "reason": "Réintégration suite à AM du 05/01 au 10/01",
        "original_absence_id": "507f...",
        "interrupting_absence_id": "507f..."
    }
    ```
    
    **Retour** :
    ```json
    {
        "success": true,
        "balance_before": 15.0,
        "balance_after": 19.0,
        "transaction_id": "507f...",
        "notification_sent": true
    }
    ```
    """
    try:
        # Vérifier que les absences existent
        original = await db.absences.find_one({"_id": request.original_absence_id})
        interrupting = await db.absences.find_one({"_id": request.interrupting_absence_id})
        
        if not original or not interrupting:
            raise HTTPException(status_code=404, detail="Absence non trouvée")
        
        # Mettre à jour le solde (réintégration)
        result = await update_balance(
            db,
            request.employee_id,
            request.leave_type,
            "reintegrate",
            request.days
        )
        
        # Créer la transaction
        transaction = await create_transaction(
            db,
            request.employee_id,
            request.leave_type,
            "reintegrate",
            request.days,
            result["balance_before"],
            result["balance_after"],
            request.reason,
            related_absence_id=request.original_absence_id,
            interrupting_absence_id=request.interrupting_absence_id,
            is_automatic=True
        )
        
        # TODO: Envoyer notification email (Phase 4)
        # await send_reintegration_notification(request.employee_id, request)
        
        logger.info(
            f"✅ Réintégration : {request.days} jour(s) de {request.leave_type} "
            f"réintégrés pour employee={request.employee_id}"
        )
        
        return {
            "success": True,
            "balance_before": result["balance_before"],
            "balance_after": result["balance_after"],
            "transaction_id": transaction.id,
            "notification_sent": False  # À implémenter en Phase 4
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Erreur reintegrate_leave : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@leave_balance_router.post("/grant")
async def grant_leave(
    request: GrantLeaveRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Attribue des jours de congés (attribution initiale ou ajustement).
    
    **Body** :
    ```json
    {
        "employee_id": "507f...",
        "leave_type": "CA",
        "days": 25.0,
        "reason": "Attribution annuelle 2025",
        "created_by": "admin_user_id"
    }
    ```
    """
    try:
        result = await update_balance(
            db,
            request.employee_id,
            request.leave_type,
            "grant",
            request.days
        )
        
        transaction = await create_transaction(
            db,
            request.employee_id,
            request.leave_type,
            "grant",
            request.days,
            result["balance_before"],
            result["balance_after"],
            request.reason,
            created_by=request.created_by,
            is_automatic=False
        )
        
        return {
            "success": True,
            "balance_before": result["balance_before"],
            "balance_after": result["balance_after"],
            "transaction_id": transaction.id
        }
    
    except Exception as e:
        logger.error(f"❌ Erreur grant_leave : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@leave_balance_router.get("/transactions/{employee_id}", response_model=List[LeaveTransactionResponse])
async def get_leave_transactions(
    employee_id: str,
    year: Optional[int] = None,
    leave_type: Optional[str] = None,
    limit: int = 50,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Récupère l'historique des transactions d'un employé.
    
    **Paramètres** :
    - `employee_id` : ID de l'employé
    - `year` : Filtrer par année (optionnel)
    - `leave_type` : Filtrer par type de congé (optionnel)
    - `limit` : Nombre max de transactions (défaut: 50)
    
    **Retour** : Liste des transactions triées par date décroissante
    ```json
    [
        {
            "transaction_id": "507f...",
            "employee_id": "507f...",
            "leave_type": "CA",
            "operation": "reintegrate",
            "amount": 4.0,
            "balance_after": 19.0,
            "reason": "Réintégration suite à AM",
            "transaction_date": "2025-01-12T10:30:00Z"
        }
    ]
    ```
    """
    try:
        # Construire le filtre
        query = {"employee_id": employee_id}
        
        if year:
            start_date = datetime(year, 1, 1)
            end_date = datetime(year, 12, 31, 23, 59, 59)
            query["transaction_date"] = {"$gte": start_date, "$lte": end_date}
        
        if leave_type:
            query["leave_type"] = leave_type
        
        # Récupérer les transactions
        cursor = db.leave_transactions.find(query).sort("transaction_date", -1).limit(limit)
        transactions = await cursor.to_list(length=limit)
        
        # Formater la réponse
        return [
            LeaveTransactionResponse(
                transaction_id=t["_id"],
                employee_id=t["employee_id"],
                leave_type=t["leave_type"],
                operation=t["operation"],
                amount=t["amount"],
                balance_after=t["balance_after"],
                reason=t["reason"],
                transaction_date=t["transaction_date"]
            )
            for t in transactions
        ]
    
    except Exception as e:
        logger.error(f"❌ Erreur get_leave_transactions : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# === ENDPOINT ADMIN : Initialisation des soldes ===

@leave_balance_router.post("/admin/initialize-balances")
async def initialize_balances_for_all_employees(
    year: int,
    ca_initial: float = 25.0,
    rtt_initial: float = 12.0,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    **ADMIN** : Initialise les soldes de congés pour tous les employés.
    
    À utiliser lors de la migration initiale ou pour une nouvelle année.
    
    **Body** :
    ```json
    {
        "year": 2025,
        "ca_initial": 25.0,
        "rtt_initial": 12.0
    }
    ```
    """
    try:
        # Récupérer tous les employés
        cursor = db.users.find({"role": {"$ne": "admin"}})  # Exclure les admins
        employees = await cursor.to_list(length=None)
        
        initialized_count = 0
        skipped_count = 0
        
        for emp in employees:
            employee_id = emp["_id"]
            
            # Vérifier si le solde existe déjà
            existing = await db.leave_balances.find_one({
                "employee_id": employee_id,
                "year": year
            })
            
            if existing:
                skipped_count += 1
                continue
            
            # Créer le solde
            balance = EmployeeLeaveBalance(
                employee_id=employee_id,
                year=year,
                ca_initial=ca_initial,
                ca_balance=ca_initial,
                rtt_initial=rtt_initial,
                rtt_balance=rtt_initial
            )
            
            await db.leave_balances.insert_one(balance.model_dump(by_alias=True))
            initialized_count += 1
            
            logger.info(f"✅ Solde initialisé pour {emp.get('name', employee_id)}")
        
        return {
            "success": True,
            "year": year,
            "initialized_count": initialized_count,
            "skipped_count": skipped_count,
            "total_employees": len(employees)
        }
    
    except Exception as e:
        logger.error(f"❌ Erreur initialize_balances : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
