"""
API Routes - Gestion des Soldes de Congés
MOZAIK RH - Version simplifiée et fonctionnelle

Endpoints :
- GET /api/leave-balances : Tous les soldes
- GET /api/leave-balances/{user_id} : Solde d'un employé
- GET /api/leave-balances/{user_id}/history : Historique
- POST /api/leave-balances/initialize : Initialiser (admin)
- POST /api/leave-balances/deduct : Déduire
- POST /api/leave-balances/reintegrate : Réintégrer
- POST /api/leave-balances/validate : Valider disponibilité
- POST /api/leave-balances/detect/{absence_id} : Détection auto réintégration
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime

from models_leave_balance import (
    InitializeBalanceRequest,
    DeductLeaveRequest,
    ReintegrateLeaveRequest,
    ValidateLeaveRequest,
    ManualAdjustmentRequest
)
from service_leave_balance import LeaveBalanceService

router = APIRouter(prefix="/api/leave-balances", tags=["Leave Balances"])


# ============================================================================
# Dépendance : Service
# ============================================================================

def get_service() -> LeaveBalanceService:
    """Retourne le service avec la DB globale"""
    import server
    return LeaveBalanceService(server.db)


# ============================================================================
# ENDPOINTS : Consultation
# ============================================================================

@router.get("")
async def get_all_balances(
    fiscal_year: Optional[int] = None
):
    """
    📊 Récupère tous les soldes de congés
    
    Query params:
    - fiscal_year: Année (défaut: année en cours)
    """
    service = get_service()
    balances = await service.get_all_balances(fiscal_year)
    
    return {
        "success": True,
        "balances": balances,
        "count": len(balances)
    }


@router.get("/{user_id}")
async def get_user_balance(
    user_id: str,
    fiscal_year: Optional[int] = None
):
    """
    📋 Récupère le solde d'un employé spécifique
    
    Path params:
    - user_id: ID de l'employé
    
    Query params:
    - fiscal_year: Année (défaut: année en cours)
    """
    service = get_service()
    
    balance = await service.get_or_create_balance(user_id, fiscal_year)
    
    if not balance:
        raise HTTPException(status_code=404, detail="Balance not found")
    
    return {
        "success": True,
        "balance": {
            "user_id": balance["user_id"],
            "fiscal_year": balance["fiscal_year"],
            "ca_balance": balance["ca_balance"],
            "rtt_balance": balance["rtt_balance"],
            "ct_balance": balance["ct_balance"],
            "rec_balance": balance["rec_balance"],
            "last_updated": balance["last_updated"].isoformat() if isinstance(balance["last_updated"], datetime) else balance["last_updated"]
        }
    }


@router.get("/{user_id}/history")
async def get_transaction_history(
    user_id: str,
    fiscal_year: Optional[int] = None,
    limit: int = 50
):
    """
    📜 Récupère l'historique des transactions d'un employé
    
    Path params:
    - user_id: ID de l'employé
    
    Query params:
    - fiscal_year: Année (défaut: toutes)
    - limit: Nombre max de résultats (défaut: 50)
    """
    service = get_service()
    
    # Récupérer transactions
    import server
    query = {"user_id": user_id}
    if fiscal_year:
        query["fiscal_year"] = fiscal_year
    
    transactions = await server.db.leave_transactions.find(
        query
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Formater les dates
    for trans in transactions:
        if "created_at" in trans and isinstance(trans["created_at"], datetime):
            trans["created_at"] = trans["created_at"].isoformat()
        # Supprimer _id MongoDB
        trans.pop("_id", None)
    
    return {
        "success": True,
        "transactions": transactions,
        "count": len(transactions)
    }


# ============================================================================
# ENDPOINTS : Gestion (Admin / Système)
# ============================================================================

@router.post("/initialize")
async def initialize_balance(request: InitializeBalanceRequest):
    """
    🎯 Initialiser le solde d'un employé (Admin uniquement)
    
    Body:
    - user_id: ID employé
    - fiscal_year: Année
    - ca_initial: Solde CA initial (défaut: 25)
    - rtt_initial: Solde RTT initial (défaut: 12)
    - ct_initial: Solde CT initial (défaut: 0)
    - rec_initial: Solde REC initial (défaut: 0)
    """
    service = get_service()
    
    # Vérifier si existe déjà
    existing = await service.get_or_create_balance(
        request.user_id,
        request.fiscal_year
    )
    
    if existing and existing.get("ca_balance") > 0:
        return {
            "success": True,
            "message": "Balance already exists",
            "balance": existing
        }
    
    # Créer/mettre à jour
    import server
    balance = {
        "user_id": request.user_id,
        "fiscal_year": request.fiscal_year,
        "ca_balance": request.ca_initial,
        "rtt_balance": request.rtt_initial,
        "ct_balance": request.ct_initial,
        "rec_balance": request.rec_initial,
        "last_updated": datetime.utcnow()
    }
    
    await server.db.leave_balances.update_one(
        {"user_id": request.user_id, "fiscal_year": request.fiscal_year},
        {"$set": balance},
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Balance initialized",
        "balance": balance
    }


@router.post("/deduct")
async def deduct_leave(request: DeductLeaveRequest):
    """
    ➖ Déduire des jours de congé (appelé lors de l'approbation)
    
    Body:
    - user_id: ID employé
    - leave_type: Type (CA/RTT/CT/REC)
    - amount: Nombre de jours (positif)
    - absence_id: ID de l'absence
    - reason: Raison
    - fiscal_year: Année
    """
    service = get_service()
    
    try:
        transaction_id = await service.deduct_leave(
            user_id=request.user_id,
            leave_type=request.leave_type,
            amount=request.amount,
            absence_id=request.absence_id,
            reason=request.reason,
            fiscal_year=request.fiscal_year,
            created_by="system"
        )
        
        # Récupérer nouveau solde
        balance = await service.get_or_create_balance(request.user_id, request.fiscal_year)
        
        return {
            "success": True,
            "message": f"{request.amount} jours déduits",
            "transaction_id": transaction_id,
            "new_balance": balance.get(f"{request.leave_type.lower()}_balance", 0)
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/reintegrate")
async def reintegrate_leave(request: ReintegrateLeaveRequest):
    """
    ➕ Réintégrer des jours de congé (annulation ou remplacement maladie)
    
    Body:
    - user_id: ID employé
    - leave_type: Type (CA/RTT/CT/REC)
    - amount: Nombre de jours (positif)
    - absence_id: ID absence (optionnel)
    - reason: Raison
    - fiscal_year: Année
    """
    service = get_service()
    
    try:
        transaction_id = await service.reintegrate_leave(
            user_id=request.user_id,
            leave_type=request.leave_type,
            amount=request.amount,
            reason=request.reason,
            fiscal_year=request.fiscal_year,
            related_absence_id=request.absence_id,
            created_by="system"
        )
        
        # Récupérer nouveau solde
        balance = await service.get_or_create_balance(request.user_id, request.fiscal_year)
        
        return {
            "success": True,
            "message": f"{request.amount} jours réintégrés",
            "transaction_id": transaction_id,
            "new_balance": balance.get(f"{request.leave_type.lower()}_balance", 0)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
async def validate_leave_availability(request: ValidateLeaveRequest):
    """
    ✅ Valider qu'un employé a assez de solde disponible
    
    Body:
    - user_id: ID employé
    - leave_type: Type (CA/RTT/CT/REC)
    - amount: Nombre de jours demandés
    - fiscal_year: Année
    
    Retourne:
    - available: true/false
    - current_balance: Solde actuel
    - requested: Montant demandé
    - deficit: Manque (si insuffisant)
    """
    service = get_service()
    
    result = await service.validate_leave_request(
        user_id=request.user_id,
        leave_type=request.leave_type,
        amount=request.amount,
        fiscal_year=request.fiscal_year
    )
    
    return result


@router.post("/detect/{absence_id}")
async def detect_and_reintegrate(absence_id: str):
    """
    🤖 Détection automatique et réintégration pour chevauchement maladie
    
    Path params:
    - absence_id: ID de l'absence AM/MA/MAL qui pourrait chevaucher des CA/RTT
    
    Cette route est appelée automatiquement lors de l'approbation d'un arrêt maladie.
    Elle détecte les chevauchements avec des absences CA/RTT/CT et réintègre automatiquement.
    """
    service = get_service()
    
    try:
        reintegrations = await service.detect_and_reintegrate(absence_id)
        
        return {
            "success": True,
            "reintegrations": reintegrations,
            "count": len(reintegrations)
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "reintegrations": []
        }


@router.post("/manual-adjustment")
async def manual_adjustment(request: ManualAdjustmentRequest):
    """
    🔧 Ajustement manuel du solde (Admin uniquement)
    
    Body:
    - user_id: ID employé
    - leave_type: Type (CA/RTT/CT/REC)
    - amount: Montant (positif ou négatif)
    - reason: Raison de l'ajustement
    - fiscal_year: Année
    """
    service = get_service()
    
    try:
        transaction_id = await service.manual_adjustment(
            user_id=request.user_id,
            leave_type=request.leave_type,
            amount=request.amount,
            reason=request.reason,
            fiscal_year=request.fiscal_year,
            adjusted_by="admin"
        )
        
        balance = await service.get_or_create_balance(request.user_id, request.fiscal_year)
        
        return {
            "success": True,
            "message": "Ajustement effectué",
            "transaction_id": transaction_id,
            "new_balance": balance.get(f"{request.leave_type.lower()}_balance", 0)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/initialize-all")
async def initialize_all_balances(
    fiscal_year: Optional[int] = None,
    force_recalculate: bool = False
):
    """
    🚀 Initialiser les soldes de tous les employés avec calcul CCN66
    
    Cette fonction:
    1. Récupère tous les employés de la base
    2. Calcule les droits selon CCN66:
       - CA: 25j (proratisé temps partiel)
       - RTT: 12j
       - CT: 9j ou 18j selon catégorie (proratisé)
       - CEX: Ancienneté 2j/5ans max 6j (non proratisé)
    3. Crée les soldes dans la collection leave_balances
    
    Query params:
    - fiscal_year: Année (défaut: année en cours)
    - force_recalculate: Recalculer même si solde existe (défaut: false)
    """
    import server
    
    if fiscal_year is None:
        fiscal_year = datetime.now().year
    
    print(f"\n🚀 Starting initialization for fiscal year {fiscal_year}")
    
    # Get all users
    users = await server.db.users.find({}).to_list(None)
    print(f"📋 Found {len(users)} users")
    
    initialized = 0
    skipped = 0
    updated = 0
    errors = []
    
    for user in users:
        user_id = user.get("id")
        if not user_id:
            continue
        
        try:
            # Check if balance exists
            existing = await server.db.leave_balances.find_one({
                "user_id": user_id,
                "fiscal_year": fiscal_year
            })
            
            if existing and not force_recalculate:
                skipped += 1
                continue
            
            # Calculate CCN66-compliant balances
            categorie = user.get("categorie_employe", "").upper()
            metier = user.get("metier", "").lower()
            temps_travail = user.get("temps_travail", "100%")
            date_embauche = user.get("date_embauche")
            
            # Parse temps_travail percentage
            try:
                if isinstance(temps_travail, str):
                    temps_percent = float(temps_travail.replace("%", "").strip()) / 100.0
                else:
                    temps_percent = float(temps_travail) / 100.0
            except:
                temps_percent = 1.0
            
            # Calculate CA (prorated for part-time)
            ca_initial = 25.0 if temps_percent == 1.0 else round(25.0 * temps_percent, 1)
            
            # Calculate CT based on category
            category_a_keywords = ["educateur", "éducateur", "ouvrier", "chef"]
            is_category_a = categorie == "A" or any(kw in metier for kw in category_a_keywords)
            
            ct_base = 18.0 if is_category_a else 9.0
            ct_initial = ct_base if temps_percent == 1.0 else round(ct_base * temps_percent, 1)
            
            # Calculate ancienneté (NOT prorated)
            cex_initial = 0.0
            if date_embauche:
                try:
                    if isinstance(date_embauche, str):
                        for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"]:
                            try:
                                hire_date = datetime.strptime(date_embauche, fmt)
                                break
                            except:
                                continue
                    else:
                        hire_date = date_embauche
                    
                    years_service = (datetime.now() - hire_date).days / 365.25
                    if years_service >= 5:
                        cex_initial = min(6.0, (int(years_service / 5) * 2))
                except:
                    pass
            
            # RTT: 12 days base
            rtt_initial = 12.0
            
            # Create balance document
            balance_doc = {
                "id": f"lb_{user_id}_{fiscal_year}",
                "user_id": user_id,
                "fiscal_year": fiscal_year,
                "ca_balance": ca_initial,
                "rtt_balance": rtt_initial,
                "rec_balance": 0.0,
                "ct_balance": ct_initial,
                "cex_balance": cex_initial,
                "last_updated": datetime.utcnow()
            }
            
            if existing:
                # Update existing
                await server.db.leave_balances.update_one(
                    {"user_id": user_id, "fiscal_year": fiscal_year},
                    {"$set": balance_doc}
                )
                updated += 1
                print(f"  ✅ Updated: {user.get('prenom')} {user.get('nom')} - CA={ca_initial}j, CT={ct_initial}j, CEX={cex_initial}j")
            else:
                # Create new
                await server.db.leave_balances.insert_one(balance_doc)
                initialized += 1
                print(f"  ✅ Created: {user.get('prenom')} {user.get('nom')} - CA={ca_initial}j, CT={ct_initial}j, CEX={cex_initial}j")
        
        except Exception as e:
            errors.append({"user_id": user_id, "error": str(e)})
            print(f"  ❌ Error for {user.get('email')}: {e}")
    
    return {
        "success": True,
        "fiscal_year": fiscal_year,
        "initialized": initialized,
        "updated": updated,
        "skipped": skipped,
        "errors": len(errors),
        "error_details": errors if errors else None,
        "total_processed": initialized + updated + skipped
    }

