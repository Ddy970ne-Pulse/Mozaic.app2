from fastapi import FastAPI, APIRouter, HTTPException, Depends
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
    {"code": "CA", "name": "Congés annuels", "category": "vacation", "type": "Absence Programmée", "counting_method": "Jours Ouvrables", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "CT", "name": "Congés Trimestriels", "category": "vacation", "type": "Absence Programmée", "counting_method": "Jours Ouvrés", "requires_validation": True, "requires_acknowledgment": False},
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

def generate_temp_password(length: int = 12) -> str:
    """Generate a secure temporary password"""
    # Mélange de lettres majuscules, minuscules et chiffres pour lisibilité
    alphabet = string.ascii_uppercase + string.ascii_lowercase + string.digits
    # Éviter les caractères ambigus
    alphabet = alphabet.replace('0', '').replace('O', '').replace('1', '').replace('l', '').replace('I', '')
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def is_temp_password_expired(expires_at: Optional[datetime]) -> bool:
    """Check if temporary password has expired"""
    if not expires_at:
        return False
    return datetime.utcnow() > expires_at

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
    department: str
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
    # Champs additionnels depuis employees
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
    position: Optional[str] = None
    hire_date: Optional[str] = None
    isDelegateCSE: Optional[bool] = False

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[str] = None
    isDelegateCSE: Optional[bool] = None
    is_active: Optional[bool] = None

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
    email: str
    date_naissance: Optional[str] = None
    sexe: Optional[str] = None
    categorie: Optional[str] = None  # Ex: Cadre, Technicien, Ouvrier qualifié
    employe: Optional[str] = None  # Ex: Employé, Agent administratif
    metier: Optional[str] = None
    fonction: Optional[str] = None
    departement: str
    site: Optional[str] = None
    temps_travail: Optional[str] = None
    contrat: Optional[str] = None
    date_debut_contrat: Optional[str] = None
    date_fin_contrat: Optional[str] = None
    notes: Optional[str] = None
    email_cse: Optional[str] = None  # "perso email pro CSE" - indication statut CSE
    is_cse_delegate: bool = False  # Identifié comme délégué CSE (via préfixe NOM)
    cse_status: Optional[str] = None  # "titulaire" ou "suppléant"
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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str

class Absence(BaseModel):
    """Modèle pour les absences stockées en base"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str  # UUID de l'utilisateur
    employee_name: str  # Nom complet pour affichage
    email: str
    date_debut: str
    date_fin: Optional[str] = None  # Calculée automatiquement
    jours_absence: str
    motif_absence: str
    counting_method: Optional[str] = None  # Méthode de décompte
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str

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
        position=user_data.position,
        hire_date=user_data.hire_date,
        isDelegateCSE=user_data.isDelegateCSE,
        hashed_password=hash_password(temp_password),
        requires_password_change=True,
        first_login=True,
        temp_password_expires=temp_expires,
        created_by=current_user.name
    )
    
    await db.users.insert_one(user_in_db.dict())
    
    return TempPasswordResponse(
        temp_password=temp_password,
        expires_at=temp_expires,
        message=f"Utilisateur {user_data.name} créé avec succès. Mot de passe temporaire généré (expire dans 7 jours)."
    )

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_data: UserUpdate, current_user: User = Depends(get_current_user)):
    """Update user (admin or own profile for basic info)"""
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
            
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
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
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Password changed successfully"}

@api_router.post("/users/{user_id}/reset-password")
async def reset_user_password(user_id: str, password_data: PasswordReset, current_user: User = Depends(get_current_user)):
    """Reset user password (admin only - generates new temporary password)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if user exists
    existing_user = await db.users.find_one({"id": user_id})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate new temporary password
    temp_password = generate_temp_password()
    temp_expires = datetime.utcnow().replace(tzinfo=timezone.utc) + timedelta(days=7)
    
    # Update password with temporary settings
    hashed_password = hash_password(temp_password)
    await db.users.update_one(
        {"id": user_id}, 
        {"$set": {
            "hashed_password": hashed_password,
            "requires_password_change": True,
            "temp_password_expires": temp_expires,
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {
        "message": "Temporary password generated successfully",
        "temp_password": temp_password,
        "expires_at": temp_expires
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

# Absence Types endpoints  
@api_router.get("/absence-types", response_model=List[AbsenceType])
async def get_absence_types(current_user: User = Depends(get_current_user)):
    return [AbsenceType(**absence_type) for absence_type in demo_absence_types]

@api_router.get("/absence-types/{code}", response_model=AbsenceType)
async def get_absence_type(code: str, current_user: User = Depends(get_current_user)):
    absence_type = next((a for a in demo_absence_types if a["code"] == code), None)
    if not absence_type:
        raise HTTPException(status_code=404, detail="Absence type not found")
    return AbsenceType(**absence_type)

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
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # In real implementation, update database
    return {
        "message": "Request approved successfully",
        "request_id": request_id,
        "approved_by": current_user.name,
        "approved_date": datetime.utcnow().isoformat()
    }

@api_router.put("/absence-requests/{request_id}/reject", response_model=dict)
async def reject_absence_request(request_id: str, rejection_data: dict, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # In real implementation, update database
    return {
        "message": "Request rejected successfully",
        "request_id": request_id,
        "rejected_by": current_user.name,
        "rejected_date": datetime.utcnow().isoformat(),
        "rejection_reason": rejection_data.get("reason", "")
    }

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
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        "summary": {
            "totalAbsences": 1542,
            "delegationHours": 87,  # DEL coded absences
            "personalAbsences": 1455,  # Non-DEL absences
            "averagePerEmployee": 8.5,
            "delegationRate": 5.6,  # % of absences that are DEL
            "comparisonLastYear": "+3.2%"
        },
        "byCategory": [
            {"code": "DEL", "name": "Délégation CSE", "count": 87, "percentage": 5.6, "color": "bg-indigo-600", "justified": True},
            {"code": "CP", "name": "Congés payés", "count": 654, "percentage": 42.4, "color": "bg-blue-500", "justified": True},
            {"code": "AM", "name": "Arrêt maladie", "count": 245, "percentage": 15.9, "color": "bg-red-500", "justified": False},
            {"code": "RTT", "name": "RTT/Récupération", "count": 198, "percentage": 12.8, "color": "bg-green-500", "justified": True},
            {"code": "FO", "name": "Formation", "count": 156, "percentage": 10.1, "color": "bg-purple-500", "justified": True},
            {"code": "AT", "name": "Accident travail", "count": 89, "percentage": 5.8, "color": "bg-red-600", "justified": False},
            {"code": "MAT", "name": "Congé maternité", "count": 45, "percentage": 2.9, "color": "bg-pink-500", "justified": True},
            {"code": "FAM", "name": "Événement familial", "count": 34, "percentage": 2.2, "color": "bg-purple-300", "justified": True},
            {"code": "NAUT", "name": "Absence non autorisée", "count": 23, "percentage": 1.5, "color": "bg-red-700", "justified": False},
            {"code": "Autres", "name": "Autres motifs", "count": 11, "percentage": 0.7, "color": "bg-gray-500", "justified": False}
        ],
        "monthlyTrend": [
            {"month": "Jan", "del": 8, "personal": 125, "total": 133},
            {"month": "Fév", "del": 6, "personal": 118, "total": 124},
            {"month": "Mar", "del": 9, "personal": 142, "total": 151},
            {"month": "Avr", "del": 7, "personal": 139, "total": 146},
            {"month": "Mai", "del": 5, "personal": 156, "total": 161},
            {"month": "Juin", "del": 8, "personal": 178, "total": 186},
            {"month": "Juil", "del": 4, "personal": 195, "total": 199},
            {"month": "Août", "del": 3, "personal": 218, "total": 221},
            {"month": "Sep", "del": 9, "personal": 128, "total": 137},
            {"month": "Oct", "del": 8, "personal": 145, "total": 153},
            {"month": "Nov", "del": 10, "personal": 134, "total": 144},
            {"month": "Déc", "del": 10, "personal": 117, "total": 127}
        ],
        "departmentBreakdown": [
            {"department": "Direction", "del": 15, "personal": 45, "total": 60, "delRate": 25.0},
            {"department": "Éducatif", "del": 25, "personal": 198, "total": 223, "delRate": 11.2},
            {"department": "Administratif", "del": 12, "personal": 156, "total": 168, "delRate": 7.1},
            {"department": "Commercial", "del": 18, "personal": 234, "total": 252, "delRate": 7.1},
            {"department": "Production", "del": 8, "personal": 298, "total": 306, "delRate": 2.6},
            {"department": "ASI", "del": 5, "personal": 89, "total": 94, "delRate": 5.3},
            {"department": "Technique", "del": 4, "personal": 165, "total": 169, "delRate": 2.4}
        ]
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

@api_router.post("/import/reset-demo")
async def reset_demo_accounts(current_user: User = Depends(require_admin_access)):
    """Reset system: Clear all data and keep only current admin"""
    try:
        # Clear all collections except current admin user
        await db.employees.delete_many({})
        await db.absences.delete_many({})
        await db.work_hours.delete_many({})
        
        # Keep only current admin user, remove all others
        await db.users.delete_many({"id": {"$ne": current_user.id}})
        
        return {
            "success": True,
            "message": "System reset completed. All demo data cleared.",
            "remaining_admin": {
                "name": current_user.name,
                "email": current_user.email,
                "role": current_user.role
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting system: {str(e)}")

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
    logger.info(f"📊 Nombre de lignes reçues: {len(request.data)}")
    if len(request.data) > 0:
        logger.info(f"📋 Colonnes de la première ligne: {list(request.data[0].keys())}")
        logger.info(f"📝 Données de la première ligne: {request.data[0]}")
    
    try:
        for i, employee_data in enumerate(request.data):
            try:
                email = employee_data.get('email', '').lower().strip()
                nom_original = employee_data.get('nom', '').strip()
                prenom = employee_data.get('prenom', '').strip()
                email_cse = employee_data.get('email_cse', '').strip()
                
                # Détecter si c'est un délégué CSE (préfixe dans le NOM)
                is_cse_delegate = False
                cse_status = None
                nom = nom_original
                
                if nom_original.lower().startswith('délégué '):
                    is_cse_delegate = True
                    cse_status = 'titulaire'
                    nom = nom_original[8:].strip()  # Enlever "Délégué "
                    logger.info(f"🏛️ Ligne {i+1}: Délégué CSE TITULAIRE détecté - {nom}")
                elif nom_original.lower().startswith('suppléant '):
                    is_cse_delegate = True
                    cse_status = 'suppléant'
                    nom = nom_original[10:].strip()  # Enlever "Suppléant "
                    logger.info(f"🏛️ Ligne {i+1}: Délégué CSE SUPPLÉANT détecté - {nom}")
                
                logger.info(f"🔍 Ligne {i+1}: email='{email}', nom='{nom}', prenom='{prenom}', CSE={is_cse_delegate}")
                
                if not email or not nom or not prenom:
                    error_msg = f"Email={email!r}, nom={nom!r}, prénom={prenom!r} sont obligatoires"
                    logger.warning(f"❌ Ligne {i+1}: {error_msg}")
                    errors.append({
                        "row": i + 1,
                        "error": error_msg,
                        "data_received": employee_data
                    })
                    continue
                
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
                    categorie=employee_data.get('categorie'),
                    employe=employee_data.get('employe'),
                    metier=employee_data.get('metier'),
                    fonction=employee_data.get('fonction'),
                    departement=employee_data.get('departement', ''),
                    site=employee_data.get('site'),
                    temps_travail=employee_data.get('temps_travail'),
                    contrat=employee_data.get('contrat'),
                    date_debut_contrat=employee_data.get('date_debut_contrat'),
                    date_fin_contrat=employee_data.get('date_fin_contrat'),
                    notes=employee_data.get('notes'),
                    email_cse=email_cse,
                    is_cse_delegate=is_cse_delegate,
                    cse_status=cse_status,
                    created_by=current_user.name
                )
                
                # Generate temporary password
                temp_password = generate_temp_password()
                temp_expires = datetime.utcnow().replace(tzinfo=timezone.utc) + timedelta(days=7)
                
                # Create user account automatically with ALL employee data
                user_account = UserInDB(
                    name=f"{prenom} {nom}",
                    email=email,
                    role="employee",  # Default role
                    department=employee_data.get('departement', 'Non spécifié'),
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
                        # Déterminer le collège selon la catégorie
                        college = "employes"  # Default
                        categorie = employee_data.get('categorie_employe', '').lower()
                        if 'cadre' in categorie:
                            college = "cadres"
                        elif 'ouvrier' in categorie or 'agent' in categorie:
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
                        
                        logger.info(f"✅ Délégué CSE créé: {prenom} {nom} ({cse_status}, {college})")
                        
                        if email_cse:
                            logger.info(f"📧 Email CSE: {email_cse}")
                    
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
                absence_type = next((at for at in demo_absence_types if at["code"] == motif_absence), None)
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
    """Import work hours data from Excel"""
    errors = []
    warnings = []
    successful_imports = 0
    
    try:
        for i, work_data in enumerate(request.data):
            try:
                # Find employee by name to get ID
                employee_name = work_data.get('employee_name', '')
                employee = await db.employees.find_one({"$or": [
                    {"nom": {"$regex": employee_name, "$options": "i"}},
                    {"prenom": {"$regex": employee_name, "$options": "i"}}
                ]})
                
                if not employee:
                    errors.append({
                        "row": str(i + 1),
                        "error": f"Employé non trouvé: {employee_name}"
                    })
                    continue
                
                work_hours = ImportWorkHours(
                    employee_id=employee["id"],
                    employee_name=employee_name,
                    date=work_data.get('date', ''),
                    heures_travaillees=float(work_data.get('heures_travaillees', 0)),
                    notes=work_data.get('notes'),
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
        raise HTTPException(status_code=500, detail=f"Error getting statistics: {str(e)}")

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

@api_router.delete("/absences/{absence_id}")
async def delete_absence(absence_id: str, current_user: User = Depends(get_current_user)):
    """Delete an absence (admin only)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        result = await db.absences.delete_one({"id": absence_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Absence not found")
        
        return {"message": "Absence deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting absence: {str(e)}")

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
        # Marquer comme inactif plutôt que supprimer
        result = await db.cse_delegates.update_one(
            {"id": delegate_id},
            {"$set": {"actif": False, "updated_at": datetime.utcnow().isoformat()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Délégué non trouvé")
        
        return {"message": "Délégué désactivé avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
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
    """Get overtime data for all employees"""
    try:
        # Fetch all overtime records from database
        overtime_records = await db.overtime.find({}).to_list(length=None)
        
        # Group by employee and calculate totals
        employee_overtime = {}
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
        
        # Calculate balance for each employee
        result = []
        for emp_data in employee_overtime.values():
            emp_data['balance'] = emp_data['accumulated'] - emp_data['recovered']
            result.append(emp_data)
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching overtime data: {str(e)}")
        return []  # Return empty list if no data

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
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db_init():
    """Initialize database with default admin user"""
    await initialize_admin_user()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
