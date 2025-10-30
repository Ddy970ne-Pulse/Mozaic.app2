"""
Security Headers Middleware - MOZAIK RH
Implements OWASP recommended HTTP security headers
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import logging

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add OWASP recommended security headers to all responses
    
    Headers implemented:
    - X-Frame-Options: Prevents clickjacking attacks
    - X-Content-Type-Options: Prevents MIME type sniffing
    - X-XSS-Protection: Legacy XSS protection (CSP is better)
    - Strict-Transport-Security: Forces HTTPS
    - Content-Security-Policy: XSS and injection protection
    - Referrer-Policy: Controls referrer information
    - Permissions-Policy: Controls browser features
    """
    
    def __init__(self, app, environment: str = "production"):
        super().__init__(app)
        self.environment = environment
        self.csp_policy = self._build_csp_policy()
    
    def _build_csp_policy(self) -> str:
        """
        Build Content Security Policy
        
        Development: More permissive for hot reload
        Production: Strict policy
        """
        if self.environment == "development":
            # Development: Allow unsafe-inline for hot reload
            return (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' data:; "
                "connect-src 'self' ws: wss:; "
                "frame-ancestors 'none';"
            )
        else:
            # Production: Strict policy
            return (
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self'; "
                "img-src 'self' data: https:; "
                "font-src 'self' data:; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self';"
            )
    
    async def dispatch(self, request: Request, call_next):
        """Add security headers to response"""
        
        response: Response = await call_next(request)
        
        # 1. Prevent clickjacking attacks
        # DENY = never allow framing, even from same origin
        response.headers["X-Frame-Options"] = "DENY"
        
        # 2. Prevent MIME type sniffing
        # Forces browser to respect Content-Type header
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # 3. XSS Protection (legacy, but still useful for old browsers)
        # 1 = enable, mode=block = block page instead of sanitizing
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # 4. HTTP Strict Transport Security (HSTS)
        # Only add for HTTPS connections
        if request.url.scheme == "https" or self.environment == "production":
            # max-age=31536000 = 1 year
            # includeSubDomains = apply to all subdomains
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        
        # 5. Content Security Policy
        # Primary defense against XSS and injection attacks
        response.headers["Content-Security-Policy"] = self.csp_policy
        
        # 6. Referrer Policy
        # Controls how much referrer information is sent
        # strict-origin-when-cross-origin = send full URL for same-origin,
        # only origin for cross-origin
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # 7. Permissions Policy (formerly Feature-Policy)
        # Disable unnecessary browser features
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=()"
        )
        
        # 8. Remove server identification (security through obscurity)
        response.headers["Server"] = "Mozaik-RH"
        
        # 9. Cache control for sensitive data
        if "/api/users" in request.url.path or "/api/absences" in request.url.path:
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        
        logger.debug(f"Security headers added to {request.url.path}")
        
        return response
