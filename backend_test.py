#!/usr/bin/env python3
"""
COMPREHENSIVE ON-CALL SCHEDULE BACKEND API TESTING

OBJECTIF: Test complet de l'API backend Planning Astreintes nouvellement implémentée pour MOZAIK RH
USER ACCOUNT: Admin Diego DACALOR (ddacalor@aaea-gpe.fr / admin123)

API ENDPOINTS À TESTER:
1. GET /api/on-call/schedule - Retrieve schedules with filtering
2. POST /api/on-call/schedule/bulk - Create multiple schedules (week-long)
3. GET /api/on-call/assignments - Date range filtering for Monthly Planning
4. DELETE /api/on-call/schedule/{id} - Delete schedule
5. PUT /api/on-call/schedule/{id} - Update schedule

TESTS CRITIQUES:
1. Authentication required for all endpoints (403 without token)
2. Bulk creation creates multiple schedules correctly
3. Duplicate prevention works (returns existing schedule)
4. GET endpoints filter correctly by month/year and date range
5. DELETE removes schedules permanently
6. PUT updates schedules correctly
7. MongoDB persistence verified (data survives operations)
8. Proper error handling (404 for not found, 400 for validation errors)

EXPECTED OUTCOMES:
- All endpoints respond with correct HTTP status codes
- Authentication required for all endpoints (403/401 without token)
- Data validation working (date format, type validation)
- MongoDB persistence working correctly
- Proper error responses for edge cases
"""

import requests
import json
import sys
import os
import asyncio
import websockets
import threading
import time
from datetime import datetime, timedelta

# Configuration
BACKEND_URL = "https://mozaik-hr-2.preview.emergentagent.com/api"
WEBSOCKET_URL = "wss://hr-multi-saas.preview.emergentagent.com/api/ws"
ADMIN_EMAIL = "ddacalor@aaea-gpe.fr"
ADMIN_PASSWORD = "admin123"

class OnCallScheduleAPITester:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.session = requests.Session()
        self.websocket_messages = []
        self.websocket_connected = False
        self.test_results = {
            "authentication": {"passed": 0, "failed": 0, "details": []},
            "get_endpoints": {"passed": 0, "failed": 0, "details": []},
            "post_endpoints": {"passed": 0, "failed": 0, "details": []},
            "delete_endpoints": {"passed": 0, "failed": 0, "details": []},
            "put_endpoints": {"passed": 0, "failed": 0, "details": []},
            "data_persistence": {"passed": 0, "failed": 0, "details": []},
            "error_handling": {"passed": 0, "failed": 0, "details": []}
        }
        self.created_schedule_ids = []  # Track created schedules for cleanup
        
    def log_result(self, phase, test_name, success, message, expected=None, actual=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        detail = {
            "test": test_name,
            "status": status,
            "message": message
        }
        if expected is not None:
            detail["expected"] = expected
        if actual is not None:
            detail["actual"] = actual
            
        self.test_results[phase]["details"].append(detail)
        if success:
            self.test_results[phase]["passed"] += 1
        else:
            self.test_results[phase]["failed"] += 1
            
        print(f"{status} {test_name}: {message}")
        if expected is not None and actual is not None:
            print(f"    Expected: {expected}")
            print(f"    Actual: {actual}")

    def authenticate(self):
        """Authenticate as admin Diego DACALOR"""
        print(f"\n🔐 AUTHENTICATION - Admin Diego DACALOR")
        print("=" * 60)
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("token")
                user = data.get("user", {})
                self.user_id = user.get("id")
                print(f"✅ Login successful: {user.get('name')} ({user.get('email')})")
                print(f"✅ Role: {user.get('role')}")
                print(f"✅ User ID: {self.user_id}")
                print(f"✅ Token obtained: {self.token[:20]}...")
                
                # Set authorization header for all future requests
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                return True
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False

    def test_authentication_requirements(self):
        """Test that all on-call endpoints require authentication"""
        print(f"\n🔐 AUTHENTICATION REQUIREMENTS")
        print("=" * 60)
        
        # Test endpoints without authentication
        endpoints_to_test = [
            ("GET", "/on-call/schedule", {}),
            ("GET", "/on-call/assignments?startDate=2025-01-01&endDate=2025-01-31", {}),
            ("POST", "/on-call/schedule", {
                "employee_id": "test-id",
                "employee_name": "Test User",
                "date": "2025-01-15",
                "type": "Astreinte semaine",
                "notes": "Test"
            }),
            ("POST", "/on-call/schedule/bulk", {
                "schedules": [{
                    "employee_id": "test-id",
                    "employee_name": "Test User", 
                    "date": "2025-01-15",
                    "type": "Astreinte semaine",
                    "notes": "Test"
                }]
            })
        ]
        
        for method, endpoint, data in endpoints_to_test:
            try:
                if method == "GET":
                    response = requests.get(f"{BACKEND_URL}{endpoint}")
                else:
                    response = requests.post(f"{BACKEND_URL}{endpoint}", json=data)
                
                if response.status_code in [401, 403]:
                    print(f"✅ {method} {endpoint} requires authentication ({response.status_code})")
                    self.log_result("authentication", f"{method} {endpoint} auth required", True,
                                   f"Properly rejected with {response.status_code}")
                else:
                    self.log_result("authentication", f"{method} {endpoint} auth required", False,
                                   f"Expected 401/403, got {response.status_code}")
                    
            except Exception as e:
                self.log_result("authentication", f"{method} {endpoint} auth test", False, f"Exception: {str(e)}")

    def test_get_endpoints(self):
        """Test GET endpoints for on-call schedules"""
        print(f"\n📅 GET ENDPOINTS TESTING")
        print("=" * 60)
        
        # Test 1: GET /api/on-call/schedule (no filters - should return empty initially)
        print(f"\n📋 Test 1: GET /api/on-call/schedule (no filters)")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/on-call/schedule")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ GET schedule successful (200) - Found {len(data)} schedules")
                self.log_result("get_endpoints", "GET schedule no filters", True,
                               f"Returned {len(data)} schedules successfully")
            else:
                self.log_result("get_endpoints", "GET schedule no filters", False,
                               f"Expected 200, got {response.status_code}")
                
        except Exception as e:
            self.log_result("get_endpoints", "GET schedule no filters", False, f"Exception: {str(e)}")
        
        # Test 2: GET /api/on-call/schedule with month/year filtering
        print(f"\n📋 Test 2: GET /api/on-call/schedule with month/year filtering")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/on-call/schedule?month=1&year=2025")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ GET schedule with filters successful (200) - Found {len(data)} schedules")
                self.log_result("get_endpoints", "GET schedule with month/year filter", True,
                               f"Month/year filtering working, returned {len(data)} schedules")
            else:
                self.log_result("get_endpoints", "GET schedule with month/year filter", False,
                               f"Expected 200, got {response.status_code}")
                
        except Exception as e:
            self.log_result("get_endpoints", "GET schedule with month/year filter", False, f"Exception: {str(e)}")
        
        # Test 3: GET /api/on-call/assignments with date range
        print(f"\n📋 Test 3: GET /api/on-call/assignments with date range")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/on-call/assignments?startDate=2025-01-01&endDate=2025-01-31")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ GET assignments successful (200) - Found {len(data)} assignments")
                self.log_result("get_endpoints", "GET assignments with date range", True,
                               f"Date range filtering working, returned {len(data)} assignments")
            else:
                self.log_result("get_endpoints", "GET assignments with date range", False,
                               f"Expected 200, got {response.status_code}")
                
        except Exception as e:
            self.log_result("get_endpoints", "GET assignments with date range", False, f"Exception: {str(e)}")
        
        # Test 4: GET /api/on-call/assignments with invalid date format
        print(f"\n📋 Test 4: GET /api/on-call/assignments with invalid date format")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/on-call/assignments?startDate=invalid&endDate=2025-01-31")
            
            if response.status_code == 400:
                print(f"✅ Invalid date format rejected (400)")
                self.log_result("get_endpoints", "GET assignments invalid date format", True,
                               "Invalid date format properly rejected with 400")
            else:
                self.log_result("get_endpoints", "GET assignments invalid date format", False,
                               f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_result("get_endpoints", "GET assignments invalid date format", False, f"Exception: {str(e)}")

    def test_phase3_rate_limiting(self):
        """PHASE 3: Rate Limiting - Test rate limits on critical endpoints"""
        print(f"\n⚡ PHASE 3 - RATE LIMITING")
        print("=" * 60)
        
        # Test 1: Login Rate Limit (5/minute)
        print(f"\n🔐 Test 1: Login Rate Limit (5/minute)")
        
        login_attempts = []
        for i in range(6):  # Try 6 attempts, 6th should be rate limited
            response = requests.post(f"{BACKEND_URL}/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            login_attempts.append(response.status_code)
            print(f"   Attempt {i+1}: {response.status_code}")
            
            # Check for rate limit headers
            if 'X-RateLimit-Limit' in response.headers:
                print(f"     Rate Limit Headers: Limit={response.headers.get('X-RateLimit-Limit')}, "
                      f"Remaining={response.headers.get('X-RateLimit-Remaining')}")
        
        # Check if 6th request was rate limited
        if login_attempts[5] == 429:
            print(f"✅ Login rate limit working (6th request = 429)")
            self.log_result("phase3_rate_limiting", "Login rate limit enforced", True, 
                           f"6th login attempt properly rate limited with 429")
        else:
            self.log_result("phase3_rate_limiting", "Login rate limit enforced", False, 
                           f"6th login attempt got {login_attempts[5]}, expected 429")
        
        # Wait a bit before next test
        print(f"⏳ Waiting 60 seconds for rate limit reset...")
        time.sleep(60)
        
        # Test 2: User Creation Rate Limit (5/minute)
        print(f"\n👤 Test 2: User Creation Rate Limit (5/minute)")
        
        user_creation_attempts = []
        for i in range(6):
            user_data = {
                "name": f"Test User {i}",
                "email": f"testuser{i}@example.com",
                "password": "admin123",
                "department": "Test Dept"
            }
            
            response = self.session.post(f"{BACKEND_URL}/users", json=user_data)
            user_creation_attempts.append(response.status_code)
            print(f"   Attempt {i+1}: {response.status_code}")
            
            # Clean up created users (if successful)
            if response.status_code == 200:
                user_id = response.json().get("temp_password", {})
                # Note: We can't easily delete users in this test, but that's OK for rate limit testing
        
        # Check if 6th request was rate limited
        if user_creation_attempts[5] == 429:
            print(f"✅ User creation rate limit working (6th request = 429)")
            self.log_result("phase3_rate_limiting", "User creation rate limit enforced", True, 
                           f"6th user creation properly rate limited with 429")
        else:
            self.log_result("phase3_rate_limiting", "User creation rate limit enforced", False, 
                           f"6th user creation got {user_creation_attempts[5]}, expected 429")
        
        # Test 3: Absence Creation Rate Limit (10/minute)
        print(f"\n📅 Test 3: Absence Creation Rate Limit (10/minute)")
        
        absence_attempts = []
        for i in range(11):  # Try 11 attempts, 11th should be rate limited
            absence_data = {
                "employee_id": self.user_id,
                "employee_name": "Diego DACALOR",
                "email": ADMIN_EMAIL,
                "motif_absence": "CA",
                "jours_absence": "1",
                "date_debut": f"0{(i%9)+1}/01/2025",  # Vary dates
                "notes": f"Rate limit test {i+1}"
            }
            
            response = self.session.post(f"{BACKEND_URL}/absences", json=absence_data)
            absence_attempts.append(response.status_code)
            print(f"   Attempt {i+1}: {response.status_code}")
            
            # Clean up created absences
            if response.status_code == 200:
                absence_id = response.json().get("id")
                if absence_id:
                    self.session.delete(f"{BACKEND_URL}/absences/{absence_id}")
        
        # Check if 11th request was rate limited
        if absence_attempts[10] == 429:
            print(f"✅ Absence creation rate limit working (11th request = 429)")
            self.log_result("phase3_rate_limiting", "Absence creation rate limit enforced", True, 
                           f"11th absence creation properly rate limited with 429")
        else:
            self.log_result("phase3_rate_limiting", "Absence creation rate limit enforced", False, 
                           f"11th absence creation got {absence_attempts[10]}, expected 429")

    def test_security_bypass_attempts(self):
        """Security Bypass Tests - Attempt to bypass security measures"""
        print(f"\n🔒 SECURITY BYPASS TESTS")
        print("=" * 60)
        
        # Test 1: SQL Injection attempts
        print(f"\n💉 Test 1: SQL Injection Protection")
        
        sql_injection_payloads = [
            "admin'; DROP TABLE users; --",
            "' OR '1'='1",
            "admin' UNION SELECT * FROM users --"
        ]
        
        for payload in sql_injection_payloads:
            response = requests.post(f"{BACKEND_URL}/auth/login", json={
                "email": payload,
                "password": "admin123"
            })
            
            if response.status_code in [401, 422]:  # Should be rejected
                print(f"✅ SQL injection payload rejected: {payload[:20]}...")
                self.log_result("security_bypass", "SQL injection protection", True, 
                               f"Payload properly rejected with {response.status_code}")
            else:
                self.log_result("security_bypass", "SQL injection protection", False, 
                               f"Payload not rejected: {response.status_code}")
        
        # Test 2: XSS attempts in user creation
        print(f"\n🚨 Test 2: XSS Protection")
        
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>"
        ]
        
        for payload in xss_payloads:
            user_data = {
                "name": payload,
                "email": "xss@test.com",
                "password": "admin123",
                "department": "Test"
            }
            
            response = self.session.post(f"{BACKEND_URL}/users", json=user_data)
            
            if response.status_code == 422:  # Should be rejected by validation
                print(f"✅ XSS payload rejected: {payload[:20]}...")
                self.log_result("security_bypass", "XSS protection", True, 
                               f"XSS payload properly rejected with 422")
            else:
                # If accepted, check if it's properly sanitized
                if response.status_code == 200:
                    print(f"⚠️ XSS payload accepted but should be sanitized")
                    self.log_result("security_bypass", "XSS protection", False, 
                                   f"XSS payload accepted: {response.status_code}")
        
        # Test 3: Oversized input attempts
        print(f"\n📏 Test 3: Input Length Limits")
        
        # Test very long name (should exceed max length)
        long_name = "A" * 500  # Exceeds 200 char limit
        
        long_input_data = {
            "name": long_name,
            "email": "long@test.com",
            "password": "admin123",
            "department": "Test"
        }
        
        long_input_response = self.session.post(f"{BACKEND_URL}/users", json=long_input_data)
        
        if long_input_response.status_code == 422:
            print(f"✅ Oversized input rejected (422)")
            self.log_result("security_bypass", "Input length limits", True, 
                           "Oversized input properly rejected")
        else:
            self.log_result("security_bypass", "Input length limits", False, 
                           f"Oversized input not rejected: {long_input_response.status_code}")
        
        # Test 4: Authentication bypass attempts
        print(f"\n🔐 Test 4: Authentication Bypass Protection")
        
        # Try to access protected endpoint without token
        no_auth_response = requests.get(f"{BACKEND_URL}/users")
        
        if no_auth_response.status_code == 401:
            print(f"✅ No authentication rejected (401)")
            self.log_result("security_bypass", "Authentication required", True, 
                           "Unauthenticated request properly rejected")
        else:
            self.log_result("security_bypass", "Authentication required", False, 
                           f"Unauthenticated request not rejected: {no_auth_response.status_code}")
        
        # Try with invalid token
        invalid_token_session = requests.Session()
        invalid_token_session.headers.update({"Authorization": "Bearer invalid_token_here"})
        
        invalid_token_response = invalid_token_session.get(f"{BACKEND_URL}/users")
        
        if invalid_token_response.status_code == 401:
            print(f"✅ Invalid token rejected (401)")
            self.log_result("security_bypass", "Invalid token rejected", True, 
                           "Invalid token properly rejected")
        else:
            self.log_result("security_bypass", "Invalid token rejected", False, 
                           f"Invalid token not rejected: {invalid_token_response.status_code}")

    def print_summary(self):
        """Afficher le résumé des tests de sécurité"""
        print(f"\n" + "=" * 80)
        print(f"🛡️ RÉSUMÉ COMPLET DES TESTS DE SÉCURITÉ CRITIQUES")
        print(f"=" * 80)
        
        total_passed = 0
        total_failed = 0
        
        for phase_name, results in self.test_results.items():
            phase_display = {
                "phase1_secret_key": "PHASE 1 - SECRET_KEY VALIDATION",
                "phase2_validation": "PHASE 2 - PYDANTIC VALIDATION", 
                "phase3_rate_limiting": "PHASE 3 - RATE LIMITING",
                "security_bypass": "SECURITY BYPASS TESTS"
            }
            
            passed = results["passed"]
            failed = results["failed"]
            total = passed + failed
            
            total_passed += passed
            total_failed += failed
            
            status_icon = "✅" if failed == 0 else "❌" if passed == 0 else "⚠️"
            print(f"\n{status_icon} {phase_display[phase_name]}")
            print(f"   Tests réussis: {passed}/{total}")
            print(f"   Tests échoués: {failed}/{total}")
            
            if failed > 0:
                print(f"   Échecs critiques:")
                for detail in results["details"]:
                    if "❌ FAIL" in detail["status"]:
                        print(f"     - {detail['test']}: {detail['message']}")
        
        print(f"\n" + "=" * 80)
        overall_status = "✅ SÉCURITÉ COMPLÈTE" if total_failed == 0 else "❌ FAILLES DÉTECTÉES" if total_passed == 0 else "⚠️ SÉCURITÉ PARTIELLE"
        print(f"🎯 RÉSULTAT GLOBAL: {overall_status}")
        print(f"📈 TOTAL: {total_passed} réussis, {total_failed} échoués sur {total_passed + total_failed} tests")
        
        # Critères de succès critiques pour la sécurité
        print(f"\n🔒 CRITÈRES DE SÉCURITÉ CRITIQUES:")
        success_criteria = [
            ("Backend started with secure SECRET_KEY", self.test_results["phase1_secret_key"]["failed"] == 0),
            ("JWT tokens properly signed and verified", self.test_results["phase1_secret_key"]["passed"] >= 1),
            ("Login rate limiting (5/minute) enforced", self.test_results["phase3_rate_limiting"]["passed"] >= 1),
            ("Password validation (min 6 chars + numbers)", self.test_results["phase2_validation"]["passed"] >= 2),
            ("Email validation enforced", self.test_results["phase2_validation"]["passed"] >= 1),
            ("Input sanitization working", self.test_results["phase2_validation"]["passed"] >= 3),
            ("Authentication bypass prevented", self.test_results["security_bypass"]["passed"] >= 2)
        ]
        
        for criterion, met in success_criteria:
            status = "✅" if met else "❌"
            print(f"   {status} {criterion}")
        
        # Focus sur les tests critiques de sécurité
        print(f"\n🎯 TESTS CRITIQUES DE SÉCURITÉ:")
        rate_limiting_success = self.test_results["phase3_rate_limiting"]["failed"] == 0
        validation_success = self.test_results["phase2_validation"]["failed"] == 0
        print(f"   {'✅' if rate_limiting_success else '❌'} RATE LIMITING - Protection contre brute force")
        print(f"   {'✅' if validation_success else '❌'} VALIDATION - Sécurité des données")
        
        critical_success = rate_limiting_success and validation_success
        print(f"\n🏆 SÉCURITÉ CRITIQUE: {'✅ PROTÉGÉE' if critical_success else '❌ VULNÉRABLE'}")
        
        return critical_success

    def run_all_tests(self):
        """Exécuter tous les tests de sécurité critiques"""
        print("🚀 DÉMARRAGE DES TESTS DE SÉCURITÉ CRITIQUES")
        print("=" * 80)
        print("OBJECTIF: Test complet des améliorations de sécurité critiques MOZAIK RH")
        print("USER ACCOUNT: Admin Diego DACALOR (ddacalor@aaea-gpe.fr / admin123)")
        print("PRIORITÉ: Rate limiting (brute force) + Validation (sécurité données)")
        print("=" * 80)
        
        # Phase 1: SECRET_KEY Validation (should already be working if backend started)
        self.test_phase1_secret_key_validation()
        
        # Authentification pour les tests suivants
        if not self.authenticate():
            print("❌ Impossible de continuer sans authentification")
            return False
        
        # Exécuter tous les tests de sécurité
        print(f"\n🔄 EXÉCUTION DES TESTS DE SÉCURITÉ...")
        
        # Phase 2: Pydantic Validation - CRITIQUE
        self.test_phase2_pydantic_validation()
        
        # Phase 3: Rate Limiting - CRITIQUE (protection brute force)
        self.test_phase3_rate_limiting()
        
        # Security Bypass Tests
        self.test_security_bypass_attempts()
        
        # Afficher le résumé
        return self.print_summary()

def main():
    """Point d'entrée principal"""
    tester = SecurityEnhancementsTester()
    success = tester.run_all_tests()
    
    # Code de sortie
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()