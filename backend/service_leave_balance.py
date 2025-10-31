"""
Service de gestion des soldes de congés
MOZAIK RH - Conformité légale réintégration congés

Ce service gère :
- Calcul et mise à jour des soldes
- Réintégration automatique des congés interrompus par maladie
- Historique des transactions
- Validation des soldes avant approbation

Adapté pour utiliser UUID au lieu d'ObjectId
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, date
from typing import Optional, List, Dict
import logging
import uuid

logger = logging.getLogger(__name__)


# ============================================================================
# SERVICE : Gestion des soldes de congés
# ============================================================================

class LeaveBalanceService:
    """Service gérant les soldes de congés des employés"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.balances_collection = db.leave_balances
        self.transactions_collection = db.leave_transactions
        self.absences_collection = db.absences
    
    
    # ========================================================================
    # INITIALISATION & RÉCUPÉRATION
    # ========================================================================
    
    async def get_or_create_balance(self, user_id: str, fiscal_year: int) -> Dict:
        """
        Récupère ou crée le solde d'un employé pour une année fiscale
        
        Args:
            user_id: ID de l'employé
            fiscal_year: Année fiscale (ex: 2025)
            
        Returns:
            Document de solde
        """
        balance = await self.balances_collection.find_one({
            "user_id": user_id,
            "fiscal_year": fiscal_year
        })
        
        if not balance:
            # Créer un nouveau solde avec valeurs par défaut
            balance = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "fiscal_year": fiscal_year,
                "ca_balance": 25.0,  # Défaut : 25 jours CA
                "rtt_balance": 12.0,  # Défaut : 12 jours RTT
                "ct_balance": 0.0,    # Défaut : 0 (dépend catégorie)
                "rec_balance": 0.0,   # Défaut : 0
                "last_updated": datetime.utcnow()
            }
            
            result = await self.balances_collection.insert_one(balance)
            
            logger.info(f"✅ Solde créé pour user {user_id} (année {fiscal_year})")
        
        return balance
    
    
    async def get_balance(self, user_id: str, fiscal_year: Optional[int] = None) -> Dict:
        """
        Récupère le solde actuel d'un employé
        
        Args:
            user_id: ID de l'employé
            fiscal_year: Année fiscale (défaut: année en cours)
            
        Returns:
            Document de solde ou None
        """
        if fiscal_year is None:
            fiscal_year = datetime.now().year
        
        return await self.get_or_create_balance(user_id, fiscal_year)
    
    
    async def get_all_balances(self, fiscal_year: Optional[int] = None) -> List[Dict]:
        """
        Récupère tous les soldes pour une année fiscale
        
        Args:
            fiscal_year: Année fiscale (défaut: année en cours)
            
        Returns:
            Liste des soldes
        """
        if fiscal_year is None:
            fiscal_year = datetime.now().year
        
        cursor = self.balances_collection.find({"fiscal_year": fiscal_year})
        return await cursor.to_list(length=None)
    
    
    # ========================================================================
    # TRANSACTIONS & HISTORIQUE
    # ========================================================================
    
    async def create_transaction(
        self,
        user_id: str,
        operation_type: str,
        leave_type: str,
        amount: float,
        reason: str,
        created_by: str,
        balance_before: float,
        balance_after: float,
        absence_id: Optional[str] = None,
        replaced_absence_id: Optional[str] = None
    ) -> str:
        """
        Enregistre une transaction dans l'historique
        
        Args:
            user_id: ID de l'employé
            operation_type: Type d'opération (DEDUCTION, REINTEGRATION, etc.)
            leave_type: Type de congé (CA, RTT, CT, REC)
            amount: Montant (positif ou négatif)
            reason: Motif de la transaction
            created_by: Auteur (user_id ou "system")
            balance_before: Solde avant
            balance_after: Solde après
            absence_id: ID de l'absence liée (optionnel)
            replaced_absence_id: ID de l'absence remplacée (optionnel)
            
        Returns:
            ID de la transaction créée
        """
        transaction = {
            "user_id": user_id,
            "operation_type": operation_type,
            "leave_type": leave_type,
            "amount": amount,
            "reason": reason,
            "created_by": created_by,
            "balance_before": balance_before,
            "balance_after": balance_after,
            "absence_id": absence_id,
            "replaced_absence_id": replaced_absence_id,
            "created_at": datetime.utcnow()
        }
        
        result = await self.transactions_collection.insert_one(transaction)
        logger.info(f"📝 Transaction créée : {operation_type} {amount}j ({leave_type}) pour user {user_id}")
        
        return str(result.inserted_id)
    
    
    async def get_transaction_history(
        self, 
        user_id: str, 
        limit: int = 50
    ) -> List[Dict]:
        """
        Récupère l'historique des transactions d'un employé
        
        Args:
            user_id: ID de l'employé
            limit: Nombre max de transactions à retourner
            
        Returns:
            Liste des transactions (plus récentes en premier)
        """
        cursor = self.transactions_collection.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    
    # ========================================================================
    # MISE À JOUR DES SOLDES
    # ========================================================================
    
    async def update_balance(
        self,
        user_id: str,
        leave_type: str,
        amount: float,
        operation_type: str,
        reason: str,
        created_by: str,
        absence_id: Optional[str] = None,
        replaced_absence_id: Optional[str] = None,
        fiscal_year: Optional[int] = None
    ) -> Dict:
        """
        Met à jour le solde d'un employé et enregistre la transaction
        
        Args:
            user_id: ID de l'employé
            leave_type: Type de congé (CA, RTT, CT, REC)
            amount: Montant à ajouter (positif) ou retirer (négatif)
            operation_type: Type d'opération
            reason: Motif
            created_by: Auteur
            absence_id: ID absence liée
            replaced_absence_id: ID absence remplacée
            fiscal_year: Année fiscale
            
        Returns:
            Solde mis à jour
        """
        if fiscal_year is None:
            fiscal_year = datetime.now().year
        
        # Récupérer le solde actuel
        balance = await self.get_or_create_balance(user_id, fiscal_year)
        
        # Déterminer le champ à modifier
        balance_field = f"{leave_type.lower()}_balance"
        balance_before = balance[balance_field]
        balance_after = max(0, balance_before + amount)  # Éviter soldes négatifs
        
        # Mettre à jour le solde
        await self.balances_collection.update_one(
            {"_id": balance["_id"]},
            {
                "$set": {
                    balance_field: balance_after,
                    "last_updated": datetime.utcnow()
                }
            }
        )
        
        # Enregistrer la transaction
        await self.create_transaction(
            user_id=user_id,
            operation_type=operation_type,
            leave_type=leave_type,
            amount=amount,
            reason=reason,
            created_by=created_by,
            balance_before=balance_before,
            balance_after=balance_after,
            absence_id=absence_id,
            replaced_absence_id=replaced_absence_id
        )
        
        logger.info(f"✅ Solde mis à jour : user {user_id}, {leave_type} {balance_before} → {balance_after}")
        
        # Retourner le solde mis à jour
        return await self.get_balance(user_id, fiscal_year)
    
    
    # ========================================================================
    # DÉDUCTION (Validation d'absence)
    # ========================================================================
    
    async def deduct_leave(
        self,
        user_id: str,
        leave_type: str,
        days: float,
        absence_id: str,
        approved_by: str
    ) -> Dict:
        """
        Déduit des jours de congé lors de l'approbation d'une absence
        
        Args:
            user_id: ID de l'employé
            leave_type: Type de congé (CA, RTT, CT, REC)
            days: Nombre de jours à déduire
            absence_id: ID de l'absence approuvée
            approved_by: ID de l'approbateur
            
        Returns:
            Solde mis à jour
        """
        return await self.update_balance(
            user_id=user_id,
            leave_type=leave_type,
            amount=-days,  # Négatif pour déduction
            operation_type="DEDUCTION",
            reason=f"Approbation absence {absence_id} ({days} jours)",
            created_by=approved_by,
            absence_id=absence_id
        )
    
    
    # ========================================================================
    # RÉINTÉGRATION (Remplacement par maladie)
    # ========================================================================
    
    async def reintegrate_leave(
        self,
        user_id: str,
        leave_type: str,
        days: float,
        original_absence_id: str,
        sick_leave_absence_id: str,
        created_by: str = "system"
    ) -> Dict:
        """
        🔥 FONCTION CLÉ : Réintègre des jours de congé suite à un arrêt maladie
        
        Scénario :
        1. Employé pose CA du 15 au 19 janvier (5 jours) → Approuvé → Déduit
        2. Employé tombe malade du 17 au 19 janvier (3 jours)
        3. Cette fonction réintègre 3 jours de CA (jours chevauchants)
        
        Args:
            user_id: ID de l'employé
            leave_type: Type de congé à réintégrer (CA, RTT, CT, REC)
            days: Nombre de jours à réintégrer
            original_absence_id: ID de l'absence CA/RTT initiale
            sick_leave_absence_id: ID de l'arrêt maladie
            created_by: Auteur (défaut: "system")
            
        Returns:
            Solde mis à jour
        """
        reason = (
            f"Réintégration {days} jour(s) de {leave_type} suite à arrêt maladie. "
            f"Absence initiale: {original_absence_id}, Arrêt maladie: {sick_leave_absence_id}"
        )
        
        return await self.update_balance(
            user_id=user_id,
            leave_type=leave_type,
            amount=days,  # Positif pour réintégration
            operation_type="REINTEGRATION",
            reason=reason,
            created_by=created_by,
            absence_id=sick_leave_absence_id,
            replaced_absence_id=original_absence_id
        )
    
    
    # ========================================================================
    # DÉTECTION AUTOMATIQUE DES RÉINTÉGRATIONS
    # ========================================================================
    
    async def detect_and_reintegrate(self, sick_leave_absence: Dict) -> List[Dict]:
        """
        🤖 DÉTECTION AUTOMATIQUE : Détecte les congés chevauchés par un arrêt maladie
        et réintègre automatiquement les jours concernés
        
        Cette fonction est appelée automatiquement lors de :
        - L'approbation d'un arrêt maladie
        - La création d'un arrêt maladie déjà approuvé
        
        Args:
            sick_leave_absence: Document de l'arrêt maladie
            
        Returns:
            Liste des réintégrations effectuées
        """
        if sick_leave_absence["absence_type"] != "MALADIE":
            return []
        
        user_id = sick_leave_absence["user_id"]
        sick_start = sick_leave_absence["start_date"]
        sick_end = sick_leave_absence["end_date"]
        
        # Convertir en datetime si nécessaire
        if isinstance(sick_start, str):
            sick_start = datetime.fromisoformat(sick_start.replace('Z', '+00:00'))
        if isinstance(sick_end, str):
            sick_end = datetime.fromisoformat(sick_end.replace('Z', '+00:00'))
        
        # Chercher les absences CA/RTT/CT/REC approuvées qui chevauchent
        overlapping_absences = await self.absences_collection.find({
            "user_id": user_id,
            "absence_type": {"$in": ["CA", "RTT", "CT", "REC"]},
            "status": "approved",
            "start_date": {"$lte": sick_end},
            "end_date": {"$gte": sick_start}
        }).to_list(length=None)
        
        reintegrations = []
        
        for absence in overlapping_absences:
            # Calculer le chevauchement
            overlap_start = max(
                sick_start,
                datetime.fromisoformat(absence["start_date"].replace('Z', '+00:00'))
            )
            overlap_end = min(
                sick_end,
                datetime.fromisoformat(absence["end_date"].replace('Z', '+00:00'))
            )
            
            # Calculer le nombre de jours ouvrables chevauchés
            days_overlapped = self._calculate_working_days(overlap_start, overlap_end)
            
            if days_overlapped > 0:
                # Réintégrer les jours
                result = await self.reintegrate_leave(
                    user_id=user_id,
                    leave_type=absence["absence_type"],
                    days=days_overlapped,
                    original_absence_id=str(absence["_id"]),
                    sick_leave_absence_id=str(sick_leave_absence["_id"])
                )
                
                reintegrations.append({
                    "absence_id": str(absence["_id"]),
                    "leave_type": absence["absence_type"],
                    "days_reintegrated": days_overlapped,
                    "new_balance": result[f"{absence['absence_type'].lower()}_balance"]
                })
                
                logger.info(
                    f"🔄 Réintégration automatique : {days_overlapped}j de {absence['absence_type']} "
                    f"pour user {user_id}"
                )
        
        return reintegrations
    
    
    def _calculate_working_days(self, start_date: datetime, end_date: datetime) -> float:
        """
        Calcule le nombre de jours ouvrables entre deux dates (L-V)
        
        Args:
            start_date: Date de début
            end_date: Date de fin
            
        Returns:
            Nombre de jours ouvrables (float)
        """
        current = start_date.date() if isinstance(start_date, datetime) else start_date
        end = end_date.date() if isinstance(end_date, datetime) else end_date
        
        working_days = 0
        
        while current <= end:
            # Lundi = 0, Dimanche = 6
            if current.weekday() < 5:  # Lundi à Vendredi
                working_days += 1
            current = date.fromordinal(current.toordinal() + 1)
        
        return float(working_days)
    
    
    # ========================================================================
    # VALIDATION AVANT APPROBATION
    # ========================================================================
    
    async def validate_leave_request(
        self,
        user_id: str,
        leave_type: str,
        days: float,
        fiscal_year: Optional[int] = None
    ) -> Dict:
        """
        Valide qu'un employé a suffisamment de solde avant d'approuver une absence
        
        Args:
            user_id: ID de l'employé
            leave_type: Type de congé
            days: Nombre de jours demandés
            fiscal_year: Année fiscale
            
        Returns:
            {
                "valid": bool,
                "message": str,
                "available": float,
                "requested": float
            }
        """
        # Types non soumis à solde
        if leave_type not in ["CA", "RTT", "CT", "REC"]:
            return {
                "valid": True,
                "message": "Ce type d'absence n'est pas soumis à un solde",
                "available": None,
                "requested": days
            }
        
        balance = await self.get_balance(user_id, fiscal_year)
        balance_field = f"{leave_type.lower()}_balance"
        available = balance[balance_field]
        
        if available >= days:
            return {
                "valid": True,
                "message": f"Solde suffisant ({available} jours disponibles)",
                "available": available,
                "requested": days
            }
        else:
            return {
                "valid": False,
                "message": f"Solde insuffisant : {available} jours disponibles, {days} demandés",
                "available": available,
                "requested": days
            }
    
    
    # ========================================================================
    # AJUSTEMENTS MANUELS (Admin)
    # ========================================================================
    
    async def manual_adjustment(
        self,
        user_id: str,
        leave_type: str,
        amount: float,
        reason: str,
        admin_user_id: str
    ) -> Dict:
        """
        Ajustement manuel du solde par un administrateur
        
        Args:
            user_id: ID de l'employé
            leave_type: Type de congé
            amount: Montant à ajouter (positif) ou retirer (négatif)
            reason: Justification obligatoire
            admin_user_id: ID de l'admin effectuant l'ajustement
            
        Returns:
            Solde mis à jour
        """
        return await self.update_balance(
            user_id=user_id,
            leave_type=leave_type,
            amount=amount,
            operation_type="MANUAL_ADJUSTMENT",
            reason=f"Ajustement manuel par admin : {reason}",
            created_by=admin_user_id
        )
