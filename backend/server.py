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
    return {"message": "Hello World"}

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
