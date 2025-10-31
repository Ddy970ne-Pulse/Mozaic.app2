"""
API On-Call Schedule Management
Gestion des plannings d'astreintes pour MOZAIK RH
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime, date
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import uuid
import logging
import os

logger = logging.getLogger(__name__)
security = HTTPBearer()

router = APIRouter(prefix="/api/on-call", tags=["on-call"])


# ========================
# Database Dependency
# ========================

async def get_database() -> AsyncIOMotorDatabase:
    """Get database connection"""
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    return db


# ========================
# Pydantic Models
# ========================

class OnCallScheduleBase(BaseModel):
    """Base model for on-call schedule"""
    employee_id: str = Field(..., description="UUID of employee assigned to on-call")
    employee_name: str = Field(..., min_length=1, max_length=200, description="Full name of employee")
    date: str = Field(..., description="Date in ISO format (YYYY-MM-DD or ISO datetime)")
    type: str = Field(..., description="Type of on-call: 'Astreinte semaine' or 'Astreinte jour'")
    notes: Optional[str] = Field(default="", max_length=500, description="Optional notes")
    
    @field_validator('type')
    @classmethod
    def validate_type(cls, v):
        """Validate on-call type"""
        allowed = ['Astreinte semaine', 'Astreinte jour', 'semaine', 'jour']
        if v not in allowed:
            # Auto-correct if possible
            if 'semaine' in v.lower():
                return 'Astreinte semaine'
            elif 'jour' in v.lower():
                return 'Astreinte jour'
            raise ValueError(f"Type must be one of {allowed}")
        # Normalize types
        if v == 'semaine':
            return 'Astreinte semaine'
        elif v == 'jour':
            return 'Astreinte jour'
        return v
    
    @field_validator('date')
    @classmethod
    def validate_date(cls, v):
        """Validate and normalize date format"""
        if not v:
            raise ValueError("Date is required")
        
        # Try parsing ISO datetime format
        try:
            dt = datetime.fromisoformat(v.replace('Z', '+00:00'))
            # Return as YYYY-MM-DD format for consistency
            return dt.strftime('%Y-%m-%d')
        except:
            pass
        
        # Try parsing YYYY-MM-DD format
        try:
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except:
            raise ValueError("Date must be in ISO format (YYYY-MM-DD) or ISO datetime")


class OnCallScheduleCreate(OnCallScheduleBase):
    """Model for creating a new on-call schedule"""
    pass


class OnCallScheduleResponse(OnCallScheduleBase):
    """Model for on-call schedule response"""
    id: str = Field(..., description="Unique identifier")
    created_at: str = Field(..., description="Creation timestamp")
    created_by: str = Field(..., description="User who created this schedule")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "employee_id": "123e4567-e89b-12d3-a456-426614174000",
                "employee_name": "Jean Dupont",
                "date": "2025-01-15",
                "type": "Astreinte semaine",
                "notes": "Astreinte de garde",
                "created_at": "2025-01-10T10:00:00",
                "created_by": "admin@example.com"
            }
        }


class OnCallBulkCreate(BaseModel):
    """Model for creating multiple on-call schedules at once"""
    schedules: List[OnCallScheduleCreate] = Field(..., description="List of schedules to create")


# ========================
# Helper Functions
# ========================

async def get_current_user_email(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Extract user email from JWT token"""
    import jwt
    import os
    
    try:
        token = credentials.credentials
        secret_key = os.environ.get('SECRET_KEY')
        if not secret_key:
            raise HTTPException(status_code=500, detail="SECRET_KEY not configured")
        
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token: email not found")
        return email
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def prepare_for_mongo(data: dict) -> dict:
    """Prepare data for MongoDB storage"""
    result = data.copy()
    # Dates are already strings, so no conversion needed
    return result


def parse_from_mongo(item: dict) -> dict:
    """Parse data from MongoDB"""
    if item and '_id' in item:
        del item['_id']
    return item


# ========================
# API Endpoints
# ========================

@router.get("/schedule", response_model=List[OnCallScheduleResponse])
async def get_on_call_schedule(
    month: Optional[int] = None,
    year: Optional[int] = None,
    employee_id: Optional[str] = None,
    current_user: str = Depends(get_current_user_email),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Retrieve on-call schedules with optional filtering
    
    - **month**: Filter by month (1-12)
    - **year**: Filter by year (e.g., 2025)
    - **employee_id**: Filter by employee UUID
    """
    try:
        logger.info(f"📅 Fetching on-call schedule - month={month}, year={year}, employee_id={employee_id}")
        
        # Build query filter
        query = {}
        
        if employee_id:
            query['employee_id'] = employee_id
        
        if month and year:
            # Filter by month and year in date string (YYYY-MM-DD format)
            month_str = f"{year}-{str(month).zfill(2)}"
            query['date'] = {'$regex': f'^{month_str}'}
        elif year:
            # Filter by year only
            query['date'] = {'$regex': f'^{year}'}
        
        # Get schedules from database
        cursor = db.on_call_schedules.find(query)
        schedules = await cursor.to_list(length=None)
        
        # Parse and return
        result = [parse_from_mongo(schedule) for schedule in schedules]
        logger.info(f"✅ Found {len(result)} on-call schedules")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error fetching on-call schedule: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching schedule: {str(e)}")


@router.get("/assignments", response_model=List[OnCallScheduleResponse])
async def get_on_call_assignments(
    startDate: str,
    endDate: str,
    current_user: str = Depends(get_current_user_email),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Retrieve on-call assignments for a date range (used by Monthly Planning)
    
    - **startDate**: Start date in YYYY-MM-DD format
    - **endDate**: End date in YYYY-MM-DD format
    """
    try:
        logger.info(f"📅 Fetching on-call assignments - startDate={startDate}, endDate={endDate}")
        
        # Validate date format
        try:
            datetime.strptime(startDate, '%Y-%m-%d')
            datetime.strptime(endDate, '%Y-%m-%d')
        except ValueError:
            raise HTTPException(status_code=400, detail="Dates must be in YYYY-MM-DD format")
        
        # Build query for date range
        query = {
            'date': {
                '$gte': startDate,
                '$lte': endDate
            }
        }
        
        cursor = db.on_call_schedules.find(query)
        assignments = await cursor.to_list(length=None)
        
        # Parse and return
        result = [parse_from_mongo(assignment) for assignment in assignments]
        logger.info(f"✅ Found {len(result)} on-call assignments in date range")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching on-call assignments: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching assignments: {str(e)}")


@router.post("/schedule", response_model=OnCallScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_on_call_schedule(
    schedule: OnCallScheduleCreate,
    current_user: str = Depends(get_current_user_email),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Create a new on-call schedule
    
    Requires admin authentication
    """
    try:
        logger.info(f"➕ Creating on-call schedule for employee {schedule.employee_id} on {schedule.date}")
        
        # Create schedule document
        schedule_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        schedule_doc = {
            'id': schedule_id,
            'employee_id': schedule.employee_id,
            'employee_name': schedule.employee_name,
            'date': schedule.date,
            'type': schedule.type,
            'notes': schedule.notes,
            'created_at': now,
            'created_by': current_user
        }
        
        # Check for duplicate
        existing = await db.on_call_schedules.find_one({
            'employee_id': schedule.employee_id,
            'date': schedule.date
        })
        
        if existing:
            logger.warning(f"⚠️ Duplicate on-call schedule found for {schedule.employee_id} on {schedule.date}")
            # Return existing instead of error for better UX
            return parse_from_mongo(existing)
        
        # Insert into database
        await db.on_call_schedules.insert_one(schedule_doc)
        
        logger.info(f"✅ On-call schedule created successfully: {schedule_id}")
        return schedule_doc
        
    except Exception as e:
        logger.error(f"❌ Error creating on-call schedule: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating schedule: {str(e)}")


@router.post("/schedule/bulk", response_model=List[OnCallScheduleResponse], status_code=status.HTTP_201_CREATED)
async def create_bulk_on_call_schedules(
    bulk_data: OnCallBulkCreate,
    current_user: str = Depends(get_current_user_email),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Create multiple on-call schedules at once
    
    Useful for creating week-long schedules. Requires admin authentication.
    """
    try:
        logger.info(f"➕ Creating {len(bulk_data.schedules)} on-call schedules in bulk")
        
        created_schedules = []
        now = datetime.now().isoformat()
        
        for schedule in bulk_data.schedules:
            # Check for duplicate
            existing = await db.on_call_schedules.find_one({
                'employee_id': schedule.employee_id,
                'date': schedule.date
            })
            
            if existing:
                logger.info(f"⏩ Skipping duplicate schedule for {schedule.employee_id} on {schedule.date}")
                created_schedules.append(parse_from_mongo(existing))
                continue
            
            # Create new schedule
            schedule_id = str(uuid.uuid4())
            schedule_doc = {
                'id': schedule_id,
                'employee_id': schedule.employee_id,
                'employee_name': schedule.employee_name,
                'date': schedule.date,
                'type': schedule.type,
                'notes': schedule.notes,
                'created_at': now,
                'created_by': current_user
            }
            
            await db.on_call_schedules.insert_one(schedule_doc)
            created_schedules.append(schedule_doc)
        
        logger.info(f"✅ Created {len(created_schedules)} on-call schedules successfully")
        return created_schedules
        
    except Exception as e:
        logger.error(f"❌ Error creating bulk on-call schedules: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating bulk schedules: {str(e)}")


@router.delete("/schedule/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_on_call_schedule(
    schedule_id: str,
    current_user: str = Depends(get_current_user_email),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Delete an on-call schedule
    
    Requires admin authentication
    """
    try:
        logger.info(f"🗑️ Deleting on-call schedule: {schedule_id}")
        
        # Delete from database
        result = await db.on_call_schedules.delete_one({'id': schedule_id})
        
        if result.deleted_count == 0:
            logger.warning(f"⚠️ On-call schedule not found: {schedule_id}")
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        logger.info(f"✅ On-call schedule deleted successfully: {schedule_id}")
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting on-call schedule: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting schedule: {str(e)}")


@router.put("/schedule/{schedule_id}", response_model=OnCallScheduleResponse)
async def update_on_call_schedule(
    schedule_id: str,
    schedule: OnCallScheduleCreate,
    db: AsyncIOMotorDatabase = None,
    current_user: str = Depends(get_current_user_email)
):
    """
    Update an existing on-call schedule
    
    Requires admin authentication
    """
    try:
        logger.info(f"✏️ Updating on-call schedule: {schedule_id}")
        
        # Get database connection
        if db is None:
            from motor.motor_asyncio import AsyncIOMotorClient
            import os
            mongo_url = os.environ['MONGO_URL']
            client = AsyncIOMotorClient(mongo_url)
            db = client[os.environ['DB_NAME']]
        
        # Check if schedule exists
        existing = await db.on_call_schedules.find_one({'id': schedule_id})
        if not existing:
            logger.warning(f"⚠️ On-call schedule not found: {schedule_id}")
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        # Update schedule
        update_doc = {
            'employee_id': schedule.employee_id,
            'employee_name': schedule.employee_name,
            'date': schedule.date,
            'type': schedule.type,
            'notes': schedule.notes,
            'updated_at': datetime.now().isoformat(),
            'updated_by': current_user
        }
        
        await db.on_call_schedules.update_one(
            {'id': schedule_id},
            {'$set': update_doc}
        )
        
        # Fetch updated document
        updated = await db.on_call_schedules.find_one({'id': schedule_id})
        
        logger.info(f"✅ On-call schedule updated successfully: {schedule_id}")
        return parse_from_mongo(updated)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating on-call schedule: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating schedule: {str(e)}")
