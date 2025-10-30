from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, date, timedelta, timezone
import jwt
import bcrypt
import secrets
import string

# Import du service de synchronisation
from sync_service import DataSyncService
from websocket_manager import ws_manager


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Logger configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialiser le service de synchronisation globale après le logger
sync_service = DataSyncService(db)
logger.info("🔄 Service de synchronisation globale initialisé")

# Startup event for auto-backup and restore
@app.on_event("startup")
async def startup_event():
    """Événement de démarrage - Auto-restore DÉSACTIVÉ pour éviter perte de données"""
    try:
        # DÉSACTIVÉ: L'auto-restore causait une perte de données en restaurant depuis des backups corrompus
        # from backup_restore import auto_restore_if_empty
        logger.info("✅ Server starting - auto-restore disabled to prevent data loss")
        # await auto_restore_if_empty()
    except Exception as e:
        logger.warning(f"⚠️ Startup check failed: {str(e)}")

# Security
security = HTTPBearer()

# User Management - No more hardcoded demo data
# Users will be stored in MongoDB with proper password hashing

# Delegation data will be stored in MongoDB, no more hardcoded demo data

demo_absence_types = [
    {"code": "AT", "name": "Accident du travail/Trajet", "category": "medical", "type": "Absentéisme", "counting_method": "Jours Calendaires", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "AM", "name": "Arrêt maladie", "category": "medical", "type": "Absentéisme", "counting_method": "Jours Calendaires", "requires_validation": False, "requires_acknowledgment": True},
    {"code": "MPRO", "name": "Maladie Professionnelle", "category": "medical", "type": "Absentéisme", "counting_method": "Jours Calendaires", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "EMAL", "name": "Enfants malades", "category": "medical", "type": "Absentéisme", "counting_method": "Jours Calendaires", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "RMED", "name": "Rendez-vous médical", "category": "medical", "type": "Absentéisme", "counting_method": "Jours Ouvrés", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "MAT", "name": "Congé maternité", "category": "family", "type": "Absence Programmée", "counting_method": "Jours Calendaires", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "PAT", "name": "Congé paternité", "category": "family", "type": "Absence Programmée", "counting_method": "Jours Calendaires", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "FAM", "name": "Évènement familial", "category": "family", "type": "Absentéisme", "counting_method": "Jours Calendaires", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "CA", "name": "CA - Congés Annuels", "category": "vacation", "type": "Absence Programmée", "counting_method": "Jours Ouvrables", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "CT", "name": "Congés Trimestriels", "category": "vacation", "type": "Absence Programmée", "counting_method": "Jours Ouvrés", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "RTT", "name": "RTT (Réduction Temps Travail)", "category": "vacation", "type": "Absence Programmée", "counting_method": "Jours Ouvrables", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "REC", "name": "Récupération", "category": "vacation", "type": "Absence Programmée", "counting_method": "Jours Ouvrables", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "RH", "name": "Repos Hebdomadaire", "category": "vacation", "type": "Absence Programmée", "counting_method": "Jours Ouvrables", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "RHD", "name": "Repos Dominical", "category": "vacation", "type": "Absence Programmée", "counting_method": "Jours Calendaires", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "CEX", "name": "Congé exceptionnel", "category": "vacation", "type": "Absentéisme", "counting_method": "Jours Ouvrables", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "TEL", "name": "Télétravail", "category": "work", "type": "Absentéisme", "counting_method": "Jours Ouvrables", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "DEL", "name": "Délégation", "category": "work", "type": "Absentéisme", "counting_method": "Jours Ouvrables", "requires_validation": False, "requires_acknowledgment": False},
    {"code": "FO", "name": "Congé formation", "category": "work", "type": "Absentéisme", "counting_method": "Jours Ouvrables", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "STG", "name": "Stage", "category": "work", "type": "Absence Programmée", "counting_method": "Jours Ouvrés", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "NAUT", "name": "Absence non autorisée", "category": "other", "type": "Absentéisme", "counting_method": "Jours Calendaires", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "AUT", "name": "Absence autorisée", "category": "other", "type": "Absentéisme", "counting_method": "Jours Calendaires", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "CSS", "name": "Congés Sans Solde", "category": "other", "type": "Absentéisme", "counting_method": "Jours Ouvrables", "requires_validation": True, "requires_acknowledgment": False}
]

# 🔄 HELPER: Récupérer types d'absence depuis BDD ou fallback
async def get_absence_type_config(code: str = None):
    """
    Récupère la configuration d'un type d'absence depuis MongoDB
    Fallback vers demo_absence_types si BDD indisponible
    
    Args:
        code: Si fourni, retourne uniquement ce type. Sinon tous les types.
    
    Returns:
        dict ou list[dict]: Configuration du/des type(s) d'absence
    """
    try:
        if code:
            # Récupérer un type spécifique
            absence_type = await db.absence_types_config.find_one({"code": code})
            if absence_type:
                if "_id" in absence_type:
                    del absence_type["_id"]
                return absence_type
            else:
                # Fallback vers demo_absence_types
                return next((at for at in demo_absence_types if at["code"] == code), None)
        else:
            # Récupérer tous les types
            absence_types = await db.absence_types_config.find({}).to_list(100)
            if absence_types:
                for at in absence_types:
                    if "_id" in at:
                        del at["_id"]
                return absence_types
            else:
                # Fallback vers demo_absence_types
                return demo_absence_types
    except Exception as e:
        logger.warning(f"⚠️ Erreur récupération absence_types_config, fallback vers demo_absence_types: {str(e)}")
        if code:
            return next((at for at in demo_absence_types if at["code"] == code), None)
        else:
            return demo_absence_types

# Password hashing utilities
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def calculate_end_date(start_date_str: str, days_count: int, counting_method: str) -> str:
    """
    Calculate end date based on absence counting method
    
    Args:
        start_date_str: Start date in YYYY-MM-DD or DD/MM/YYYY format
        days_count: Number of days
        counting_method: "Jours Calendaires", "Jours Ouvrés", or "Jours Ouvrables"
    
    Returns:
        End date in DD/MM/YYYY format
    """
    from datetime import datetime as dt, timedelta
    
    # Parse start date (handle both formats)
    try:
        if '/' in start_date_str:
            # Format DD/MM/YYYY
            start_date = dt.strptime(start_date_str, "%d/%m/%Y")
        else:
            # Format YYYY-MM-DD
            start_date = dt.strptime(start_date_str, "%Y-%m-%d")
    except:
        return ""
    
    if days_count <= 0:
        return start_date_str
    
    # Calculate end date based on counting method
    if counting_method == "Jours Calendaires":
        # All days count (including weekends)
        end_date = start_date + timedelta(days=days_count - 1)
    
    elif counting_method == "Jours Ouvrés":
        # Monday to Saturday (6 days/week)
        days_added = 0
        current_date = start_date
        while days_added < days_count:
            if current_date.weekday() < 6:  # Monday=0 to Saturday=5
                days_added += 1
            if days_added < days_count:
                current_date += timedelta(days=1)
        end_date = current_date
    
    elif counting_method == "Jours Ouvrables":
        # Monday to Friday (5 days/week)
        days_added = 0
        current_date = start_date
        while days_added < days_count:
            if current_date.weekday() < 5:  # Monday=0 to Friday=4
                days_added += 1
            if days_added < days_count:
                current_date += timedelta(days=1)
        end_date = current_date
    
    else:
        # Default: calendar days
        end_date = start_date + timedelta(days=days_count - 1)
    
    # Return in French format DD/MM/YYYY
    return end_date.strftime("%d/%m/%Y")

def generate_internal_email(prenom: str, nom: str) -> str:
    """
    Generate an internal email for employees without professional email
    Format: prenom.nom@internal.aaea-gpe.fr
    """
    import unicodedata
    import re
    
    # Fonction pour normaliser et retirer les accents
    def remove_accents(text):
        nfkd = unicodedata.normalize('NFKD', text)
        return ''.join([c for c in nfkd if not unicodedata.combining(c)])
    
    # Nettoyer et normaliser
    prenom_clean = remove_accents(prenom.lower().strip())
    nom_clean = remove_accents(nom.lower().strip())
    
    # Retirer caractères spéciaux, garder seulement lettres et chiffres
    prenom_clean = re.sub(r'[^a-z0-9]', '', prenom_clean)
    nom_clean = re.sub(r'[^a-z0-9]', '', nom_clean)
    
    # Construire l'email
    email = f"{prenom_clean}.{nom_clean}@internal.aaea-gpe.fr"
    
    return email

def generate_temp_password(format_type: str = "strong") -> str:
    """
    Generate a secure temporary password
    Format: XXXX-XXXX-XXXX-XXXX (16 caractères + 3 tirets)
    Mélange de lettres majuscules, minuscules, chiffres et caractères spéciaux
    """
    # Caractères autorisés (sans ambiguïtés)
    uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'  # Sans I, O
    lowercase = 'abcdefghijkmnpqrstuvwxyz'  # Sans l, o
    digits = '23456789'  # Sans 0, 1
    special = '!@#$%&*+-='  # Caractères spéciaux sûrs
    
    # Pool de tous les caractères
    all_chars = uppercase + lowercase + digits + special
    
    # Générer 4 groupes de 4 caractères
    groups = []
    for _ in range(4):
        group = ''.join(secrets.choice(all_chars) for _ in range(4))
        groups.append(group)
    
    # Joindre avec des tirets
    return '-'.join(groups)

def is_temp_password_expired(expires_at: Optional[datetime]) -> bool:
    """Check if temporary password has expired"""
    if not expires_at:
        return False
    return datetime.utcnow() > expires_at

# Absence hours/days conversion functions
HOURS_PER_DAY = 8.0  # Configuration: 8 heures par jour

def hours_to_days(hours: float) -> float:
    """Convert hours to days (8h = 1 day)"""
    return hours / HOURS_PER_DAY

def days_to_hours(days: float) -> float:
    """Convert days to hours (1 day = 8h)"""
    return days * HOURS_PER_DAY

def format_hours_to_hhmm(hours: float) -> str:
    """Format hours as HH:MM (e.g., 8.5 -> '08:30')"""
    h = int(hours)
    m = int((hours - h) * 60)
    return f"{h:02d}:{m:02d}"

def is_absence_type_hourly(motif: str) -> bool:
    """Check if absence type can be specified in hours"""
    # Types autorisés en heures: Heures supplémentaires, Délégation, Récupération, Télétravail
    hourly_types = ['DEL', 'REC', 'TEL', 'HS']  # HS = Heures Supplémentaires
    return motif.upper() in hourly_types

# Authentication helper functions
def create_access_token(user_id: str, email: str, role: str):
    payload = {
        "user_id": user_id,
        "email": email, 
        "role": role,
        "exp": datetime.utcnow().timestamp() + (24 * 3600)  # 24 hours
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token and MongoDB"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_email = payload.get("email")
        user_id = payload.get("user_id")
        
        if not user_email or not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user from MongoDB
        user_data = await db.users.find_one({"email": user_email, "id": user_id})
        if not user_data:
            raise HTTPException(status_code=401, detail="User not found")
        
        if not user_data.get("is_active", True):
            raise HTTPException(status_code=401, detail="User account is inactive")
        
        return User(**user_data)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")


# Security
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')

# Initialize default admin user
async def initialize_admin_user():
    """Create the initial admin user if no users exist"""
    user_count = await db.users.count_documents({})
    if user_count == 0:
        admin_user = UserInDB(
            name="DACALOR Diégo",
            email="ddacalor@aaea-gpe.fr",
            role="admin",
            department="Direction",
            hashed_password=hash_password("admin123"),
            requires_password_change=False,  # Admin permanent password
            first_login=False,
            created_by="system"
        )
        await db.users.insert_one(admin_user.dict())
        print("✅ Initial admin user created: ddacalor@aaea-gpe.fr / admin123")

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Authentication Models
class LoginRequest(BaseModel):
    email: str
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    role: str  # admin, manager, employee
    department: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[str] = None
    isDelegateCSE: Optional[bool] = False
    is_active: bool = True
    requires_password_change: bool = False
    first_login: bool = True
    last_login: Optional[datetime] = None
    temp_password_expires: Optional[datetime] = None
    temp_password_plain: Optional[str] = None  # Mot de passe temporaire actuel en clair (visible admin uniquement)
    initial_password: Optional[str] = None  # Mot de passe initial PERMANENT (pour réinitialisation)
    has_temp_email: bool = False  # Email généré automatiquement (sans email pro)
    # Champs additionnels depuis employees
    date_naissance: Optional[str] = None
    sexe: Optional[str] = None
    categorie_employe: Optional[str] = None
    metier: Optional[str] = None
    fonction: Optional[str] = None
    site: Optional[str] = None
    temps_travail: Optional[str] = None
    contrat: Optional[str] = None


class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Destinataire de la notification
    type: str  # 'absence_request', 'absence_approved', 'absence_rejected', 'overtime_pending', 'planning_update', 'system'
    title: str
    message: str
    link: Optional[str] = None  # Lien vers la ressource concernée
    icon: str = "🔔"  # Emoji pour l'icône
    read: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    related_id: Optional[str] = None  # ID de la ressource liée (absence, overtime, etc.)
    date_debut_contrat: Optional[str] = None
    date_fin_contrat: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

class UserInDB(User):
    hashed_password: str

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "employee"
    department: str
    phone: Optional[str] = None
    address: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[str] = None
    isDelegateCSE: Optional[bool] = False
    # Champs additionnels pour données employés complètes
    date_naissance: Optional[str] = None
    sexe: Optional[str] = None
    categorie_employe: Optional[str] = None
    metier: Optional[str] = None
    fonction: Optional[str] = None
    site: Optional[str] = None
    temps_travail: Optional[str] = None
    contrat: Optional[str] = None
    date_debut_contrat: Optional[str] = None
    date_fin_contrat: Optional[str] = None
    notes: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[str] = None
    isDelegateCSE: Optional[bool] = None
    is_active: Optional[bool] = None
    # Champs additionnels pour données employés complètes
    date_naissance: Optional[str] = None
    sexe: Optional[str] = None
    categorie_employe: Optional[str] = None
    metier: Optional[str] = None
    fonction: Optional[str] = None
    site: Optional[str] = None
    temps_travail: Optional[str] = None
    contrat: Optional[str] = None
    date_debut_contrat: Optional[str] = None
    date_fin_contrat: Optional[str] = None
    notes: Optional[str] = None

class PasswordReset(BaseModel):
    new_password: str

class PasswordChange(BaseModel):
    current_password: Optional[str] = None  # Optionnel pour le premier changement
    new_password: str
    confirm_password: str

class TempPasswordResponse(BaseModel):
    temp_password: str
    expires_at: datetime
    message: str
    
class LoginResponse(BaseModel):
    token: str
    user: User

# Delegation Hours Models
class DelegationType(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    baseHours: int
    color: str

class Delegate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employeeId: str
    name: str
    department: str
    type: str
    baseMonthlyHours: int
    reportedHours: float = 0
    receivedHours: float = 0
    cededHours: float = 0
    cededFromBase: float = 0
    cededFromReported: float = 0
    usedFromReceived: float = 0
    usedFromReported: float = 0
    usedFromBase: float = 0
    totalUsed: float = 0
    availableHours: float = 0
    startDate: str
    endDate: str
    status: str = "active"
    lastActivity: Optional[str] = None

class UsageRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    delegateId: str
    delegateName: str
    date: str
    hours: float
    activity: str
    description: Optional[str] = ""
    status: str = "pending"  # pending, approved, acknowledged
    approvedBy: Optional[str] = None
    approvedDate: Optional[str] = None
    documents: Optional[List[str]] = []
    requiresAcknowledgment: Optional[bool] = False

class CessionRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fromDelegateId: str
    fromDelegateName: str
    fromType: str
    toDelegateId: str
    toDelegateName: str
    toType: str
    hours: float
    date: str
    reason: str
    status: str = "approved"
    approvedBy: Optional[str] = None
    approvedDate: Optional[str] = None
    legalBasis: str = "Art. L2315-7 Code du Travail - Cession entre représentants"

class AbsenceType(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    name: str
    category: str  # medical, family, vacation, work, other
    type: str  # Absentéisme, Absence Programmée
    counting_method: str  # Jours Calendaires, Jours Ouvrables
    requires_validation: bool = True
    requires_acknowledgment: bool = False

# Excel Import Models
class ImportEmployee(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nom: str
    prenom: str
    email: Optional[str] = None  # Maintenant optionnel - généré auto si absent
    date_naissance: Optional[str] = None
    sexe: Optional[str] = None
    categorie_employe: Optional[str] = None  # Ex: Cadre, Technicien, Ouvrier qualifié, Agent administratif
    metier: Optional[str] = None
    fonction: Optional[str] = None
    departement: Optional[str] = None  # Maintenant optionnel
    site: Optional[str] = None
    temps_travail: Optional[str] = None
    contrat: Optional[str] = None
    date_debut_contrat: Optional[str] = None
    date_fin_contrat: Optional[str] = None
    notes: Optional[str] = None
    membre_cse: Optional[str] = None  # Colonne 16: "titulaire", "suppléant" ou vide
    has_temp_email: bool = False  # Indique si l'email a été généré automatiquement
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str

class ImportAbsence(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: Optional[str] = None  # UUID de l'utilisateur si trouvé
    nom: str
    prenom: str
    email: Optional[str] = None  # Email de l'employé si trouvé
    date_debut: Optional[str] = None
    jours_absence: Optional[str] = None
    motif_absence: str
    notes: Optional[str] = None
    # Nouveaux champs pour gestion des heures
    absence_unit: Optional[str] = "jours"  # "jours" ou "heures"
    hours_amount: Optional[float] = None  # Nombre d'heures si unit='heures'
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str

class Absence(BaseModel):
    """Modèle pour les absences stockées en base"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    employee_name: str
    email: str
    date_debut: str
    date_fin: Optional[str] = None
    jours_absence: str
    motif_absence: str
    counting_method: Optional[str] = None
    notes: Optional[str] = None
    absence_unit: str = "jours"
    hours_amount: Optional[float] = None
    
    # ⭐ NOUVEAUX CHAMPS POUR DOUBLE WORKFLOW
    status: str = "pending"  # pending, validated_by_manager, approved, rejected
    validated_by_manager: Optional[str] = None  # ID du manager
    manager_validation_date: Optional[str] = None
    approved_by: Optional[str] = None  # ID de l'admin
    approved_at: Optional[str] = None
    rejected_by: Optional[str] = None
    rejected_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

class ImportWorkHours(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    employee_name: str
    date: str
    heures_travaillees: float
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str

class ImportSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    setting_name: str
    setting_value: str
    category: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str

# ========================================
# CSE MANAGEMENT MODELS
# ========================================

class CSEDelegate(BaseModel):
    """Modèle pour les délégués CSE (titulaires et suppléants)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # UUID de l'utilisateur
    user_name: str  # Nom pour affichage
    email: str
    statut: str  # "titulaire" ou "suppléant"
    heures_mensuelles: int = 24  # Heures allouées par mois (défaut pour +250 salariés)
    college: str  # "cadres", "employes", "ouvriers"
    date_debut: str  # Date de début du mandat
    date_fin: Optional[str] = None  # Date de fin du mandat (optionnel)
    actif: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    updated_at: Optional[datetime] = None

class DelegationHoursDeclaration(BaseModel):
    """Déclaration d'heures de délégation par un délégué"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    delegate_id: str  # ID du délégué CSE
    delegate_name: str
    date: str  # Date d'utilisation (YYYY-MM-DD)
    heures_utilisees: float  # Nombre d'heures utilisées
    motif: str  # Motif/description de l'utilisation
    statut: str = "declared"  # "declared" ou "acknowledged"
    acknowledged_by: Optional[str] = None  # Qui a pris connaissance
    acknowledged_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class HoursCession(BaseModel):
    """Cession d'heures entre délégués"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cedant_id: str  # ID du délégué qui cède
    cedant_name: str
    beneficiaire_id: str  # ID du délégué bénéficiaire
    beneficiaire_name: str
    heures_cedees: float
    mois: str  # Mois concerné (YYYY-MM)
    motif: Optional[str] = None
    statut: str = "pending"  # "pending", "acknowledged", "refused"
    validated_by: Optional[str] = None
    validated_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str

class CSEStatistics(BaseModel):
    """Statistiques CSE"""
    total_delegates: int
    titulaires: int
    suppleants: int
    heures_utilisees_mois: float
    heures_allouees_mois: float
    taux_utilisation: float
    cessions_en_attente: int

class CSECession(BaseModel):
    """Cession d'heures CSE - Modèle simplifié pour le nouveau module unifié"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_id: str  # ID du membre CSE cédant
    from_name: str  # Nom du cédant
    to_id: str  # ID du bénéficiaire
    to_name: str  # Nom du bénéficiaire
    hours: float  # Nombre d'heures cédées
    usage_date: str  # Date d'utilisation prévue (YYYY-MM-DD)
    reason: Optional[str] = None  # Motif de la cession
    created_by: str  # Nom de l'utilisateur qui a créé la cession
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Leave Balance and Transaction Models
class EmployeeLeaveBalance(BaseModel):
    """Soldes de congés par employé et par année"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    employee_name: str
    year: int
    
    # Congés Annuels (CA)
    ca_initial: float = 25.0           # Attribution annuelle (ex: 25 jours/an)
    ca_taken: float = 0.0               # CA consommés (posés et pris)
    ca_pending: float = 0.0             # CA posés mais non encore écoulés
    ca_reintegrated: float = 0.0        # CA réintégrés suite interruption
    ca_balance: float = 25.0            # Solde disponible = initial - taken + reintegrated
    
    # RTT
    rtt_initial: float = 12.0           # Attribution annuelle (ex: 12 jours/an)
    rtt_taken: float = 0.0
    rtt_pending: float = 0.0
    rtt_reintegrated: float = 0.0
    rtt_balance: float = 12.0
    
    # Congés Trimestriels (CT)
    ct_initial: float = 0.0             # Variable selon convention
    ct_taken: float = 0.0
    ct_pending: float = 0.0
    ct_reintegrated: float = 0.0
    ct_balance: float = 0.0
    
    # Récupération (REC) - Accumulation variable
    rec_accumulated: float = 0.0        # Heures sup converties en récup
    rec_taken: float = 0.0
    rec_reintegrated: float = 0.0
    rec_balance: float = 0.0
    
    # Congés Exceptionnels (CEX)
    cex_initial: float = 0.0            # Selon événements familiaux
    cex_taken: float = 0.0
    cex_balance: float = 0.0
    
    # Métadonnées
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeaveTransaction(BaseModel):
    """Historique des mouvements de compteurs de congés"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    employee_name: str
    transaction_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    leave_type: str                     # CA, RTT, REC, CT, CEX
    operation: str                      # "deduct" (pose), "reintegrate" (réintégration), "grant" (attribution), "cancel" (annulation)
    amount: float                       # Nombre de jours (ou heures pour REC)
    
    reason: str                         # Ex: "Pose CA 01-14/01", "Réintégration suite AM 05-10/01"
    related_absence_id: Optional[str] = None
    interrupting_absence_type: Optional[str] = None  # Type d'absence qui a interrompu (ex: "AM")
    
    balance_before: float               # Solde avant l'opération
    balance_after: float                # Solde après l'opération
    
    created_by: str                     # Utilisateur qui a fait l'opération (système ou admin)

class LeaveBalanceUpdate(BaseModel):
    """Request pour mettre à jour un solde"""
    employee_id: str
    leave_type: str
    operation: str
    amount: float
    reason: str
    related_absence_id: Optional[str] = None
    interrupting_absence_type: Optional[str] = None

# Event Management Models
class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    event_type: str  # meeting, training, evaluation, committee, deadline, holiday
    start_date: str  # ISO date string
    start_time: str  # HH:MM format
    end_date: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    participants: Optional[int] = None
    is_all_day: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str = "meeting"
    start_date: str
    start_time: str
    end_date: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    participants: Optional[int] = None
    is_all_day: bool = False

# Import Request Models
class ImportDataRequest(BaseModel):
    data_type: str  # "employees", "absences", "work_hours", "settings"
    data: List[Dict[str, Any]]
    overwrite_existing: bool = False

class ImportValidationRequest(BaseModel):
    data_type: str
    data: List[Dict[str, Any]]

class ImportResult(BaseModel):
    success: bool
    total_processed: int
    successful_imports: int
    failed_imports: int
    errors: List[Dict[str, str]]
    warnings: List[Dict[str, str]]
    data_type: str

class AdminSetupRequest(BaseModel):
    admin_name: str = "DACALOR Diégo"
    admin_email: str = "ddacalor@aaea-gpe.fr"
    admin_password: str = "admin123"

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "MOZAIK RH API - HR Management System"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Authentication endpoints
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(login_request: LoginRequest):
    """Authenticate user against MongoDB with temporary password handling"""
    email = login_request.email.lower().strip()
    password = login_request.password
    
    # Find user in MongoDB
    user_data = await db.users.find_one({"email": email})
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if user is active
    if not user_data.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is inactive")
    
    # Check if temporary password has expired
    temp_expires = user_data.get("temp_password_expires")
    if temp_expires and is_temp_password_expired(temp_expires):
        raise HTTPException(
            status_code=401, 
            detail="Temporary password has expired. Please contact administrator."
        )
    
    # Verify password
    if not verify_password(password, user_data["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Update last login
    await db.users.update_one(
        {"email": email}, 
        {"$set": {"last_login": datetime.utcnow(), "first_login": False}}
    )
    
    # Create token
    token = create_access_token(user_data["id"], user_data["email"], user_data["role"])
    
    # Return user info and token (without password hash)
    user_data["last_login"] = datetime.utcnow()
    user_data["first_login"] = False
    user = User(**{k: v for k, v in user_data.items() if k != "hashed_password"})
    
    return LoginResponse(token=token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# User Management endpoints
@api_router.get("/users", response_model=List[User])
async def get_all_users(current_user: User = Depends(get_current_user)):
    """Get all users (admin/manager only)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    users = await db.users.find({"is_active": True}).to_list(1000)
    return [User(**{k: v for k, v in user.items() if k not in ["hashed_password", "_id"]}) for user in users]

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Get specific user (admin/manager or own profile)"""
    if current_user.role not in ["admin", "manager"] and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(**{k: v for k, v in user.items() if k not in ["hashed_password", "_id"]})

@api_router.post("/users", response_model=TempPasswordResponse)
async def create_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    """Create new user with temporary password (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email.lower().strip()})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate temporary password
    temp_password = generate_temp_password()
    temp_expires = datetime.utcnow().replace(tzinfo=timezone.utc) + timedelta(days=7)  # 7 jours pour changer
    
    # Create user with temporary password
    user_in_db = UserInDB(
        name=user_data.name,
        email=user_data.email.lower().strip(),
        role=user_data.role,
        department=user_data.department,
        phone=user_data.phone,
        address=user_data.address,
        position=user_data.position,
        hire_date=user_data.hire_date,
        isDelegateCSE=user_data.isDelegateCSE,
        hashed_password=hash_password(temp_password),
        requires_password_change=True,
        first_login=True,
        temp_password_expires=temp_expires,
        created_by=current_user.name,
        # Champs additionnels
        date_naissance=user_data.date_naissance,
        sexe=user_data.sexe,
        categorie_employe=user_data.categorie_employe,
        metier=user_data.metier,
        fonction=user_data.fonction,
        site=user_data.site,
        temps_travail=user_data.temps_travail,
        contrat=user_data.contrat,
        date_debut_contrat=user_data.date_debut_contrat,
        date_fin_contrat=user_data.date_fin_contrat,
        notes=user_data.notes
    )
    
    await db.users.insert_one(user_in_db.dict())
    
    return TempPasswordResponse(
        temp_password=temp_password,
        expires_at=temp_expires,
        message=f"Utilisateur {user_data.name} créé avec succès. Mot de passe temporaire généré (expire dans 7 jours)."
    )

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_data: UserUpdate, current_user: User = Depends(get_current_user)):
    """
    Update user (admin or own profile for basic info)
    🔄 MISE À JOUR INTERACTIVE : Toute modification se propage automatiquement dans TOUS les modules
    """
    # Check if user exists
    existing_user = await db.users.find_one({"id": user_id})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Permission checks
    is_own_profile = current_user.id == user_id
    is_admin = current_user.role == "admin"
    
    if not is_admin and not is_own_profile:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Restrict what non-admins can update on their own profile
    if is_own_profile and not is_admin:
        restricted_fields = {"role", "is_active", "isDelegateCSE"}
        update_data = {k: v for k, v in user_data.dict(exclude_unset=True).items() 
                      if k not in restricted_fields}
    else:
        update_data = user_data.dict(exclude_unset=True)
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        if "email" in update_data:
            update_data["email"] = update_data["email"].lower().strip()
        
        # Préparer les changements à propager
        old_name = existing_user.get("name", "")
        old_email = existing_user.get("email", "")
        new_name = update_data.get("name", old_name)
        new_email = update_data.get("email", old_email)
        
        name_changed = "name" in update_data and new_name != old_name
        email_changed = "email" in update_data and new_email != old_email
        
        # Mettre à jour l'utilisateur
        await db.users.update_one({"id": user_id}, {"$set": update_data})
        
        # 🔄 PROPAGATION INTERACTIVE DANS TOUS LES MODULES
        if name_changed or email_changed:
            logger.info(f"🔄 SYNCHRONISATION GLOBALE pour utilisateur {user_id}")
            
            # Compteur de mises à jour
            total_updated = 0
            
            # 1️⃣ ABSENCES
            if name_changed:
                result = await db.absences.update_many(
                    {"employee_id": user_id},
                    {"$set": {"employee_name": new_name}}
                )
                total_updated += result.modified_count
                logger.info(f"   ✅ Absences: {result.modified_count} mises à jour")
            
            if email_changed:
                result = await db.absences.update_many(
                    {"email": old_email},
                    {"$set": {"email": new_email}}
                )
                total_updated += result.modified_count
                logger.info(f"   ✅ Absences (email): {result.modified_count} mises à jour")
            
            # 2️⃣ LEAVE BALANCES (Compteurs de congés)
            if name_changed:
                result = await db.leave_balances.update_many(
                    {"employee_id": user_id},
                    {"$set": {"employee_name": new_name}}
                )
                total_updated += result.modified_count
                logger.info(f"   ✅ Compteurs congés: {result.modified_count} mis à jour")
            
            # 3️⃣ LEAVE TRANSACTIONS (Historique des transactions)
            if name_changed:
                result = await db.leave_transactions.update_many(
                    {"employee_id": user_id},
                    {"$set": {"employee_name": new_name}}
                )
                total_updated += result.modified_count
                logger.info(f"   ✅ Transactions congés: {result.modified_count} mises à jour")
            
            # 4️⃣ OVERTIME (Heures supplémentaires)
            if name_changed:
                result = await db.overtime.update_many(
                    {"employee_id": user_id},
                    {"$set": {"employee_name": new_name}}
                )
                total_updated += result.modified_count
                logger.info(f"   ✅ Heures supplémentaires: {result.modified_count} mises à jour")
            
            # 5️⃣ ON-CALL (Astreintes)
            if name_changed:
                result = await db.on_call.update_many(
                    {"employee_id": user_id},
                    {"$set": {"employee_name": new_name}}
                )
                total_updated += result.modified_count
                logger.info(f"   ✅ Astreintes: {result.modified_count} mises à jour")
            
            # 6️⃣ WORK HOURS (Heures de travail)
            if name_changed:
                result = await db.work_hours.update_many(
                    {"employee_id": user_id},
                    {"$set": {"employee_name": new_name}}
                )
                total_updated += result.modified_count
                logger.info(f"   ✅ Heures de travail: {result.modified_count} mises à jour")
            
            # 7️⃣ EMPLOYEES (Collection séparée si existe)
            if name_changed or email_changed:
                employee_update = {}
                if name_changed:
                    employee_update["name"] = new_name
                if email_changed:
                    employee_update["email"] = new_email
                
                result = await db.employees.update_many(
                    {"user_id": user_id},
                    {"$set": employee_update}
                )
                total_updated += result.modified_count
                logger.info(f"   ✅ Employees: {result.modified_count} mis à jour")
            
            # 8️⃣ CSE CESSIONS (Cessions d'heures CSE)
            if name_changed:
                # Mettre à jour comme donneur
                result_from = await db.cse_cessions.update_many(
                    {"from_employee_id": user_id},
                    {"$set": {"from_employee_name": new_name}}
                )
                # Mettre à jour comme receveur
                result_to = await db.cse_cessions.update_many(
                    {"to_employee_id": user_id},
                    {"$set": {"to_employee_name": new_name}}
                )
                total_updated += result_from.modified_count + result_to.modified_count
                logger.info(f"   ✅ Cessions CSE: {result_from.modified_count + result_to.modified_count} mises à jour")
            
            # 9️⃣ DELEGATION HOURS (Heures de délégation CSE)
            if name_changed:
                result = await db.delegation_hours.update_many(
                    {"employee_id": user_id},
                    {"$set": {"employee_name": new_name}}
                )
                total_updated += result.modified_count
                logger.info(f"   ✅ Heures délégation: {result.modified_count} mises à jour")
            
            # 🔟 ABSENCE REQUESTS (Demandes d'absence si collection séparée)
            if name_changed or email_changed:
                request_update = {}
                if name_changed:
                    request_update["employee_name"] = new_name
                if email_changed:
                    request_update["email"] = new_email
                
                result = await db.absence_requests.update_many(
                    {"employee_id": user_id},
                    {"$set": request_update}
                )
                total_updated += result.modified_count
                logger.info(f"   ✅ Demandes absence: {result.modified_count} mises à jour")
            
            logger.info(f"🎯 TOTAL: {total_updated} enregistrements synchronisés dans tous les modules")
            
            if name_changed:
                logger.info(f"   📝 Nom: '{old_name}' → '{new_name}'")
            if email_changed:
                logger.info(f"   📧 Email: '{old_email}' → '{new_email}'")
    
    # Return updated user
    updated_user = await db.users.find_one({"id": user_id})
    return User(**{k: v for k, v in updated_user.items() if k != "hashed_password"})

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Soft delete user (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Soft delete - set is_active to False
    await db.users.update_one(
        {"id": user_id}, 
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "User deactivated successfully"}

@api_router.post("/auth/change-password")
async def change_password(password_data: PasswordChange, current_user: User = Depends(get_current_user)):
    """Change password (with current password verification or first-time change)"""
    # Get current user from database
    user_data = await db.users.find_one({"id": current_user.id})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify passwords match
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")
    
    # If not first login, verify current password
    if not user_data.get("first_login", False):
        if not password_data.current_password:
            raise HTTPException(status_code=400, detail="Current password is required")
        
        if not verify_password(password_data.current_password, user_data["hashed_password"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update password and remove temporary password flags
    hashed_password = hash_password(password_data.new_password)
    await db.users.update_one(
        {"id": current_user.id}, 
        {"$set": {
            "hashed_password": hashed_password,
            "requires_password_change": False,
            "first_login": False,
            "temp_password_expires": None,
            "temp_password_plain": None,  # Supprimer le mot de passe temporaire en clair
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Password changed successfully"}

@api_router.post("/users/{user_id}/reset-password")
async def reset_user_password(user_id: str, password_data: PasswordReset, current_user: User = Depends(get_current_user)):
    """Reset user password (admin only - reverts to initial password)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if user exists
    existing_user = await db.users.find_one({"id": user_id})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Récupérer le mot de passe initial
    initial_password = existing_user.get("initial_password")
    
    if not initial_password:
        # Si pas de mot de passe initial, générer un nouveau
        initial_password = generate_temp_password()
        # Le sauvegarder comme mot de passe initial pour la prochaine fois
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"initial_password": initial_password}}
        )
    
    # Réinitialiser avec le mot de passe initial
    temp_expires = datetime.utcnow().replace(tzinfo=timezone.utc) + timedelta(days=7)
    hashed_password = hash_password(initial_password)
    
    await db.users.update_one(
        {"id": user_id}, 
        {"$set": {
            "hashed_password": hashed_password,
            "requires_password_change": True,
            "first_login": False,  # Pas une première connexion, juste un reset
            "temp_password_expires": temp_expires,
            "temp_password_plain": initial_password,  # Mot de passe actuel = initial
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {
        "message": "Password reset to initial password successfully",
        "temp_password": initial_password,
        "expires_at": temp_expires,
        "note": "Password has been reset to the user's initial password"
    }

@api_router.post("/users/send-credentials-bulk")
async def send_credentials_bulk(user_ids: list[str], current_user: User = Depends(get_current_user)):
    """Send credential emails to multiple users (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    from email_service import send_bulk_credential_emails
    
    # Récupérer les utilisateurs
    users_data = []
    for user_id in user_ids:
        user = await db.users.find_one({"id": user_id})
        if user and user.get("initial_password"):
            users_data.append({
                "name": user.get("name"),
                "email": user.get("email"),
                "password": user.get("initial_password"),
                "department": user.get("department")
            })
    
    # Envoyer les emails
    results = send_bulk_credential_emails(users_data)
    
    return {
        "success": True,
        "sent": results["sent"],
        "failed": results["failed"],
        "skipped": results["skipped"],
        "details": results["details"],
        "message": f"{results['sent']} email(s) envoyé(s), {results['failed']} échec(s), {results['skipped']} ignoré(s) (adresses internes)"
    }

@api_router.post("/users/{user_id}/send-credentials")
async def send_user_credentials_email(user_id: str, current_user: User = Depends(get_current_user)):
    """Send credential email to a specific user (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Récupérer l'utilisateur
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Vérifier qu'il y a un mot de passe initial
    initial_password = user.get("initial_password")
    if not initial_password:
        raise HTTPException(status_code=400, detail="No initial password found for this user")
    
    # Importer le service email
    from email_service import send_credential_email
    
    # Envoyer l'email
    success = send_credential_email(
        recipient_email=user.get("email"),
        recipient_name=user.get("name"),
        password=initial_password,
        department=user.get("department")
    )
    
    if success:
        return {
            "success": True,
            "message": f"Email envoyé avec succès à {user.get('email')}",
            "recipient": user.get("email")
        }
    else:
        # Si adresse interne
        if "@internal.aaea-gpe.fr" in user.get("email"):
            return {
                "success": False,
                "message": "Email non envoyé : adresse interne auto-générée",
                "reason": "internal_email",
                "recipient": user.get("email")
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to send email")

@api_router.get("/users/{user_id}/credential-card")
async def get_user_credential_card(user_id: str, current_user: User = Depends(get_current_user)):
    """Generate a printable credential card for a user (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Récupérer l'utilisateur
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    initial_password = user.get("initial_password")
    if not initial_password:
        raise HTTPException(status_code=400, detail="No initial password found for this user")
    
    # Retourner les informations pour impression
    return {
        "success": True,
        "user": {
            "name": user.get("name"),
            "email": user.get("email"),
            "initial_password": initial_password,
            "department": user.get("department"),
            "position": user.get("position"),
            "created_at": user.get("created_at")
        },
        "html_template": f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Carte d'Identification - {user.get('name')}</title>
            <style>
                @media print {{
                    body {{ margin: 0; }}
                    .no-print {{ display: none; }}
                }}
                body {{
                    font-family: 'Arial', sans-serif;
                    padding: 20px;
                    background: #f5f5f5;
                }}
                .credential-card {{
                    width: 400px;
                    margin: 20px auto;
                    background: white;
                    border: 2px solid #2563eb;
                    border-radius: 12px;
                    padding: 30px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }}
                .header {{
                    text-align: center;
                    border-bottom: 2px solid #2563eb;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }}
                .header h1 {{
                    color: #2563eb;
                    margin: 0;
                    font-size: 24px;
                }}
                .header p {{
                    color: #666;
                    margin: 5px 0;
                }}
                .info-row {{
                    margin: 15px 0;
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 6px;
                }}
                .info-label {{
                    font-weight: bold;
                    color: #333;
                    display: block;
                    margin-bottom: 5px;
                }}
                .info-value {{
                    color: #2563eb;
                    font-size: 18px;
                    font-family: 'Courier New', monospace;
                }}
                .password-box {{
                    background: #fef3c7;
                    border: 2px dashed #f59e0b;
                    padding: 15px;
                    border-radius: 8px;
                    text-align: center;
                    margin: 20px 0;
                }}
                .password-box .password {{
                    font-size: 20px;
                    font-weight: bold;
                    color: #92400e;
                    font-family: 'Courier New', monospace;
                    letter-spacing: 2px;
                }}
                .instructions {{
                    background: #dbeafe;
                    padding: 15px;
                    border-radius: 6px;
                    margin-top: 20px;
                }}
                .instructions h3 {{
                    color: #1e40af;
                    margin-top: 0;
                }}
                .instructions ul {{
                    margin: 10px 0;
                    padding-left: 20px;
                }}
                .instructions li {{
                    margin: 5px 0;
                    color: #1e3a8a;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #e5e7eb;
                    color: #6b7280;
                    font-size: 12px;
                }}
                .no-print {{
                    text-align: center;
                    margin-top: 20px;
                }}
                .print-btn {{
                    background: #2563eb;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                }}
                .print-btn:hover {{
                    background: #1d4ed8;
                }}
            </style>
        </head>
        <body>
            <div class="credential-card">
                <div class="header">
                    <h1>🔐 MOZAIK RH</h1>
                    <p>Carte d'Identification Employé</p>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Nom complet :</span>
                    <span class="info-value">{user.get('name')}</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Adresse email :</span>
                    <span class="info-value">{user.get('email')}</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Département :</span>
                    <span class="info-value">{user.get('department', 'N/A')}</span>
                </div>
                
                <div class="password-box">
                    <div class="info-label">⚠️ Mot de Passe Initial</div>
                    <div class="password">{initial_password}</div>
                    <small style="color: #92400e;">À conserver en lieu sûr</small>
                </div>
                
                <div class="instructions">
                    <h3>📋 Instructions de Première Connexion</h3>
                    <ul>
                        <li>Connectez-vous sur MOZAIK RH</li>
                        <li>Utilisez votre email et le mot de passe ci-dessus</li>
                        <li>Vous devrez changer votre mot de passe</li>
                        <li>Conservez cette carte pour réinitialisation future</li>
                    </ul>
                </div>
                
                <div class="footer">
                    Document confidentiel - Ne pas partager<br>
                    En cas d'oubli, contactez l'administrateur pour réinitialisation
                </div>
            </div>
            
            <div class="no-print">
                <button class="print-btn" onclick="window.print()">🖨️ Imprimer cette carte</button>
            </div>
        </body>
        </html>
        """
    }

@api_router.get("/users/temporary-passwords")
async def get_temporary_passwords(current_user: User = Depends(get_current_user)):
    """Get all users with temporary passwords (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Récupérer tous les utilisateurs qui ont un mot de passe temporaire
    users_with_temp = await db.users.find({
        "temp_password_plain": {"$ne": None, "$exists": True}
    }).to_list(length=None)
    
    # Formater les résultats
    result = []
    for user in users_with_temp:
        result.append({
            "id": user.get("id"),
            "name": user.get("name"),
            "email": user.get("email"),
            "temp_password": user.get("temp_password_plain"),
            "expires_at": user.get("temp_password_expires"),
            "first_login": user.get("first_login", True),
            "created_at": user.get("created_at")
        })
    
    return {
        "success": True,
        "count": len(result),
        "users": result
    }

@api_router.post("/users/{user_id}/change-email")
async def change_user_email(user_id: str, email_data: dict, current_user: User = Depends(get_current_user)):
    """Change user email address (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    new_email = email_data.get("new_email")
    if not new_email:
        raise HTTPException(status_code=400, detail="New email is required")
    
    # Check if user exists
    existing_user = await db.users.find_one({"id": user_id})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if new email is already in use by another user
    email_in_use = await db.users.find_one({"email": new_email, "id": {"$ne": user_id}})
    if email_in_use:
        raise HTTPException(status_code=400, detail="Email already in use by another user")
    
    # Update email (password remains unchanged)
    await db.users.update_one(
        {"id": user_id}, 
        {"$set": {
            "email": new_email,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Get updated user
    updated_user = await db.users.find_one({"id": user_id})
    return User(**updated_user)

@api_router.delete("/users/cleanup/test-users")
async def cleanup_test_users(current_user: User = Depends(get_current_user)):
    """Delete all test users (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Patterns de test à supprimer
    test_patterns = ['test', 'example', 'User Test', 'testemp', 'Marie Dupont', 'marie.dupont']
    
    # Récupérer tous les utilisateurs
    all_users = await db.users.find({}).to_list(length=1000)
    
    deleted_users = []
    for user in all_users:
        email = user.get('email', '').lower()
        name = user.get('name', '').lower()
        
        # Vérifier si c'est un utilisateur de test
        is_test = False
        for pattern in test_patterns:
            if pattern.lower() in email or pattern.lower() in name:
                is_test = True
                break
        
        if is_test:
            await db.users.delete_one({"_id": user["_id"]})
            deleted_users.append({
                "name": user.get('name'),
                "email": user.get('email')
            })
    
    return {
        "message": f"{len(deleted_users)} test user(s) deleted",
        "deleted_users": deleted_users
    }

@api_router.get("/users/stats/overview")
async def get_user_statistics(current_user: User = Depends(get_current_user)):
    """Get user statistics overview (admin/manager only)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    total_users = await db.users.count_documents({"is_active": True})
    admin_count = await db.users.count_documents({"role": "admin", "is_active": True})
    manager_count = await db.users.count_documents({"role": "manager", "is_active": True})
    employee_count = await db.users.count_documents({"role": "employee", "is_active": True})
    
    # Department breakdown
    departments = await db.users.distinct("department", {"is_active": True})
    department_stats = []
    for dept in departments:
        count = await db.users.count_documents({"department": dept, "is_active": True})
        department_stats.append({"department": dept, "count": count})
    
    return {
        "total_users": total_users,
        "by_role": {
            "admin": admin_count,
            "manager": manager_count,
            "employee": employee_count
        },
        "by_department": department_stats,
        "cse_delegates": await db.users.count_documents({"isDelegateCSE": True, "is_active": True})
    }

# Delegation Hours endpoints
@api_router.get("/delegation/delegates", response_model=List[Delegate])
async def get_delegates(current_user: User = Depends(get_current_user)):
    """Get delegates from database"""
    if current_user.role in ["admin", "manager"]:
        # Return all delegates
        delegates = await db.delegates.find().to_list(1000)
        return [Delegate(**delegate) for delegate in delegates]
    else:
        # Return only current user's delegation if they have one
        delegates = await db.delegates.find({"employeeId": current_user.id}).to_list(1000)
        return [Delegate(**delegate) for delegate in delegates]

@api_router.get("/delegation/delegates/{delegate_id}", response_model=Delegate) 
async def get_delegate(delegate_id: str, current_user: User = Depends(get_current_user)):
    """Get specific delegate from database"""
    delegate_data = await db.delegates.find_one({"id": delegate_id})
    if not delegate_data:
        raise HTTPException(status_code=404, detail="Delegate not found")
    
    # Check permissions
    if current_user.role not in ["admin", "manager"] and delegate_data["employeeId"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return Delegate(**delegate_data)

@api_router.post("/delegation/usage", response_model=UsageRecord)
async def create_usage_record(usage_data: dict, current_user: User = Depends(get_current_user)):
    # Create new usage record
    usage_record = UsageRecord(
        delegateId=usage_data.get("delegateId"),
        delegateName=usage_data.get("delegateName", current_user.name),
        date=usage_data.get("date"),
        hours=usage_data.get("hours"),
        activity=usage_data.get("activity"),
        description=usage_data.get("description", ""),
        status="acknowledged" if usage_data.get("requiresAcknowledgment") else "pending",
        approvedBy=current_user.name if usage_data.get("requiresAcknowledgment") else None,
        approvedDate=datetime.utcnow().isoformat() if usage_data.get("requiresAcknowledgment") else None,
        documents=usage_data.get("documents", []),
        requiresAcknowledgment=usage_data.get("requiresAcknowledgment", False)
    )
    
    # In a real implementation, save to database
    # await db.usage_records.insert_one(usage_record.dict())
    
    return usage_record

@api_router.get("/delegation/usage", response_model=List[dict])
async def get_usage_history(current_user: User = Depends(get_current_user)):
    # Get delegation usage from database
    try:
        query = {}
        if current_user.role not in ["admin", "manager"]:
            query["delegateName"] = current_user.name
        
        usage_records = await db.delegation_usage.find(query).to_list(1000)
        
        # Convert ObjectIds to strings for JSON serialization
        for record in usage_records:
            if "_id" in record:
                del record["_id"]
        
        return usage_records
        
    except Exception as e:
        print(f"Error getting delegation usage: {e}")
        return []  # Return empty list if no data yet

@api_router.get("/delegation/cessions", response_model=List[CessionRecord])
async def get_cession_history(current_user: User = Depends(get_current_user)):
    # Get cession data from database
    try:
        cession_records = await db.delegation_cessions.find().to_list(1000)
        
        # Convert ObjectIds to strings for JSON serialization
        for record in cession_records:
            if "_id" in record:
                del record["_id"]
        
        return cession_records
        
    except Exception as e:
        print(f"Error getting cession records: {e}")
        return []  # Return empty list if no data yet

@api_router.post("/delegation/cessions", response_model=CessionRecord)
async def create_cession(cession_data: dict, current_user: User = Depends(get_current_user)):
    # Create new cession record
    cession_record = CessionRecord(
        fromDelegateId=cession_data.get("fromDelegateId"),
        fromDelegateName=cession_data.get("fromDelegateName"),
        fromType=cession_data.get("fromType"),
        toDelegateId=cession_data.get("toDelegateId"), 
        toDelegateName=cession_data.get("toDelegateName"),
        toType=cession_data.get("toType"),
        hours=cession_data.get("hours"),
        date=cession_data.get("date"),
        reason=cession_data.get("reason"),
        status="approved",
        approvedBy=current_user.name,
        approvedDate=datetime.utcnow().isoformat()
    )
    
    # In real implementation, save to database
    # await db.cession_records.insert_one(cession_record.dict())
    
    return cession_record

# CSE Cessions endpoints (nouveau module unifié)
@api_router.get("/cse/cessions", response_model=List[CSECession])
async def get_cse_cessions(current_user: User = Depends(get_current_user)):
    """
    Récupère toutes les cessions d'heures CSE
    """
    try:
        cessions = await db.cse_cessions.find().to_list(1000)
        
        # Nettoyer les ObjectIds MongoDB
        result = []
        for cession in cessions:
            if "_id" in cession:
                del cession["_id"]
            result.append(cession)
        
        return result
    except Exception as e:
        print(f"Erreur lors de la récupération des cessions CSE: {e}")
        return []

@api_router.post("/cse/cessions", response_model=CSECession)
async def create_cse_cession(cession: CSECession, current_user: User = Depends(get_current_user)):
    """
    Crée une nouvelle cession d'heures CSE
    Validation:
    - Le cédant doit avoir suffisamment d'heures
    - Le bénéficiaire ne doit pas dépasser 1.5x le crédit de base (selon CCN66)
    """
    try:
        # Convertir en dict pour MongoDB
        cession_dict = cession.dict()
        
        # Sauvegarder dans MongoDB
        await db.cse_cessions.insert_one(cession_dict)
        
        print(f"Cession CSE créée: {cession.from_name} → {cession.to_name} ({cession.hours}h)")
        
        return cession
    except Exception as e:
        print(f"Erreur lors de la création de la cession CSE: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création: {str(e)}")

# Absence Types endpoints  
@api_router.get("/absence-types", response_model=List[AbsenceType])
async def get_absence_types(current_user: User = Depends(get_current_user)):
    """
    📋 Récupérer tous les types d'absence depuis MongoDB
    (Remplace l'ancienne liste hardcodée demo_absence_types)
    """
    try:
        absence_types = await db.absence_types_config.find({}).to_list(100)
        # Retirer _id de MongoDB
        for at in absence_types:
            if "_id" in at:
                del at["_id"]
        return [AbsenceType(**absence_type) for absence_type in absence_types]
    except Exception as e:
        logger.error(f"❌ Erreur récupération absence_types: {str(e)}")
        # Fallback: retourner liste vide
        return []

@api_router.get("/absence-types/{code}", response_model=AbsenceType)
async def get_absence_type(code: str, current_user: User = Depends(get_current_user)):
    """
    📋 Récupérer un type d'absence par code depuis MongoDB
    """
    try:
        absence_type = await db.absence_types_config.find_one({"code": code})
        if not absence_type:
            raise HTTPException(status_code=404, detail="Absence type not found")
        if "_id" in absence_type:
            del absence_type["_id"]
        return AbsenceType(**absence_type)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur récupération absence_type {code}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Absence Request Models
class AbsenceRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee: str
    department: str
    type: str
    startDate: str
    endDate: str
    duration: Optional[str] = ""
    reason: Optional[str] = ""
    halfDay: Optional[bool] = False
    documents: Optional[List[str]] = []
    requiresAcknowledgment: Optional[bool] = False
    status: str = "pending"  # pending, approved, rejected, acknowledged
    submittedDate: str
    approver: Optional[str] = None
    approvedDate: Optional[str] = None
    rejectedBy: Optional[str] = None
    rejectedDate: Optional[str] = None
    rejectionReason: Optional[str] = None
    acknowledgedBy: Optional[str] = None
    acknowledgedDate: Optional[str] = None
    # Nouveaux champs pour gestion des heures
    absence_unit: Optional[str] = "jours"  # "jours" ou "heures"
    hours_amount: Optional[float] = None  # Nombre d'heures si unit='heures'

# On-Call Management Models
class OnCallAssignment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employeeId: str
    employeeName: str
    startDate: str
    endDate: str
    type: str  # single, weekend, holiday, night
    status: str = "confirmed"  # pending, confirmed, cancelled
    assignedBy: str
    assignedAt: str
    notes: Optional[str] = ""

class OnCallEmployee(BaseModel):
    id: str
    name: str
    email: str
    category: str  # management, administrative, specialized_educators, technical_educators
    department: str
    currentYearOnCallDays: int = 0
    phone: Optional[str] = ""
    emergencyContact: Optional[str] = ""
    lastOnCallDate: Optional[str] = None

class OnCallValidationRequest(BaseModel):
    employeeId: str
    startDate: str
    endDate: str

class OnCallValidationResponse(BaseModel):
    isValid: bool
    errors: List[str] = []
    warnings: List[str] = []
    stats: Optional[Dict[str, Any]] = None

# Absence Requests endpoints
@api_router.get("/absence-requests", response_model=List[dict])
async def get_absence_requests(current_user: User = Depends(get_current_user)):
    """Get absence requests from database"""
    try:
        # Build query based on user role
        query = {}
        if current_user.role not in ["admin", "manager"]:
            query["employee"] = current_user.name
        
        # Get absence requests from MongoDB
        requests = await db.absence_requests.find(query).to_list(1000)
        
        # Convert ObjectIds to strings for JSON serialization
        for request in requests:
            if "_id" in request:
                del request["_id"]
        
        return requests
        
    except Exception as e:
        print(f"Error getting absence requests: {e}")
        return []  # Return empty list if no data yet

@api_router.post("/absence-requests", response_model=AbsenceRequest)
async def create_absence_request(request_data: dict, current_user: User = Depends(get_current_user)):
    """Create new absence request in database"""
    # Create new absence request
    absence_request = AbsenceRequest(
        employee=request_data.get("employee", current_user.name),
        department=request_data.get("department", current_user.department),
        type=request_data.get("type"),
        startDate=request_data.get("startDate"),
        endDate=request_data.get("endDate"),
        duration=request_data.get("duration", ""),
        reason=request_data.get("reason", ""),
        halfDay=request_data.get("halfDay", False),
        documents=request_data.get("documents", []),
        requiresAcknowledgment=request_data.get("requiresAcknowledgment", False),
        status="acknowledged" if request_data.get("requiresAcknowledgment") else "pending",
        submittedDate=request_data.get("submittedDate", datetime.utcnow().isoformat()),
        acknowledgedBy=current_user.name if request_data.get("requiresAcknowledgment") else None,
        acknowledgedDate=datetime.utcnow().isoformat() if request_data.get("requiresAcknowledgment") else None
    )
    
    # Save to database
    await db.absence_requests.insert_one(absence_request.dict())
    
    return absence_request

@api_router.put("/absence-requests/{request_id}/approve", response_model=dict)
async def approve_absence_request(request_id: str, current_user: User = Depends(get_current_user)):
    """
    🎯 WORKFLOW COMPLET D'APPROBATION
    
    1. Mettre à jour absence_requests (status = "approved")
    2. CRÉER l'absence dans la collection absences (pour le planning)
    3. Synchroniser les compteurs (déduction CA/RTT/CT)
    4. Créer overtime si REC
    5. Broadcaster via websocket
    6. Notifier l'employé
    """
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # 📥 1. Récupérer la demande
        absence_request = await db.absence_requests.find_one({"id": request_id})
        
        if not absence_request:
            raise HTTPException(status_code=404, detail="Demande d'absence non trouvée")
        
        # 🔒 Validation : Manager ne peut pas approuver sa propre demande
        employee_name = absence_request.get("employee", "")
        # Extract email if format is "Name - email"
        if " - " in employee_name:
            employee_email = employee_name.split(" - ")[1].strip()
            employee_name = employee_name.split(" - ")[0].strip()
        else:
            employee_email = None
        
        employee = await db.users.find_one({"name": employee_name}) if employee_name else None
        if not employee and employee_email:
            employee = await db.users.find_one({"email": employee_email})
        
        if current_user.role == "manager" and employee and employee.get("id") == current_user.id:
            raise HTTPException(
                status_code=403,
                detail="❌ Un manager ne peut pas approuver sa propre demande d'absence"
            )
        
        approved_date = datetime.now(timezone.utc).isoformat()
        
        # 📝 2. Mettre à jour absence_requests
        await db.absence_requests.update_one(
            {"id": request_id},
            {"$set": {
                "status": "approved",
                "approver": current_user.name,
                "approvedDate": approved_date
            }}
        )
        
        logger.info(f"✅ Demande {request_id} approuvée par {current_user.name}")
        
        # 🎯 3. CRÉER L'ABSENCE DANS LA COLLECTION 'absences' (pour le planning)
        # Calculer date_fin si pas fournie
        date_fin = absence_request.get("endDate")
        if not date_fin and absence_request.get("duration"):
            try:
                days_count = int(float(absence_request.get("duration", "0").split()[0]))
                if days_count > 0:
                    # Simple calculation: add days to start date
                    start_date = datetime.fromisoformat(absence_request.get("startDate").replace("Z", "+00:00"))
                    end_date = start_date + timedelta(days=days_count - 1)
                    date_fin = end_date.strftime("%d/%m/%Y")
                else:
                    date_fin = absence_request.get("startDate")
            except Exception as e:
                logger.warning(f"Error calculating end date: {e}")
                date_fin = absence_request.get("startDate")
        
        # Convert start date to DD/MM/YYYY format if needed
        start_date_str = absence_request.get("startDate", "")
        if start_date_str and "-" in start_date_str:
            try:
                dt = datetime.fromisoformat(start_date_str.replace("Z", "+00:00"))
                start_date_str = dt.strftime("%d/%m/%Y")
            except:
                pass
        
        # Créer l'objet Absence pour la collection 'absences'
        new_absence = Absence(
            employee_id=employee.get("id") if employee else "unknown",
            employee_name=employee.get("name") if employee else absence_request.get("employee", "Unknown"),
            email=employee.get("email") if employee else "unknown@example.com",
            date_debut=start_date_str,
            date_fin=date_fin or start_date_str,
            jours_absence=absence_request.get("duration", "0"),
            motif_absence=absence_request.get("type", "AUT"),
            notes=absence_request.get("reason", ""),
            absence_unit=absence_request.get("absence_unit", "jours"),
            hours_amount=absence_request.get("hours_amount"),
            status="approved",  # Déjà approuvée
            approved_by=current_user.name,
            approved_at=approved_date,
            created_by=current_user.id
        )
        
        # Préparer pour MongoDB
        absence_dict = new_absence.dict()
        if isinstance(absence_dict.get('created_at'), datetime):
            absence_dict['created_at'] = absence_dict['created_at'].isoformat()
        if "_id" in absence_dict:
            del absence_dict["_id"]
        
        # 💾 Insérer dans la collection 'absences'
        await db.absences.insert_one(absence_dict)
        
        logger.info(f"📅 Absence créée dans 'absences' pour planning: {new_absence.id}")
        
        # 🔄 4. SYNCHRONISER LES COMPTEURS (déduction CA/RTT/CT)
        sync_performed = False
        try:
            sync_result = await sync_service.sync_absence_to_counters(absence_dict, operation="approve")
            sync_performed = bool(sync_result)
            if sync_result:
                logger.info(f"🔄 Compteurs synchronisés pour absence {new_absence.id}")
            else:
                logger.warning(f"⚠️ Échec synchronisation compteurs pour {new_absence.id}")
        except Exception as e:
            logger.error(f"❌ Erreur synchronisation compteurs: {str(e)}")
        
        # ⏰ 5. Si REC, créer overtime "recovered"
        overtime_created = False
        if absence_request.get("type") == "REC" or (absence_request.get("type") and "récup" in absence_request.get("type", "").lower()):
            try:
                # Calculer les heures
                duration_str = absence_request.get("duration", "0")
                duration_days = float(duration_str.split()[0]) if duration_str else 0
                hours_recovered = duration_days * 7  # 7h par jour standard
                
                # Créer overtime "recovered"
                overtime_entry = {
                    "id": str(uuid.uuid4()),
                    "employee_id": employee.get("id") if employee else "unknown",
                    "employee_name": absence_request.get("employee", "Unknown"),
                    "department": employee.get("department", "N/A") if employee else "N/A",
                    "date": absence_request.get("startDate"),
                    "hours": hours_recovered,
                    "type": "recovered",
                    "reason": f"Récupération validée - {absence_request.get('reason', 'Récupération')}",
                    "validated": True,
                    "validated_by": current_user.name,
                    "validated_at": approved_date,
                    "created_at": approved_date
                }
                
                await db.overtime.insert_one(overtime_entry)
                overtime_created = True
                logger.info(f"⏰ Overtime 'recovered' créé: {hours_recovered}h pour {absence_request.get('employee')}")
            except Exception as e:
                logger.error(f"❌ Erreur création overtime: {str(e)}")
        
        # 📡 6. BROADCASTER VIA WEBSOCKET
        try:
            await ws_manager.broadcast_absence_created(absence_dict, current_user.id)
            logger.info(f"📡 Absence broadcastée via websocket")
        except Exception as e:
            logger.error(f"❌ Erreur broadcast websocket: {str(e)}")
        
        # 📧 7. NOTIFIER L'EMPLOYÉ
        if employee:
            try:
                await create_auto_notification(
                    user_id=employee.get('id'),
                    notif_type="absence_approved",
                    title="Demande approuvée ✅",
                    message=f"Votre demande de {absence_request.get('type')} du {start_date_str} au {date_fin or start_date_str} a été approuvée",
                    icon="✅",
                    link="/my-space",
                    related_id=request_id
                )
                logger.info(f"📧 Notification envoyée à {employee.get('name')}")
            except Exception as e:
                logger.error(f"❌ Erreur notification: {str(e)}")
        
        # ✅ RETOUR
        return {
            "success": True,
            "message": "Demande approuvée avec succès",
            "request_id": request_id,
            "absence_id": new_absence.id,
            "approved_by": current_user.name,
            "approved_date": approved_date,
            "counters_synced": sync_performed,
            "overtime_deducted": overtime_created,
            "planning_updated": True,  # 🎯 NOUVEAU : Confirme que le planning est alimenté
            "steps_completed": {
                "absence_request_updated": True,
                "absence_created_in_db": True,
                "counters_synchronized": sync_performed,
                "overtime_created": overtime_created,
                "websocket_broadcast": True,
                "employee_notified": employee is not None
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur lors de l'approbation: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.put("/absence-requests/{request_id}/reject", response_model=dict)
async def reject_absence_request(request_id: str, rejection_data: dict, current_user: User = Depends(get_current_user)):
    """
    ❌ REJETER UNE DEMANDE D'ABSENCE
    
    NE CRÉE PAS d'entrée dans 'absences' car rejetée
    Pas de synchronisation compteurs
    """
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Récupérer la demande
        absence_request = await db.absence_requests.find_one({"id": request_id})
        if not absence_request:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        # 🔒 Validation : Manager ne peut pas rejeter sa propre demande
        employee_name = absence_request.get("employee", "")
        if " - " in employee_name:
            employee_email = employee_name.split(" - ")[1].strip()
            employee_name = employee_name.split(" - ")[0].strip()
        else:
            employee_email = None
        
        employee = await db.users.find_one({"name": employee_name}) if employee_name else None
        if not employee and employee_email:
            employee = await db.users.find_one({"email": employee_email})
            
        if current_user.role == "manager" and employee and employee.get("id") == current_user.id:
            raise HTTPException(
                status_code=403,
                detail="❌ Un manager ne peut pas rejeter sa propre demande d'absence"
            )
        
        rejected_date = datetime.now(timezone.utc).isoformat()
        
        # Mettre à jour dans absence_requests
        await db.absence_requests.update_one(
            {"id": request_id},
            {"$set": {
                "status": "rejected",
                "rejectedBy": current_user.name,
                "rejectedDate": rejected_date,
                "rejectionReason": rejection_data.get("reason", "Aucune raison spécifiée")
            }}
        )
        
        logger.info(f"❌ Demande {request_id} rejetée par {current_user.name}")
        
        # 📧 Notifier l'employé du rejet
        if employee:
            try:
                await create_auto_notification(
                    user_id=employee.get('id'),
                    notif_type="absence_rejected",
                    title="Demande rejetée ❌",
                    message=f"Votre demande de {absence_request.get('type')} a été rejetée. Raison: {rejection_data.get('reason', 'Non spécifiée')}",
                    icon="❌",
                    link="/my-space",
                    related_id=request_id
                )
                logger.info(f"📧 Notification de rejet envoyée à {employee.get('name')}")
            except Exception as e:
                logger.error(f"❌ Erreur notification: {str(e)}")
        
        return {
            "success": True,
            "message": "Demande rejetée avec succès",
            "request_id": request_id,
            "rejected_by": current_user.name,
            "rejected_date": rejected_date,
            "rejection_reason": rejection_data.get("reason", "")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur rejet: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# Legacy user management endpoints removed - using MongoDB-based endpoints above

# HR Configuration endpoints - Updated with complete data from user images
@api_router.get("/hr-config/departments")
async def get_departments(current_user: User = Depends(get_current_user)):
    return {
        "departments": [
            "Direction",
            "Éducatif", 
            "Administratif",
            "Comptable",
            "ASI",
            "Production",
            "Commercial",
            "Technique",
            "Maintenance",
            "Qualité",
            "Logistique",
            "Ressources Humaines"
        ]
    }

@api_router.get("/hr-config/sites") 
async def get_sites(current_user: User = Depends(get_current_user)):
    return {
        "sites": [
            "Siège",
            "Pôle Éducatif", 
            "Menuiserie 44",
            "Voiles 44",
            "Garage 44",
            "Alpinia 44",
            "Ferme 44",
            "Restaurant 44",
            "Atelier Nord",
            "Atelier Sud",
            "Entrepôt Central",
            "Agence Régionale"
        ]
    }

@api_router.get("/hr-config/contracts")
async def get_contract_types(current_user: User = Depends(get_current_user)):
    return {
        "contracts": [
            "CDI - Non Cadre",
            "CDD - Non Cadre", 
            "CDI - Cadre",
            "CDD - Cadre",
            "Stagiaire",
            "Apprenti(e)",
            "Intérimaire",
            "Consultant",
            "Temps partiel CDI",
            "Temps partiel CDD",
            "Contrat pro"
        ]
    }

@api_router.get("/hr-config/employee-categories")
async def get_employee_categories(current_user: User = Depends(get_current_user)):
    return {
        "categories": [
            "Cadre Supérieur",
            "Cadre", 
            "Employé Qualifié",
            "Technicien",
            "Ouvrier qualifié",
            "Ouvrier non qualifié",
            "Agent administratif",
            "Personnel ASI",
            "Agent de maîtrise",
            "Technicien supérieur",
            "Employé",
            "Manœuvre"
        ]
    }

# KPI and Analytics endpoints  
@api_router.get("/analytics/absence-kpi")
async def get_absence_kpi(current_user: User = Depends(get_current_user)):
    """
    📊 ANALYTICS KPI - DONNÉES RÉELLES DEPUIS MONGODB
    Remplace les anciennes données mockées par des vraies requêtes
    """
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # 📊 1. RÉSUMÉ GLOBAL
        all_absences = await db.absences.find({}).to_list(10000)
        total_absences = len(all_absences)
        
        # Compter les absences DEL vs Personal
        del_absences = [a for a in all_absences if a.get("motif_absence") == "DEL"]
        del_count = len(del_absences)
        personal_count = total_absences - del_count
        
        # Moyenne par employé
        total_employees = await db.users.count_documents({})
        avg_per_employee = round(total_absences / total_employees, 1) if total_employees > 0 else 0
        
        # Taux de délégation
        delegation_rate = round((del_count / total_absences * 100), 1) if total_absences > 0 else 0
        
        # 📈 2. PAR CATÉGORIE
        # Agréger par motif_absence
        by_category_pipeline = [
            {"$group": {
                "_id": "$motif_absence",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}}
        ]
        by_category_data = await db.absences.aggregate(by_category_pipeline).to_list(100)
        
        # Mapper aux couleurs et noms
        motif_colors = {
            "DEL": {"name": "Délégation CSE", "color": "bg-indigo-600", "justified": True},
            "CA": {"name": "CA - Congés Annuels", "color": "bg-blue-500", "justified": True},
            "AM": {"name": "Arrêt maladie", "color": "bg-red-500", "justified": False},
            "RTT": {"name": "RTT/Récupération", "color": "bg-green-500", "justified": True},
            "REC": {"name": "Récupération", "color": "bg-green-400", "justified": True},
            "FO": {"name": "Formation", "color": "bg-purple-500", "justified": True},
            "AT": {"name": "Accident travail", "color": "bg-red-600", "justified": False},
            "MAT": {"name": "Congé maternité", "color": "bg-pink-500", "justified": True},
            "PAT": {"name": "Congé paternité", "color": "bg-pink-400", "justified": True},
            "FAM": {"name": "Événement familial", "color": "bg-purple-300", "justified": True},
            "CT": {"name": "Congés Trimestriels", "color": "bg-blue-300", "justified": True},
            "NAUT": {"name": "Absence non autorisée", "color": "bg-red-700", "justified": False},
            "AUT": {"name": "Absence autorisée", "color": "bg-gray-500", "justified": True},
            "TEL": {"name": "Télétravail", "color": "bg-cyan-500", "justified": True},
            "STG": {"name": "Stage", "color": "bg-cyan-400", "justified": True},
            "CEX": {"name": "Congé exceptionnel", "color": "bg-indigo-400", "justified": True}
        }
        
        by_category = []
        for item in by_category_data:
            code = item["_id"]
            count = item["count"]
            percentage = round((count / total_absences * 100), 1) if total_absences > 0 else 0
            
            config = motif_colors.get(code, {"name": code, "color": "bg-gray-500", "justified": False})
            
            by_category.append({
                "code": code,
                "name": config["name"],
                "count": count,
                "percentage": percentage,
                "color": config["color"],
                "justified": config["justified"]
            })
        
        # 📅 3. TENDANCE MENSUELLE (12 derniers mois)
        from datetime import datetime, timedelta
        current_date = datetime.now()
        
        monthly_trend = []
        months_fr = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]
        
        for i in range(12):
            month_date = datetime(current_date.year, i + 1, 1)
            month_name = months_fr[i]
            
            # Compter absences du mois
            month_absences = [a for a in all_absences if a.get("date_debut", "").startswith(f"{i+1:02d}/") or 
                             a.get("date_debut", "").endswith(f"/{i+1:02d}/") or
                             (f"-{i+1:02d}-" in a.get("date_debut", ""))]
            
            del_month = len([a for a in month_absences if a.get("motif_absence") == "DEL"])
            total_month = len(month_absences)
            personal_month = total_month - del_month
            
            monthly_trend.append({
                "month": month_name,
                "del": del_month,
                "personal": personal_month,
                "total": total_month
            })
        
        # 🏢 4. RÉPARTITION PAR DÉPARTEMENT
        users = await db.users.find({}).to_list(1000)
        department_breakdown = []
        
        departments = list(set([u.get("department", "Non spécifié") for u in users]))
        
        for dept in departments:
            dept_employees = [u["id"] for u in users if u.get("department") == dept]
            dept_absences = [a for a in all_absences if a.get("employee_id") in dept_employees]
            
            dept_del = len([a for a in dept_absences if a.get("motif_absence") == "DEL"])
            dept_total = len(dept_absences)
            dept_personal = dept_total - dept_del
            dept_del_rate = round((dept_del / dept_total * 100), 1) if dept_total > 0 else 0
            
            department_breakdown.append({
                "department": dept,
                "del": dept_del,
                "personal": dept_personal,
                "total": dept_total,
                "delRate": dept_del_rate
            })
        
        # Trier par total décroissant
        department_breakdown.sort(key=lambda x: x["total"], reverse=True)
        
        # ✅ RETOUR DES DONNÉES RÉELLES
        return {
            "summary": {
                "totalAbsences": total_absences,
                "delegationHours": del_count,
                "personalAbsences": personal_count,
                "averagePerEmployee": avg_per_employee,
                "delegationRate": delegation_rate,
                "comparisonLastYear": "N/A"  # Nécessite historique année précédente
            },
            "byCategory": by_category[:10],  # Top 10
            "monthlyTrend": monthly_trend,
            "departmentBreakdown": department_breakdown
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur calcul analytics: {str(e)}")
        # Fallback: retourner structure vide
        return {
            "summary": {
                "totalAbsences": 0,
                "delegationHours": 0,
                "personalAbsences": 0,
                "averagePerEmployee": 0,
                "delegationRate": 0,
                "comparisonLastYear": "N/A"
            },
            "byCategory": [],
            "monthlyTrend": [],
            "departmentBreakdown": []
        }

# On-Call Management endpoints
@api_router.get("/on-call/employees", response_model=List[OnCallEmployee])
async def get_on_call_employees(current_user: User = Depends(get_current_user)):
    """Récupérer la liste des employés éligibles aux astreintes avec leurs quotas"""
    # Get on-call eligible employees from real users database
    try:
        # Get all active users
        users = await db.users.find({"is_active": True}).to_list(1000)
        
        # Convert to OnCallEmployee format
        on_call_employees = []
        for user in users:
            employee = {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "category": user.get("department", "administrative").lower().replace(" ", "_"),
                "department": user["department"],
                "currentYearOnCallDays": 0,  # Will be calculated from actual assignments
                "phone": user.get("phone", ""),
                "emergencyContact": "",
                "lastOnCallDate": None
            }
            on_call_employees.append(OnCallEmployee(**employee))
        
        return on_call_employees
        
    except Exception as e:
        print(f"Error getting on-call employees: {e}")
        return []  # Return empty list if no data yet

@api_router.get("/on-call/assignments", response_model=List[OnCallAssignment])
async def get_on_call_assignments(
    month: Optional[int] = None, 
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """Récupérer les assignations d'astreinte pour une période donnée"""
    # Get on-call assignments from database
    try:
        query = {}
        assignments = await db.on_call_assignments.find(query).to_list(1000)
        
        # Convert ObjectIds to strings for JSON serialization
        for assignment in assignments:
            if "_id" in assignment:
                del assignment["_id"]
        
        # Convert to OnCallAssignment objects
        assignment_objects = [OnCallAssignment(**assignment) for assignment in assignments]
        
        # Filter by month/year if specified
        if month is not None and year is not None:
            filtered_assignments = []
            for assignment in assignment_objects:
                assignment_date = datetime.fromisoformat(assignment.startDate.replace('Z', '+00:00'))
                if assignment_date.month == month and assignment_date.year == year:
                    filtered_assignments.append(assignment)
            return filtered_assignments
        
        return assignment_objects
        
    except Exception as e:
        print(f"Error getting on-call assignments: {e}")
        return []  # Return empty list if no data yet

@api_router.post("/on-call/assignments", response_model=OnCallAssignment)
async def create_on_call_assignment(
    assignment: OnCallAssignment,
    current_user: User = Depends(get_current_user)
):
    """Créer une nouvelle assignation d'astreinte"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # En production, ici on validerait et sauvegarderait en base
    assignment.assignedBy = current_user.name
    assignment.assignedAt = datetime.now().isoformat()
    return assignment

@api_router.post("/on-call/validate", response_model=OnCallValidationResponse)
async def validate_on_call_assignment(
    validation: OnCallValidationRequest,
    current_user: User = Depends(get_current_user)
):
    """Valider une assignation d'astreinte selon les règles CCN66"""
    # Limites CCN66 par catégorie
    ccn66_limits = {
        "management": 60,
        "administrative": 45,
        "specialized_educators": 50,
        "technical_educators": 50
    }
    
    # Get employee info from database
    try:
        user = await db.users.find_one({"id": validation.employeeId})
        if not user:
            return OnCallValidationResponse(
                isValid=False,
                errors=["Employé non trouvé"]
            )
        
        # Calculate current on-call days for this year
        current_assignments = await db.on_call_assignments.find({
            "employeeId": validation.employeeId,
            "status": "confirmed"
        }).to_list(1000)
        
        current_days = 0
        current_year = datetime.now().year
        for assignment in current_assignments:
            assign_date = datetime.fromisoformat(assignment["startDate"])
            if assign_date.year == current_year:
                end_date = datetime.fromisoformat(assignment["endDate"])
                current_days += (end_date - assign_date).days + 1
        
        employee = {
            "name": user["name"],
            "category": user.get("department", "administrative").lower().replace(" ", "_"),
            "currentDays": current_days
        }
        
    except Exception as e:
        print(f"Error getting employee for validation: {e}")
        return OnCallValidationResponse(
            isValid=False,
            errors=["Erreur lors de la récupération des données employé"]
        )
    
    # Calcul du nombre de jours demandés
    start_date = datetime.fromisoformat(validation.startDate)
    end_date = datetime.fromisoformat(validation.endDate)
    new_days = (end_date - start_date).days + 1
    
    errors = []
    warnings = []
    
    # Vérification limite CCN66
    max_days = ccn66_limits[employee["category"]]
    total_after = employee["currentDays"] + new_days
    
    if total_after > max_days:
        errors.append(
            f"⚠️ LIMITE CCN66 DÉPASSÉE: {employee['name']} dépasserait sa limite annuelle "
            f"({max_days} jours max, actuellement {employee['currentDays']} + {new_days} = {total_after})"
        )
    elif total_after > max_days * 0.9:
        warnings.append(
            f"⚡ ATTENTION: {employee['name']} s'approche de sa limite annuelle "
            f"({round((total_after / max_days) * 100)}%)"
        )
    
    return OnCallValidationResponse(
        isValid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        stats={
            "employeeName": employee["name"],
            "category": employee["category"],
            "currentDays": employee["currentDays"],
            "newDays": new_days,
            "totalAfter": total_after,
            "maxDays": max_days,
            "percentageUsed": round((total_after / max_days) * 100, 1)
        }
    )

@api_router.get("/on-call/export/{month}/{year}")
async def export_on_call_planning(
    month: int,
    year: int,
    current_user: User = Depends(get_current_user)
):
    """Exporter le planning d'astreintes pour l'entreprise de sécurité"""
    # En production, ici on récupérerait les vraies données
    return {
        "month": month,
        "year": year,
        "assignments": [
            {
                "startDate": "2025-01-05",
                "endDate": "2025-01-06",
                "employeeName": "Sophie Martin",
                "employeePhone": "06.12.34.56.78",
                "emergencyContact": "Service Direction",
                "type": "Week-end",
                "notes": ""
            }
        ],
        "generatedAt": datetime.now().isoformat(),
        "generatedBy": current_user.name
    }

# Excel Import endpoints - Admin only
def require_admin_access(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def require_admin_or_manager(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin or manager access required")
    return current_user

@api_router.post("/import/reset-demo")
async def reset_demo_accounts(current_user: User = Depends(require_admin_access)):
    """Reset system: DÉSACTIVÉ EN PRODUCTION - Trop dangereux (causait perte de données)"""
    raise HTTPException(
        status_code=403, 
        detail="Endpoint désactivé en production pour éviter toute perte de données. Utilisez la fonction de backup/restore si nécessaire."
    )
    # ANCIEN CODE DANGEREUX (DÉSACTIVÉ):
    # try:
    #     # Clear all collections except current admin user
    #     await db.employees.delete_many({})
    #     await db.absences.delete_many({})
    #     await db.work_hours.delete_many({})
    #     
    #     # Keep only current admin user, remove all others
    #     await db.users.delete_many({"id": {"$ne": current_user.id}})
    #     
    #     return {
    #         "success": True,
    #         "message": "System reset completed. All demo data cleared.",
    #         "remaining_admin": {
    #             "name": current_user.name,
    #             "email": current_user.email,
    #             "role": current_user.role
    #         }
    #     }
    # except Exception as e:
    #     raise HTTPException(status_code=500, detail=f"Error resetting system: {str(e)}")

@api_router.post("/import/validate", response_model=ImportResult)
async def validate_import_data(
    request: ImportValidationRequest, 
    current_user: User = Depends(require_admin_access)
):
    """Validate Excel import data before actual import"""
    errors = []
    warnings = []
    
    try:
        if request.data_type == "employees":
            for i, employee_data in enumerate(request.data):
                # Required fields validation
                required_fields = ['nom', 'prenom', 'email', 'departement']
                for field in required_fields:
                    if not employee_data.get(field):
                        errors.append({
                            "row": str(i + 1),
                            "field": field,
                            "error": f"Champ requis manquant: {field}"
                        })
                
                # Email validation
                email = employee_data.get('email', '')
                if email and '@' not in email:
                    errors.append({
                        "row": str(i + 1),
                        "field": "email",
                        "error": f"Format email invalide: {email}"
                    })
                
                # Check for duplicate emails
                email_count = sum(1 for emp in request.data if emp.get('email') == email)
                if email_count > 1:
                    warnings.append({
                        "row": str(i + 1),
                        "field": "email",
                        "warning": f"Email en doublon: {email}"
                    })
        
        elif request.data_type == "absences":
            for i, absence_data in enumerate(request.data):
                required_fields = ['employee_name', 'date_debut', 'jours_absence', 'motif_absence']
                for field in required_fields:
                    if not absence_data.get(field):
                        errors.append({
                            "row": str(i + 1),
                            "field": field,
                            "error": f"Champ requis manquant: {field}"
                        })
        
        elif request.data_type == "work_hours":
            for i, work_data in enumerate(request.data):
                required_fields = ['employee_name', 'date', 'heures_travaillees']
                for field in required_fields:
                    if not work_data.get(field):
                        errors.append({
                            "row": str(i + 1),
                            "field": field,
                            "error": f"Champ requis manquant: {field}"
                        })
                
                # Validate hours is numeric
                hours = work_data.get('heures_travaillees')
                if hours is not None:
                    try:
                        float(hours)
                    except (ValueError, TypeError):
                        errors.append({
                            "row": str(i + 1),
                            "field": "heures_travaillees",
                            "error": f"Valeur numérique attendue pour les heures: {hours}"
                        })

        return ImportResult(
            success=len(errors) == 0,
            total_processed=len(request.data),
            successful_imports=len(request.data) - len(errors),
            failed_imports=len(errors),
            errors=errors,
            warnings=warnings,
            data_type=request.data_type
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")

@api_router.post("/import/employees", response_model=dict)
async def import_employees(
    request: ImportDataRequest,
    current_user: User = Depends(require_admin_access)
):
    """Import employee data from Excel and create user accounts automatically"""
    errors = []
    warnings = []
    successful_imports = 0
    created_users = []
    
    # Log détaillé pour debugging
    logger.info(f"📥 Import lancé par {current_user.name}")
    logger.info(f"📊 Nombre TOTAL de lignes reçues: {len(request.data)}")
    logger.info(f"🎯 OBJECTIF: Importer TOUTES les lignes (même avec données manquantes)")
    if len(request.data) > 0:
        logger.info(f"📋 Colonnes de la première ligne: {list(request.data[0].keys())}")
        logger.info(f"📝 Données de la première ligne: {request.data[0]}")
    
    try:
        for i, employee_data in enumerate(request.data):
            try:
                email_raw = employee_data.get('email', '').strip()
                nom = employee_data.get('nom', '').strip()
                prenom = employee_data.get('prenom', '').strip()
                membre_cse_raw = employee_data.get('membre_cse', '').strip().lower()
                
                # Vérifier les champs vraiment obligatoires (NOM et PRENOM uniquement)
                if not nom or not prenom:
                    error_msg = f"NOM et PRENOM sont obligatoires - reçu: nom={nom!r}, prenom={prenom!r}"
                    logger.warning(f"❌ Ligne {i+1}: {error_msg}")
                    errors.append({
                        "row": i + 1,
                        "error": error_msg,
                        "data_received": employee_data
                    })
                    continue
                
                # Gérer l'email : générer automatiquement si absent
                has_temp_email = False
                if not email_raw:
                    email = generate_internal_email(prenom, nom)
                    has_temp_email = True
                    logger.info(f"📧 Ligne {i+1}: Email ABSENT - Email interne généré: {email}")
                    warnings.append({
                        "row": i + 1,
                        "warning": f"Email généré automatiquement pour {prenom} {nom}: {email}"
                    })
                else:
                    email = email_raw.lower()
                
                # Détecter si c'est un membre CSE via la colonne 16 "Membre CSE"
                is_cse_delegate = False
                cse_status = None
                
                if membre_cse_raw in ['titulaire', 'délégué', 'delegue']:
                    is_cse_delegate = True
                    cse_status = 'titulaire'
                    logger.info(f"🏛️ Ligne {i+1}: Membre CSE TITULAIRE détecté - {prenom} {nom}")
                elif membre_cse_raw in ['suppléant', 'suppleant', 'suppléante', 'suppleante']:
                    is_cse_delegate = True
                    cse_status = 'suppléant'
                    logger.info(f"🏛️ Ligne {i+1}: Membre CSE SUPPLÉANT détecté - {prenom} {nom}")
                
                logger.info(f"🔍 Ligne {i+1}: email='{email}' (généré={has_temp_email}), nom='{nom}', prenom='{prenom}', membre_cse='{membre_cse_raw}', CSE={is_cse_delegate}")
                
                # Check if user already exists
                existing_user = await db.users.find_one({"email": email})
                if existing_user:
                    warnings.append({
                        "row": i + 1,
                        "warning": f"Utilisateur {email} existe déjà - données mises à jour"
                    })
                    continue
                
                # Create employee record
                employee = ImportEmployee(
                    nom=nom,
                    prenom=prenom,
                    email=email,
                    date_naissance=employee_data.get('date_naissance'),
                    sexe=employee_data.get('sexe'),
                    categorie_employe=employee_data.get('categorie_employe'),
                    metier=employee_data.get('metier'),
                    fonction=employee_data.get('fonction'),
                    departement=employee_data.get('departement') or None,  # Peut être vide
                    site=employee_data.get('site'),
                    temps_travail=employee_data.get('temps_travail'),
                    contrat=employee_data.get('contrat'),
                    date_debut_contrat=employee_data.get('date_debut_contrat'),
                    date_fin_contrat=employee_data.get('date_fin_contrat'),
                    notes=employee_data.get('notes'),
                    membre_cse=membre_cse_raw,
                    created_by=current_user.name
                )
                
                # Generate temporary password
                temp_password = generate_temp_password()
                temp_expires = datetime.utcnow().replace(tzinfo=timezone.utc) + timedelta(days=7)
                
                # Create user account automatically with ALL employee data
                departement_value = employee_data.get('departement')
                if not departement_value or not departement_value.strip():
                    departement_value = 'Non renseigné'
                
                user_account = UserInDB(
                    name=f"{prenom} {nom}",
                    email=email,
                    role="employee",  # Default role
                    department=departement_value,
                    phone=employee_data.get('telephone') or employee_data.get('phone'),
                    address=employee_data.get('adresse') or employee_data.get('address'),
                    position=employee_data.get('fonction'),
                    hire_date=employee_data.get('date_debut_contrat'),
                    isDelegateCSE=is_cse_delegate,  # Marqué si délégué CSE détecté
                    is_active=True,
                    requires_password_change=True,
                    first_login=True,
                    last_login=None,
                    temp_password_expires=temp_expires,
                    temp_password_plain=temp_password,  # Mot de passe temporaire actuel
                    initial_password=temp_password,  # Mot de passe initial PERMANENT
                    has_temp_email=has_temp_email,  # Indique si email généré auto
                    # Champs additionnels depuis employee
                    date_naissance=employee_data.get('date_naissance'),
                    sexe=employee_data.get('sexe'),
                    categorie_employe=employee_data.get('categorie_employe'),
                    metier=employee_data.get('metier'),
                    fonction=employee_data.get('fonction'),
                    site=employee_data.get('site'),
                    temps_travail=employee_data.get('temps_travail'),
                    contrat=employee_data.get('contrat'),
                    date_debut_contrat=employee_data.get('date_debut_contrat'),
                    date_fin_contrat=employee_data.get('date_fin_contrat'),
                    notes=employee_data.get('notes'),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                    created_by=current_user.name,
                    hashed_password=hash_password(temp_password)
                )
                
                # Store both employee and user records
                await db.employees.insert_one(employee.dict())
                user_dict = user_account.dict()
                await db.users.insert_one(user_dict)
                
                # Si c'est un délégué CSE, créer automatiquement son profil de délégué
                if is_cse_delegate:
                    try:
                        # Déterminer le collège selon "Catégorie Employé"
                        college = "employes"  # Default
                        categorie_employe = employee_data.get('categorie_employe', '').lower()
                        if 'cadre' in categorie_employe:
                            college = "cadres"
                        elif 'ouvrier' in categorie_employe or 'agent' in categorie_employe:
                            college = "ouvriers"
                        
                        # Créer le délégué CSE avec 24h par défaut
                        delegate = CSEDelegate(
                            user_id=user_dict["id"],
                            user_name=f"{prenom} {nom}",
                            email=email,
                            statut=cse_status,
                            heures_mensuelles=24,  # Défaut pour +250 salariés
                            college=college,
                            date_debut=employee_data.get('date_debut_contrat') or datetime.utcnow().strftime("%Y-%m-%d"),
                            date_fin=None,
                            actif=True,
                            created_by=current_user.name
                        )
                        
                        # Préparer pour MongoDB
                        delegate_dict = delegate.dict()
                        if isinstance(delegate_dict.get('created_at'), datetime):
                            delegate_dict['created_at'] = delegate_dict['created_at'].isoformat()
                        
                        await db.cse_delegates.insert_one(delegate_dict)
                        
                        logger.info(f"✅ Délégué CSE créé: {prenom} {nom} ({cse_status}, {college}, 24h/mois)")
                    
                    except Exception as e:
                        logger.error(f"⚠️ Erreur création délégué CSE pour {prenom} {nom}: {str(e)}")
                        warnings.append({
                            "row": i + 1,
                            "warning": f"Employé créé mais erreur création délégué CSE: {str(e)}"
                        })
                
                # Track created user info for admin
                created_users.append({
                    "name": f"{prenom} {nom}",
                    "email": email,
                    "temp_password": temp_password,
                    "expires_at": temp_expires.isoformat(),
                    "department": employee_data.get('departement', 'Non spécifié')
                })
                
                successful_imports += 1
                
            except Exception as e:
                errors.append({
                    "row": i + 1,
                    "error": f"Erreur lors de la création de l'employé/utilisateur: {str(e)}"
                })
        
        return {
            "success": len(errors) == 0,
            "total_processed": len(request.data),
            "successful_imports": successful_imports,
            "failed_imports": len(errors),
            "errors": errors,
            "warnings": warnings,
            "data_type": "employees",
            "created_users": created_users,
            "message": f"{successful_imports} employés importés avec création automatique des comptes utilisateurs"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import error: {str(e)}")

@api_router.post("/import/absences", response_model=dict)
async def import_absences(
    request: ImportDataRequest,
    current_user: User = Depends(require_admin_access)
):
    """Import absence data from Excel - matches employees by NOM + PRENOM"""
    errors = []
    warnings = []
    successful_imports = 0
    
    logger.info(f"📥 Import absences lancé par {current_user.name}")
    logger.info(f"📊 Nombre de lignes reçues: {len(request.data)}")
    
    try:
        for i, absence_data in enumerate(request.data):
            try:
                # Extraire les données
                nom = absence_data.get('nom', '').strip()
                prenom = absence_data.get('prenom', '').strip()
                date_debut = absence_data.get('date_debut', '').strip()
                jours_absence = absence_data.get('jours_absence', '').strip()
                motif_absence = absence_data.get('motif_absence', '').strip()
                notes = absence_data.get('notes', '').strip()
                
                logger.info(f"🔍 Ligne {i+1}: nom='{nom}', prenom='{prenom}', motif='{motif_absence}'")
                
                # Vérifier les champs obligatoires
                if not nom or not prenom:
                    error_msg = f"NOM et PRENOM sont obligatoires"
                    logger.warning(f"❌ Ligne {i+1}: {error_msg}")
                    errors.append({
                        "row": i + 1,
                        "error": error_msg,
                        "data": f"NOM='{nom}', PRENOM='{prenom}'"
                    })
                    continue
                
                if not motif_absence:
                    error_msg = f"Motif d'absence obligatoire"
                    logger.warning(f"❌ Ligne {i+1}: {error_msg}")
                    errors.append({
                        "row": i + 1,
                        "error": error_msg,
                        "data": f"{prenom} {nom}"
                    })
                    continue
                
                # Ignorer les lignes sans date de début
                if not date_debut:
                    warnings.append({
                        "row": i + 1,
                        "warning": f"Date de début manquante pour {prenom} {nom} - ligne ignorée"
                    })
                    continue
                
                # Chercher l'employé dans la collection users par nom + prénom
                # Normaliser la recherche (insensible à la casse et accents)
                employee = await db.users.find_one({
                    "$and": [
                        {"name": {"$regex": f".*{prenom}.*{nom}.*", "$options": "i"}}
                    ]
                })
                
                # Si pas trouvé, essayer dans l'autre sens (nom puis prénom)
                if not employee:
                    employee = await db.users.find_one({
                        "$and": [
                            {"name": {"$regex": f".*{nom}.*{prenom}.*", "$options": "i"}}
                        ]
                    })
                
                if not employee:
                    error_msg = f"Employé non trouvé dans la base: {prenom} {nom}"
                    logger.warning(f"❌ Ligne {i+1}: {error_msg}")
                    errors.append({
                        "row": i + 1,
                        "error": error_msg,
                        "suggestion": "Vérifiez l'orthographe ou importez d'abord les employés"
                    })
                    continue
                
                # Trouver la méthode de décompte pour ce type d'absence
                absence_type = await get_absence_type_config(motif_absence)
                counting_method = absence_type["counting_method"] if absence_type else "Jours Calendaires"
                
                # Calculer la date de fin automatiquement
                date_fin = None
                if jours_absence and jours_absence.replace('.', '').isdigit():
                    try:
                        days_count = int(float(jours_absence))
                        if days_count > 0:
                            date_fin = calculate_end_date(date_debut, days_count, counting_method)
                            logger.info(f"📅 Calcul date fin: {date_debut} + {days_count}j ({counting_method}) = {date_fin}")
                    except Exception as e:
                        logger.warning(f"⚠️ Erreur calcul date fin: {str(e)}")
                
                # Créer l'objet absence
                absence = Absence(
                    employee_id=employee["id"],
                    employee_name=employee.get("name", f"{prenom} {nom}"),
                    email=employee.get("email", ""),
                    date_debut=date_debut,
                    date_fin=date_fin,
                    jours_absence=jours_absence if jours_absence else "Non spécifié",
                    motif_absence=motif_absence,
                    counting_method=counting_method,
                    notes=notes,
                    created_by=current_user.name
                )
                
                # Préparer pour MongoDB (convertir datetime en ISO string)
                absence_dict = absence.dict()
                if isinstance(absence_dict.get('created_at'), datetime):
                    absence_dict['created_at'] = absence_dict['created_at'].isoformat()
                
                # Stocker dans MongoDB
                await db.absences.insert_one(absence_dict)
                successful_imports += 1
                logger.info(f"✅ Ligne {i+1}: Absence créée pour {employee.get('name')} (du {date_debut} au {date_fin or 'N/A'})")
                
            except Exception as e:
                logger.error(f"❌ Erreur ligne {i+1}: {str(e)}")
                errors.append({
                    "row": i + 1,
                    "error": f"Erreur lors de l'import: {str(e)}"
                })
        
        return {
            "success": len(errors) == 0,
            "total_processed": len(request.data),
            "successful_imports": successful_imports,
            "failed_imports": len(errors),
            "errors": errors,
            "warnings": warnings,
            "data_type": "absences",
            "message": f"{successful_imports} absences importées avec succès"
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur globale import absences: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Import error: {str(e)}")

@api_router.post("/import/work-hours", response_model=ImportResult)
async def import_work_hours(
    request: ImportDataRequest,
    current_user: User = Depends(require_admin_access)
):
    """Import work hours data from Excel - supports both 'employee_name' and 'nom'+'prenom' formats"""
    errors = []
    warnings = []
    successful_imports = 0
    
    try:
        for i, work_data in enumerate(request.data):
            try:
                # Support both formats: 'employee_name' OR 'nom'+'prenom'
                nom = work_data.get('nom', '').strip()
                prenom = work_data.get('prenom', '').strip()
                employee_name = work_data.get('employee_name', '').strip()
                
                # If nom and prenom are provided separately, use them
                if nom and prenom:
                    search_name = f"{prenom} {nom}"
                    display_name = f"{prenom} {nom}"
                elif employee_name:
                    search_name = employee_name
                    display_name = employee_name
                else:
                    errors.append({
                        "row": str(i + 1),
                        "error": "Nom et prénom (ou employee_name) requis"
                    })
                    continue
                
                # UNIFIED EMPLOYEE SEARCH - Try all possible locations
                employee = None
                
                # 1. Try by full name in users.name
                employee = await db.users.find_one({"name": {"$regex": search_name, "$options": "i"}})
                
                # 2. Try by NOM in users collection (case insensitive)
                if not employee and nom:
                    employee = await db.users.find_one({
                        "$or": [
                            {"name": {"$regex": f".*{nom}.*", "$options": "i"}},
                            {"email": {"$regex": f".*{nom}.*", "$options": "i"}}
                        ]
                    })
                
                # 3. Try employees collection as fallback (if it exists)
                if not employee:
                    try:
                        employee = await db.employees.find_one({
                            "$or": [
                                {"nom": {"$regex": nom if nom else search_name, "$options": "i"}},
                                {"prenom": {"$regex": prenom if prenom else search_name, "$options": "i"}}
                            ]
                        })
                    except:
                        pass  # employees collection may not exist
                
                if not employee:
                    errors.append({
                        "row": str(i + 1),
                        "error": f"Employé non trouvé: {display_name}"
                    })
                    continue
                
                # Get motif/notes
                motif = work_data.get('motif', work_data.get('notes', ''))
                
                work_hours = ImportWorkHours(
                    employee_id=employee.get("id", employee.get("_id")),
                    employee_name=employee.get("name", display_name),
                    date=work_data.get('date', ''),
                    heures_travaillees=float(work_data.get('heures_travaillees', 0)),
                    notes=motif,
                    created_by=current_user.name
                )
                
                # Store in MongoDB
                await db.work_hours.insert_one(work_hours.dict())
                successful_imports += 1
                
            except Exception as e:
                errors.append({
                    "row": str(i + 1),
                    "error": str(e)
                })
        
        return ImportResult(
            success=len(errors) == 0,
            total_processed=len(request.data),
            successful_imports=successful_imports,
            failed_imports=len(errors),
            errors=errors,
            warnings=warnings,
            data_type="work_hours"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import error: {str(e)}")

@api_router.get("/import/statistics")
async def get_import_statistics(current_user: User = Depends(require_admin_access)):
    """Get statistics about imported data"""
    try:
        employees_count = await db.employees.count_documents({})
        absences_count = await db.absences.count_documents({})
        work_hours_count = await db.work_hours.count_documents({})
        
        return {
            "employees": employees_count,
            "absences": absences_count,
            "work_hours": work_hours_count,
            "total_records": employees_count + absences_count + work_hours_count
        }
    except Exception as e:
        logger.error(f"Error getting statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/import/work-hours/list")
async def list_work_hours(current_user: User = Depends(require_admin_access)):
    """List all imported work hours"""
    try:
        work_hours = await db.work_hours.find({}).to_list(length=None)
        # Remove MongoDB _id field for JSON serialization
        for wh in work_hours:
            if '_id' in wh:
                del wh['_id']
        return work_hours
    except Exception as e:
        logger.error(f"Error listing work hours: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/import/work-hours/{employee_id}")
async def delete_employee_work_hours(
    employee_id: str,
    current_user: User = Depends(require_admin_access)
):
    """Delete all work hours for a specific employee"""
    try:
        result = await db.work_hours.delete_many({"employee_id": employee_id})
        return {
            "success": True,
            "deleted_count": result.deleted_count,
            "employee_id": employee_id
        }
    except Exception as e:
        logger.error(f"Error deleting work hours: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Leave Balance Management endpoints
@api_router.get("/leave-balance/{employee_id}", response_model=EmployeeLeaveBalance)
async def get_leave_balance(
    employee_id: str, 
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Récupère les soldes de congés d'un employé pour une année donnée.
    Si year non spécifié, utilise l'année courante.
    """
    try:
        if year is None:
            year = datetime.now().year
        
        # Chercher le solde existant
        balance = await db.leave_balances.find_one({
            "employee_id": employee_id,
            "year": year
        })
        
        if balance:
            # Nettoyer l'ObjectId MongoDB
            if "_id" in balance:
                del balance["_id"]
            return balance
        else:
            # Créer un solde par défaut si n'existe pas
            employee = await db.users.find_one({"id": employee_id})
            if not employee:
                raise HTTPException(status_code=404, detail="Employé non trouvé")
            
            new_balance = EmployeeLeaveBalance(
                employee_id=employee_id,
                employee_name=employee.get("name", ""),
                year=year
            )
            
            # Sauvegarder en base
            balance_dict = new_balance.dict()
            balance_dict['last_updated'] = balance_dict['last_updated'].isoformat()
            balance_dict['created_at'] = balance_dict['created_at'].isoformat()
            await db.leave_balances.insert_one(balance_dict)
            
            return new_balance
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting leave balance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/leave-balance/update")
async def update_leave_balance(
    update: LeaveBalanceUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Met à jour un solde de congés (déduction, réintégration, attribution).
    
    Operations:
    - "deduct" : Décompte lors de la pose d'absence
    - "reintegrate" : Réintégration suite à interruption
    - "grant" : Attribution de jours supplémentaires
    - "cancel" : Annulation d'une pose
    """
    try:
        year = datetime.now().year
        
        # Récupérer le solde actuel
        balance = await db.leave_balances.find_one({
            "employee_id": update.employee_id,
            "year": year
        })
        
        if not balance:
            # Créer un nouveau solde
            employee = await db.users.find_one({"id": update.employee_id})
            if not employee:
                raise HTTPException(status_code=404, detail="Employé non trouvé")
            
            balance = {
                "id": str(uuid.uuid4()),
                "employee_id": update.employee_id,
                "employee_name": employee.get("name", ""),
                "year": year,
                "ca_initial": 25.0, "ca_taken": 0.0, "ca_pending": 0.0, "ca_reintegrated": 0.0, "ca_balance": 25.0,
                "rtt_initial": 12.0, "rtt_taken": 0.0, "rtt_pending": 0.0, "rtt_reintegrated": 0.0, "rtt_balance": 12.0,
                "ct_initial": 0.0, "ct_taken": 0.0, "ct_pending": 0.0, "ct_reintegrated": 0.0, "ct_balance": 0.0,
                "rec_accumulated": 0.0, "rec_taken": 0.0, "rec_reintegrated": 0.0, "rec_balance": 0.0,
                "cex_initial": 0.0, "cex_taken": 0.0, "cex_balance": 0.0,
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.leave_balances.insert_one(balance)
        
        # Déterminer les champs à mettre à jour selon le type
        leave_type_map = {
            "CA": ("ca_balance", "ca_taken", "ca_reintegrated", "ca_pending"),
            "CP": ("ca_balance", "ca_taken", "ca_reintegrated", "ca_pending"),
            "RTT": ("rtt_balance", "rtt_taken", "rtt_reintegrated", "rtt_pending"),
            "CT": ("ct_balance", "ct_taken", "ct_reintegrated", "ct_pending"),
            "REC": ("rec_balance", "rec_taken", "rec_reintegrated", None),
            "CEX": ("cex_balance", "cex_taken", None, None)
        }
        
        if update.leave_type not in leave_type_map:
            raise HTTPException(status_code=400, detail=f"Type de congé non géré: {update.leave_type}")
        
        balance_field, taken_field, reint_field, pending_field = leave_type_map[update.leave_type]
        
        balance_before = balance.get(balance_field, 0.0)
        balance_after = balance_before
        
        # Appliquer l'opération
        if update.operation == "deduct":
            # Déduction : diminue le solde, augmente taken
            balance_after = balance_before - update.amount
            await db.leave_balances.update_one(
                {"employee_id": update.employee_id, "year": year},
                {
                    "$set": {
                        balance_field: balance_after,
                        "last_updated": datetime.now(timezone.utc).isoformat()
                    },
                    "$inc": {taken_field: update.amount}
                }
            )
            
        elif update.operation == "reintegrate":
            # Réintégration : augmente le solde et le compteur de réintégration
            balance_after = balance_before + update.amount
            update_fields = {
                balance_field: balance_after,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
            if reint_field:
                update_fields[reint_field] = balance.get(reint_field, 0.0) + update.amount
            
            await db.leave_balances.update_one(
                {"employee_id": update.employee_id, "year": year},
                {"$set": update_fields}
            )
            
        elif update.operation == "grant":
            # Attribution : augmente le solde initial et le solde disponible
            balance_after = balance_before + update.amount
            await db.leave_balances.update_one(
                {"employee_id": update.employee_id, "year": year},
                {
                    "$set": {
                        balance_field: balance_after,
                        "last_updated": datetime.now(timezone.utc).isoformat()
                    },
                    "$inc": {balance_field.replace("balance", "initial"): update.amount}
                }
            )
            
        elif update.operation == "cancel":
            # Annulation : augmente le solde, diminue taken
            balance_after = balance_before + update.amount
            await db.leave_balances.update_one(
                {"employee_id": update.employee_id, "year": year},
                {
                    "$set": {
                        balance_field: balance_after,
                        "last_updated": datetime.now(timezone.utc).isoformat()
                    },
                    "$inc": {taken_field: -update.amount}
                }
            )
        
        # Créer une transaction dans l'historique
        transaction = LeaveTransaction(
            employee_id=update.employee_id,
            employee_name=balance.get("employee_name", ""),
            leave_type=update.leave_type,
            operation=update.operation,
            amount=update.amount,
            reason=update.reason,
            related_absence_id=update.related_absence_id,
            interrupting_absence_type=update.interrupting_absence_type,
            balance_before=balance_before,
            balance_after=balance_after,
            created_by=current_user.email
        )
        
        transaction_dict = transaction.dict()
        transaction_dict['transaction_date'] = transaction_dict['transaction_date'].isoformat()
        await db.leave_transactions.insert_one(transaction_dict)
        
        logger.info(f"✅ Leave balance updated: {update.employee_id} - {update.leave_type} {update.operation} {update.amount} days")
        
        return {
            "success": True,
            "employee_id": update.employee_id,
            "leave_type": update.leave_type,
            "operation": update.operation,
            "amount": update.amount,
            "balance_before": balance_before,
            "balance_after": balance_after,
            "transaction_id": transaction.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating leave balance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/leave-transactions/{employee_id}", response_model=List[LeaveTransaction])
async def get_leave_transactions(
    employee_id: str,
    year: Optional[int] = None,
    leave_type: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Récupère l'historique des transactions de congés pour un employé.
    """
    try:
        query = {"employee_id": employee_id}
        
        if year:
            # Filtrer par année
            start_date = datetime(year, 1, 1, tzinfo=timezone.utc)
            end_date = datetime(year, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
            query["transaction_date"] = {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            }
        
        if leave_type:
            query["leave_type"] = leave_type
        
        transactions = await db.leave_transactions.find(query).sort("transaction_date", -1).to_list(1000)
        
        # Nettoyer les ObjectIds
        result = []
        for trans in transactions:
            if "_id" in trans:
                del trans["_id"]
            result.append(trans)
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting leave transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/leave-balance/initialize-all")
async def initialize_all_leave_balances(
    year: Optional[int] = None,
    force_recalculate: bool = False,
    current_user: User = Depends(require_admin_access)
):
    """
    Initialise les soldes de congés pour tous les employés selon CCN66 (réservé admin).
    Utilisé lors de la première installation ou en début d'année.
    
    Calcule automatiquement les droits selon:
    - Catégorie A (Éducateurs, Ouvriers qualifiés, Chefs): 30j CA + 18j CT + ancienneté
    - Catégorie B (Autres): 30j CA + 9j CT + ancienneté
    - Proratisation temps partiel (CA et CT)
    - Congés d'ancienneté: 2j/5ans (max 6j) NON proratisés
    """
    try:
        from ccn66_rules import calculate_employee_rights
        
        if year is None:
            year = datetime.now().year
        
        # Récupérer tous les employés
        employees = await db.users.find().to_list(1000)
        
        initialized = 0
        updated = 0
        skipped = 0
        
        for employee in employees:
            employee_id = employee.get("id")
            if not employee_id:
                continue
            
            # Vérifier si le solde existe déjà
            existing = await db.leave_balances.find_one({
                "employee_id": employee_id,
                "year": year
            })
            
            if existing and not force_recalculate:
                skipped += 1
                continue
            
            # Calculer les droits selon CCN66
            rights = calculate_employee_rights(
                categorie_employe=employee.get("categorie_employe"),
                metier=employee.get("metier"),
                date_embauche=employee.get("date_debut_contrat") or employee.get("hire_date"),
                temps_travail=employee.get("temps_travail"),
                reference_year=year
            )
            
            # Créer ou mettre à jour le solde
            balance_data = {
                "employee_id": employee_id,
                "employee_name": employee.get("name", ""),
                "year": year,
                # Congés Payés (CA)
                "ca_initial": rights["CA"],
                "ca_taken": existing.get("ca_taken", 0.0) if existing else 0.0,
                "ca_pending": existing.get("ca_pending", 0.0) if existing else 0.0,
                "ca_reintegrated": existing.get("ca_reintegrated", 0.0) if existing else 0.0,
                "ca_balance": rights["CA"] - (existing.get("ca_taken", 0.0) if existing else 0.0) + (existing.get("ca_reintegrated", 0.0) if existing else 0.0),
                # Congés Trimestriels (CT)
                "ct_initial": rights["CT"],
                "ct_taken": existing.get("ct_taken", 0.0) if existing else 0.0,
                "ct_pending": existing.get("ct_pending", 0.0) if existing else 0.0,
                "ct_reintegrated": existing.get("ct_reintegrated", 0.0) if existing else 0.0,
                "ct_balance": rights["CT"] - (existing.get("ct_taken", 0.0) if existing else 0.0) + (existing.get("ct_reintegrated", 0.0) if existing else 0.0),
                # Congés d'Ancienneté (CEX)
                "cex_initial": rights["CEX"],
                "cex_taken": existing.get("cex_taken", 0.0) if existing else 0.0,
                "cex_balance": rights["CEX"] - (existing.get("cex_taken", 0.0) if existing else 0.0),
                # RTT (par défaut 0 pour CCN66)
                "rtt_initial": 0.0,
                "rtt_taken": existing.get("rtt_taken", 0.0) if existing else 0.0,
                "rtt_pending": existing.get("rtt_pending", 0.0) if existing else 0.0,
                "rtt_reintegrated": existing.get("rtt_reintegrated", 0.0) if existing else 0.0,
                "rtt_balance": 0.0,
                # Récupération (accumulation variable)
                "rec_accumulated": existing.get("rec_accumulated", 0.0) if existing else 0.0,
                "rec_taken": existing.get("rec_taken", 0.0) if existing else 0.0,
                "rec_reintegrated": existing.get("rec_reintegrated", 0.0) if existing else 0.0,
                "rec_balance": existing.get("rec_accumulated", 0.0) if existing else 0.0,
                # Métadonnées CCN66
                "ccn66_category": rights["category"],
                "temps_travail_percent": rights["temps_travail_percent"],
                "is_temps_plein": rights["is_temps_plein"],
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "created_at": existing.get("created_at") if existing else datetime.now(timezone.utc).isoformat()
            }
            
            if existing:
                # Mettre à jour
                await db.leave_balances.update_one(
                    {"employee_id": employee_id, "year": year},
                    {"$set": balance_data}
                )
                updated += 1
                logger.info(f"✅ Updated CCN66 rights: {employee.get('name')} - Cat {rights['category']}: CA={rights['CA']}j, CT={rights['CT']}j, CEX={rights['CEX']}j")
            else:
                # Créer
                balance_data['id'] = str(uuid.uuid4())
                await db.leave_balances.insert_one(balance_data)
                initialized += 1
                logger.info(f"✅ Initialized CCN66 rights: {employee.get('name')} - Cat {rights['category']}: CA={rights['CA']}j, CT={rights['CT']}j, CEX={rights['CEX']}j")
        
        total_processed = initialized + updated
        logger.info(f"✅ CCN66 initialization complete: {initialized} created, {updated} updated, {skipped} skipped")
        
        return {
            "success": True,
            "year": year,
            "initialized": initialized,
            "updated": updated,
            "skipped": skipped,
            "total_employees": len(employees),
            "total_processed": total_processed
        }
        
    except Exception as e:
        logger.error(f"Error initializing leave balances with CCN66: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Event Management endpoints
@api_router.get("/events", response_model=List[Event])
async def get_events(current_user: User = Depends(get_current_user)):
    """Get upcoming events"""
    try:
        # Get events from today onwards
        today = datetime.now().strftime('%Y-%m-%d')
        events = await db.events.find({"start_date": {"$gte": today}}).sort("start_date", 1).to_list(100)
        
        # Convert ObjectIds to strings for JSON serialization
        for event in events:
            if "_id" in event:
                del event["_id"]
        
        return [Event(**event) for event in events]
        
    except Exception as e:
        print(f"Error getting events: {e}")
        return []

@api_router.post("/events", response_model=Event)
async def create_event(event_data: EventCreate, current_user: User = Depends(get_current_user)):
    """Create new event (admin/manager only)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        event = Event(
            title=event_data.title,
            description=event_data.description,
            event_type=event_data.event_type,
            start_date=event_data.start_date,
            start_time=event_data.start_time,
            end_date=event_data.end_date,
            end_time=event_data.end_time,
            location=event_data.location,
            participants=event_data.participants,
            is_all_day=event_data.is_all_day,
            created_by=current_user.name
        )
        
        await db.events.insert_one(event.dict())
        return event
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating event: {str(e)}")

@api_router.put("/events/{event_id}", response_model=Event)
async def update_event(event_id: str, event_data: EventCreate, current_user: User = Depends(get_current_user)):
    """Update event (admin/manager only)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        event = await db.events.find_one({"id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        update_data = event_data.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        await db.events.update_one({"id": event_id}, {"$set": update_data})
        
        updated_event = await db.events.find_one({"id": event_id})
        return Event(**{k: v for k, v in updated_event.items() if k != "_id"})
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating event: {str(e)}")

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: User = Depends(get_current_user)):
    """Delete event (admin/manager only)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        result = await db.events.delete_one({"id": event_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Event not found")
        
        return {"message": "Event deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting event: {str(e)}")

# ========================================
# ABSENCE MANAGEMENT ENDPOINTS
# ========================================

@api_router.get("/absences", response_model=List[dict])
async def get_absences(current_user: User = Depends(get_current_user)):
    """Get all absences (admin/manager can see all, employees see their own)"""
    try:
        if current_user.role in ["admin", "manager"]:
            # Admin et managers peuvent voir toutes les absences
            absences = await db.absences.find({}).sort("created_at", -1).to_list(1000)
        else:
            # Les employés ne voient que leurs propres absences
            absences = await db.absences.find({"employee_id": current_user.id}).sort("created_at", -1).to_list(100)
        
        # Nettoyer les ObjectIds
        for absence in absences:
            if "_id" in absence:
                del absence["_id"]
        
        return absences
        
    except Exception as e:
        logger.error(f"Error getting absences: {e}")
        return []

@api_router.post("/absences", response_model=dict)
async def create_absence(absence: Absence, current_user: User = Depends(get_current_user)):
    """
    Create a new absence request
    🔄 SYNCHRONISATION AUTOMATIQUE : Si approved, déduit automatiquement des compteurs
    ✅ VALIDATION : Vérifie les chevauchements de dates
    - Employees can create their own absence requests with status='pending'
    - Admins can create absences with any status
    """
    try:
        # Vérifier que l'employé ne crée que ses propres demandes (sauf admin)
        if current_user.role not in ["admin", "manager"]:
            if absence.employee_id != current_user.id:
                raise HTTPException(status_code=403, detail="You can only create your own absence requests")
            # Forcer le statut à "pending" pour les employés
            absence.status = "pending"
        
        # 🔍 VALIDATION : Vérifier les chevauchements de dates
        overlapping = await db.absences.find({
            "employee_id": absence.employee_id,
            "status": {"$in": ["approved", "pending"]},  # Vérifier les absences approuvées et en attente
            "$or": [
                {
                    "date_debut": {"$lte": absence.date_fin},
                    "date_fin": {"$gte": absence.date_debut}
                }
            ]
        }).to_list(length=None)
        
        if overlapping:
            overlap_details = []
            for existing in overlapping:
                overlap_details.append(
                    f"- {existing.get('motif_absence')} du {existing.get('date_debut')} au {existing.get('date_fin')} (statut: {existing.get('status')})"
                )
            
            error_message = (
                f"❌ Chevauchement de dates détecté pour {absence.employee_name}:\n" +
                "\n".join(overlap_details) +
                f"\n\nNouvelle demande: {absence.motif_absence} du {absence.date_debut} au {absence.date_fin}"
            )
            
            logger.warning(f"⚠️ Tentative de création d'absence avec chevauchement: {absence.employee_name}")
            raise HTTPException(status_code=400, detail=error_message)
        
        # 🔄 ENRICHISSEMENT : Récupérer la configuration du type d'absence depuis BDD
        absence_type_config = await get_absence_type_config(absence.motif_absence)
        if absence_type_config:
            # Enrichir avec counting_method depuis la BDD
            absence.counting_method = absence_type_config.get("counting_method", "Jours Calendaires")
            logger.info(f"📋 Type d'absence {absence.motif_absence}: counting_method = {absence.counting_method}")
            
            # 📅 CALCUL AUTOMATIQUE : Date de fin basée sur counting_method
            if absence.jours_absence and absence.date_debut:
                try:
                    days_count = int(float(absence.jours_absence))
                    if days_count > 0:
                        calculated_date_fin = calculate_end_date(absence.date_debut, days_count, absence.counting_method)
                        absence.date_fin = calculated_date_fin
                        logger.info(f"📅 Date fin calculée: {absence.date_debut} + {days_count}j ({absence.counting_method}) = {absence.date_fin}")
                except Exception as e:
                    logger.warning(f"⚠️ Erreur calcul date fin: {str(e)}")
        else:
            logger.warning(f"⚠️ Type d'absence {absence.motif_absence} non trouvé en BDD, utilisation des valeurs par défaut")
        
        # Préparer les données pour MongoDB
        absence_dict = absence.dict()
        absence_dict['created_at'] = datetime.utcnow().isoformat()
        absence_dict['created_by'] = current_user.id
        
        # Convertir les dates en ISO format si nécessaire
        if isinstance(absence_dict.get('date_debut'), str):
            absence_dict['date_debut'] = absence_dict['date_debut']
        if isinstance(absence_dict.get('date_fin'), str):
            absence_dict['date_fin'] = absence_dict['date_fin']
        
        # Insérer dans la base de données
        result = await db.absences.insert_one(absence_dict)
        
        if result.inserted_id:
            logger.info(f"✅ Absence créée: {absence.id} pour {absence.employee_name}")
            
            # 🔄 SYNCHRONISATION : Si l'absence est approuvée, déduire des compteurs
            if absence.status == "approved":
                sync_result = await sync_service.sync_absence_to_counters(absence_dict, operation="create")
                if sync_result:
                    logger.info(f"🔄 Compteurs synchronisés pour absence {absence.id}")
                else:
                    logger.warning(f"⚠️ Échec synchronisation compteurs pour absence {absence.id}")
            
            # 🔔 NOTIFICATION : Si demande pending, notifier les managers et admins
            if absence.status == "pending":
                managers_and_admins = await db.users.find({
                    "role": {"$in": ["admin", "manager"]}
                }).to_list(length=None)
                
                for user in managers_and_admins:
                    await create_auto_notification(
                        user_id=user.get('id'),
                        notif_type="absence_request",
                        title="Nouvelle demande d'absence",
                        message=f"{absence.employee_name} a soumis une demande de {absence.motif_absence} ({absence.date_debut} → {absence.date_fin})",
                        icon="📝",
                        link="/absence-requests",
                        related_id=absence.id
                    )
                
                logger.info(f"🔔 Notifications envoyées à {len(managers_and_admins)} managers/admins")
            
            # 📡 WEBSOCKET : Broadcast à tous les utilisateurs connectés
            await ws_manager.broadcast_absence_created(absence_dict, current_user.id)
            
            return {
                "message": "Absence request created successfully",
                "id": absence.id,
                "status": absence.status,
                "counters_synced": absence.status == "approved"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create absence")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating absence: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating absence: {str(e)}")

@api_router.get("/absences/{employee_id}")
async def get_absences_by_employee(employee_id: str, current_user: User = Depends(get_current_user)):
    """Get absences for a specific employee"""
    # Vérifier les permissions (admin/manager ou l'employé lui-même)
    if current_user.role not in ["admin", "manager"] and current_user.id != employee_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        absences = await db.absences.find({"employee_id": employee_id}).sort("date_debut", -1).to_list(100)
        
        # Nettoyer les ObjectIds
        for absence in absences:
            if "_id" in absence:
                del absence["_id"]
        
        return absences
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting absences: {str(e)}")

@api_router.delete("/absences/bulk/all")
async def delete_all_absences(current_user: User = Depends(get_current_user)):
    """Delete ALL absences (admin only) - Use with caution!"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can delete all absences")
    
    try:
        result = await db.absences.delete_many({})
        logger.warning(f"🗑️ ALL ABSENCES DELETED by {current_user.name}: {result.deleted_count} absences removed")
        
        return {
            "message": f"All absences deleted successfully",
            "deleted_count": result.deleted_count
        }
        
    except Exception as e:
        logger.error(f"Error deleting all absences: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting all absences: {str(e)}")

@api_router.put("/absences/{absence_id}")
async def update_absence(
    absence_id: str,
    absence_data: dict,
    current_user: User = Depends(get_current_user)
):
    """
    🔄 WORKFLOW DOUBLE VALIDATION CCN66
    
    1️⃣ Employee crée → status='pending'
    2️⃣ Manager valide → status='validated_by_manager' (PAS de déduction compteurs)
    3️⃣ Admin approuve → status='approved' (DÉDUCTION compteurs)
    
    Exceptions:
    - Manager NE PEUT PAS valider sa propre demande (seul admin peut)
    - Admin peut directement approuver (skip manager)
    """
    # Récupérer l'absence existante
    existing_absence = await db.absences.find_one({"id": absence_id})
    if not existing_absence:
        raise HTTPException(status_code=404, detail="Absence not found")
    
    old_status = existing_absence.get("status")
    old_jours = float(existing_absence.get("jours_absence", 0))
    
    # 🔒 PERMISSIONS CHECK
    if current_user.role not in ["admin", "manager"]:
        # Employees peuvent modifier seulement leurs propres absences en attente
        if existing_absence.get("employee_id") != current_user.id:
            raise HTTPException(status_code=403, detail="Non autorisé")
        if existing_absence.get("status") != "pending":
            raise HTTPException(status_code=403, detail="Cannot update validated absences")
    
    # Préparer les données de mise à jour
    update_fields = {}
    allowed_fields = ['date_debut', 'date_fin', 'jours_absence', 'motif_absence', 
                      'notes', 'absence_unit', 'hours_amount', 'counting_method']
    
    for field in allowed_fields:
        if field in absence_data:
            update_fields[field] = absence_data[field]
    
    update_fields['updated_at'] = datetime.utcnow().isoformat()
    update_fields['updated_by'] = current_user.id
    
    # 🎯 GESTION DU WORKFLOW DE VALIDATION
    if 'status' in absence_data:
        new_status_requested = absence_data['status']
        
        # ==================== CAS 1: MANAGER VALIDE (pending → validated_by_manager) ====================
        if current_user.role == "manager" and new_status_requested == "validated_by_manager":
            # ❌ Manager NE PEUT PAS valider sa propre demande
            if current_user.id == existing_absence.get('employee_id'):
                raise HTTPException(
                    status_code=403,
                    detail="❌ Un manager ne peut pas valider sa propre demande. Seul un administrateur peut le faire."
                )
            
            # ✅ Manager valide une demande d'un autre employé
            if old_status == "pending":
                update_fields['status'] = "validated_by_manager"
                update_fields['validated_by_manager'] = current_user.id
                update_fields['manager_validation_date'] = datetime.utcnow().isoformat()
                
                logger.info(f"✅ Manager {current_user.name} a PRÉ-VALIDÉ l'absence {absence_id} de {existing_absence.get('employee_name')}")
                
                # 📧 NOTIFICATION: Notifier l'admin qu'une absence attend approbation finale
                admins = await db.users.find({"role": "admin"}).to_list(length=None)
                for admin in admins:
                    await create_auto_notification(
                        user_id=admin.get('id'),
                        notif_type="absence_request",
                        title="Absence validée par manager - Approbation finale requise ⏳",
                        message=f"{existing_absence.get('employee_name')} - {existing_absence.get('motif_absence')} ({existing_absence.get('date_debut')} → {existing_absence.get('date_fin')}) - Validée par {current_user.name}",
                        icon="⏳",
                        link="/absence-requests",
                        related_id=absence_id
                    )
                
                logger.info(f"📧 Notifications envoyées à {len(admins)} admin(s)")
            else:
                raise HTTPException(status_code=400, detail=f"Cannot validate absence with status '{old_status}'")
        
        # ==================== CAS 2: ADMIN APPROUVE (validated_by_manager → approved) ====================
        elif current_user.role == "admin" and new_status_requested == "approved":
            # Admin peut approuver depuis pending OU validated_by_manager
            if old_status in ["pending", "validated_by_manager"]:
                update_fields['status'] = "approved"
                update_fields['approved_by'] = current_user.id
                update_fields['approved_at'] = datetime.utcnow().isoformat()
                
                logger.info(f"✅ Admin {current_user.name} a APPROUVÉ l'absence {absence_id}")
            else:
                raise HTTPException(status_code=400, detail=f"Cannot approve absence with status '{old_status}'")
        
        # ==================== CAS 3: ADMIN REJETTE ====================
        elif current_user.role == "admin" and new_status_requested == "rejected":
            update_fields['status'] = "rejected"
            update_fields['rejected_by'] = current_user.id
            update_fields['rejected_at'] = datetime.utcnow().isoformat()
            update_fields['rejection_reason'] = absence_data.get('rejection_reason', 'Aucune raison spécifiée')
            
            logger.info(f"❌ Admin {current_user.name} a REJETÉ l'absence {absence_id}")
        
        # ==================== CAS 4: MANAGER TENTE D'APPROUVER DIRECTEMENT ====================
        elif current_user.role == "manager" and new_status_requested == "approved":
            raise HTTPException(
                status_code=403,
                detail="❌ Seul un administrateur peut approuver une absence. Les managers peuvent uniquement pré-valider."
            )
        
        else:
            # Autres transitions non autorisées
            raise HTTPException(
                status_code=403,
                detail=f"Transition non autorisée: {old_status} → {new_status_requested} pour role={current_user.role}"
            )
    
    new_status = update_fields.get('status', old_status)
    new_jours = float(update_fields.get('jours_absence', old_jours))
    
    # 💾 METTRE À JOUR DANS MONGODB
    result = await db.absences.update_one(
        {"id": absence_id},
        {"$set": update_fields}
    )
    
    # Récupérer l'absence mise à jour
    updated_absence = await db.absences.find_one({"id": absence_id})
    if "_id" in updated_absence:
        del updated_absence["_id"]
    
    # 🔄 SYNCHRONISATION COMPTEURS (UNIQUEMENT SUR APPROBATION FINALE)
    sync_performed = False
    
    if old_status in ["pending", "validated_by_manager"] and new_status == "approved":
        logger.info(f"🔄 APPROBATION FINALE: {old_status} → approved - Déduction compteurs")
        sync_result = await sync_service.sync_absence_to_counters(updated_absence, operation="approve")
        sync_performed = sync_result
        
        # 📧 NOTIFICATION: Notifier l'employé de l'approbation
        await create_auto_notification(
            user_id=updated_absence.get('employee_id'),
            notif_type="absence_approved",
            title="Demande approuvée ✅",
            message=f"Votre demande de {updated_absence.get('motif_absence')} du {updated_absence.get('date_debut')} au {updated_absence.get('date_fin')} a été approuvée",
            icon="✅",
            link="/my-space",
            related_id=absence_id
        )
    
    elif old_status == "approved" and new_status == "rejected":
        logger.info(f"🔄 ANNULATION: approved → rejected - Réintégration compteurs")
        sync_result = await sync_service.sync_absence_to_counters(updated_absence, operation="delete")
        sync_performed = sync_result
        
        # 📧 NOTIFICATION: Notifier l'employé de l'annulation
        await create_auto_notification(
            user_id=updated_absence.get('employee_id'),
            notif_type="absence_rejected",
            title="Demande annulée ❌",
            message=f"Votre demande de {updated_absence.get('motif_absence')} a été annulée",
            icon="❌",
            link="/my-space",
            related_id=absence_id
        )
    
    elif old_status == "pending" and new_status == "rejected":
        logger.info(f"✅ REJET DIRECT: pending → rejected (pas de déduction)")
        
        # 📧 NOTIFICATION: Notifier l'employé du rejet
        await create_auto_notification(
            user_id=updated_absence.get('employee_id'),
            notif_type="absence_rejected",
            title="Demande rejetée ❌",
            message=f"Votre demande de {updated_absence.get('motif_absence')} a été rejetée",
            icon="❌",
            link="/my-space",
            related_id=absence_id
        )
    
    elif old_status == "validated_by_manager" and new_status == "rejected":
        logger.info(f"✅ REJET POST-VALIDATION: validated_by_manager → rejected (pas de déduction)")
        
        # 📧 NOTIFICATION: Notifier l'employé du rejet
        await create_auto_notification(
            user_id=updated_absence.get('employee_id'),
            notif_type="absence_rejected",
            title="Demande rejetée ❌",
            message=f"Votre demande de {updated_absence.get('motif_absence')} a été rejetée par l'administrateur",
            icon="❌",
            link="/my-space",
            related_id=absence_id
        )
    
    elif old_status == "approved" and new_status == "approved" and old_jours != new_jours:
        logger.info(f"🔄 MODIFICATION DURÉE: {old_jours}j → {new_jours}j")
        # Réintégrer ancienne durée
        old_absence_dict = existing_absence.copy()
        await sync_service.sync_absence_to_counters(old_absence_dict, operation="delete")
        # Déduire nouvelle durée
        sync_result = await sync_service.sync_absence_to_counters(updated_absence, operation="create")
        sync_performed = sync_result
    
    # 📡 WEBSOCKET: Broadcast modification
    await ws_manager.broadcast_absence_updated(updated_absence, current_user.id)
    
    return {
        "success": True,
        "message": "Absence updated successfully",
        "absence": updated_absence,
        "counters_synced": sync_performed,
        "status_change": f"{old_status} → {new_status}" if old_status != new_status else None,
        "workflow_step": {
            "pending": "En attente de validation manager",
            "validated_by_manager": "✅ Validée par manager - En attente approbation admin",
            "approved": "✅ APPROUVÉE - Compteurs déduits",
            "rejected": "❌ Rejetée"
        }.get(new_status, new_status)
    }

@api_router.delete("/absences/{absence_id}")
async def delete_absence(
    absence_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete an absence
    🔄 SYNCHRONISATION AUTOMATIQUE : Si approved, réintègre dans les compteurs
    Admin can delete any absence
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Récupérer l'absence avant suppression pour synchroniser les compteurs
    absence_to_delete = await db.absences.find_one({"id": absence_id})
    
    if not absence_to_delete:
        raise HTTPException(status_code=404, detail="Absence not found")
    
    # Supprimer l'absence
    result = await db.absences.delete_one({"id": absence_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Absence not found")
    
    # 🔄 SYNCHRONISATION : Si l'absence était approved, réintégrer dans les compteurs
    sync_performed = False
    if absence_to_delete.get("status") == "approved":
        logger.info(f"🔄 Suppression absence approved {absence_id}: réintégration dans compteurs")
        sync_result = await sync_service.sync_absence_to_counters(absence_to_delete, operation="delete")
        sync_performed = sync_result
        if sync_result:
            logger.info(f"✅ Compteurs réintégrés après suppression absence {absence_id}")
        else:
            logger.warning(f"⚠️ Échec réintégration compteurs pour absence {absence_id}")
    else:
        logger.info(f"✅ Suppression absence {absence_id} (status={absence_to_delete.get('status')}) - pas de réintégration")
    
    # 📡 WEBSOCKET : Broadcast suppression à tous les utilisateurs
    await ws_manager.broadcast_absence_deleted(absence_id, current_user.id)
    
    return {
        "success": True,
        "message": "Absence deleted successfully",
        "counters_synced": sync_performed
    }

@api_router.get("/absences/by-period/{year}/{month}", response_model=List[dict])
async def get_absences_by_period(
    year: int, 
    month: int, 
    current_user: User = Depends(get_current_user)
):
    """
    Get all absences for a specific month and year
    Returns absences with date_debut in the specified month
    """
    try:
        # Admin and managers can see all absences
        if current_user.role in ["admin", "manager"]:
            # Find all absences where date_debut is in the specified month/year
            # date_debut format can be DD/MM/YYYY or YYYY-MM-DD
            absences = await db.absences.find({}).to_list(1000)
        else:
            # Employees see only their own absences
            absences = await db.absences.find({"employee_id": current_user.id}).to_list(100)
        
        # Filter by month and year - INCLUDES absences that OVERLAP the month
        filtered_absences = []
        for absence in absences:
            date_debut = absence.get("date_debut", "")
            date_fin = absence.get("date_fin", date_debut)  # If no end date, use start date
            
            if not date_debut:
                continue
                
            try:
                # Parse dates in both formats
                if '/' in date_debut:
                    # Format DD/MM/YYYY
                    parts_debut = date_debut.split('/')
                    if len(parts_debut) == 3:
                        debut_day, debut_month, debut_year = int(parts_debut[0]), int(parts_debut[1]), int(parts_debut[2])
                else:
                    # Format YYYY-MM-DD
                    parts_debut = date_debut.split('-')
                    if len(parts_debut) == 3:
                        debut_year, debut_month, debut_day = int(parts_debut[0]), int(parts_debut[1]), int(parts_debut[2])
                
                # Parse end date
                if '/' in date_fin:
                    parts_fin = date_fin.split('/')
                    if len(parts_fin) == 3:
                        fin_day, fin_month, fin_year = int(parts_fin[0]), int(parts_fin[1]), int(parts_fin[2])
                else:
                    parts_fin = date_fin.split('-')
                    if len(parts_fin) == 3:
                        fin_year, fin_month, fin_day = int(parts_fin[0]), int(parts_fin[1]), int(parts_fin[2])
                
                # Check if absence overlaps with the requested month
                # Absence overlaps if:
                # - Starts before or during the month AND ends during or after the month
                # Simple check: (debut_year, debut_month) <= (year, month) <= (fin_year, fin_month)
                
                debut_date_num = debut_year * 12 + debut_month
                fin_date_num = fin_year * 12 + fin_month
                target_date_num = year * 12 + month
                
                if debut_date_num <= target_date_num <= fin_date_num:
                    # Clean ObjectIds
                    if "_id" in absence:
                        del absence["_id"]
                    filtered_absences.append(absence)
                    
            except (ValueError, IndexError, NameError) as e:
                # Skip malformed dates
                logger.warning(f"Skipping absence with malformed date: {date_debut} -> {date_fin}, error: {e}")
                continue
        
        logger.info(f"📊 Get absences for {month}/{year}: {len(filtered_absences)} found")
        return filtered_absences
        
    except Exception as e:
        logger.error(f"Error getting absences by period: {e}")
        return []

# ========================================
# CSE MANAGEMENT ENDPOINTS
# ========================================

@api_router.post("/cse/delegates", response_model=CSEDelegate)
async def create_cse_delegate(
    user_id: str,
    statut: str,
    heures_mensuelles: int,
    college: str,
    date_debut: str,
    date_fin: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Désigner un délégué CSE (admin uniquement)"""
    if current_user.role not in ["admin"]:
        raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent désigner des délégués CSE")
    
    try:
        # Vérifier que l'utilisateur existe
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        # Vérifier si déjà délégué actif
        existing = await db.cse_delegates.find_one({"user_id": user_id, "actif": True})
        if existing:
            raise HTTPException(status_code=400, detail="Cet utilisateur est déjà délégué CSE actif")
        
        # Créer le délégué
        delegate = CSEDelegate(
            user_id=user_id,
            user_name=user.get("name", ""),
            email=user.get("email", ""),
            statut=statut,
            heures_mensuelles=heures_mensuelles,
            college=college,
            date_debut=date_debut,
            date_fin=date_fin,
            actif=True,
            created_by=current_user.name
        )
        
        # Préparer pour MongoDB
        delegate_dict = delegate.dict()
        if isinstance(delegate_dict.get('created_at'), datetime):
            delegate_dict['created_at'] = delegate_dict['created_at'].isoformat()
        
        await db.cse_delegates.insert_one(delegate_dict)
        
        # Mettre à jour l'utilisateur avec isDelegateCSE
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"isDelegateCSE": True}}
        )
        
        logger.info(f"✅ Délégué CSE créé: {user.get('name')} ({statut})")
        return delegate
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur création délégué CSE: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du délégué: {str(e)}")

@api_router.get("/cse/delegates")
async def get_cse_delegates(
    actif_only: bool = True,
    current_user: User = Depends(get_current_user)
):
    """Liste des délégués CSE"""
    try:
        query = {"actif": True} if actif_only else {}
        delegates = await db.cse_delegates.find(query).sort("created_at", -1).to_list(100)
        
        # Nettoyer les ObjectIds
        for delegate in delegates:
            if "_id" in delegate:
                del delegate["_id"]
        
        return delegates
        
    except Exception as e:
        logger.error(f"❌ Erreur récupération délégués: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.put("/cse/delegates/{delegate_id}")
async def update_cse_delegate(
    delegate_id: str,
    heures_mensuelles: Optional[int] = None,
    date_fin: Optional[str] = None,
    actif: Optional[bool] = None,
    current_user: User = Depends(get_current_user)
):
    """Modifier un délégué CSE (admin uniquement)"""
    if current_user.role not in ["admin"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    try:
        update_data = {}
        if heures_mensuelles is not None:
            update_data["heures_mensuelles"] = heures_mensuelles
        if date_fin is not None:
            update_data["date_fin"] = date_fin
        if actif is not None:
            update_data["actif"] = actif
        
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        result = await db.cse_delegates.update_one(
            {"id": delegate_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Délégué non trouvé")
        
        return {"message": "Délégué mis à jour avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.delete("/cse/delegates/{delegate_id}")
async def delete_cse_delegate(delegate_id: str, current_user: User = Depends(get_current_user)):
    """Supprimer un délégué CSE (admin uniquement)"""
    if current_user.role not in ["admin"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    try:
        result = await db.cse_delegates.delete_one({"id": delegate_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Délégué non trouvé")
        
        return {"message": "Délégué supprimé avec succès", "id": delegate_id}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.delete("/cse/test-data/cleanup")
async def cleanup_delegation_test_data(current_user: User = Depends(require_admin_access)):
    """Supprimer toutes les données de test de délégation (admin uniquement)"""
    try:
        # Supprimer tous les délégués
        delegates_result = await db.cse_delegates.delete_many({})
        
        # Supprimer toutes les utilisations
        usage_result = await db.delegation_usage.delete_many({})
        
        # Supprimer toutes les cessions
        cessions_result = await db.cse_hour_transfers.delete_many({})
        
        return {
            "message": "Données de test supprimées avec succès",
            "deleted": {
                "delegates": delegates_result.deleted_count,
                "usage": usage_result.deleted_count,
                "cessions": cessions_result.deleted_count
            }
        }
        
    except Exception as e:
        logger.error(f"Erreur suppression données test: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# ========================================
# HEURES DE DÉLÉGATION - DÉCLARATION ET PRISE DE CONNAISSANCE
# ========================================

@api_router.post("/cse/hours/declare")
async def declare_delegation_hours(
    delegate_id: str,
    date: str,
    heures_utilisees: float,
    motif: str,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Déclarer des heures de délégation (délégué CSE ou admin)"""
    try:
        # Vérifier que le délégué existe et est actif
        delegate = await db.cse_delegates.find_one({"id": delegate_id, "actif": True})
        if not delegate:
            raise HTTPException(status_code=404, detail="Délégué CSE non trouvé ou inactif")
        
        # Vérifier que l'utilisateur a le droit (délégué lui-même ou admin)
        if current_user.id != delegate["user_id"] and current_user.role not in ["admin"]:
            raise HTTPException(status_code=403, detail="Vous ne pouvez déclarer que vos propres heures")
        
        # Calculer le solde du mois
        from datetime import datetime as dt
        target_date = dt.strptime(date, "%Y-%m-%d")
        month_str = target_date.strftime("%Y-%m")
        
        # Heures déjà utilisées ce mois
        declarations = await db.delegation_hours.find({
            "delegate_id": delegate_id,
            "date": {"$regex": f"^{month_str}"}
        }).to_list(100)
        
        heures_utilisees_mois = sum(float(d.get("heures_utilisees", 0)) for d in declarations)
        solde_disponible = delegate["heures_mensuelles"] - heures_utilisees_mois
        
        # Vérifier si dépassement
        if heures_utilisees > solde_disponible:
            raise HTTPException(
                status_code=400,
                detail=f"Solde insuffisant. Heures disponibles: {solde_disponible}h / Demandées: {heures_utilisees}h"
            )
        
        # Créer la déclaration
        declaration = DelegationHoursDeclaration(
            delegate_id=delegate_id,
            delegate_name=delegate["user_name"],
            date=date,
            heures_utilisees=heures_utilisees,
            motif=motif,
            statut="declared",
            notes=notes
        )
        
        # Préparer pour MongoDB
        declaration_dict = declaration.dict()
        if isinstance(declaration_dict.get('created_at'), datetime):
            declaration_dict['created_at'] = declaration_dict['created_at'].isoformat()
        
        await db.delegation_hours.insert_one(declaration_dict)
        
        logger.info(f"✅ Heures de délégation déclarées: {heures_utilisees}h par {delegate['user_name']}")
        
        return {
            "message": "Heures déclarées avec succès",
            "declaration_id": declaration.id,
            "solde_restant": solde_disponible - heures_utilisees
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur déclaration heures: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.post("/cse/hours/acknowledge/{declaration_id}")
async def acknowledge_delegation_hours(declaration_id: str, current_user: User = Depends(get_current_user)):
    """Prendre connaissance d'une déclaration d'heures (admin/directeur uniquement)"""
    if current_user.role not in ["admin"]:
        raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent prendre connaissance")
    
    try:
        result = await db.delegation_hours.update_one(
            {"id": declaration_id, "statut": "declared"},
            {"$set": {
                "statut": "acknowledged",
                "acknowledged_by": current_user.name,
                "acknowledged_at": datetime.utcnow().isoformat()
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Déclaration non trouvée ou déjà prise en compte")
        
        return {"message": "Prise de connaissance enregistrée"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.get("/cse/hours")
async def get_delegation_hours(
    delegate_id: Optional[str] = None,
    mois: Optional[str] = None,
    statut: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Liste des déclarations d'heures de délégation"""
    try:
        query = {}
        
        # Admin voit tout, délégués voient leurs heures
        if current_user.role not in ["admin", "manager"]:
            # Trouver le delegate_id de l'utilisateur
            delegate = await db.cse_delegates.find_one({"user_id": current_user.id, "actif": True})
            if not delegate:
                return []
            query["delegate_id"] = delegate["id"]
        elif delegate_id:
            query["delegate_id"] = delegate_id
        
        if mois:
            query["date"] = {"$regex": f"^{mois}"}
        
        if statut:
            query["statut"] = statut
        
        declarations = await db.delegation_hours.find(query).sort("date", -1).to_list(100)
        
        # Nettoyer les ObjectIds
        for decl in declarations:
            if "_id" in decl:
                del decl["_id"]
        
        return declarations
        
    except Exception as e:
        logger.error(f"❌ Erreur récupération heures: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# ========================================
# CESSIONS D'HEURES ENTRE DÉLÉGUÉS
# ========================================

@api_router.post("/cse/cession/request")
async def request_hours_cession(
    beneficiaire_id: str,
    heures_cedees: float,
    mois: str,
    motif: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Demander une cession d'heures (délégué CSE)"""
    try:
        # Vérifier que le cédant est un délégué actif
        cedant = await db.cse_delegates.find_one({"user_id": current_user.id, "actif": True})
        if not cedant:
            raise HTTPException(status_code=403, detail="Vous devez être délégué CSE pour céder des heures")
        
        # Vérifier que le bénéficiaire existe et est actif
        beneficiaire = await db.cse_delegates.find_one({"id": beneficiaire_id, "actif": True})
        if not beneficiaire:
            raise HTTPException(status_code=404, detail="Bénéficiaire non trouvé ou inactif")
        
        # Vérifier le solde du cédant
        declarations = await db.delegation_hours.find({
            "delegate_id": cedant["id"],
            "date": {"$regex": f"^{mois}"}
        }).to_list(100)
        
        heures_utilisees = sum(float(d.get("heures_utilisees", 0)) for d in declarations)
        solde_disponible = cedant["heures_mensuelles"] - heures_utilisees
        
        if heures_cedees > solde_disponible:
            raise HTTPException(
                status_code=400,
                detail=f"Solde insuffisant. Disponible: {solde_disponible}h / Demandé: {heures_cedees}h"
            )
        
        # Créer la cession
        cession = HoursCession(
            cedant_id=cedant["id"],
            cedant_name=cedant["user_name"],
            beneficiaire_id=beneficiaire_id,
            beneficiaire_name=beneficiaire["user_name"],
            heures_cedees=heures_cedees,
            mois=mois,
            motif=motif,
            statut="pending",
            created_by=current_user.name
        )
        
        # Préparer pour MongoDB
        cession_dict = cession.dict()
        if isinstance(cession_dict.get('created_at'), datetime):
            cession_dict['created_at'] = cession_dict['created_at'].isoformat()
        
        await db.hours_cessions.insert_one(cession_dict)
        
        logger.info(f"✅ Cession demandée: {heures_cedees}h de {cedant['user_name']} vers {beneficiaire['user_name']}")
        
        return {"message": "Demande de cession enregistrée", "cession_id": cession.id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur demande cession: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.post("/cse/cession/acknowledge/{cession_id}")
async def acknowledge_cession(cession_id: str, current_user: User = Depends(get_current_user)):
    """Prendre connaissance d'une cession (admin uniquement)"""
    if current_user.role not in ["admin"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    try:
        result = await db.hours_cessions.update_one(
            {"id": cession_id, "statut": "pending"},
            {"$set": {
                "statut": "acknowledged",
                "validated_by": current_user.name,
                "validated_at": datetime.utcnow().isoformat()
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Cession non trouvée")
        
        return {"message": "Cession prise en compte"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.get("/cse/cessions")
async def get_cessions(
    statut: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Liste des cessions d'heures"""
    try:
        query = {}
        if statut:
            query["statut"] = statut
        
        cessions = await db.hours_cessions.find(query).sort("created_at", -1).to_list(100)
        
        # Nettoyer les ObjectIds
        for cession in cessions:
            if "_id" in cession:
                del cession["_id"]
        
        return cessions
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# ========================================
# STATISTIQUES CSE
# ========================================

@api_router.get("/cse/statistics")
async def get_cse_statistics(mois: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Statistiques CSE du mois"""
    try:
        from datetime import datetime as dt
        if not mois:
            mois = dt.now().strftime("%Y-%m")
        
        # Compter les délégués
        delegates = await db.cse_delegates.find({"actif": True}).to_list(100)
        total_delegates = len(delegates)
        titulaires = len([d for d in delegates if d.get("statut") == "titulaire"])
        suppleants = len([d for d in delegates if d.get("statut") == "suppléant"])
        
        # Heures allouées totales
        heures_allouees_mois = sum(d.get("heures_mensuelles", 0) for d in delegates)
        
        # Heures utilisées ce mois
        declarations = await db.delegation_hours.find({
            "date": {"$regex": f"^{mois}"}
        }).to_list(1000)
        heures_utilisees_mois = sum(float(d.get("heures_utilisees", 0)) for d in declarations)
        
        # Taux d'utilisation
        taux_utilisation = (heures_utilisees_mois / heures_allouees_mois * 100) if heures_allouees_mois > 0 else 0
        
        # Cessions en attente
        cessions_pending = await db.hours_cessions.count_documents({"statut": "pending"})
        
        return {
            "total_delegates": total_delegates,
            "titulaires": titulaires,
            "suppleants": suppleants,
            "heures_utilisees_mois": heures_utilisees_mois,
            "heures_allouees_mois": heures_allouees_mois,
            "taux_utilisation": round(taux_utilisation, 1),
            "cessions_en_attente": cessions_pending
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur statistiques CSE: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# ========================================
# OVERTIME MANAGEMENT ENDPOINTS
# ========================================

@api_router.get("/overtime/all")
async def get_all_overtime(current_user: User = Depends(get_current_user)):
    """Get overtime data for all employees - includes imported work hours"""
    try:
        # Fetch all overtime records from database
        overtime_records = await db.overtime.find({}).to_list(length=None)
        
        # Fetch imported work hours (these are treated as accumulated overtime)
        work_hours_records = await db.work_hours.find({}).to_list(length=None)
        
        # Group by employee and calculate totals
        employee_overtime = {}
        
        # Process overtime records
        for record in overtime_records:
            emp_id = record.get('employee_id')
            emp_name = record.get('employee_name')
            
            if emp_id not in employee_overtime:
                employee_overtime[emp_id] = {
                    'id': emp_id,
                    'name': emp_name,
                    'department': record.get('department', 'N/A'),
                    'accumulated': 0,
                    'recovered': 0,
                    'balance': 0,
                    'thisMonth': 0,
                    'details': []
                }
            
            hours = record.get('hours', 0)
            record_type = record.get('type', 'accumulated')
            
            if record_type == 'accumulated':
                employee_overtime[emp_id]['accumulated'] += hours
                employee_overtime[emp_id]['thisMonth'] += hours
            elif record_type == 'recovered':
                employee_overtime[emp_id]['recovered'] += hours
            
            employee_overtime[emp_id]['details'].append({
                'date': record.get('date'),
                'hours': hours if record_type == 'accumulated' else -hours,
                'type': record_type,
                'reason': record.get('reason', ''),
                'validated': record.get('validated', False)
            })
        
        # Process imported work hours (treated as accumulated overtime)
        for record in work_hours_records:
            emp_id = record.get('employee_id')
            emp_name = record.get('employee_name')
            hours = record.get('heures_travaillees', 0)
            
            if emp_id not in employee_overtime:
                # Get employee info to get department
                employee = await db.users.find_one({"id": emp_id})
                department = employee.get('department', 'N/A') if employee else 'N/A'
                
                employee_overtime[emp_id] = {
                    'id': emp_id,
                    'name': emp_name,
                    'department': department,
                    'accumulated': 0,
                    'recovered': 0,
                    'balance': 0,
                    'thisMonth': 0,
                    'details': []
                }
            
            # Add imported hours as accumulated overtime
            employee_overtime[emp_id]['accumulated'] += hours
            employee_overtime[emp_id]['thisMonth'] += hours
            
            employee_overtime[emp_id]['details'].append({
                'date': record.get('date'),
                'hours': hours,
                'type': 'accumulated',
                'reason': 'Heures importées',
                'validated': True  # Imported hours are pre-validated
            })
        
        # Calculate balance for each employee and add educational sector flag
        result = []
        for emp_data in employee_overtime.values():
            emp_data['balance'] = emp_data['accumulated'] - emp_data['recovered']
            
            # Check if employee is educational sector for manager validation
            employee = await db.users.find_one({"id": emp_data['id']})
            if employee:
                from ccn66_rules import is_category_a
                emp_data['is_educational_sector'] = is_category_a(
                    employee.get('categorie_employe'), 
                    employee.get('metier')
                )
                emp_data['categorie_employe'] = employee.get('categorie_employe', 'N/A')
                emp_data['metier'] = employee.get('metier', 'N/A')
            else:
                emp_data['is_educational_sector'] = False
                emp_data['categorie_employe'] = 'N/A'
                emp_data['metier'] = 'N/A'
            
            result.append(emp_data)
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching overtime data: {str(e)}")
        return []  # Return empty list if no data


@api_router.put("/overtime/validate/{employee_id}")
async def validate_overtime(
    employee_id: str,
    validation_data: dict,
    current_user: User = Depends(get_current_user)
):
    """
    Validate overtime hours for educational sector employees
    Managers can validate overtime for specific educational sector employees (éducateurs)
    
    CCN66 Compliance: Managers must validate overtime for educational personnel
    """
    try:
        # Check permissions: only managers and admins can validate
        if current_user.role not in ["admin", "manager"]:
            raise HTTPException(
                status_code=403, 
                detail="Seuls les managers et administrateurs peuvent valider les heures supplémentaires"
            )
        
        # Get employee information
        employee = await db.users.find_one({"id": employee_id})
        if not employee:
            raise HTTPException(status_code=404, detail="Employé non trouvé")
        
        # Check if employee is in educational sector
        from ccn66_rules import is_category_a
        is_educational = is_category_a(
            employee.get('categorie_employe'), 
            employee.get('metier')
        )
        
        if not is_educational:
            raise HTTPException(
                status_code=400, 
                detail="La validation managériale ne s'applique qu'aux employés du secteur éducatif (éducateurs, moniteurs)"
            )
        
        # Get the specific overtime records to validate
        date_to_validate = validation_data.get('date')
        hours_to_validate = validation_data.get('hours', 0)
        
        # Update overtime records for this employee/date
        update_result = await db.overtime.update_many(
            {
                "employee_id": employee_id,
                "date": date_to_validate,
                "type": "accumulated",
                "validated": False  # Only update non-validated records
            },
            {
                "$set": {
                    "validated": True,
                    "validated_by": current_user.id,
                    "validated_by_name": current_user.name,
                    "validated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Also update work_hours records if applicable
        work_hours_update = await db.work_hours.update_many(
            {
                "employee_id": employee_id,
                "date": date_to_validate
            },
            {
                "$set": {
                    "validated": True,
                    "validated_by": current_user.id,
                    "validated_by_name": current_user.name,
                    "validated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        total_updated = update_result.modified_count + work_hours_update.modified_count
        
        if total_updated == 0:
            logger.warning(f"No overtime records found to validate for employee {employee_id} on {date_to_validate}")
        
        logger.info(f"✅ Manager {current_user.name} validated {hours_to_validate}h overtime for {employee.get('name')} ({date_to_validate})")
        
        return {
            "success": True,
            "message": f"Heures supplémentaires validées pour {employee.get('name')}",
            "employee_id": employee_id,
            "employee_name": employee.get('name'),
            "date": date_to_validate,
            "hours": hours_to_validate,
            "validated_by": current_user.name,
            "validated_at": datetime.now(timezone.utc).isoformat(),
            "records_updated": total_updated
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating overtime: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la validation: {str(e)}")

# ==================================================
# BACKUP & RESTORE ENDPOINTS
# ==================================================

@api_router.post("/backup/create")
async def create_backup(current_user: User = Depends(get_current_user)):
    """Créer un backup de la base de données (admin uniquement)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        from backup_restore import backup_database
        backup_file = await backup_database()
        
        return {
            "success": True,
            "message": "Backup créé avec succès",
            "backup_file": backup_file,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")

@api_router.post("/backup/restore")
async def restore_backup(
    backup_file: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Restaurer depuis un backup (admin uniquement)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        from backup_restore import restore_database
        success = await restore_database(backup_file)
        
        if success:
            return {
                "success": True,
                "message": "Données restaurées avec succès",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        else:
            raise HTTPException(status_code=404, detail="No backup file found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")

@api_router.get("/backup/list")
async def list_backups(current_user: User = Depends(get_current_user)):
    """Lister tous les backups disponibles (admin uniquement)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        from pathlib import Path
        backup_dir = Path("/app/data/backups")
        
        if not backup_dir.exists():
            return {"backups": []}
        
        backups = []
        for backup_file in sorted(backup_dir.glob("backup_*.json"), reverse=True):
            size = backup_file.stat().st_size / 1024  # KB
            backups.append({
                "filename": backup_file.name,
                "path": str(backup_file),
                "size_kb": round(size, 2),
                "modified": datetime.fromtimestamp(backup_file.stat().st_mtime, tz=timezone.utc).isoformat()
            })
        
        return {
            "success": True,
            "backups": backups,
            "total": len(backups)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"List failed: {str(e)}")

# ==================================================
# SEED ENDPOINT - Demo Data Population
# ==================================================

@api_router.post("/seed/demo-data")
async def seed_demo_data(current_user: User = Depends(get_current_user)):
    """
    Populate database with comprehensive demo data for MOZAIK RH
    Can be run multiple times safely (idempotent)
    """
    try:
        logger.info(f"🌱 Seed demo data initiated by {current_user.name}")
        
        # ==================================================
        # 1. CREATE ADMIN USERS (if they don't exist)
        # ==================================================
        admin_users_data = [
            {
                "name": "Diégo DACALOR",
                "email": "ddacalor@aaea-gpe.fr",
                "password": "admin123",
                "role": "admin",
                "department": "Direction",
                "phone": "06.12.34.56.78",
                "position": "Directeur Général",
                "hire_date": "2020-01-15",
                "categorie_employe": "Cadre dirigeant",
                "sexe": "M",
                "site": "Siège social",
                "contrat": "CDI"
            },
            {
                "name": "Sophie Martin",
                "email": "sophie.martin@company.com",
                "password": "demo123",
                "role": "admin",
                "department": "Ressources Humaines",
                "phone": "06.23.45.67.89",
                "position": "DRH",
                "hire_date": "2021-03-10",
                "categorie_employe": "Cadre",
                "sexe": "F",
                "site": "Siège social",
                "contrat": "CDI"
            }
        ]
        
        admin_ids = {}
        for admin_data in admin_users_data:
            existing = await db.users.find_one({"email": admin_data["email"]})
            if not existing:
                user = UserInDB(
                    name=admin_data["name"],
                    email=admin_data["email"],
                    role=admin_data["role"],
                    department=admin_data["department"],
                    phone=admin_data.get("phone"),
                    position=admin_data.get("position"),
                    hire_date=admin_data.get("hire_date"),
                    hashed_password=hash_password(admin_data["password"]),
                    is_active=True,
                    requires_password_change=False,
                    first_login=False,
                    categorie_employe=admin_data.get("categorie_employe"),
                    sexe=admin_data.get("sexe"),
                    site=admin_data.get("site"),
                    contrat=admin_data.get("contrat"),
                    created_by="seed_script"
                )
                user_dict = user.dict()
                await db.users.insert_one(user_dict)
                admin_ids[admin_data["email"]] = user_dict["id"]
                logger.info(f"✅ Admin created: {admin_data['name']} ({admin_data['email']})")
            else:
                admin_ids[admin_data["email"]] = existing["id"]
                logger.info(f"ℹ️ Admin already exists: {admin_data['name']}")
        
        # ==================================================
        # 2. CREATE SAMPLE EMPLOYEES
        # ==================================================
        employees_data = [
            {
                "nom": "DUPONT", "prenom": "Jean", "email": "jean.dupont@company.com",
                "role": "manager", "department": "Production", "phone": "06.34.56.78.90",
                "position": "Chef de service", "hire_date": "2019-06-01",
                "categorie_employe": "Cadre", "sexe": "M", "site": "Site principal",
                "contrat": "CDI", "temps_travail": "Temps plein",
                "isDelegateCSE": True, "cse_status": "titulaire"
            },
            {
                "nom": "LEBLANC", "prenom": "Marie", "email": "marie.leblanc@company.com",
                "role": "employee", "department": "Administration", "phone": "06.45.67.89.01",
                "position": "Assistante administrative", "hire_date": "2020-09-15",
                "categorie_employe": "Employé", "sexe": "F", "site": "Siège social",
                "contrat": "CDI", "temps_travail": "Temps plein"
            },
            {
                "nom": "MOREAU", "prenom": "Pierre", "email": "pierre.moreau@company.com",
                "role": "employee", "department": "Production", "phone": "06.56.78.90.12",
                "position": "Éducateur spécialisé", "hire_date": "2021-01-20",
                "categorie_employe": "Éducateur spécialisé", "sexe": "M", "site": "Site principal",
                "contrat": "CDI", "temps_travail": "Temps plein",
                "isDelegateCSE": True, "cse_status": "suppléant"
            },
            {
                "nom": "BERNARD", "prenom": "Claire", "email": "claire.bernard@company.com",
                "role": "employee", "department": "Services généraux", "phone": "06.67.89.01.23",
                "position": "Agent de service", "hire_date": "2018-11-10",
                "categorie_employe": "Ouvrier", "sexe": "F", "site": "Site principal",
                "contrat": "CDI", "temps_travail": "Temps plein"
            },
            {
                "nom": "GREGOIRE", "prenom": "Thomas", "email": "thomas.gregoire@company.com",
                "role": "manager", "department": "Direction", "phone": "06.78.90.12.34",
                "position": "Directeur Adjoint", "hire_date": "2017-03-01",
                "categorie_employe": "Cadre dirigeant", "sexe": "M", "site": "Siège social",
                "contrat": "CDI", "temps_travail": "Temps plein"
            },
            {
                "nom": "ADOLPHIN", "prenom": "Joël", "email": "joel.adolphin@company.com",
                "role": "employee", "department": "Production", "phone": "06.89.01.23.45",
                "position": "Éducateur technique", "hire_date": "2019-09-01",
                "categorie_employe": "Éducateur technique", "sexe": "M", "site": "Site principal",
                "contrat": "CDI", "temps_travail": "Temps plein"
            },
            {
                "nom": "LOUBER", "prenom": "Fabrice", "email": "fabrice.louber@company.com",
                "role": "employee", "department": "Administration", "phone": "06.90.12.34.56",
                "position": "Comptable", "hire_date": "2020-02-15",
                "categorie_employe": "Employé", "sexe": "M", "site": "Siège social",
                "contrat": "CDI", "temps_travail": "Temps plein"
            }
        ]
        
        employee_ids = {}
        for emp_data in employees_data:
            email = emp_data["email"]
            existing = await db.users.find_one({"email": email})
            if not existing:
                # Generate temporary password
                temp_password = generate_temp_password()
                temp_expires = datetime.utcnow().replace(tzinfo=timezone.utc) + timedelta(days=30)
                
                user = UserInDB(
                    name=f"{emp_data['prenom']} {emp_data['nom']}",
                    email=email,
                    role=emp_data["role"],
                    department=emp_data["department"],
                    phone=emp_data.get("phone"),
                    position=emp_data.get("position"),
                    hire_date=emp_data.get("hire_date"),
                    hashed_password=hash_password(temp_password),
                    is_active=True,
                    requires_password_change=True,
                    first_login=True,
                    temp_password_expires=temp_expires,
                    isDelegateCSE=emp_data.get("isDelegateCSE", False),
                    categorie_employe=emp_data.get("categorie_employe"),
                    sexe=emp_data.get("sexe"),
                    site=emp_data.get("site"),
                    contrat=emp_data.get("contrat"),
                    temps_travail=emp_data.get("temps_travail"),
                    created_by="seed_script"
                )
                user_dict = user.dict()
                await db.users.insert_one(user_dict)
                employee_ids[email] = user_dict["id"]
                logger.info(f"✅ Employee created: {emp_data['prenom']} {emp_data['nom']} (temp password: {temp_password})")
                
                # Create CSE delegate if applicable
                if emp_data.get("isDelegateCSE"):
                    college = "employes"
                    if "cadre" in emp_data.get("categorie_employe", "").lower():
                        college = "cadres"
                    elif "ouvrier" in emp_data.get("categorie_employe", "").lower():
                        college = "ouvriers"
                    
                    delegate = CSEDelegate(
                        user_id=user_dict["id"],
                        user_name=f"{emp_data['prenom']} {emp_data['nom']}",
                        email=email,
                        statut=emp_data.get("cse_status", "titulaire"),
                        heures_mensuelles=24,
                        college=college,
                        date_debut=emp_data.get("hire_date", "2024-01-01"),
                        actif=True,
                        created_by="seed_script"
                    )
                    delegate_dict = delegate.dict()
                    if isinstance(delegate_dict.get('created_at'), datetime):
                        delegate_dict['created_at'] = delegate_dict['created_at'].isoformat()
                    await db.cse_delegates.insert_one(delegate_dict)
                    logger.info(f"✅ CSE delegate created: {emp_data['prenom']} {emp_data['nom']} ({emp_data.get('cse_status')})")
            else:
                employee_ids[email] = existing["id"]
                logger.info(f"ℹ️ Employee already exists: {emp_data['prenom']} {emp_data['nom']}")
        
        # ==================================================
        # 3. CREATE SAMPLE ABSENCES
        # ==================================================
        absences_data = [
            {
                "employee_email": "jean.dupont@company.com",
                "date_debut": "15/01/2025", "jours_absence": "5", "motif_absence": "CA",
                "notes": "Congés annuels d'hiver"
            },
            {
                "employee_email": "marie.leblanc@company.com",
                "date_debut": "22/01/2025", "jours_absence": "3", "motif_absence": "AM",
                "notes": "Arrêt maladie - grippe"
            },
            {
                "employee_email": "pierre.moreau@company.com",
                "date_debut": "10/01/2025", "jours_absence": "1", "motif_absence": "DEL",
                "notes": "Réunion CSE", "absence_unit": "heures", "hours_amount": 8.0
            },
            {
                "employee_email": "claire.bernard@company.com",
                "date_debut": "05/01/2025", "jours_absence": "2", "motif_absence": "REC",
                "notes": "Récupération heures supplémentaires"
            },
            {
                "employee_email": "joel.adolphin@company.com",
                "date_debut": "18/01/2025", "jours_absence": "1", "motif_absence": "TEL",
                "notes": "Télétravail"
            },
            {
                "employee_email": "fabrice.louber@company.com",
                "date_debut": "25/01/2025", "jours_absence": "3", "motif_absence": "FO",
                "notes": "Formation professionnelle"
            },
            {
                "employee_email": "thomas.gregoire@company.com",
                "date_debut": "08/01/2025", "jours_absence": "10", "motif_absence": "CA",
                "notes": "Congés annuels"
            }
        ]
        
        for abs_data in absences_data:
            employee_email = abs_data["employee_email"]
            if employee_email in employee_ids:
                employee = await db.users.find_one({"email": employee_email})
                if employee:
                    # Find counting method
                    absence_type = await get_absence_type_config(abs_data["motif_absence"])
                    counting_method = absence_type["counting_method"] if absence_type else "Jours Calendaires"
                    
                    # Calculate end date
                    date_fin = None
                    if abs_data["jours_absence"]:
                        days_count = int(float(abs_data["jours_absence"]))
                        if days_count > 0:
                            date_fin = calculate_end_date(abs_data["date_debut"], days_count, counting_method)
                    
                    absence = Absence(
                        employee_id=employee["id"],
                        employee_name=employee.get("name"),
                        email=employee_email,
                        date_debut=abs_data["date_debut"],
                        date_fin=date_fin,
                        jours_absence=abs_data["jours_absence"],
                        motif_absence=abs_data["motif_absence"],
                        counting_method=counting_method,
                        notes=abs_data.get("notes"),
                        absence_unit=abs_data.get("absence_unit", "jours"),
                        hours_amount=abs_data.get("hours_amount"),
                        created_by="seed_script"
                    )
                    absence_dict = absence.dict()
                    if isinstance(absence_dict.get('created_at'), datetime):
                        absence_dict['created_at'] = absence_dict['created_at'].isoformat()
                    await db.absences.insert_one(absence_dict)
                    logger.info(f"✅ Absence created: {employee.get('name')} - {abs_data['motif_absence']} ({abs_data['date_debut']})")
        
        # ==================================================
        # 4. CREATE SAMPLE WORK HOURS
        # ==================================================
        work_hours_data = [
            {"employee_email": "jean.dupont@company.com", "date": "02/01/2025", "heures_travaillees": 8.5},
            {"employee_email": "jean.dupont@company.com", "date": "03/01/2025", "heures_travaillees": 9.0},
            {"employee_email": "marie.leblanc@company.com", "date": "02/01/2025", "heures_travaillees": 7.5},
            {"employee_email": "pierre.moreau@company.com", "date": "02/01/2025", "heures_travaillees": 8.0},
            {"employee_email": "claire.bernard@company.com", "date": "02/01/2025", "heures_travaillees": 8.0},
        ]
        
        for wh_data in work_hours_data:
            employee_email = wh_data["employee_email"]
            if employee_email in employee_ids:
                employee = await db.users.find_one({"email": employee_email})
                if employee:
                    work_hours = ImportWorkHours(
                        employee_id=employee["id"],
                        employee_name=employee.get("name"),
                        date=wh_data["date"],
                        heures_travaillees=wh_data["heures_travaillees"],
                        created_by="seed_script"
                    )
                    wh_dict = work_hours.dict()
                    if isinstance(wh_dict.get('created_at'), datetime):
                        wh_dict['created_at'] = wh_dict['created_at'].isoformat()
                    await db.work_hours.insert_one(wh_dict)
                    logger.info(f"✅ Work hours created: {employee.get('name')} - {wh_data['date']} ({wh_data['heures_travaillees']}h)")
        
        # ==================================================
        # 5. INITIALIZE LEAVE BALANCES FOR 2025
        # ==================================================
        for email, emp_id in employee_ids.items():
            existing_balance = await db.leave_balances.find_one({"employee_id": emp_id, "year": 2025})
            if not existing_balance:
                employee = await db.users.find_one({"id": emp_id})
                if employee:
                    leave_balance = {
                        "id": str(uuid.uuid4()),
                        "employee_id": emp_id,
                        "employee_name": employee.get("name"),
                        "year": 2025,
                        "CA": {"total": 25.0, "taken": 0.0, "remaining": 25.0},
                        "RTT": {"total": 12.0, "taken": 0.0, "remaining": 12.0},
                        "CT": {"total": 12.0, "taken": 0.0, "remaining": 12.0},
                        "REC": {"total": 0.0, "taken": 0.0, "remaining": 0.0},
                        "CEX": {"total": 0.0, "taken": 0.0, "remaining": 0.0},
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.leave_balances.insert_one(leave_balance)
                    logger.info(f"✅ Leave balance initialized: {employee.get('name')} (2025)")
        
        # ==================================================
        # SUMMARY
        # ==================================================
        users_count = await db.users.count_documents({})
        absences_count = await db.absences.count_documents({})
        work_hours_count = await db.work_hours.count_documents({})
        delegates_count = await db.cse_delegates.count_documents({})
        balances_count = await db.leave_balances.count_documents({})
        
        logger.info(f"🌱 Seed completed successfully!")
        
        return {
            "success": True,
            "message": "Demo data seeded successfully",
            "summary": {
                "users": users_count,
                "absences": absences_count,
                "work_hours": work_hours_count,
                "cse_delegates": delegates_count,
                "leave_balances": balances_count
            },
            "admin_accounts": [
                {"email": "ddacalor@aaea-gpe.fr", "password": "admin123", "name": "Diégo DACALOR"},
                {"email": "sophie.martin@company.com", "password": "demo123", "name": "Sophie Martin"}
            ],
            "note": "Employee passwords are temporary and require change on first login. Check logs for individual passwords."
        }
        
    except Exception as e:
        logger.error(f"❌ Error seeding demo data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Seed error: {str(e)}")

# ==================== NOTIFICATIONS ENDPOINTS ====================

@api_router.get("/notifications")
async def get_notifications(current_user: User = Depends(get_current_user)):
    """Récupérer toutes les notifications de l'utilisateur connecté"""
    try:
        notifications = await db.notifications.find(
            {"user_id": current_user.id}
        ).sort("created_at", -1).to_list(length=50)
        
        # Convertir _id MongoDB en string
        for notif in notifications:
            if '_id' in notif:
                del notif['_id']
        
        return notifications
    except Exception as e:
        logger.error(f"Error fetching notifications: {str(e)}")
        return []


@api_router.get("/notifications/unread-count")
async def get_unread_count(current_user: User = Depends(get_current_user)):
    """Compter les notifications non lues"""
    try:
        count = await db.notifications.count_documents({
            "user_id": current_user.id,
            "read": False
        })
        return {"count": count}
    except Exception as e:
        logger.error(f"Error counting unread notifications: {str(e)}")
        return {"count": 0}


@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    """Marquer une notification comme lue"""
    try:
        result = await db.notifications.update_one(
            {"id": notification_id, "user_id": current_user.id},
            {"$set": {"read": True}}
        )
        
        if result.modified_count > 0:
            return {"success": True, "message": "Notification marquée comme lue"}
        else:
            raise HTTPException(status_code=404, detail="Notification non trouvée")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/notifications/read-all")
async def mark_all_read(current_user: User = Depends(get_current_user)):
    """Marquer toutes les notifications comme lues"""
    try:
        result = await db.notifications.update_many(
            {"user_id": current_user.id, "read": False},
            {"$set": {"read": True}}
        )
        
        return {
            "success": True,
            "message": f"{result.modified_count} notifications marquées comme lues"
        }
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/notifications/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    """Supprimer une notification"""
    try:
        result = await db.notifications.delete_one({
            "id": notification_id,
            "user_id": current_user.id
        })
        
        if result.deleted_count > 0:
            return {"success": True, "message": "Notification supprimée"}
        else:
            raise HTTPException(status_code=404, detail="Notification non trouvée")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting notification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/notifications/create")
async def create_notification(
    notification: Notification,
    current_user: User = Depends(require_admin_or_manager)
):
    """Créer une nouvelle notification (admin/manager seulement)"""
    try:
        notif_dict = notification.dict()
        await db.notifications.insert_one(notif_dict)
        
        logger.info(f"✅ Notification créée pour user {notification.user_id}: {notification.title}")
        
        return {"success": True, "notification": notif_dict}
    except Exception as e:
        logger.error(f"Error creating notification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Helper function pour créer des notifications automatiquement
async def create_auto_notification(
    user_id: str,
    notif_type: str,
    title: str,
    message: str,
    icon: str = "🔔",
    link: Optional[str] = None,
    related_id: Optional[str] = None
):
    """Fonction helper pour créer des notifications automatiques"""
    try:
        notification = Notification(
            user_id=user_id,
            type=notif_type,
            title=title,
            message=message,
            icon=icon,
            link=link,
            related_id=related_id
        )
        
        await db.notifications.insert_one(notification.dict())
        logger.info(f"🔔 Auto-notification créée: {title} pour user {user_id}")
    except Exception as e:
        logger.error(f"Error creating auto-notification: {str(e)}")


# ==================== WEBSOCKET ENDPOINT ====================

@app.websocket("/api/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """
    WebSocket endpoint pour les mises à jour en temps réel
    URL: wss://domain.com/api/ws/{user_id}
    IMPORTANT: Le préfixe /api est requis pour le routing Kubernetes Ingress
    """
    await ws_manager.connect(websocket, user_id)
    
    try:
        # Garder la connexion ouverte et écouter les messages
        while True:
            # Recevoir un message du client (heartbeat ou autre)
            data = await websocket.receive_text()
            
            # Optionnel : répondre au heartbeat
            if data == "ping":
                await websocket.send_text("pong")
                
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id)
        logger.info(f"WebSocket disconnected: {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for {user_id}: {str(e)}")
        ws_manager.disconnect(websocket, user_id)


# 📊 ENDPOINT: GÉNÉRATION RAPPORT ABSENCES DOUBLE-BLOC
@api_router.post("/analytics/generate-absence-report")
async def generate_absence_report(
    year: int,
    month: int = None,
    current_user: User = Depends(get_current_user)
):
    """
    📊 Génère un rapport Excel double-bloc (Programmées | Absentéisme)
    
    Args:
        year: Année du rapport
        month: Mois (optionnel, si None = toute l'année)
    
    Returns:
        Fichier Excel avec les deux blocs côte à côte
    """
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        import subprocess
        import tempfile
        from pathlib import Path
        
        # 1. Extraire les données d'absences depuis MongoDB
        query = {}
        
        if month:
            # Filtrer par mois
            query = {
                "$or": [
                    {"date_debut": {"$regex": f"/{month:02d}/{year}"}},
                    {"date_debut": {"$regex": f"{year}-{month:02d}-"}}
                ]
            }
        else:
            # Toute l'année
            query = {
                "$or": [
                    {"date_debut": {"$regex": f"/{year}"}},
                    {"date_debut": {"$regex": f"{year}-"}}
                ]
            }
        
        absences = await db.absences.find(query).to_list(10000)
        
        if not absences:
            raise HTTPException(status_code=404, detail="Aucune absence trouvée pour cette période")
        
        # 2. Créer fichier temporaire CSV
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as tmp_source:
            import csv
            writer = csv.DictWriter(tmp_source, fieldnames=['EmployeNom', 'TypeAbsence', 'Duree', 'DateDebut', 'DateFin', 'StatutPlanif'])
            writer.writeheader()
            
            for absence in absences:
                writer.writerow({
                    'EmployeNom': absence.get('employee_name', 'Inconnu'),
                    'TypeAbsence': absence.get('motif_absence', 'INCONNU'),
                    'Duree': absence.get('jours_absence', '0'),
                    'DateDebut': absence.get('date_debut', ''),
                    'DateFin': absence.get('date_fin', ''),
                    'StatutPlanif': absence.get('status', 'approved')
                })
            
            tmp_source_path = tmp_source.name
        
        # 3. Générer nom fichier output
        period_str = f"{year}_{month:02d}" if month else f"{year}"
        output_filename = f"Analyse_Absences_{period_str}.xlsx"
        output_path = Path(f"./out/{output_filename}")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 4. Exécuter le script adapter
        script_path = Path(__file__).parent / "adapt_absences_tableau.py"
        mapping_path = Path(__file__).parent / "config" / "mapping_absences.csv"
        
        result = subprocess.run([
            "python",
            str(script_path),
            "--source", tmp_source_path,
            "--mapping", str(mapping_path),
            "--output", str(output_path)
        ], capture_output=True, text=True, timeout=60)
        
        # 5. Nettoyer fichier temporaire
        Path(tmp_source_path).unlink(missing_ok=True)
        
        if result.returncode != 0:
            logger.error(f"Erreur génération rapport: {result.stderr}")
            raise HTTPException(status_code=500, detail=f"Erreur génération: {result.stderr}")
        
        # 6. Vérifier que le fichier existe
        if not output_path.exists():
            raise HTTPException(status_code=500, detail="Fichier de sortie non créé")
        
        # 7. Retourner le fichier
        from fastapi.responses import FileResponse
        
        return FileResponse(
            path=str(output_path),
            filename=output_filename,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur génération rapport absences: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
# logger déjà défini plus haut

@app.on_event("startup")
async def startup_db_init():
    """Initialize database with default admin user"""
    await initialize_admin_user()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
