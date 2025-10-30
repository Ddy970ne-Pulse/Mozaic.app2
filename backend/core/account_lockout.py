"""
Account Lockout System - MOZAIK RH
Prevents brute force attacks with persistent account lockout
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)


class AccountLockoutManager:
    """
    Manages account lockout after failed login attempts
    
    Security Features:
    - Persistent storage in MongoDB
    - Configurable max attempts and lockout duration
    - Automatic unlock after duration
    - Admin override capability
    - Audit logging
    """
    
    def __init__(
        self,
        db: AsyncIOMotorDatabase,
        max_attempts: int = 5,
        lockout_duration_minutes: int = 30
    ):
        """
        Initialize account lockout manager
        
        Args:
            db: MongoDB database instance
            max_attempts: Maximum failed attempts before lockout (default: 5)
            lockout_duration_minutes: Lockout duration in minutes (default: 30)
        """
        self.db = db
        self.collection = db.account_lockouts
        self.max_attempts = max_attempts
        self.lockout_duration_minutes = lockout_duration_minutes
    
    async def record_failed_attempt(self, email: str, ip_address: Optional[str] = None) -> Tuple[bool, int, Optional[datetime]]:
        """
        Record a failed login attempt
        
        Args:
            email: User email address
            ip_address: IP address of the attempt
        
        Returns:
            Tuple of (is_now_locked, total_attempts, locked_until)
        """
        now = datetime.now(timezone.utc)
        email_lower = email.lower().strip()
        
        # Get or create lockout record
        lockout_record = await self.collection.find_one({"email": email_lower})
        
        if not lockout_record:
            # First failed attempt
            lockout_record = {
                "email": email_lower,
                "failed_attempts": 1,
                "first_attempt_at": now,
                "last_attempt_at": now,
                "locked_until": None,
                "is_locked": False,
                "ip_addresses": [ip_address] if ip_address else [],
                "created_at": now,
                "updated_at": now
            }
            await self.collection.insert_one(lockout_record)
            
            logger.warning(
                f"Failed login attempt 1/{self.max_attempts} for {email_lower}",
                extra={"email": email_lower, "ip": ip_address}
            )
            
            return False, 1, None
        
        # Check if currently locked
        if lockout_record.get("is_locked") and lockout_record.get("locked_until"):
            locked_until = lockout_record["locked_until"]
            if now < locked_until:
                # Still locked
                logger.warning(
                    f"Login attempt on locked account: {email_lower}",
                    extra={
                        "email": email_lower,
                        "ip": ip_address,
                        "locked_until": locked_until.isoformat()
                    }
                )
                return True, lockout_record["failed_attempts"], locked_until
            else:
                # Lock expired, reset
                await self.reset_lockout(email)
                return await self.record_failed_attempt(email, ip_address)
        
        # Reset counter if last attempt was > lockout_duration ago
        last_attempt = lockout_record.get("last_attempt_at", now)
        if (now - last_attempt).total_seconds() > (self.lockout_duration_minutes * 60):
            await self.reset_lockout(email)
            return await self.record_failed_attempt(email, ip_address)
        
        # Increment failed attempts
        new_attempt_count = lockout_record["failed_attempts"] + 1
        
        # Add IP if new
        ip_addresses = lockout_record.get("ip_addresses", [])
        if ip_address and ip_address not in ip_addresses:
            ip_addresses.append(ip_address)
        
        # Check if should lock
        if new_attempt_count >= self.max_attempts:
            locked_until = now + timedelta(minutes=self.lockout_duration_minutes)
            
            await self.collection.update_one(
                {"email": email_lower},
                {
                    "$set": {
                        "failed_attempts": new_attempt_count,
                        "last_attempt_at": now,
                        "is_locked": True,
                        "locked_until": locked_until,
                        "locked_at": now,
                        "ip_addresses": ip_addresses,
                        "updated_at": now
                    }
                }
            )
            
            logger.error(
                f"🔒 Account LOCKED: {email_lower} after {new_attempt_count} failed attempts",
                extra={
                    "email": email_lower,
                    "attempts": new_attempt_count,
                    "locked_until": locked_until.isoformat(),
                    "ip_addresses": ip_addresses
                }
            )
            
            return True, new_attempt_count, locked_until
        else:
            # Not locked yet, but increment counter
            await self.collection.update_one(
                {"email": email_lower},
                {
                    "$set": {
                        "failed_attempts": new_attempt_count,
                        "last_attempt_at": now,
                        "ip_addresses": ip_addresses,
                        "updated_at": now
                    }
                }
            )
            
            logger.warning(
                f"Failed login attempt {new_attempt_count}/{self.max_attempts} for {email_lower}",
                extra={"email": email_lower, "ip": ip_address}
            )
            
            return False, new_attempt_count, None
    
    async def is_locked(self, email: str) -> Tuple[bool, Optional[datetime], int]:
        """
        Check if an account is currently locked
        
        Args:
            email: User email address
        
        Returns:
            Tuple of (is_locked, locked_until, remaining_attempts)
        """
        email_lower = email.lower().strip()
        lockout_record = await self.collection.find_one({"email": email_lower})
        
        if not lockout_record:
            return False, None, self.max_attempts
        
        # Check if locked
        if lockout_record.get("is_locked") and lockout_record.get("locked_until"):
            locked_until = lockout_record["locked_until"]
            now = datetime.now(timezone.utc)
            
            if now < locked_until:
                # Still locked
                return True, locked_until, 0
            else:
                # Lock expired, auto-unlock
                await self.reset_lockout(email)
                return False, None, self.max_attempts
        
        # Not locked, return remaining attempts
        failed_attempts = lockout_record.get("failed_attempts", 0)
        remaining = max(0, self.max_attempts - failed_attempts)
        
        return False, None, remaining
    
    async def reset_lockout(self, email: str) -> bool:
        """
        Reset lockout for successful login or expired lockout
        
        Args:
            email: User email address
        
        Returns:
            True if reset successful
        """
        email_lower = email.lower().strip()
        
        result = await self.collection.delete_one({"email": email_lower})
        
        if result.deleted_count > 0:
            logger.info(
                f"🔓 Account lockout reset: {email_lower}",
                extra={"email": email_lower}
            )
            return True
        
        return False
    
    async def admin_unlock(self, email: str, admin_email: str) -> bool:
        """
        Admin override to unlock an account
        
        Args:
            email: Email of locked account
            admin_email: Email of admin performing unlock
        
        Returns:
            True if unlock successful
        """
        email_lower = email.lower().strip()
        
        lockout_record = await self.collection.find_one({"email": email_lower})
        
        if not lockout_record:
            return False
        
        # Delete lockout record
        await self.collection.delete_one({"email": email_lower})
        
        logger.warning(
            f"🔓 Admin unlock: {email_lower} by {admin_email}",
            extra={
                "locked_email": email_lower,
                "admin_email": admin_email,
                "was_locked": lockout_record.get("is_locked", False)
            }
        )
        
        return True
    
    async def get_lockout_info(self, email: str) -> Optional[dict]:
        """
        Get detailed lockout information for an account
        
        Args:
            email: User email address
        
        Returns:
            Lockout record dict or None if not found
        """
        email_lower = email.lower().strip()
        lockout_record = await self.collection.find_one(
            {"email": email_lower},
            {"_id": 0}  # Exclude MongoDB _id
        )
        
        return lockout_record
    
    async def get_recent_lockouts(self, hours: int = 24, limit: int = 100) -> list:
        """
        Get recent account lockouts for security monitoring
        
        Args:
            hours: Look back period in hours (default: 24)
            limit: Maximum number of results (default: 100)
        
        Returns:
            List of recent lockout records
        """
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        lockouts = await self.collection.find(
            {
                "locked_at": {"$gte": since}
            },
            {"_id": 0}
        ).sort("locked_at", -1).limit(limit).to_list(limit)
        
        return lockouts
    
    async def get_suspicious_patterns(self) -> list:
        """
        Detect suspicious patterns (multiple accounts from same IP, etc.)
        
        Returns:
            List of suspicious patterns detected
        """
        # Aggregate by IP to find IPs trying multiple accounts
        pipeline = [
            {
                "$match": {
                    "is_locked": True,
                    "locked_at": {
                        "$gte": datetime.now(timezone.utc) - timedelta(hours=1)
                    }
                }
            },
            {
                "$unwind": "$ip_addresses"
            },
            {
                "$group": {
                    "_id": "$ip_addresses",
                    "emails": {"$addToSet": "$email"},
                    "count": {"$sum": 1}
                }
            },
            {
                "$match": {
                    "count": {"$gte": 3}  # 3+ accounts from same IP
                }
            },
            {
                "$sort": {"count": -1}
            }
        ]
        
        suspicious = await self.collection.aggregate(pipeline).to_list(100)
        
        if suspicious:
            logger.error(
                f"🚨 Suspicious pattern detected: {len(suspicious)} IPs with multiple lockouts",
                extra={"patterns": suspicious}
            )
        
        return suspicious
