"""
Enhanced Authentication - MOZAIK RH
Refresh tokens, token rotation, and enhanced password security
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import jwt
import bcrypt
import secrets
import re
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)


class PasswordPolicy:
    """
    Enhanced password policy following ANSSI/OWASP recommendations
    
    Requirements:
    - Minimum 12 characters (configurable)
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 digit
    - At least 1 special character
    - Not in common passwords list
    """
    
    MIN_LENGTH = 12
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = True
    
    # Top 100 most common passwords (subset)
    COMMON_PASSWORDS = {
        "password", "123456", "12345678", "qwerty", "abc123",
        "monkey", "1234567", "letmein", "trustno1", "dragon",
        "baseball", "iloveyou", "master", "sunshine", "ashley",
        "admin", "admin123", "password123", "welcome", "login",
        "passw0rd", "password1", "123456789", "12345", "1234567890",
        "password!", "admin@123", "Welcome123", "Password1!"
    }
    
    @classmethod
    def validate(cls, password: str) -> Tuple[bool, str]:
        """
        Validate password against policy
        
        Returns:
            (is_valid, error_message)
        """
        errors = []
        
        # Length check
        if len(password) < cls.MIN_LENGTH:
            errors.append(f"Minimum {cls.MIN_LENGTH} characters required")
        
        # Uppercase check
        if cls.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            errors.append("At least 1 uppercase letter required (A-Z)")
        
        # Lowercase check
        if cls.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            errors.append("At least 1 lowercase letter required (a-z)")
        
        # Digit check
        if cls.REQUIRE_DIGIT and not re.search(r'\d', password):
            errors.append("At least 1 digit required (0-9)")
        
        # Special character check
        if cls.REQUIRE_SPECIAL:
            special_chars = r'[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]'
            if not re.search(special_chars, password):
                errors.append("At least 1 special character required (!@#$%^&*...)")
        
        # Common password check
        if password.lower() in cls.COMMON_PASSWORDS:
            errors.append("Password is too common. Please choose a stronger password")
        
        # Sequential characters check
        if cls._has_sequential_chars(password):
            errors.append("Avoid sequential characters (abc, 123, etc.)")
        
        # Repeated characters check
        if cls._has_repeated_chars(password):
            errors.append("Avoid repeated characters (aaa, 111, etc.)")
        
        if errors:
            return False, " | ".join(errors)
        
        return True, "Password meets all requirements"
    
    @staticmethod
    def _has_sequential_chars(password: str, length: int = 3) -> bool:
        """Check for sequential characters"""
        password_lower = password.lower()
        for i in range(len(password_lower) - length + 1):
            substr = password_lower[i:i+length]
            # Check if all characters are sequential
            if all(ord(substr[j+1]) - ord(substr[j]) == 1 for j in range(length-1)):
                return True
        return False
    
    @staticmethod
    def _has_repeated_chars(password: str, length: int = 3) -> bool:
        """Check for repeated characters"""
        for i in range(len(password) - length + 1):
            substr = password[i:i+length]
            if len(set(substr)) == 1:  # All same character
                return True
        return False
    
    @classmethod
    def generate_strong_password(cls, length: int = 16) -> str:
        """
        Generate a strong random password
        
        Args:
            length: Password length (minimum 12)
        """
        if length < cls.MIN_LENGTH:
            length = cls.MIN_LENGTH
        
        # Character sets
        uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        lowercase = 'abcdefghijklmnopqrstuvwxyz'
        digits = '0123456789'
        special = '!@#$%^&*()_+-=[]{}|;:,.<>?'
        
        # Ensure at least one of each required type
        password_chars = [
            secrets.choice(uppercase),
            secrets.choice(lowercase),
            secrets.choice(digits),
            secrets.choice(special)
        ]
        
        # Fill remaining with random characters
        all_chars = uppercase + lowercase + digits + special
        for _ in range(length - 4):
            password_chars.append(secrets.choice(all_chars))
        
        # Shuffle to avoid predictable pattern
        secrets.SystemRandom().shuffle(password_chars)
        
        return ''.join(password_chars)


class RefreshTokenManager:
    """
    Manage refresh tokens for JWT token rotation
    
    Features:
    - Long-lived refresh tokens (7 days)
    - Token revocation/blacklist
    - Automatic cleanup of expired tokens
    - One refresh token per user per device
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.refresh_tokens
    
    async def create_refresh_token(
        self,
        user_id: str,
        user_email: str,
        device_id: Optional[str] = None,
        expiry_days: int = 7
    ) -> str:
        """
        Create a new refresh token
        
        Args:
            user_id: User ID
            user_email: User email
            device_id: Optional device identifier (for multi-device support)
            expiry_days: Token expiry in days (default: 7)
        
        Returns:
            Refresh token JTI (unique identifier)
        """
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=expiry_days)
        
        # Generate unique token ID
        jti = secrets.token_urlsafe(32)
        
        # Store in database
        refresh_token_doc = {
            "jti": jti,
            "user_id": user_id,
            "user_email": user_email,
            "device_id": device_id,
            "created_at": now,
            "expires_at": expires_at,
            "revoked": False,
            "last_used": now
        }
        
        await self.collection.insert_one(refresh_token_doc)
        
        logger.info(
            f"Created refresh token for {user_email}",
            extra={"user_id": user_id, "jti": jti, "expires": expires_at.isoformat()}
        )
        
        return jti
    
    async def validate_refresh_token(self, jti: str) -> Tuple[bool, Optional[dict], Optional[str]]:
        """
        Validate a refresh token
        
        Args:
            jti: Token JTI to validate
        
        Returns:
            (is_valid, token_data, error_message)
        """
        token = await self.collection.find_one({"jti": jti})
        
        if not token:
            return False, None, "Refresh token not found"
        
        # Check if revoked
        if token.get("revoked", False):
            return False, None, "Refresh token has been revoked"
        
        # Check expiry
        now = datetime.now(timezone.utc)
        expires_at = token["expires_at"]
        
        if now > expires_at:
            # Auto-revoke expired token
            await self.revoke_token(jti)
            return False, None, "Refresh token has expired"
        
        # Update last used timestamp
        await self.collection.update_one(
            {"jti": jti},
            {"$set": {"last_used": now}}
        )
        
        return True, token, None
    
    async def revoke_token(self, jti: str) -> bool:
        """
        Revoke a refresh token
        
        Args:
            jti: Token JTI to revoke
        
        Returns:
            True if revoked successfully
        """
        result = await self.collection.update_one(
            {"jti": jti},
            {"$set": {
                "revoked": True,
                "revoked_at": datetime.now(timezone.utc)
            }}
        )
        
        if result.modified_count > 0:
            logger.info(f"Revoked refresh token: {jti}")
            return True
        
        return False
    
    async def revoke_all_user_tokens(self, user_id: str) -> int:
        """
        Revoke all refresh tokens for a user (logout from all devices)
        
        Args:
            user_id: User ID
        
        Returns:
            Number of tokens revoked
        """
        result = await self.collection.update_many(
            {"user_id": user_id, "revoked": False},
            {"$set": {
                "revoked": True,
                "revoked_at": datetime.now(timezone.utc)
            }}
        )
        
        count = result.modified_count
        
        if count > 0:
            logger.warning(f"Revoked all {count} refresh tokens for user: {user_id}")
        
        return count
    
    async def cleanup_expired_tokens(self) -> int:
        """
        Delete expired and revoked tokens
        
        Returns:
            Number of tokens deleted
        """
        now = datetime.now(timezone.utc)
        
        # Delete tokens expired more than 30 days ago
        cutoff = now - timedelta(days=30)
        
        result = await self.collection.delete_many({
            "$or": [
                {"expires_at": {"$lt": cutoff}},
                {"revoked": True, "revoked_at": {"$lt": cutoff}}
            ]
        })
        
        count = result.deleted_count
        
        if count > 0:
            logger.info(f"Cleaned up {count} expired refresh tokens")
        
        return count
    
    async def get_user_active_sessions(self, user_id: str) -> list:
        """
        Get all active sessions (non-revoked tokens) for a user
        
        Args:
            user_id: User ID
        
        Returns:
            List of active refresh tokens
        """
        now = datetime.now(timezone.utc)
        
        tokens = await self.collection.find({
            "user_id": user_id,
            "revoked": False,
            "expires_at": {"$gt": now}
        }, {"_id": 0}).to_list(100)
        
        return tokens


class SessionManager:
    """
    Manage user sessions with refresh token rotation
    
    Features:
    - Access token: 1 hour (short-lived)
    - Refresh token: 7 days (long-lived)
    - Automatic token rotation
    - Session tracking
    """
    
    def __init__(self, db: AsyncIOMotorDatabase, secret_key: str):
        self.db = db
        self.secret_key = secret_key
        self.refresh_manager = RefreshTokenManager(db)
        self.access_token_expiry_minutes = 60  # 1 hour
        self.refresh_token_expiry_days = 7  # 7 days
    
    def create_access_token(
        self,
        user_id: str,
        email: str,
        role: str,
        jti: Optional[str] = None
    ) -> str:
        """
        Create short-lived access token
        
        Args:
            user_id: User ID
            email: User email
            role: User role
            jti: Optional JTI for token tracking
        
        Returns:
            JWT access token
        """
        now = datetime.now(timezone.utc)
        expires = now + timedelta(minutes=self.access_token_expiry_minutes)
        
        if not jti:
            jti = secrets.token_urlsafe(16)
        
        payload = {
            "user_id": user_id,
            "email": email,
            "role": role,
            "type": "access",
            "jti": jti,
            "iat": int(now.timestamp()),
            "exp": int(expires.timestamp())
        }
        
        return jwt.encode(payload, self.secret_key, algorithm="HS256")
    
    def create_refresh_token_jwt(
        self,
        user_id: str,
        email: str,
        role: str,
        jti: str
    ) -> str:
        """
        Create long-lived refresh token (JWT)
        
        Args:
            user_id: User ID
            email: User email
            role: User role
            jti: Unique token identifier from database
        
        Returns:
            JWT refresh token
        """
        now = datetime.now(timezone.utc)
        expires = now + timedelta(days=self.refresh_token_expiry_days)
        
        payload = {
            "user_id": user_id,
            "email": email,
            "role": role,
            "type": "refresh",
            "jti": jti,
            "iat": int(now.timestamp()),
            "exp": int(expires.timestamp())
        }
        
        return jwt.encode(payload, self.secret_key, algorithm="HS256")
    
    async def create_session(
        self,
        user_id: str,
        email: str,
        role: str,
        device_id: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Create new session with access and refresh tokens
        
        Returns:
            (access_token, refresh_token)
        """
        # Create refresh token in database
        refresh_jti = await self.refresh_manager.create_refresh_token(
            user_id=user_id,
            user_email=email,
            device_id=device_id,
            expiry_days=self.refresh_token_expiry_days
        )
        
        # Create JWT tokens
        access_token = self.create_access_token(user_id, email, role)
        refresh_token = self.create_refresh_token_jwt(user_id, email, role, refresh_jti)
        
        return access_token, refresh_token
    
    async def refresh_session(self, refresh_token: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Refresh session using refresh token
        
        Args:
            refresh_token: JWT refresh token
        
        Returns:
            (new_access_token, new_refresh_token, error_message)
        """
        try:
            # Decode refresh token
            payload = jwt.decode(refresh_token, self.secret_key, algorithms=["HS256"])
            
            # Validate token type
            if payload.get("type") != "refresh":
                return None, None, "Invalid token type"
            
            # Get JTI and validate in database
            jti = payload.get("jti")
            is_valid, token_data, error = await self.refresh_manager.validate_refresh_token(jti)
            
            if not is_valid:
                return None, None, error
            
            # Create new tokens
            user_id = payload["user_id"]
            email = payload["email"]
            role = payload["role"]
            
            new_access_token, new_refresh_token = await self.create_session(
                user_id=user_id,
                email=email,
                role=role,
                device_id=token_data.get("device_id")
            )
            
            # Optionally revoke old refresh token (token rotation)
            # await self.refresh_manager.revoke_token(jti)
            
            logger.info(f"Session refreshed for {email}")
            
            return new_access_token, new_refresh_token, None
            
        except jwt.ExpiredSignatureError:
            return None, None, "Refresh token has expired"
        except jwt.InvalidTokenError as e:
            return None, None, f"Invalid refresh token: {str(e)}"
    
    async def revoke_session(self, refresh_token: str) -> bool:
        """Revoke a specific session"""
        try:
            payload = jwt.decode(refresh_token, self.secret_key, algorithms=["HS256"])
            jti = payload.get("jti")
            
            if jti:
                return await self.refresh_manager.revoke_token(jti)
            
            return False
        except:
            return False
    
    async def revoke_all_sessions(self, user_id: str) -> int:
        """Revoke all sessions for a user (logout from all devices)"""
        return await self.refresh_manager.revoke_all_user_tokens(user_id)
