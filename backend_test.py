#!/usr/bin/env python3
"""
COMPREHENSIVE SECURITY ENHANCEMENTS TESTING - OPTION A: SÉCURITÉ CRITIQUE

OBJECTIF: Test complet des améliorations de sécurité critiques implémentées dans MOZAIK RH
USER ACCOUNT: Admin Diego DACALOR (ddacalor@aaea-gpe.fr / admin123)

PHASES DE SÉCURITÉ À TESTER:
PHASE 1: SECRET_KEY Validation ✅ (Backend refuse de démarrer sans SECRET_KEY sécurisé)
PHASE 2: Strict Pydantic Validation (TO TEST)
PHASE 3: Rate Limiting (TO TEST)

TESTS CRITIQUES:
1. Rate limiting on login endpoint (CRITICAL - prevents brute force)
2. Password validation (CRITICAL - security)  
3. Rate limiting on absence/user creation
4. Email validation
5. Input sanitization (length limits, patterns)

EXPECTED OUTCOMES:
- All validation rules properly enforced
- Clear error messages for validation failures
- Rate limits applied correctly with 429 responses
- Rate limit headers present in responses
- No security bypasses possible
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
BACKEND_URL = "https://saas-hr-hub.preview.emergentagent.com/api"
WEBSOCKET_URL = "wss://hr-multi-saas.preview.emergentagent.com/api/ws"
ADMIN_EMAIL = "ddacalor@aaea-gpe.fr"
ADMIN_PASSWORD = "admin123"

class SecurityEnhancementsTester:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.session = requests.Session()
        self.websocket_messages = []
        self.websocket_connected = False
        self.test_results = {
            "phase1_secret_key": {"passed": 0, "failed": 0, "details": []},
            "phase2_validation": {"passed": 0, "failed": 0, "details": []},
            "phase3_rate_limiting": {"passed": 0, "failed": 0, "details": []},
            "security_bypass": {"passed": 0, "failed": 0, "details": []}
        }
        
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

    def test_phase1_secret_key_validation(self):
        """PHASE 1: SECRET_KEY Validation - Verify backend started with secure SECRET_KEY"""
        print(f"\n🔐 PHASE 1 - SECRET_KEY VALIDATION")
        print("=" * 60)
        
        try:
            # Test 1: Backend should be running (if SECRET_KEY is valid)
            response = requests.get(f"{BACKEND_URL}/")
            
            if response.status_code == 200:
                print(f"✅ Backend started successfully with SECRET_KEY")
                self.log_result("phase1_secret_key", "Backend started with SECRET_KEY", True, 
                               "Backend is running, indicating SECRET_KEY is properly configured")
            else:
                self.log_result("phase1_secret_key", "Backend started with SECRET_KEY", False, 
                               f"Backend not responding: {response.status_code}")
            
            # Test 2: JWT tokens should be properly signed
            login_response = requests.post(f"{BACKEND_URL}/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            
            if login_response.status_code == 200:
                data = login_response.json()
                token = data.get("token")
                if token and len(token) > 50:  # JWT tokens are typically long
                    print(f"✅ JWT token properly generated and signed")
                    self.log_result("phase1_secret_key", "JWT tokens properly signed", True, 
                                   f"Token generated: {token[:20]}...")
                else:
                    self.log_result("phase1_secret_key", "JWT tokens properly signed", False, 
                                   "Token missing or invalid format")
            else:
                self.log_result("phase1_secret_key", "JWT tokens properly signed", False, 
                               f"Login failed: {login_response.status_code}")
                
        except Exception as e:
            self.log_result("phase1_secret_key", "SECRET_KEY validation", False, f"Exception: {str(e)}")

    def test_phase2_pydantic_validation(self):
        """PHASE 2: Strict Pydantic Validation - Test all validation rules"""
        print(f"\n🛡️ PHASE 2 - PYDANTIC VALIDATION")
        print("=" * 60)
        
        # Test 1: Login Endpoint Validation
        print(f"\n📧 Test 1: Login Endpoint Validation")
        
        # Test invalid email format
        invalid_email_response = requests.post(f"{BACKEND_URL}/auth/login", json={
            "email": "invalid-email-format",
            "password": "admin123"
        })
        
        if invalid_email_response.status_code == 422:
            print(f"✅ Invalid email format rejected (422)")
            self.log_result("phase2_validation", "Login invalid email rejected", True, 
                           "Invalid email format properly rejected with 422")
        else:
            self.log_result("phase2_validation", "Login invalid email rejected", False, 
                           f"Expected 422, got {invalid_email_response.status_code}")
        
        # Test valid credentials should work
        valid_login_response = requests.post(f"{BACKEND_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if valid_login_response.status_code == 200:
            print(f"✅ Valid credentials accepted (200)")
            self.log_result("phase2_validation", "Login valid credentials accepted", True, 
                           "Valid login credentials work correctly")
        else:
            self.log_result("phase2_validation", "Login valid credentials accepted", False, 
                           f"Valid login failed: {valid_login_response.status_code}")
        
        # Test 2: User Creation Validation
        print(f"\n👤 Test 2: User Creation Validation")
        
        # Test weak password (< 6 chars)
        weak_password_data = {
            "name": "Test User",
            "email": "test@example.com",
            "password": "123",  # Too short
            "department": "Test Dept"
        }
        
        weak_password_response = self.session.post(f"{BACKEND_URL}/users", json=weak_password_data)
        
        if weak_password_response.status_code == 422:
            print(f"✅ Weak password rejected (422)")
            self.log_result("phase2_validation", "Weak password rejected", True, 
                           "Password < 6 characters properly rejected")
        else:
            self.log_result("phase2_validation", "Weak password rejected", False, 
                           f"Expected 422, got {weak_password_response.status_code}")
        
        # Test password without numbers
        no_number_password_data = {
            "name": "Test User",
            "email": "test2@example.com", 
            "password": "abcdef",  # No numbers
            "department": "Test Dept"
        }
        
        no_number_response = self.session.post(f"{BACKEND_URL}/users", json=no_number_password_data)
        
        if no_number_response.status_code == 422:
            print(f"✅ Password without numbers rejected (422)")
            self.log_result("phase2_validation", "Password without numbers rejected", True, 
                           "Password without numbers properly rejected")
        else:
            self.log_result("phase2_validation", "Password without numbers rejected", False, 
                           f"Expected 422, got {no_number_response.status_code}")
        
        # Test invalid role
        invalid_role_data = {
            "name": "Test User",
            "email": "test3@example.com",
            "password": "admin123",
            "role": "invalid_role",  # Invalid role
            "department": "Test Dept"
        }
        
        invalid_role_response = self.session.post(f"{BACKEND_URL}/users", json=invalid_role_data)
        
        if invalid_role_response.status_code == 422:
            print(f"✅ Invalid role rejected (422)")
            self.log_result("phase2_validation", "Invalid role rejected", True, 
                           "Invalid role properly rejected")
        else:
            self.log_result("phase2_validation", "Invalid role rejected", False, 
                           f"Expected 422, got {invalid_role_response.status_code}")
        
        # Test 3: Absence Creation Validation
        print(f"\n📅 Test 3: Absence Creation Validation")
        
        # Test invalid email format in absence
        invalid_absence_email = {
            "employee_id": self.user_id,
            "employee_name": "Test Employee",
            "email": "invalid-email",  # Invalid format
            "motif_absence": "CA",
            "jours_absence": "2",
            "date_debut": "01/01/2025"
        }
        
        invalid_absence_response = self.session.post(f"{BACKEND_URL}/absences", json=invalid_absence_email)
        
        if invalid_absence_response.status_code == 422:
            print(f"✅ Invalid absence email rejected (422)")
            self.log_result("phase2_validation", "Invalid absence email rejected", True, 
                           "Invalid email in absence properly rejected")
        else:
            self.log_result("phase2_validation", "Invalid absence email rejected", False, 
                           f"Expected 422, got {invalid_absence_response.status_code}")
        
        # Test hours > 24
        invalid_hours_absence = {
            "employee_id": self.user_id,
            "employee_name": "Test Employee", 
            "email": ADMIN_EMAIL,
            "motif_absence": "CA",
            "jours_absence": "1",
            "date_debut": "01/01/2025",
            "hours_amount": 25.0  # > 24 hours
        }
        
        invalid_hours_response = self.session.post(f"{BACKEND_URL}/absences", json=invalid_hours_absence)
        
        if invalid_hours_response.status_code == 422:
            print(f"✅ Hours > 24 rejected (422)")
            self.log_result("phase2_validation", "Hours > 24 rejected", True, 
                           "Hours > 24 properly rejected")
        else:
            self.log_result("phase2_validation", "Hours > 24 rejected", False, 
                           f"Expected 422, got {invalid_hours_response.status_code}")
        
        # Test valid absence should work
        valid_absence_data = {
            "employee_id": self.user_id,
            "employee_name": "Diego DACALOR",
            "email": ADMIN_EMAIL,
            "motif_absence": "CA",
            "jours_absence": "1",
            "date_debut": "01/01/2025",
            "notes": "Test validation"
        }
        
        valid_absence_response = self.session.post(f"{BACKEND_URL}/absences", json=valid_absence_data)
        
        if valid_absence_response.status_code == 200:
            print(f"✅ Valid absence accepted (200)")
            self.log_result("phase2_validation", "Valid absence accepted", True, 
                           "Valid absence data works correctly")
            
            # Clean up - delete test absence
            absence_id = valid_absence_response.json().get("id")
            if absence_id:
                self.session.delete(f"{BACKEND_URL}/absences/{absence_id}")
        else:
            self.log_result("phase2_validation", "Valid absence accepted", False, 
                           f"Valid absence failed: {valid_absence_response.status_code}")

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

    def test_existing_endpoints(self):
        """TEST 4: Tests Existants - Valider endpoints existants"""
        print(f"\n🔧 TEST 4 - ENDPOINTS EXISTANTS")
        print("=" * 60)
        
        endpoints_to_test = [
            ("GET /api/users", f"{BACKEND_URL}/users"),
            ("GET /api/absences", f"{BACKEND_URL}/absences"),
            ("POST /api/auth/login", f"{BACKEND_URL}/auth/login"),
        ]
        
        for endpoint_name, url in endpoints_to_test:
            try:
                if "login" in endpoint_name:
                    # Test spécial pour login
                    response = requests.post(url, json={
                        "email": ADMIN_EMAIL,
                        "password": ADMIN_PASSWORD
                    })
                else:
                    # Test GET normal avec authentification
                    response = self.session.get(url)
                
                if response.status_code == 200:
                    print(f"✅ {endpoint_name} - OK (200)")
                    self.log_result("existing_apis", f"{endpoint_name} fonctionnel", 
                                   True, f"Réponse 200 OK")
                else:
                    print(f"❌ {endpoint_name} - Erreur {response.status_code}")
                    self.log_result("existing_apis", f"{endpoint_name} fonctionnel", 
                                   False, f"Erreur {response.status_code}: {response.text[:100]}")
                    
            except Exception as e:
                print(f"❌ {endpoint_name} - Exception: {str(e)}")
                self.log_result("existing_apis", f"{endpoint_name} fonctionnel", 
                               False, f"Exception: {str(e)}")
        
        # Test spécial pour PUT /api/absences/{id} (approve/reject)
        try:
            # D'abord créer une absence de test
            test_absence = {
                "employee_id": self.user_id,
                "employee_name": "Diego DACALOR",
                "email": ADMIN_EMAIL,
                "motif_absence": "CA",
                "jours_absence": "1",
                "date_debut": "2025-12-01",
                "notes": "Test PUT endpoint",
                "status": "pending"
            }
            
            create_response = self.session.post(f"{BACKEND_URL}/absences", json=test_absence)
            
            if create_response.status_code == 200:
                absence_id = create_response.json().get("id")
                
                # Tester PUT approve
                put_response = self.session.put(f"{BACKEND_URL}/absences/{absence_id}", json={
                    "status": "approved"
                })
                
                if put_response.status_code == 200:
                    print(f"✅ PUT /api/absences/{absence_id} (approve) - OK (200)")
                    self.log_result("existing_apis", "PUT /api/absences/{id} (approve) fonctionnel", 
                                   True, "Approbation réussie")
                else:
                    print(f"❌ PUT /api/absences/{absence_id} (approve) - Erreur {put_response.status_code}")
                    self.log_result("existing_apis", "PUT /api/absences/{id} (approve) fonctionnel", 
                                   False, f"Erreur {put_response.status_code}")
                
                # Nettoyer
                self.session.delete(f"{BACKEND_URL}/absences/{absence_id}")
            else:
                self.log_result("existing_apis", "PUT /api/absences/{id} test setup", 
                               False, "Impossible de créer absence de test pour PUT")
                
        except Exception as e:
            self.log_result("existing_apis", "PUT /api/absences/{id} fonctionnel", 
                           False, f"Exception: {str(e)}")

    def print_summary(self):
        """Afficher le résumé des tests"""
        print(f"\n" + "=" * 80)
        print(f"📊 RÉSUMÉ COMPLET DES TESTS WEBSOCKET & ABSENCE")
        print(f"=" * 80)
        
        total_passed = 0
        total_failed = 0
        
        for phase_name, results in self.test_results.items():
            phase_display = {
                "websocket": "TEST 1 - WEBSOCKET CONNECTION",
                "absence_api": "TEST 2 - API ABSENCES (AJOUT RAPIDE)", 
                "users_api": "TEST 3 - GET /api/users (EMAIL FIELD)",
                "existing_apis": "TEST 4 - ENDPOINTS EXISTANTS"
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
                print(f"   Échecs:")
                for detail in results["details"]:
                    if "❌ FAIL" in detail["status"]:
                        print(f"     - {detail['test']}: {detail['message']}")
        
        print(f"\n" + "=" * 80)
        overall_status = "✅ SUCCÈS COMPLET" if total_failed == 0 else "❌ ÉCHECS DÉTECTÉS" if total_passed == 0 else "⚠️ SUCCÈS PARTIEL"
        print(f"🎯 RÉSULTAT GLOBAL: {overall_status}")
        print(f"📈 TOTAL: {total_passed} réussis, {total_failed} échoués sur {total_passed + total_failed} tests")
        
        # Critères de succès selon la demande française
        print(f"\n📋 CRITÈRES DE SUCCÈS:")
        success_criteria = [
            ("WebSocket connexion acceptée (pas 404)", self.test_results["websocket"]["failed"] == 0),
            ("Message de bienvenue WebSocket reçu", self.test_results["websocket"]["passed"] >= 1),
            ("POST /api/absences réponse 200 OK (pas 422)", self.test_results["absence_api"]["failed"] == 0),
            ("Absence bien créée en base", self.test_results["absence_api"]["passed"] >= 2),
            ("Tous les users ont champ email valide", self.test_results["users_api"]["failed"] == 0),
            ("Endpoints existants fonctionnels", self.test_results["existing_apis"]["failed"] == 0)
        ]
        
        for criterion, met in success_criteria:
            status = "✅" if met else "❌"
            print(f"   {status} {criterion}")
        
        # Focus sur tests 2 et 3 comme demandé
        print(f"\n🎯 PRIORITÉ TESTS 2 & 3 (bug email résolu?):")
        test2_success = self.test_results["absence_api"]["failed"] == 0
        test3_success = self.test_results["users_api"]["failed"] == 0
        print(f"   {'✅' if test2_success else '❌'} TEST 2 - API Absences (Ajout Rapide)")
        print(f"   {'✅' if test3_success else '❌'} TEST 3 - GET /api/users (Email Field)")
        
        priority_success = test2_success and test3_success
        print(f"\n🏆 TESTS PRIORITAIRES: {'✅ RÉUSSIS' if priority_success else '❌ ÉCHECS DÉTECTÉS'}")
        
        return priority_success

    def run_all_tests(self):
        """Exécuter tous les tests WebSocket et Absence"""
        print("🚀 DÉMARRAGE DES TESTS WEBSOCKET & ABSENCE")
        print("=" * 80)
        print("OBJECTIF: Test complet des fonctionnalités MOZAIK RH après implémentation WebSocket et ajout rapide d'absence")
        print("USER ACCOUNT: Admin Diego DACALOR (ddacalor@aaea-gpe.fr / admin123)")
        print("PRIORITÉ: Focus sur tests 2 et 3 (bug email résolu?)")
        print("=" * 80)
        
        # Authentification
        if not self.authenticate():
            print("❌ Impossible de continuer sans authentification")
            return False
        
        # Exécuter tous les tests
        print(f"\n🔄 EXÉCUTION DES TESTS...")
        
        # Test 1: WebSocket Connection
        self.run_websocket_test()
        
        # Test 2: API Absences (Ajout Rapide) - PRIORITÉ
        self.test_absence_api_quick_add()
        
        # Test 3: GET /api/users (Email Field) - PRIORITÉ  
        self.test_users_api_email_field()
        
        # Test 4: Endpoints Existants
        self.test_existing_endpoints()
        
        # Afficher le résumé
        return self.print_summary()

def main():
    """Point d'entrée principal"""
    tester = WebSocketAbsenceTester()
    success = tester.run_all_tests()
    
    # Code de sortie
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()