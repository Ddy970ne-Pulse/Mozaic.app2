"""
Security Monitoring & Alerting - MOZAIK RH
Real-time security event monitoring and alerting
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
import asyncio

logger = logging.getLogger(__name__)


class SecurityMonitor:
    """
    Real-time security monitoring and alerting
    
    Features:
    - Failed login pattern detection
    - Brute force attack detection
    - Suspicious activity monitoring
    - Automated alerts
    - Security metrics dashboard
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.alert_thresholds = {
            "failed_logins_per_ip": 10,  # 10 failures from same IP in window
            "failed_logins_per_user": 5,  # 5 failures for same user
            "lockouts_per_hour": 5,  # 5 lockouts in 1 hour
            "time_window_minutes": 30  # Time window for checks
        }
    
    async def check_brute_force_attack(self) -> List[Dict[str, Any]]:
        """
        Detect potential brute force attacks
        
        Returns:
            List of suspicious IPs/patterns
        """
        since = datetime.now(timezone.utc) - timedelta(minutes=self.alert_thresholds["time_window_minutes"])
        
        # Check audit logs for failed logins
        pipeline = [
            {
                "$match": {
                    "event_type": "login_failed",
                    "timestamp": {"$gte": since}
                }
            },
            {
                "$group": {
                    "_id": "$ip_address",
                    "count": {"$sum": 1},
                    "emails": {"$addToSet": "$user_email"},
                    "latest": {"$max": "$timestamp"}
                }
            },
            {
                "$match": {
                    "count": {"$gte": self.alert_thresholds["failed_logins_per_ip"]}
                }
            },
            {
                "$sort": {"count": -1}
            }
        ]
        
        alerts = await self.db.audit_logs.aggregate(pipeline).to_list(100)
        
        if alerts:
            logger.error(
                f"🚨 BRUTE FORCE DETECTED: {len(alerts)} suspicious IPs with excessive failed logins",
                extra={"alerts": alerts}
            )
        
        return alerts
    
    async def check_account_lockout_spike(self) -> Dict[str, Any]:
        """
        Detect unusual spike in account lockouts
        
        Returns:
            Alert data if spike detected
        """
        since = datetime.now(timezone.utc) - timedelta(hours=1)
        
        # Count lockouts in last hour
        lockout_count = await self.db.audit_logs.count_documents({
            "event_type": "account_locked",
            "timestamp": {"$gte": since}
        })
        
        if lockout_count >= self.alert_thresholds["lockouts_per_hour"]:
            logger.error(
                f"🚨 LOCKOUT SPIKE: {lockout_count} account lockouts in last hour (threshold: {self.alert_thresholds['lockouts_per_hour']})",
                extra={"lockout_count": lockout_count, "threshold": self.alert_thresholds["lockouts_per_hour"]}
            )
            
            return {
                "alert_type": "lockout_spike",
                "severity": "high",
                "count": lockout_count,
                "threshold": self.alert_thresholds["lockouts_per_hour"],
                "time_window": "1 hour",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        return {}
    
    async def check_unusual_data_access(self, user_id: str) -> Dict[str, Any]:
        """
        Detect unusual data access patterns for a user
        
        Args:
            user_id: User ID to check
        
        Returns:
            Alert data if unusual pattern detected
        """
        since = datetime.now(timezone.utc) - timedelta(hours=1)
        
        # Count data access events in last hour
        access_count = await self.db.audit_logs.count_documents({
            "user_id": user_id,
            "event_type": "data_accessed",
            "timestamp": {"$gte": since}
        })
        
        # Threshold: 50 data access events in 1 hour is suspicious
        if access_count > 50:
            logger.warning(
                f"⚠️  UNUSUAL DATA ACCESS: User {user_id} accessed {access_count} records in 1 hour",
                extra={"user_id": user_id, "access_count": access_count}
            )
            
            return {
                "alert_type": "unusual_data_access",
                "severity": "medium",
                "user_id": user_id,
                "access_count": access_count,
                "threshold": 50,
                "time_window": "1 hour",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        return {}
    
    async def get_security_dashboard(self) -> Dict[str, Any]:
        """
        Get security metrics for dashboard
        
        Returns:
            Dashboard metrics
        """
        now = datetime.now(timezone.utc)
        last_24h = now - timedelta(hours=24)
        last_hour = now - timedelta(hours=1)
        
        # Failed logins (last 24h)
        failed_logins_24h = await self.db.audit_logs.count_documents({
            "event_type": "login_failed",
            "timestamp": {"$gte": last_24h}
        })
        
        # Successful logins (last 24h)
        successful_logins_24h = await self.db.audit_logs.count_documents({
            "event_type": "login_success",
            "timestamp": {"$gte": last_24h}
        })
        
        # Account lockouts (last 24h)
        lockouts_24h = await self.db.audit_logs.count_documents({
            "event_type": "account_locked",
            "timestamp": {"$gte": last_24h}
        })
        
        # Security alerts (last 24h)
        security_alerts_24h = await self.db.audit_logs.count_documents({
            "event_type": {"$in": ["security_alert", "suspicious_activity"]},
            "timestamp": {"$gte": last_24h}
        })
        
        # Currently locked accounts
        locked_accounts = await self.db.account_lockouts.count_documents({
            "is_locked": True,
            "locked_until": {"$gt": now}
        })
        
        # Active sessions
        active_sessions = await self.db.refresh_tokens.count_documents({
            "revoked": False,
            "expires_at": {"$gt": now}
        })
        
        # Top IPs by failed logins
        top_failed_ips = await self.db.audit_logs.aggregate([
            {
                "$match": {
                    "event_type": "login_failed",
                    "timestamp": {"$gte": last_24h}
                }
            },
            {
                "$group": {
                    "_id": "$ip_address",
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"count": -1}
            },
            {
                "$limit": 5
            }
        ]).to_list(5)
        
        return {
            "timestamp": now.isoformat(),
            "period": "last_24_hours",
            "metrics": {
                "authentication": {
                    "failed_logins": failed_logins_24h,
                    "successful_logins": successful_logins_24h,
                    "success_rate": round(
                        successful_logins_24h / (successful_logins_24h + failed_logins_24h) * 100, 2
                    ) if (successful_logins_24h + failed_logins_24h) > 0 else 0
                },
                "security": {
                    "account_lockouts": lockouts_24h,
                    "security_alerts": security_alerts_24h,
                    "currently_locked": locked_accounts
                },
                "sessions": {
                    "active_sessions": active_sessions
                },
                "threats": {
                    "top_failed_login_ips": top_failed_ips
                }
            },
            "health_status": self._calculate_health_status(
                failed_logins_24h,
                lockouts_24h,
                security_alerts_24h
            )
        }
    
    def _calculate_health_status(
        self,
        failed_logins: int,
        lockouts: int,
        alerts: int
    ) -> str:
        """
        Calculate overall security health status
        
        Returns:
            "healthy", "warning", or "critical"
        """
        if alerts > 10 or lockouts > 20 or failed_logins > 100:
            return "critical"
        elif alerts > 5 or lockouts > 10 or failed_logins > 50:
            return "warning"
        else:
            return "healthy"
    
    async def run_security_checks(self) -> Dict[str, Any]:
        """
        Run all security checks and return summary
        
        Returns:
            Summary of all checks with alerts
        """
        results = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "checks": {}
        }
        
        # 1. Brute force check
        brute_force_alerts = await self.check_brute_force_attack()
        results["checks"]["brute_force"] = {
            "status": "alert" if brute_force_alerts else "ok",
            "alerts": brute_force_alerts,
            "count": len(brute_force_alerts)
        }
        
        # 2. Lockout spike check
        lockout_alert = await self.check_account_lockout_spike()
        results["checks"]["lockout_spike"] = {
            "status": "alert" if lockout_alert else "ok",
            "alert": lockout_alert
        }
        
        # 3. Overall status
        results["overall_status"] = "alert" if (brute_force_alerts or lockout_alert) else "ok"
        
        return results


# Background monitoring task (to be run periodically)
async def security_monitoring_loop(db: AsyncIOMotorDatabase, interval_minutes: int = 15):
    """
    Continuous security monitoring loop
    
    Args:
        db: MongoDB database
        interval_minutes: Check interval (default: 15 minutes)
    """
    monitor = SecurityMonitor(db)
    
    logger.info(f"🛡️  Security monitoring started (interval: {interval_minutes} minutes)")
    
    while True:
        try:
            # Run security checks
            results = await monitor.run_security_checks()
            
            if results["overall_status"] == "alert":
                logger.error(
                    "🚨 SECURITY ALERT TRIGGERED",
                    extra={"checks": results["checks"]}
                )
                # Here you could send alerts via email, Slack, etc.
            
            # Wait for next check
            await asyncio.sleep(interval_minutes * 60)
            
        except Exception as e:
            logger.error(f"Error in security monitoring loop: {e}", exc_info=True)
            await asyncio.sleep(60)  # Wait 1 minute before retry
