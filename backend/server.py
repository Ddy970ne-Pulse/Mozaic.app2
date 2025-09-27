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

# Demo Data
demo_users = {
    "admin@company.com": {
        "id": "1",
        "name": "Sophie Martin",
        "email": "admin@company.com", 
        "password": "demo123",
        "role": "admin",
        "department": "Direction",
        "isDelegateCSE": False
    },
    "manager@company.com": {
        "id": "2", 
        "name": "Jean Dupont",
        "email": "manager@company.com",
        "password": "demo123", 
        "role": "manager",
        "department": "IT",
        "isDelegateCSE": False
    },
    "marie.leblanc@company.com": {
        "id": "3",
        "name": "Marie Leblanc", 
        "email": "marie.leblanc@company.com",
        "password": "demo123",
        "role": "employee",
        "department": "Commercial", 
        "isDelegateCSE": True
    },
    "pierre.moreau@company.com": {
        "id": "4",
        "name": "Pierre Moreau",
        "email": "pierre.moreau@company.com", 
        "password": "demo123",
        "role": "employee",
        "department": "Production",
        "isDelegateCSE": True
    }
}

demo_delegates = [
    {
        "id": "1",
        "employeeId": "3",
        "name": "Marie Leblanc",
        "department": "Commercial",
        "type": "CSE",
        "baseMonthlyHours": 15,
        "reportedHours": 2.0,
        "receivedHours": 0.0,
        "cededHours": 0.0,
        "cededFromBase": 0.0,
        "cededFromReported": 0.0,
        "usedFromReceived": 0.0,
        "usedFromReported": 2.0,
        "usedFromBase": 5.5,
        "totalUsed": 7.5,
        "availableHours": 9.5,
        "startDate": "2024-01-01",
        "endDate": "2024-12-31", 
        "status": "active",
        "lastActivity": "2024-01-15"
    },
    {
        "id": "2",
        "employeeId": "4",
        "name": "Pierre Moreau",
        "department": "Production", 
        "type": "CSE",
        "baseMonthlyHours": 15,
        "reportedHours": 0.0,
        "receivedHours": 0.0,
        "cededHours": 3.0,
        "cededFromBase": 3.0,
        "cededFromReported": 0.0,
        "usedFromReceived": 0.0,
        "usedFromReported": 0.0,
        "usedFromBase": 3.5,
        "totalUsed": 3.5,
        "availableHours": 8.5,
        "startDate": "2024-01-01",
        "endDate": "2024-12-31",
        "status": "active", 
        "lastActivity": "2024-01-18"
    }
]

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

# Authentication helper functions
def create_access_token(user_id: str, email: str, role: str):
    payload = {
        "user_id": user_id,
        "email": email, 
        "role": role,
        "exp": datetime.utcnow().timestamp() + (24 * 3600)  # 24 hours
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_email = payload.get("email")
        if user_email and user_email in demo_users:
            user_data = demo_users[user_email]
            return User(
                id=user_data["id"],
                name=user_data["name"],
                email=user_data["email"],
                role=user_data["role"], 
                department=user_data["department"],
                isDelegateCSE=user_data["isDelegateCSE"]
            )
    except:
        pass
    raise HTTPException(status_code=401, detail="Invalid authentication credentials")


# Security
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')

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
    isDelegateCSE: Optional[bool] = False
    
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
    email = login_request.email
    password = login_request.password
    
    if email not in demo_users:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_data = demo_users[email]
    if password != user_data["password"]:  # In production, use proper password hashing
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create token
    token = create_access_token(user_data["id"], user_data["email"], user_data["role"])
    
    # Return user info and token
    user = User(
        id=user_data["id"],
        name=user_data["name"],
        email=user_data["email"], 
        role=user_data["role"],
        department=user_data["department"],
        isDelegateCSE=user_data["isDelegateCSE"]
    )
    
    return LoginResponse(token=token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Delegation Hours endpoints
@api_router.get("/delegation/delegates", response_model=List[Delegate])
async def get_delegates(current_user: User = Depends(get_current_user)):
    # Admin and managers can see all delegates, employees only see their own
    if current_user.role in ["admin", "manager"]:
        return [Delegate(**delegate) for delegate in demo_delegates]
    else:
        # Return only current user's delegation if they have one
        user_delegate = next((d for d in demo_delegates if d["name"] == current_user.name), None)
        return [Delegate(**user_delegate)] if user_delegate else []

@api_router.get("/delegation/delegates/{delegate_id}", response_model=Delegate) 
async def get_delegate(delegate_id: str, current_user: User = Depends(get_current_user)):
    delegate_data = next((d for d in demo_delegates if d["id"] == delegate_id), None)
    if not delegate_data:
        raise HTTPException(status_code=404, detail="Delegate not found")
    
    # Check permissions
    if current_user.role not in ["admin", "manager"] and delegate_data["name"] != current_user.name:
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

# HR Configuration endpoints
@api_router.get("/hr-config/departments")
async def get_departments(current_user: User = Depends(get_current_user)):
    return {
        "departments": ["Direction", "Éducatif", "Administratif", "Comptable", "ASI"]
    }

@api_router.get("/hr-config/sites") 
async def get_sites(current_user: User = Depends(get_current_user)):
    return {
        "sites": ["Siège", "Pôle Éducatif", "Menuiserie 44", "Voiles 44", "Garage 44", "Alpinia 44", "Ferme 44", "Restaurant 44"]
    }

@api_router.get("/hr-config/contracts")
async def get_contract_types(current_user: User = Depends(get_current_user)):
    return {
        "contracts": ["CDI - Non Cadre", "CDD - Non Cadre", "CDI - Cadre", "CDD - Cadre", "Stagiaire", "Apprenti(e)"]
    }

@api_router.get("/hr-config/employee-categories")
async def get_employee_categories(current_user: User = Depends(get_current_user)):
    return {
        "categories": ["Cadre Supérieur", "Cadre", "Employé Qualifié", "Technicien", "Ouvrier qualifié", "Ouvrier non qualifié", "Agent administratif", "Personnel ASI"]
    }

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
