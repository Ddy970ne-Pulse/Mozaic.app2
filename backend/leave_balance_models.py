"""
Modèles Pydantic pour la gestion des soldes de congés et réintégrations
Compatible avec MongoDB (Motor) et FastAPI
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from uuid import uuid4


class EmployeeLeaveBalance(BaseModel):
    """
    Soldes de congés d'un employé pour une année donnée.
    Collection MongoDB : leave_balances
    """
    id: str = Field(default_factory=lambda: str(uuid4()), alias="_id")
    employee_id: str  # Référence à users._id
    year: int  # Année de référence (ex: 2025)
    
    # === CONGÉS ANNUELS (CA) ===
    ca_initial: float = 25.0  # Solde initial annuel (ex: 25 jours)
    ca_taken: float = 0.0  # Jours consommés
    ca_reintegrated: float = 0.0  # Jours réintégrés suite à interruptions
    ca_balance: float = 25.0  # Solde disponible = initial - taken + reintegrated
    
    # === RTT ===
    rtt_initial: float = 12.0  # Solde initial annuel (ex: 12 jours)
    rtt_taken: float = 0.0
    rtt_reintegrated: float = 0.0
    rtt_balance: float = 12.0
    
    # === RÉCUPÉRATION (accumulation variable) ===
    rec_balance: float = 0.0  # Pas de solde initial, s'accumule au fil de l'eau
    rec_taken: float = 0.0
    rec_reintegrated: float = 0.0
    
    # === CONGÉS TRIMESTRIELS (CT) ===
    ct_balance: float = 0.0
    ct_taken: float = 0.0
    ct_reintegrated: float = 0.0
    
    # === CONGÉS PAYÉS (CP) ===
    cp_initial: float = 0.0
    cp_taken: float = 0.0
    cp_reintegrated: float = 0.0
    cp_balance: float = 0.0
    
    # === CONGÉS EXCEPTIONNELS (CEX) ===
    cex_balance: float = 0.0
    cex_taken: float = 0.0
    cex_reintegrated: float = 0.0
    
    # === Métadonnées ===
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "_id": "507f1f77bcf86cd799439011",
                "employee_id": "507f1f77bcf86cd799439012",
                "year": 2025,
                "ca_balance": 19.0,
                "ca_taken": 10.0,
                "ca_reintegrated": 4.0,
                "rtt_balance": 12.0
            }
        }


class LeaveTransaction(BaseModel):
    """
    Historique des mouvements de compteurs de congés.
    Collection MongoDB : leave_transactions
    """
    id: str = Field(default_factory=lambda: str(uuid4()), alias="_id")
    employee_id: str  # Référence à users._id
    transaction_date: datetime = Field(default_factory=datetime.utcnow)
    
    # === Type de congé concerné ===
    leave_type: Literal["CA", "CP", "CT", "RTT", "REC", "CEX"]
    
    # === Type d'opération ===
    operation: Literal[
        "deduct",  # Déduction lors de la pose
        "reintegrate",  # Réintégration suite à interruption
        "grant",  # Attribution initiale ou ajustement
        "correction"  # Correction manuelle
    ]
    
    # === Montants ===
    amount: float  # Nombre de jours (positif ou négatif selon opération)
    balance_before: float  # Solde avant transaction
    balance_after: float  # Solde après transaction
    
    # === Contexte ===
    reason: str  # Description lisible (ex: "Maladie du 05/01 au 10/01")
    related_absence_id: Optional[str] = None  # ID de l'absence liée (si applicable)
    interrupting_absence_id: Optional[str] = None  # ID de l'absence qui interrompt
    
    # === Métadonnées ===
    created_by: Optional[str] = None  # ID de l'utilisateur qui a effectué l'action
    is_automatic: bool = True  # True si réintégration automatique, False si manuelle
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "_id": "507f1f77bcf86cd799439013",
                "employee_id": "507f1f77bcf86cd799439012",
                "leave_type": "CA",
                "operation": "reintegrate",
                "amount": 4.0,
                "balance_before": 15.0,
                "balance_after": 19.0,
                "reason": "Réintégration suite à arrêt maladie du 05/01 au 10/01",
                "related_absence_id": "507f1f77bcf86cd799439014",
                "interrupting_absence_id": "507f1f77bcf86cd799439015",
                "is_automatic": True
            }
        }


# === DTOs pour les requêtes API ===

class DeductLeaveRequest(BaseModel):
    """Requête pour décompter des jours lors de la pose d'absence"""
    employee_id: str
    leave_type: Literal["CA", "CP", "CT", "RTT", "REC", "CEX"]
    days: float
    absence_id: str  # ID de l'absence créée
    reason: Optional[str] = None


class ReintegrateLeaveRequest(BaseModel):
    """Requête pour réintégrer des jours suite à interruption"""
    employee_id: str
    leave_type: Literal["CA", "CP", "CT", "RTT", "REC", "CEX"]
    days: float
    reason: str
    original_absence_id: str  # ID de l'absence interrompue
    interrupting_absence_id: str  # ID de l'absence qui interrompt


class GrantLeaveRequest(BaseModel):
    """Requête pour attribuer des jours (attribution initiale ou ajustement)"""
    employee_id: str
    leave_type: Literal["CA", "CP", "CT", "RTT", "REC", "CEX"]
    days: float
    reason: str
    created_by: Optional[str] = None


class LeaveBalanceResponse(BaseModel):
    """Réponse contenant les soldes d'un employé"""
    employee_id: str
    year: int
    balances: dict  # Format: {"CA": 19.0, "RTT": 12.0, ...}
    last_updated: datetime


class LeaveTransactionResponse(BaseModel):
    """Réponse contenant une transaction"""
    transaction_id: str
    employee_id: str
    leave_type: str
    operation: str
    amount: float
    balance_after: float
    reason: str
    transaction_date: datetime
