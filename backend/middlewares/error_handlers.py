"""
Error Handlers - MOZAIK RH
Secure error handling that doesn't expose system information
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
import traceback
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Handle HTTP exceptions without exposing internal details
    """
    
    # Log the full error internally
    logger.error(
        f"HTTP {exc.status_code} on {request.method} {request.url.path}",
        extra={
            "status_code": exc.status_code,
            "detail": exc.detail,
            "path": request.url.path,
            "method": request.method,
            "client_host": request.client.host if request.client else None
        }
    )
    
    # Return sanitized error to client
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "status_code": exc.status_code,
                "message": exc.detail,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "path": request.url.path
            }
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle validation errors with clear but safe messages
    """
    
    # Log validation errors
    logger.warning(
        f"Validation error on {request.method} {request.url.path}",
        extra={
            "errors": exc.errors(),
            "body": exc.body if hasattr(exc, 'body') else None
        }
    )
    
    # Format errors for client
    formatted_errors = []
    for error in exc.errors():
        formatted_errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "status_code": 422,
                "message": "Validation error",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "path": request.url.path,
                "details": formatted_errors
            }
        }
    )


async def general_exception_handler(request: Request, exc: Exception):
    """
    Catch-all handler for unexpected errors
    
    SECURITY: Never expose stack traces or internal details in production
    """
    
    # Generate unique error ID for tracking
    import uuid
    error_id = str(uuid.uuid4())
    
    # Log full error details internally
    logger.error(
        f"Unhandled exception [ID: {error_id}] on {request.method} {request.url.path}",
        exc_info=True,  # Include full stack trace in logs
        extra={
            "error_id": error_id,
            "path": request.url.path,
            "method": request.method,
            "client_host": request.client.host if request.client else None,
            "exception_type": type(exc).__name__,
            "exception_message": str(exc)
        }
    )
    
    # Return generic error to client (no stack trace!)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "status_code": 500,
                "message": "An internal server error occurred. Please contact support if the problem persists.",
                "error_id": error_id,  # Client can report this ID
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "path": request.url.path
            }
        }
    )


async def rate_limit_exception_handler(request: Request, exc: Exception):
    """
    Handle rate limit exceeded errors
    """
    
    logger.warning(
        f"Rate limit exceeded on {request.method} {request.url.path}",
        extra={
            "path": request.url.path,
            "client_host": request.client.host if request.client else None
        }
    )
    
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error": {
                "status_code": 429,
                "message": "Too many requests. Please try again later.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "path": request.url.path,
                "retry_after": "60 seconds"
            }
        },
        headers={
            "Retry-After": "60"
        }
    )
