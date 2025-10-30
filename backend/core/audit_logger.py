"""
Audit Logger - MOZAIK RH
Structured audit logging for RGPD compliance and security forensics
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorDatabase
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class AuditEventType(str, Enum):
    """Audit event types"""
    # Authentication
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET = "password_reset"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"
    
    # User Management
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    USER_ACTIVATED = "user_activated"
    USER_DEACTIVATED = "user_deactivated"
    
    # Absence Management
    ABSENCE_CREATED = "absence_created"
    ABSENCE_UPDATED = "absence_updated"
    ABSENCE_DELETED = "absence_deleted"
    ABSENCE_APPROVED = "absence_approved"
    ABSENCE_REJECTED = "absence_rejected"
    
    # Data Access (RGPD)
    DATA_ACCESSED = "data_accessed"
    DATA_EXPORTED = "data_exported"
    DATA_DELETED = "data_deleted"
    
    # Administrative
    ADMIN_ACTION = "admin_action"
    ROLE_CHANGED = "role_changed"
    PERMISSION_CHANGED = "permission_changed"
    
    # Security
    SECURITY_ALERT = "security_alert"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    ACCESS_DENIED = "access_denied"


class AuditLogger:
    """
    Structured audit logger for compliance and security
    
    RGPD Compliance:
    - Article 30: Register of processing activities
    - Article 5(2): Accountability principle
    - Article 32: Security of processing
    
    Features:
    - MongoDB persistent storage
    - Structured JSON logging
    - GDPR-compliant data access tracking
    - Retention policy support
    - Search and filtering capabilities
    """
    
    def __init__(self, db: AsyncIOMotorDatabase, retention_days: int = 365):
        """
        Initialize audit logger
        
        Args:
            db: MongoDB database instance
            retention_days: How long to keep audit logs (default: 1 year)
        """
        self.db = db
        self.collection = db.audit_logs
        self.retention_days = retention_days
        
        # Create indexes for performance
        self._ensure_indexes()
    
    def _ensure_indexes(self):
        """Create MongoDB indexes for efficient querying"""
        # Note: This is async, call it during startup
        # self.collection.create_index("timestamp")
        # self.collection.create_index("user_id")
        # self.collection.create_index("event_type")
        # self.collection.create_index([("timestamp", -1), ("event_type", 1)])
        pass
    
    async def log_event(
        self,
        event_type: AuditEventType,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        action: str = "",
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        status: str = "success",
        details: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None
    ) -> str:
        """
        Log an audit event
        
        Args:
            event_type: Type of event (from AuditEventType enum)
            user_id: ID of user performing action
            user_email: Email of user
            action: Human-readable action description
            resource_type: Type of resource affected (user, absence, etc.)
            resource_id: ID of affected resource
            ip_address: IP address of request
            user_agent: User agent string
            status: "success" or "failure"
            details: Additional context (dict)
            error_message: Error details if status=failure
        
        Returns:
            Audit log ID
        """
        now = datetime.now(timezone.utc)
        
        audit_entry = {
            "timestamp": now,
            "event_type": event_type.value,
            "user_id": user_id,
            "user_email": user_email,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "status": status,
            "details": details or {},
            "error_message": error_message,
            "environment": "production",  # Could be from env var
            "retention_until": now.replace(year=now.year + 1)  # 1 year retention
        }
        
        # Insert into MongoDB
        result = await self.collection.insert_one(audit_entry)
        audit_id = str(result.inserted_id)
        
        # Also log to application logger
        log_level = logging.INFO if status == "success" else logging.WARNING
        log_msg = (
            f"AUDIT [{event_type.value}] {action} | "
            f"user={user_email or user_id} | "
            f"resource={resource_type}:{resource_id} | "
            f"status={status}"
        )
        
        logger.log(log_level, log_msg, extra={
            "audit_id": audit_id,
            "event_type": event_type.value,
            "user_id": user_id,
            "ip_address": ip_address
        })
        
        return audit_id
    
    async def log_authentication(
        self,
        event_type: AuditEventType,
        email: str,
        ip_address: str,
        user_agent: Optional[str] = None,
        success: bool = True,
        failure_reason: Optional[str] = None
    ):
        """Log authentication events"""
        await self.log_event(
            event_type=event_type,
            user_email=email,
            action=f"Authentication attempt: {event_type.value}",
            resource_type="authentication",
            ip_address=ip_address,
            user_agent=user_agent,
            status="success" if success else "failure",
            error_message=failure_reason
        )
    
    async def log_data_access(
        self,
        accessor_id: str,
        accessor_email: str,
        accessed_user_id: str,
        accessed_user_email: str,
        data_type: str,
        purpose: str,
        ip_address: str,
        fields_accessed: Optional[List[str]] = None
    ):
        """
        Log access to personal data (RGPD Article 30)
        
        Critical for demonstrating GDPR compliance
        """
        await self.log_event(
            event_type=AuditEventType.DATA_ACCESSED,
            user_id=accessor_id,
            user_email=accessor_email,
            action=f"Accessed {data_type} of {accessed_user_email}",
            resource_type="personal_data",
            resource_id=accessed_user_id,
            ip_address=ip_address,
            details={
                "accessed_user_email": accessed_user_email,
                "data_type": data_type,
                "purpose": purpose,
                "fields_accessed": fields_accessed or [],
                "legal_basis": "legitimate_interest",  # or "consent", "contract", etc.
                "data_category": "personal_identifiable_information"
            }
        )
    
    async def log_absence_action(
        self,
        event_type: AuditEventType,
        user_id: str,
        user_email: str,
        absence_id: str,
        action: str,
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        """Log absence-related actions"""
        await self.log_event(
            event_type=event_type,
            user_id=user_id,
            user_email=user_email,
            action=action,
            resource_type="absence",
            resource_id=absence_id,
            ip_address=ip_address,
            details=details
        )
    
    async def log_user_management(
        self,
        event_type: AuditEventType,
        admin_id: str,
        admin_email: str,
        target_user_id: str,
        target_user_email: str,
        action: str,
        ip_address: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None
    ):
        """Log user management actions"""
        await self.log_event(
            event_type=event_type,
            user_id=admin_id,
            user_email=admin_email,
            action=action,
            resource_type="user",
            resource_id=target_user_id,
            ip_address=ip_address,
            details={
                "target_user_email": target_user_email,
                "changes": changes or {}
            }
        )
    
    async def log_security_event(
        self,
        event_type: AuditEventType,
        description: str,
        user_email: Optional[str] = None,
        ip_address: Optional[str] = None,
        severity: str = "medium",
        details: Optional[Dict[str, Any]] = None
    ):
        """Log security-related events"""
        await self.log_event(
            event_type=event_type,
            user_email=user_email,
            action=description,
            resource_type="security",
            ip_address=ip_address,
            status="alert",
            details={
                "severity": severity,  # low, medium, high, critical
                **(details or {})
            }
        )
    
    async def search_logs(
        self,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        event_type: Optional[AuditEventType] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[str] = None,
        limit: int = 100,
        skip: int = 0
    ) -> Dict[str, Any]:
        """
        Search audit logs with filters
        
        Returns:
            Dict with logs and metadata
        """
        query = {}
        
        if user_id:
            query["user_id"] = user_id
        
        if user_email:
            query["user_email"] = user_email
        
        if event_type:
            query["event_type"] = event_type.value
        
        if resource_type:
            query["resource_type"] = resource_type
        
        if resource_id:
            query["resource_id"] = resource_id
        
        if status:
            query["status"] = status
        
        if start_date or end_date:
            query["timestamp"] = {}
            if start_date:
                query["timestamp"]["$gte"] = start_date
            if end_date:
                query["timestamp"]["$lte"] = end_date
        
        # Get total count
        total = await self.collection.count_documents(query)
        
        # Get logs
        cursor = self.collection.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit)
        logs = await cursor.to_list(limit)
        
        return {
            "logs": logs,
            "total": total,
            "limit": limit,
            "skip": skip,
            "has_more": (skip + len(logs)) < total
        }
    
    async def get_user_activity(
        self,
        user_id: str,
        days: int = 30,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get recent activity for a specific user"""
        since = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        ) - timedelta(days=days)
        
        result = await self.search_logs(
            user_id=user_id,
            start_date=since,
            limit=limit
        )
        
        return result["logs"]
    
    async def get_resource_history(
        self,
        resource_type: str,
        resource_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get complete history for a specific resource"""
        result = await self.search_logs(
            resource_type=resource_type,
            resource_id=resource_id,
            limit=limit
        )
        
        return result["logs"]
    
    async def get_failed_logins(
        self,
        hours: int = 24,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get recent failed login attempts"""
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        result = await self.search_logs(
            event_type=AuditEventType.LOGIN_FAILED,
            start_date=since,
            limit=limit
        )
        
        return result["logs"]
    
    async def get_security_alerts(
        self,
        hours: int = 24,
        severity: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get recent security alerts"""
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        query = {
            "event_type": {"$in": [
                AuditEventType.SECURITY_ALERT.value,
                AuditEventType.SUSPICIOUS_ACTIVITY.value,
                AuditEventType.ACCOUNT_LOCKED.value
            ]},
            "timestamp": {"$gte": since}
        }
        
        if severity:
            query["details.severity"] = severity
        
        logs = await self.collection.find(query, {"_id": 0}).sort("timestamp", -1).to_list(100)
        
        return logs
    
    async def cleanup_old_logs(self) -> int:
        """
        Delete audit logs older than retention period
        
        Returns:
            Number of deleted logs
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=self.retention_days)
        
        result = await self.collection.delete_many({
            "timestamp": {"$lt": cutoff_date}
        })
        
        deleted_count = result.deleted_count
        
        if deleted_count > 0:
            logger.info(
                f"Cleaned up {deleted_count} old audit logs (older than {self.retention_days} days)",
                extra={"deleted_count": deleted_count, "retention_days": self.retention_days}
            )
        
        return deleted_count
    
    async def export_user_audit_trail(
        self,
        user_id: str,
        format: str = "json"
    ) -> Dict[str, Any]:
        """
        Export complete audit trail for a user (GDPR Article 15)
        
        Used for data subject access requests
        """
        # Get all logs for this user
        all_logs = await self.collection.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(None)
        
        # Get logs where user was the subject of action
        subject_logs = await self.collection.find(
            {"resource_id": user_id, "resource_type": "user"},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(None)
        
        export = {
            "user_id": user_id,
            "export_date": datetime.now(timezone.utc).isoformat(),
            "total_events": len(all_logs) + len(subject_logs),
            "actions_performed": all_logs,
            "actions_received": subject_logs,
            "format": format
        }
        
        return export


# Import statement for timezone
from datetime import timedelta
