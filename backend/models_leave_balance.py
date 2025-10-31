"""
Modèles Pydantic pour la gestion des soldes de congés et transactions
MOZAIK RH - Conformité légale réintégration congés
Adapté pour utiliser UUID au lieu d'ObjectId
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
import uuid


# ============================================================================
# MODÈLE : Solde de congés d'un employé
# ============================================================================

class EmployeeLeaveBalance(BaseModel):
    """
    Représente les soldes de congés d'un employé
    
    Champs :
    - user_id : ID de l'employé (référence à users collection)
    - ca_balance : Solde Congés Annuels (jours)
    - rtt_balance : Solde RTT (jours)
    - ct_balance : Solde Congés Trimestriels (jours, catégorie A uniquement)
    - rec_balance : Solde Récupération (jours)
    - last_updated : Date de dernière mise à jour
    - fiscal_year : Année fiscale du solde
    """
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(..., description="ID de l'employé")
    
    # Soldes par type de congé (en jours ouvrables)
    ca_balance: float = Field(default=0.0, ge=0, description="Congés Annuels disponibles")
    rtt_balance: float = Field(default=0.0, ge=0, description="RTT disponibles")
    ct_balance: float = Field(default=0.0, ge=0, description="Congés Trimestriels disponibles (Cat. A)")
    rec_balance: float = Field(default=0.0, ge=0, description="Récupération disponible")
    
    # Métadonnées
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    fiscal_year: int = Field(..., description="Année fiscale (ex: 2025)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "user_id": "user-uuid-123",
                "ca_balance": 25.0,
                "rtt_balance": 12.0,
                "ct_balance": 4.0,
                "rec_balance": 2.5,
                "fiscal_year": 2025
            }
        }


# ============================================================================
# MODÈLE : Transaction de solde (historique)
# ============================================================================

class LeaveTransaction(BaseModel):
    """
    Historique des mouvements de soldes de congés
    
    Types d'opérations :
    - DEDUCTION : Retrait de jours (validation absence)
    - REINTEGRATION : Ajout de jours (annulation absence, remplacement maladie)
    - ACQUISITION : Acquisition automatique (mensuelle/trimestrielle)
    - MANUAL_ADJUSTMENT : Ajustement manuel par admin
    """
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(..., description="ID de l'employé concerné")
    
    # Type d'opération
    operation_type: Literal["DEDUCTION", "REINTEGRATION", "ACQUISITION", "MANUAL_ADJUSTMENT"] = Field(
        ..., description="Type d'opération effectuée"
    )
    
    # Type de congé concerné
    leave_type: Literal["CA", "RTT", "CT", "REC"] = Field(
        ..., description="Type de congé (CA/RTT/CT/REC)"
    )
    
    # Montant
    amount: float = Field(..., description="Nombre de jours (positif = ajout, négatif = retrait)")
    
    # Contexte
    absence_id: Optional[str] = Field(None, description="ID de l'absence liée (si applicable)")
    reason: str = Field(..., description="Raison du mouvement")
    performed_by: str = Field(..., description="ID de l'utilisateur ayant effectué l'opération")
    
    # Soldes avant/après
    balance_before: float = Field(..., description="Solde avant l'opération")
    balance_after: float = Field(..., description="Solde après l'opération")
    
    # Métadonnées
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    fiscal_year: int = Field(..., description="Année fiscale concernée")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "trans-uuid-123",
                "user_id": "user-uuid-456",
                "operation_type": "DEDUCTION",
                "leave_type": "CA",
                "amount": -5.0,
                "absence_id": "absence-uuid-789",
                "reason": "Validation absence CA du 15-19/01/2025",
                "performed_by": "admin-uuid-001",
                "balance_before": 25.0,
                "balance_after": 20.0,
                "fiscal_year": 2025
            }
        }


# ============================================================================
# DTOs : Requêtes et réponses API
# ============================================================================

class LeaveBalanceResponse(BaseModel):
    """Réponse API : solde d'un employé"""
    user_id: str
    fiscal_year: int
    ca_balance: float
    rtt_balance: float
    ct_balance: float
    rec_balance: float
    last_updated: datetime


class DeductLeaveRequest(BaseModel):
    """Requête API : déduire des jours de congé"""
    user_id: str
    leave_type: Literal["CA", "RTT", "CT", "REC"]
    amount: float = Field(..., gt=0, description="Nombre de jours à déduire (positif)")
    absence_id: str
    reason: str
    fiscal_year: int


class ReintegrateLeaveRequest(BaseModel):
    """Requête API : réintégrer des jours de congé"""
    user_id: str
    leave_type: Literal["CA", "RTT", "CT", "REC"]
    amount: float = Field(..., gt=0, description="Nombre de jours à réintégrer (positif)")
    absence_id: Optional[str] = None
    reason: str
    fiscal_year: int


class ManualAdjustmentRequest(BaseModel):
    """Requête API : ajustement manuel par admin"""
    user_id: str
    leave_type: Literal["CA", "RTT", "CT", "REC"]
    amount: float = Field(..., description="Montant d'ajustement (positif ou négatif)")
    reason: str
    fiscal_year: int


class ValidateLeaveRequest(BaseModel):
    """Requête API : valider la disponibilité de solde"""
    user_id: str
    leave_type: Literal["CA", "RTT", "CT", "REC"]
    amount: float
    fiscal_year: int


class InitializeBalanceRequest(BaseModel):
    """Requête API : initialiser un solde"""
    user_id: str
    fiscal_year: int
    ca_initial: float = 25.0
    rtt_initial: float = 12.0
    ct_initial: float = 0.0
    rec_initial: float = 0.0
