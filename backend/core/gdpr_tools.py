"""
GDPR Data Protection Tools - MOZAIK RH
Tools for GDPR compliance: data export, anonymization, deletion
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorDatabase
import hashlib
import re
import logging

logger = logging.getLogger(__name__)


class GDPRDataManager:
    """
    GDPR compliance tools for data subject rights
    
    Implements:
    - Article 15: Right of access (data export)
    - Article 16: Right to rectification
    - Article 17: Right to erasure (right to be forgotten)
    - Article 18: Right to restriction of processing
    - Article 20: Right to data portability
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def export_user_data(self, user_id: str) -> Dict[str, Any]:
        """
        Export all personal data for a user (GDPR Article 15)
        
        Args:
            user_id: User ID
        
        Returns:
            Complete data export in portable format
        """
        # 1. User profile
        user_data = await self.db.users.find_one({"id": user_id})
        
        if not user_data:
            raise ValueError(f"User {user_id} not found")
        
        # Remove sensitive fields
        user_export = {
            k: v for k, v in user_data.items()
            if k not in ["_id", "hashed_password", "initial_password"]
        }
        
        # 2. Absences
        absences = await self.db.absences.find({"employee_id": user_id}).to_list(None)
        absences_export = [
            {k: v for k, v in abs.items() if k != "_id"}
            for abs in absences
        ]
        
        # 3. Leave balances
        leave_balances = await self.db.leave_balances.find({"employee_id": user_id}).to_list(None)
        balances_export = [
            {k: v for k, v in bal.items() if k != "_id"}
            for bal in leave_balances
        ]
        
        # 4. Audit logs (from audit logger)
        from core.audit_logger import AuditLogger
        audit = AuditLogger(self.db)
        audit_trail = await audit.export_user_audit_trail(user_id)
        
        # 5. Sessions
        sessions = await self.db.refresh_tokens.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(None)
        
        # Compile complete export
        export = {
            "export_metadata": {
                "user_id": user_id,
                "export_date": datetime.now(timezone.utc).isoformat(),
                "format": "JSON",
                "version": "1.0",
                "legal_basis": "GDPR Article 15 - Right of access"
            },
            "personal_info": user_export,
            "absences": absences_export,
            "leave_balances": balances_export,
            "audit_trail": audit_trail,
            "active_sessions": sessions,
            "data_categories": {
                "personal_identifiers": ["name", "email", "phone"],
                "employment_data": ["department", "position", "hire_date"],
                "absence_records": ["absences", "leave_balances"],
                "system_logs": ["audit_trail", "sessions"]
            }
        }
        
        logger.info(f"📤 GDPR data export completed for user {user_id}")
        
        return export
    
    async def anonymize_user(self, user_id: str, reason: str) -> Dict[str, Any]:
        """
        Anonymize user data while retaining necessary records (GDPR Article 17)
        
        Note: Complete deletion may not be possible due to legal obligations
        (e.g., employment records, financial records). Anonymization is the
        alternative that preserves statistical data while protecting privacy.
        
        Args:
            user_id: User ID
            reason: Reason for anonymization
        
        Returns:
            Summary of anonymization actions
        """
        user = await self.db.users.find_one({"id": user_id})
        
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        original_email = user["email"]
        timestamp = datetime.now(timezone.utc)
        
        # 1. Anonymize user profile
        anonymized_data = {
            "name": f"DELETED_USER_{user_id[:8]}",
            "email": f"deleted_{user_id}@anonymized.local",
            "phone": None,
            "address": None,
            "date_naissance": None,
            "notes": None,
            "is_active": False,
            "gdpr_anonymized": True,
            "anonymized_at": timestamp,
            "anonymization_reason": reason,
            "original_email_hash": hashlib.sha256(original_email.encode()).hexdigest()
        }
        
        await self.db.users.update_one(
            {"id": user_id},
            {"$set": anonymized_data}
        )
        
        # 2. Anonymize absences (keep records for legal compliance, but anonymize PII)
        await self.db.absences.update_many(
            {"employee_id": user_id},
            {"$set": {
                "employee_name": f"DELETED_USER_{user_id[:8]}",
                "email": f"deleted_{user_id}@anonymized.local",
                "notes": "[Anonymized]",
                "gdpr_anonymized": True,
                "anonymized_at": timestamp
            }}
        )
        
        # 3. Revoke all sessions
        from core.enhanced_auth import RefreshTokenManager
        refresh_manager = RefreshTokenManager(self.db)
        sessions_revoked = await refresh_manager.revoke_all_user_tokens(user_id)
        
        # 4. Audit log the anonymization
        from core.audit_logger import AuditLogger, AuditEventType
        audit = AuditLogger(self.db)
        await audit.log_event(
            event_type=AuditEventType.DATA_DELETED,
            user_id=user_id,
            user_email=original_email,
            action=f"User data anonymized: {reason}",
            resource_type="user",
            resource_id=user_id,
            details={
                "reason": reason,
                "anonymization_type": "gdpr_article_17",
                "records_affected": {
                    "user_profile": 1,
                    "absences": "multiple",
                    "sessions_revoked": sessions_revoked
                }
            }
        )
        
        logger.warning(
            f"🗑️  User anonymized: {original_email} (ID: {user_id})",
            extra={"user_id": user_id, "reason": reason}
        )
        
        return {
            "success": True,
            "user_id": user_id,
            "original_email": original_email,
            "anonymized_at": timestamp.isoformat(),
            "reason": reason,
            "actions_taken": {
                "user_profile_anonymized": True,
                "absences_anonymized": True,
                "sessions_revoked": sessions_revoked,
                "audit_log_created": True
            },
            "retained_data": {
                "absence_records": "Anonymized but retained for legal compliance",
                "audit_logs": "Retained for 1 year minimum per regulations"
            }
        }
    
    @staticmethod
    def pseudonymize_email(email: str) -> str:
        """
        Pseudonymize email for analytics/reporting
        
        Args:
            email: Original email
        
        Returns:
            Pseudonymized email (deterministic hash)
        """
        local, domain = email.split('@')
        hash_hex = hashlib.sha256(local.encode()).hexdigest()[:12]
        return f"user_{hash_hex}@{domain}"
    
    @staticmethod
    def mask_phone(phone: str) -> str:
        """
        Mask phone number for display
        
        Args:
            phone: Original phone
        
        Returns:
            Masked phone (e.g., 06.XX.XX.XX.78)
        """
        if not phone:
            return phone
        
        digits = re.sub(r'\D', '', phone)
        
        if len(digits) >= 4:
            masked = digits[:2] + 'X' * (len(digits) - 4) + digits[-2:]
            return masked
        
        return 'X' * len(digits)
    
    @staticmethod
    def anonymize_name(name: str) -> str:
        """
        Anonymize name for reports
        
        Args:
            name: Original name
        
        Returns:
            Anonymized name (e.g., J. D.)
        """
        parts = name.split()
        return ' '.join([f"{p[0]}." for p in parts if p])
    
    async def restrict_processing(self, user_id: str, reason: str) -> bool:
        """
        Mark user data with processing restriction (GDPR Article 18)
        
        Data is retained but not actively processed
        
        Args:
            user_id: User ID
            reason: Reason for restriction
        
        Returns:
            True if restriction applied
        """
        result = await self.db.users.update_one(
            {"id": user_id},
            {"$set": {
                "processing_restricted": True,
                "restriction_reason": reason,
                "restricted_at": datetime.now(timezone.utc)
            }}
        )
        
        if result.modified_count > 0:
            logger.info(f"⛔ Processing restriction applied to user {user_id}: {reason}")
            return True
        
        return False
    
    async def lift_processing_restriction(self, user_id: str) -> bool:
        """
        Remove processing restriction
        
        Args:
            user_id: User ID
        
        Returns:
            True if restriction lifted
        """
        result = await self.db.users.update_one(
            {"id": user_id},
            {"$set": {
                "processing_restricted": False,
                "restriction_lifted_at": datetime.now(timezone.utc)
            }}
        )
        
        if result.modified_count > 0:
            logger.info(f"✅ Processing restriction lifted for user {user_id}")
            return True
        
        return False
