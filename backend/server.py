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
from datetime import datetime, date
import jwt
import bcrypt


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
    position: Optional[str] = None
    hire_date: Optional[str] = None
    isDelegateCSE: Optional[bool] = False
    is_active: bool = True
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
    categorie_employe: Optional[str] = None
    metier: Optional[str] = None
    fonction: Optional[str] = None
    departement: str
    site: Optional[str] = None
    temps_travail: Optional[str] = None
    contrat: Optional[str] = None
    date_debut_contrat: Optional[str] = None
    date_fin_contrat: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str

class ImportAbsence(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    employee_name: str
    date_debut: str
    jours_absence: str
    motif_absence: str
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
    """Authenticate user against MongoDB"""
    email = login_request.email.lower().strip()
    password = login_request.password
    
    # Find user in MongoDB
    user_data = await db.users.find_one({"email": email})
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if user is active
    if not user_data.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is inactive")
    
    # Verify password
    if not verify_password(password, user_data["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create token
    token = create_access_token(user_data["id"], user_data["email"], user_data["role"])
    
    # Return user info and token (without password hash)
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
    return [User(**{k: v for k, v in user.items() if k != "hashed_password"}) for user in users]

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Get specific user (admin/manager or own profile)"""
    if current_user.role not in ["admin", "manager"] and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(**{k: v for k, v in user.items() if k != "hashed_password"})

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    """Create new user (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email.lower().strip()})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user with hashed password
    user_in_db = UserInDB(
        name=user_data.name,
        email=user_data.email.lower().strip(),
        role=user_data.role,
        department=user_data.department,
        phone=user_data.phone,
        position=user_data.position,
        hire_date=user_data.hire_date,
        isDelegateCSE=user_data.isDelegateCSE,
        hashed_password=hash_password(user_data.password),
        created_by=current_user.name
    )
    
    await db.users.insert_one(user_in_db.dict())
    
    # Return user without password hash
    return User(**{k: v for k, v in user_in_db.dict().items() if k != "hashed_password"})

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

@api_router.post("/users/{user_id}/reset-password")
async def reset_user_password(user_id: str, password_data: PasswordReset, current_user: User = Depends(get_current_user)):
    """Reset user password (admin or own password)"""
    # Check if user exists
    existing_user = await db.users.find_one({"id": user_id})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Permission checks
    is_own_password = current_user.id == user_id
    is_admin = current_user.role == "admin"
    
    if not is_admin and not is_own_password:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Update password
    hashed_password = hash_password(password_data.new_password)
    await db.users.update_one(
        {"id": user_id}, 
        {"$set": {
            "hashed_password": hashed_password, 
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Password reset successfully"}

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
    # Mock usage history - in real implementation, fetch from database
    mock_usage = [
        {
            "id": "1",
            "delegateId": "1", 
            "delegateName": "Marie Leblanc",
            "date": "2024-01-15",
            "hours": 2.5,
            "activity": "Réunion CSE",
            "description": "Réunion mensuelle du comité social et économique",
            "status": "approved",
            "approvedBy": "Sophie Martin",
            "approvedDate": "2024-01-16"
        },
        {
            "id": "2", 
            "delegateId": "2",
            "delegateName": "Pierre Moreau", 
            "date": "2024-01-18",
            "hours": 2.5,
            "activity": "AM - Arrêt maladie",
            "description": "Prise de connaissance de l'absence pour maladie",
            "status": "acknowledged",
            "approvedBy": "Sophie Martin",
            "approvedDate": "2024-01-18",
            "requiresAcknowledgment": True
        }
    ]
    
    # Filter based on user role
    if current_user.role in ["admin", "manager"]:
        return mock_usage
    else:
        return [u for u in mock_usage if u["delegateName"] == current_user.name]

@api_router.get("/delegation/cessions", response_model=List[CessionRecord])
async def get_cession_history(current_user: User = Depends(get_current_user)):
    # Mock cession data
    mock_cessions = [
        {
            "id": "1",
            "fromDelegateId": "2", 
            "fromDelegateName": "Pierre Moreau",
            "fromType": "CSE",
            "toDelegateId": "1",
            "toDelegateName": "Marie Leblanc", 
            "toType": "CSE",
            "hours": 3.0,
            "date": "2024-01-10",
            "reason": "Négociation urgente accord télétravail - expertise technique requise",
            "status": "approved",
            "approvedBy": "Sophie Martin",
            "approvedDate": "2024-01-10",
            "legalBasis": "Art. L2315-7 Code du Travail - Cession entre représentants"
        }
    ]
    
    return [CessionRecord(**c) for c in mock_cessions]

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
    # Mock absence requests data
    mock_requests = [
        {
            "id": "1",
            "employee": "Marie Leblanc",
            "department": "Commercial",
            "type": "RTT",
            "startDate": "2024-02-15",
            "endDate": "2024-02-15",
            "duration": "1 jour",
            "reason": "Rendez-vous médical",
            "submittedDate": "2024-01-10",
            "status": "pending"
        },
        {
            "id": "2",
            "employee": "Pierre Moreau",
            "department": "Production",
            "type": "AM",
            "startDate": "2024-02-20",
            "endDate": "2024-02-23",
            "duration": "4 jours",
            "reason": "Grippe saisonnière",
            "submittedDate": "2024-01-08",
            "status": "acknowledged",
            "acknowledgedBy": "Sophie Martin",
            "acknowledgedDate": "2024-01-08",
            "requiresAcknowledgment": True
        }
    ]
    
    # Filter based on user role
    if current_user.role in ["admin", "manager"]:
        return mock_requests
    else:
        return [r for r in mock_requests if r["employee"] == current_user.name]

@api_router.post("/absence-requests", response_model=AbsenceRequest)
async def create_absence_request(request_data: dict, current_user: User = Depends(get_current_user)):
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
    
    # In real implementation, save to database
    # await db.absence_requests.insert_one(absence_request.dict())
    
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

# User management endpoints
@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    users = []
    for email, user_data in demo_users.items():
        users.append(User(
            id=user_data["id"],
            name=user_data["name"], 
            email=user_data["email"],
            role=user_data["role"],
            department=user_data["department"],
            isDelegateCSE=user_data["isDelegateCSE"]
        ))
    return users

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str, current_user: User = Depends(get_current_user)):
    # Users can access their own data, admins/managers can access all
    if current_user.role not in ["admin", "manager"] and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    user_data = next((u for u in demo_users.values() if u["id"] == user_id), None)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(
        id=user_data["id"],
        name=user_data["name"],
        email=user_data["email"],
        role=user_data["role"], 
        department=user_data["department"],
        isDelegateCSE=user_data["isDelegateCSE"]
    )

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
    # Données mockées avec les catégories CCN66
    mock_employees = [
        {
            "id": "1",
            "name": "Sophie Martin",
            "email": "sophie.martin@company.com",
            "category": "management",
            "department": "Direction",
            "currentYearOnCallDays": 25,
            "phone": "06.12.34.56.78",
            "emergencyContact": "06.87.65.43.21",
            "lastOnCallDate": "2024-12-15"
        },
        {
            "id": "2",
            "name": "Jean Dupont",
            "email": "jean.dupont@company.com",
            "category": "administrative",
            "department": "Administration",
            "currentYearOnCallDays": 18,
            "phone": "06.23.45.67.89",
            "emergencyContact": "06.98.76.54.32",
            "lastOnCallDate": "2024-12-08"
        },
        {
            "id": "3",
            "name": "Marie Leblanc",
            "email": "marie.leblanc@company.com",
            "category": "specialized_educators",
            "department": "Éducation",
            "currentYearOnCallDays": 32,
            "phone": "06.34.56.78.90",
            "emergencyContact": "06.09.87.65.43",
            "lastOnCallDate": "2024-12-22"
        },
        {
            "id": "4",
            "name": "Pierre Moreau",
            "email": "pierre.moreau@company.com",
            "category": "technical_educators",
            "department": "Technique",
            "currentYearOnCallDays": 15,
            "phone": "06.45.67.89.01",
            "emergencyContact": "06.10.98.76.54",
            "lastOnCallDate": "2024-11-30"
        },
        {
            "id": "5",
            "name": "Claire Dubois",
            "email": "claire.dubois@company.com",
            "category": "administrative",
            "department": "Comptabilité",
            "currentYearOnCallDays": 28,
            "phone": "06.56.78.90.12",
            "emergencyContact": "06.21.09.87.65",
            "lastOnCallDate": "2024-12-10"
        }
    ]
    return [OnCallEmployee(**emp) for emp in mock_employees]

@api_router.get("/on-call/assignments", response_model=List[OnCallAssignment])
async def get_on_call_assignments(
    month: Optional[int] = None, 
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """Récupérer les assignations d'astreinte pour une période donnée"""
    # Données mockées d'assignations d'astreintes
    mock_assignments = [
        {
            "id": "1",
            "employeeId": "1",
            "employeeName": "Sophie Martin",
            "startDate": "2025-01-05",
            "endDate": "2025-01-06",
            "type": "weekend",
            "status": "confirmed",
            "assignedBy": "Direction",
            "assignedAt": "2024-12-20T10:00:00Z",
            "notes": "Astreinte week-end standard"
        },
        {
            "id": "2",
            "employeeId": "2",
            "employeeName": "Jean Dupont",
            "startDate": "2025-01-12",
            "endDate": "2025-01-13",
            "type": "weekend",
            "status": "confirmed",
            "assignedBy": "RH",
            "assignedAt": "2024-12-18T14:30:00Z",
            "notes": ""
        },
        {
            "id": "3",
            "employeeId": "3",
            "employeeName": "Marie Leblanc",
            "startDate": "2025-01-19",
            "endDate": "2025-01-19",
            "type": "single",
            "status": "confirmed",
            "assignedBy": "Direction",
            "assignedAt": "2024-12-15T09:15:00Z",
            "notes": "Astreinte exceptionnelle"
        },
        {
            "id": "4",
            "employeeId": "4",
            "employeeName": "Pierre Moreau",
            "startDate": "2025-01-25",
            "endDate": "2025-01-26",
            "type": "weekend",
            "status": "pending",
            "assignedBy": "RH",
            "assignedAt": "2024-12-22T16:45:00Z",
            "notes": "En attente de confirmation"
        }
    ]
    
    assignments = [OnCallAssignment(**assignment) for assignment in mock_assignments]
    
    # Filtrer par mois/année si spécifiés
    if month is not None and year is not None:
        filtered_assignments = []
        for assignment in assignments:
            assignment_date = datetime.fromisoformat(assignment.startDate.replace('Z', '+00:00'))
            if assignment_date.month == month and assignment_date.year == year:
                filtered_assignments.append(assignment)
        return filtered_assignments
    
    return assignments

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
    
    # Récupérer les infos de l'employé (mockées)
    employee_data = {
        "1": {"category": "management", "currentDays": 25, "name": "Sophie Martin"},
        "2": {"category": "administrative", "currentDays": 18, "name": "Jean Dupont"},
        "3": {"category": "specialized_educators", "currentDays": 32, "name": "Marie Leblanc"},
        "4": {"category": "technical_educators", "currentDays": 15, "name": "Pierre Moreau"},
        "5": {"category": "administrative", "currentDays": 28, "name": "Claire Dubois"}
    }
    
    employee = employee_data.get(validation.employeeId)
    if not employee:
        return OnCallValidationResponse(
            isValid=False,
            errors=["Employé non trouvé"]
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

@api_router.post("/import/employees", response_model=ImportResult)
async def import_employees(
    request: ImportDataRequest,
    current_user: User = Depends(require_admin_access)
):
    """Import employee data from Excel"""
    errors = []
    warnings = []
    successful_imports = 0
    
    try:
        for i, employee_data in enumerate(request.data):
            try:
                # Create employee object
                employee = ImportEmployee(
                    nom=employee_data.get('nom', ''),
                    prenom=employee_data.get('prenom', ''),
                    email=employee_data.get('email', ''),
                    date_naissance=employee_data.get('date_naissance'),
                    sexe=employee_data.get('sexe'),
                    categorie_employe=employee_data.get('categorie_employe'),
                    metier=employee_data.get('metier'),
                    fonction=employee_data.get('fonction'),
                    departement=employee_data.get('departement', ''),
                    site=employee_data.get('site'),
                    temps_travail=employee_data.get('temps_travail'),
                    contrat=employee_data.get('contrat'),
                    date_debut_contrat=employee_data.get('date_debut_contrat'),
                    date_fin_contrat=employee_data.get('date_fin_contrat'),
                    notes=employee_data.get('notes'),
                    created_by=current_user.name
                )
                
                # Store in MongoDB
                await db.employees.insert_one(employee.dict())
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
            data_type="employees"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import error: {str(e)}")

@api_router.post("/import/absences", response_model=ImportResult)
async def import_absences(
    request: ImportDataRequest,
    current_user: User = Depends(require_admin_access)
):
    """Import absence data from Excel"""
    errors = []
    warnings = []
    successful_imports = 0
    
    try:
        for i, absence_data in enumerate(request.data):
            try:
                # Find employee by name to get ID
                employee_name = absence_data.get('employee_name', '')
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
                
                absence = ImportAbsence(
                    employee_id=employee["id"],
                    employee_name=employee_name,
                    date_debut=absence_data.get('date_debut', ''),
                    jours_absence=absence_data.get('jours_absence', ''),
                    motif_absence=absence_data.get('motif_absence', ''),
                    created_by=current_user.name
                )
                
                # Store in MongoDB
                await db.absences.insert_one(absence.dict())
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
            data_type="absences"
        )
        
    except Exception as e:
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
