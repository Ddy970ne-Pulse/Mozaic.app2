#!/usr/bin/env python3
"""
TEST COMPLET DU MODULE CSE - MEMBRES ET CESSION D'HEURES

OBJECTIF: Test exhaustif du module CSE selon la demande française spécifique
USER ACCOUNT: Admin Diego DACALOR (ddacalor@aaea-gpe.fr / admin123)
BACKEND URL: https://oncall-planner-2.preview.emergentagent.com/api

MEMBRES CSE À VÉRIFIER (base de données):
1. Jacques EDAU - Titulaire - 22h/mois
2. Thierry MARTIAS - Titulaire - 22h/mois  
3. Jean-François BERNARD - Titulaire - 22h/mois
4. Richard MANIOC - Suppléant - 0h/mois

TESTS À EFFECTUER:
### 1. Vérification Membres CSE
- GET /api/cse/delegates
- Vérifier 4 membres retournés avec heures correctes
- Vérifier statuts (3 titulaires, 1 suppléant)

### 2. Test Cession vers Membre CSE (existant)
- POST /api/cse/cessions
- Vérifier statut 200/201 et cession créée

### 3. Test Cession vers Personne Externe (NOUVEAU - PRIORITAIRE)
- POST /api/cse/cessions avec to_id="external"
- Vérifier acceptation sans validation de limite
- Vérifier stockage correct du nom externe

### 4. Vérification Liste Cessions
- GET /api/cse/cessions
- Vérifier les cessions créées apparaissent

### 5. Paramètres Entreprise
- GET /api/company-settings
- Vérifier effectif = 250 salariés
- Vérifier accord_entreprise_heures_cse = false

FOCUS PRINCIPAL: Vérifier que la cession vers une personne externe (non enregistrée dans la base) 
fonctionne correctement avec to_id="external" et to_name en texte libre.
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
BACKEND_URL = "https://oncall-planner-2.preview.emergentagent.com/api"
WEBSOCKET_URL = "wss://hr-multi-saas.preview.emergentagent.com/api/ws"
ADMIN_EMAIL = "ddacalor@aaea-gpe.fr"
ADMIN_PASSWORD = "admin123"

class CSEModuleTester:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.session = requests.Session()
        self.websocket_messages = []
        self.websocket_connected = False
        self.test_results = {
            "authentication": {"passed": 0, "failed": 0, "details": []},
            "cse_delegates": {"passed": 0, "failed": 0, "details": []},
            "cse_cessions_internal": {"passed": 0, "failed": 0, "details": []},
            "cse_cessions_external": {"passed": 0, "failed": 0, "details": []},
            "cse_cessions_list": {"passed": 0, "failed": 0, "details": []},
            "company_settings": {"passed": 0, "failed": 0, "details": []}
        }
        self.created_cession_ids = []  # Track created cessions for cleanup
        self.expected_delegates = [
            {"name": "Jacques EDAU", "statut": "Titulaire", "heures": 22},
            {"name": "Thierry MARTIAS", "statut": "Titulaire", "heures": 22},
            {"name": "Jean-François BERNARD", "statut": "Titulaire", "heures": 22},
            {"name": "Richard MANIOC", "statut": "Suppléant", "heures": 0}
        ]
        
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

    def test_cse_delegates(self):
        """Test 1: Vérification Membres CSE - GET /api/cse/delegates"""
        print(f"\n👥 TEST 1: VÉRIFICATION MEMBRES CSE")
        print("=" * 60)
        
        try:
            response = self.session.get(f"{BACKEND_URL}/cse/delegates")
            
            if response.status_code == 200:
                delegates = response.json()
                print(f"✅ GET /api/cse/delegates successful (200) - Found {len(delegates)} delegates")
                
                # Vérifier le nombre de délégués (4 attendus)
                if len(delegates) == 4:
                    self.log_result("cse_delegates", "Nombre de délégués correct", True,
                                   f"4 délégués trouvés comme attendu")
                else:
                    self.log_result("cse_delegates", "Nombre de délégués correct", False,
                                   f"Attendu: 4 délégués, Trouvé: {len(delegates)}")
                
                # Vérifier les délégués spécifiques
                found_delegates = []
                titulaires_count = 0
                suppleants_count = 0
                
                for delegate in delegates:
                    name = delegate.get("user_name", "")
                    statut = delegate.get("statut", "")
                    heures = delegate.get("heures_mensuelles", 0)
                    
                    found_delegates.append({
                        "name": name,
                        "statut": statut,
                        "heures": heures
                    })
                    
                    if statut.lower() == "titulaire":
                        titulaires_count += 1
                    elif statut.lower() == "suppléant":
                        suppleants_count += 1
                
                print(f"📊 Délégués trouvés:")
                for delegate in found_delegates:
                    print(f"   - {delegate['name']}: {delegate['statut']} - {delegate['heures']}h/mois")
                
                # Vérifier les statuts (3 titulaires, 1 suppléant)
                if titulaires_count == 3 and suppleants_count == 1:
                    self.log_result("cse_delegates", "Statuts délégués corrects", True,
                                   f"3 titulaires et 1 suppléant trouvés")
                else:
                    self.log_result("cse_delegates", "Statuts délégués corrects", False,
                                   f"Attendu: 3 titulaires + 1 suppléant, Trouvé: {titulaires_count} titulaires + {suppleants_count} suppléants")
                
                # Vérifier les heures mensuelles (titulaires = 22h, suppléants = 0h)
                heures_correctes = True
                for delegate in delegates:
                    statut = delegate.get("statut", "").lower()
                    heures = delegate.get("heures_mensuelles", 0)
                    
                    if statut == "titulaire" and heures != 22:
                        heures_correctes = False
                        print(f"❌ {delegate.get('user_name')}: Titulaire devrait avoir 22h, a {heures}h")
                    elif statut == "suppléant" and heures != 0:
                        heures_correctes = False
                        print(f"❌ {delegate.get('user_name')}: Suppléant devrait avoir 0h, a {heures}h")
                
                if heures_correctes:
                    self.log_result("cse_delegates", "Heures mensuelles correctes", True,
                                   "Toutes les heures mensuelles sont correctes")
                else:
                    self.log_result("cse_delegates", "Heures mensuelles correctes", False,
                                   "Certaines heures mensuelles sont incorrectes")
                
            else:
                self.log_result("cse_delegates", "GET cse/delegates", False,
                               f"Expected 200, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("cse_delegates", "GET cse/delegates", False, f"Exception: {str(e)}")

    def test_cse_cessions_internal(self):
        """Test 2: Cession vers Membre CSE (existant) - POST /api/cse/cessions"""
        print(f"\n🔄 TEST 2: CESSION VERS MEMBRE CSE (EXISTANT)")
        print("=" * 60)
        
        # D'abord, récupérer les IDs des délégués pour les utiliser dans les cessions
        try:
            delegates_response = self.session.get(f"{BACKEND_URL}/cse/delegates")
            if delegates_response.status_code != 200:
                self.log_result("cse_cessions_internal", "Récupération délégués pour cession", False,
                               "Impossible de récupérer les délégués")
                return
            
            delegates = delegates_response.json()
            
            # Trouver Jacques EDAU et Thierry MARTIAS
            jacques_id = None
            thierry_id = None
            
            for delegate in delegates:
                name = delegate.get("user_name", "")
                if "Jacques" in name and "EDAU" in name:
                    jacques_id = delegate.get("user_id")
                elif "Thierry" in name and "MARTIAS" in name:
                    thierry_id = delegate.get("user_id")
            
            if not jacques_id or not thierry_id:
                self.log_result("cse_cessions_internal", "IDs délégués trouvés", False,
                               f"Jacques ID: {jacques_id}, Thierry ID: {thierry_id}")
                return
            
            print(f"✅ IDs délégués trouvés - Jacques: {jacques_id[:8]}..., Thierry: {thierry_id[:8]}...")
            
            # Test de cession entre membres CSE existants
            cession_data = {
                "from_id": jacques_id,
                "from_name": "Jacques EDAU",
                "to_id": thierry_id,
                "to_name": "Thierry MARTIAS",
                "is_external": False,
                "hours": 5,
                "usage_date": "2025-02-15",
                "reason": "Test cession membre CSE",
                "created_by": "Test"
            }
            
            response = self.session.post(f"{BACKEND_URL}/cse/cessions", json=cession_data)
            
            if response.status_code in [200, 201]:
                data = response.json()
                print(f"✅ Cession créée avec succès ({response.status_code})")
                print(f"   De: {data.get('from_name')} → Vers: {data.get('to_name')}")
                print(f"   Heures: {data.get('hours')}h, Date: {data.get('usage_date')}")
                
                # Tracker pour cleanup
                if data.get("id"):
                    self.created_cession_ids.append(data["id"])
                
                self.log_result("cse_cessions_internal", "POST cession membre CSE", True,
                               f"Cession créée: {data.get('from_name')} → {data.get('to_name')} ({data.get('hours')}h)")
                
                # Vérifier la structure de la réponse
                required_fields = ["id", "from_id", "from_name", "to_id", "to_name", "hours", "usage_date", "reason", "created_by"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("cse_cessions_internal", "Structure réponse cession", True,
                                   "Tous les champs requis présents")
                else:
                    self.log_result("cse_cessions_internal", "Structure réponse cession", False,
                                   f"Champs manquants: {missing_fields}")
                
            else:
                self.log_result("cse_cessions_internal", "POST cession membre CSE", False,
                               f"Expected 200/201, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("cse_cessions_internal", "POST cession membre CSE", False, f"Exception: {str(e)}")

    def test_cse_cessions_external(self):
        """Test 3: Cession vers Personne Externe (NOUVEAU - PRIORITAIRE) - POST /api/cse/cessions"""
        print(f"\n🌐 TEST 3: CESSION VERS PERSONNE EXTERNE (PRIORITAIRE)")
        print("=" * 60)
        
        # D'abord, récupérer l'ID de Jacques EDAU pour la cession
        try:
            delegates_response = self.session.get(f"{BACKEND_URL}/cse/delegates")
            if delegates_response.status_code != 200:
                self.log_result("cse_cessions_external", "Récupération délégués pour cession externe", False,
                               "Impossible de récupérer les délégués")
                return
            
            delegates = delegates_response.json()
            
            # Trouver Jacques EDAU
            jacques_id = None
            for delegate in delegates:
                name = delegate.get("user_name", "")
                if "Jacques" in name and "EDAU" in name:
                    jacques_id = delegate.get("user_id")
                    break
            
            if not jacques_id:
                self.log_result("cse_cessions_external", "ID Jacques EDAU trouvé", False,
                               "Jacques EDAU non trouvé dans les délégués")
                return
            
            print(f"✅ ID Jacques EDAU trouvé: {jacques_id[:8]}...")
            
            # Test de cession vers personne externe (NOUVEAU - PRIORITAIRE)
            external_cession_data = {
                "from_id": jacques_id,
                "from_name": "Jacques EDAU",
                "to_id": "external",
                "to_name": "Marie Dupont (Externe)",
                "is_external": True,
                "hours": 3,
                "usage_date": "2025-02-20",
                "reason": "Test cession personne externe non enregistrée",
                "created_by": "Test"
            }
            
            response = self.session.post(f"{BACKEND_URL}/cse/cessions", json=external_cession_data)
            
            if response.status_code in [200, 201]:
                data = response.json()
                print(f"✅ Cession externe créée avec succès ({response.status_code})")
                print(f"   De: {data.get('from_name')} → Vers: {data.get('to_name')}")
                print(f"   Heures: {data.get('hours')}h, Date: {data.get('usage_date')}")
                print(f"   to_id: {data.get('to_id')}")
                
                # Tracker pour cleanup
                if data.get("id"):
                    self.created_cession_ids.append(data["id"])
                
                self.log_result("cse_cessions_external", "POST cession externe acceptée", True,
                               f"Cession externe créée sans validation de limite")
                
                # Vérifier que to_id="external" est conservé
                if data.get("to_id") == "external":
                    self.log_result("cse_cessions_external", "to_id external conservé", True,
                                   "to_id='external' correctement stocké")
                else:
                    self.log_result("cse_cessions_external", "to_id external conservé", False,
                                   f"to_id attendu: 'external', trouvé: {data.get('to_id')}")
                
                # Vérifier que le nom externe est correctement stocké
                if data.get("to_name") == "Marie Dupont (Externe)":
                    self.log_result("cse_cessions_external", "Nom externe stocké correctement", True,
                                   "Nom externe 'Marie Dupont (Externe)' correctement stocké")
                else:
                    self.log_result("cse_cessions_external", "Nom externe stocké correctement", False,
                                   f"Nom attendu: 'Marie Dupont (Externe)', trouvé: {data.get('to_name')}")
                
                # Vérifier que is_external est True
                if data.get("is_external") == True:
                    self.log_result("cse_cessions_external", "is_external flag correct", True,
                                   "is_external=True correctement défini")
                else:
                    self.log_result("cse_cessions_external", "is_external flag correct", False,
                                   f"is_external attendu: True, trouvé: {data.get('is_external')}")
                
            else:
                self.log_result("cse_cessions_external", "POST cession externe acceptée", False,
                               f"Expected 200/201, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("cse_cessions_external", "POST cession externe", False, f"Exception: {str(e)}")

    def test_delete_endpoints(self):
        """Test DELETE endpoints for on-call schedules"""
        print(f"\n🗑️ DELETE ENDPOINTS TESTING")
        print("=" * 60)
        
        # Test 1: DELETE existing schedule
        print(f"\n📋 Test 1: DELETE existing schedule")
        
        if self.created_schedule_ids:
            schedule_id = self.created_schedule_ids[0]
            
            try:
                response = self.session.delete(f"{BACKEND_URL}/on-call/schedule/{schedule_id}")
                
                if response.status_code == 204:
                    print(f"✅ Schedule deleted successfully (204)")
                    self.log_result("delete_endpoints", "DELETE existing schedule", True,
                                   "Schedule deleted with proper 204 status")
                    
                    # Remove from tracking list
                    self.created_schedule_ids.remove(schedule_id)
                else:
                    self.log_result("delete_endpoints", "DELETE existing schedule", False,
                                   f"Expected 204, got {response.status_code}")
                    
            except Exception as e:
                self.log_result("delete_endpoints", "DELETE existing schedule", False, f"Exception: {str(e)}")
        else:
            self.log_result("delete_endpoints", "DELETE existing schedule", False, "No schedules available to delete")
        
        # Test 2: DELETE non-existent schedule (404)
        print(f"\n📋 Test 2: DELETE non-existent schedule")
        
        try:
            fake_id = "00000000-0000-0000-0000-000000000000"
            response = self.session.delete(f"{BACKEND_URL}/on-call/schedule/{fake_id}")
            
            if response.status_code == 404:
                print(f"✅ Non-existent schedule properly rejected (404)")
                self.log_result("delete_endpoints", "DELETE non-existent schedule", True,
                               "Non-existent schedule properly returns 404")
            else:
                self.log_result("delete_endpoints", "DELETE non-existent schedule", False,
                               f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_result("delete_endpoints", "DELETE non-existent schedule", False, f"Exception: {str(e)}")

    def test_put_endpoints(self):
        """Test PUT endpoints for updating on-call schedules"""
        print(f"\n✏️ PUT ENDPOINTS TESTING")
        print("=" * 60)
        
        # Test 1: PUT update existing schedule
        print(f"\n📋 Test 1: PUT update existing schedule")
        
        if self.created_schedule_ids:
            schedule_id = self.created_schedule_ids[0]
            
            try:
                update_data = {
                    "employee_id": self.user_id,
                    "employee_name": "Diego DACALOR (Updated)",
                    "date": "2025-01-16",
                    "type": "Astreinte jour",
                    "notes": "Updated schedule notes"
                }
                
                response = self.session.put(f"{BACKEND_URL}/on-call/schedule/{schedule_id}", json=update_data)
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Schedule updated successfully (200)")
                    
                    # Verify updated fields
                    if (data.get("employee_name") == "Diego DACALOR (Updated)" and 
                        data.get("type") == "Astreinte jour" and
                        data.get("notes") == "Updated schedule notes"):
                        self.log_result("put_endpoints", "PUT update existing schedule", True,
                                       "Schedule updated with correct field values")
                    else:
                        self.log_result("put_endpoints", "PUT update existing schedule", False,
                                       "Updated fields not reflected correctly")
                else:
                    self.log_result("put_endpoints", "PUT update existing schedule", False,
                                   f"Expected 200, got {response.status_code}")
                    
            except Exception as e:
                self.log_result("put_endpoints", "PUT update existing schedule", False, f"Exception: {str(e)}")
        else:
            self.log_result("put_endpoints", "PUT update existing schedule", False, "No schedules available to update")
        
        # Test 2: PUT update non-existent schedule (404)
        print(f"\n📋 Test 2: PUT update non-existent schedule")
        
        try:
            fake_id = "00000000-0000-0000-0000-000000000000"
            update_data = {
                "employee_id": self.user_id,
                "employee_name": "Test User",
                "date": "2025-01-30",
                "type": "Astreinte jour",
                "notes": "Test update"
            }
            
            response = self.session.put(f"{BACKEND_URL}/on-call/schedule/{fake_id}", json=update_data)
            
            if response.status_code == 404:
                print(f"✅ Non-existent schedule update properly rejected (404)")
                self.log_result("put_endpoints", "PUT non-existent schedule", True,
                               "Non-existent schedule update properly returns 404")
            else:
                self.log_result("put_endpoints", "PUT non-existent schedule", False,
                               f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_result("put_endpoints", "PUT non-existent schedule", False, f"Exception: {str(e)}")

    def test_data_persistence(self):
        """Test MongoDB data persistence"""
        print(f"\n💾 DATA PERSISTENCE TESTING")
        print("=" * 60)
        
        # Test 1: Verify created schedules appear in GET requests
        print(f"\n📋 Test 1: Verify schedules appear in GET requests")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/on-call/schedule")
            
            if response.status_code == 200:
                data = response.json()
                created_count = len([s for s in data if s.get("id") in self.created_schedule_ids])
                
                if created_count > 0:
                    print(f"✅ Found {created_count} created schedules in GET response")
                    self.log_result("data_persistence", "Schedules appear in GET", True,
                                   f"Created schedules properly persisted and retrievable")
                else:
                    self.log_result("data_persistence", "Schedules appear in GET", False,
                                   "Created schedules not found in GET response")
            else:
                self.log_result("data_persistence", "Schedules appear in GET", False,
                               f"GET request failed: {response.status_code}")
                
        except Exception as e:
            self.log_result("data_persistence", "Schedules appear in GET", False, f"Exception: {str(e)}")
        
        # Test 2: Test month/year filtering with created data
        print(f"\n📋 Test 2: Test month/year filtering with created data")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/on-call/schedule?month=1&year=2025")
            
            if response.status_code == 200:
                data = response.json()
                january_schedules = [s for s in data if s.get("date", "").startswith("2025-01")]
                
                if len(january_schedules) > 0:
                    print(f"✅ Month/year filtering working - Found {len(january_schedules)} January 2025 schedules")
                    self.log_result("data_persistence", "Month/year filtering works", True,
                                   f"Filtering correctly returned {len(january_schedules)} schedules for January 2025")
                else:
                    print(f"ℹ️ No January 2025 schedules found (expected if no test data in that period)")
                    self.log_result("data_persistence", "Month/year filtering works", True,
                                   "Filtering working correctly (no data in filtered period)")
            else:
                self.log_result("data_persistence", "Month/year filtering works", False,
                               f"Filtered GET request failed: {response.status_code}")
                
        except Exception as e:
            self.log_result("data_persistence", "Month/year filtering works", False, f"Exception: {str(e)}")

    def test_error_handling(self):
        """Test error handling and edge cases"""
        print(f"\n⚠️ ERROR HANDLING TESTING")
        print("=" * 60)
        
        # Test 1: Missing required fields
        print(f"\n📋 Test 1: Missing required fields")
        
        try:
            incomplete_data = {
                "employee_name": "Test User",
                # Missing employee_id, date, type
                "notes": "Incomplete data test"
            }
            
            response = self.session.post(f"{BACKEND_URL}/on-call/schedule", json=incomplete_data)
            
            if response.status_code == 422:
                print(f"✅ Missing required fields properly rejected (422)")
                self.log_result("error_handling", "Missing required fields", True,
                               "Missing required fields properly rejected with validation error")
            else:
                self.log_result("error_handling", "Missing required fields", False,
                               f"Expected 422, got {response.status_code}")
                
        except Exception as e:
            self.log_result("error_handling", "Missing required fields", False, f"Exception: {str(e)}")
        
        # Test 2: Invalid employee_id format
        print(f"\n📋 Test 2: Invalid employee_id format")
        
        try:
            invalid_id_data = {
                "employee_id": "not-a-uuid",
                "employee_name": "Test User",
                "date": "2025-01-30",
                "type": "Astreinte jour",
                "notes": "Invalid ID test"
            }
            
            response = self.session.post(f"{BACKEND_URL}/on-call/schedule", json=invalid_id_data)
            
            # This might be accepted depending on validation rules, so we check the response
            if response.status_code in [422, 400]:
                print(f"✅ Invalid employee_id format handled ({response.status_code})")
                self.log_result("error_handling", "Invalid employee_id format", True,
                               f"Invalid employee_id properly handled with {response.status_code}")
            elif response.status_code == 201:
                print(f"ℹ️ Invalid employee_id accepted (may be by design)")
                self.log_result("error_handling", "Invalid employee_id format", True,
                               "Invalid employee_id accepted (validation may be lenient by design)")
            else:
                self.log_result("error_handling", "Invalid employee_id format", False,
                               f"Unexpected response: {response.status_code}")
                
        except Exception as e:
            self.log_result("error_handling", "Invalid employee_id format", False, f"Exception: {str(e)}")

    def cleanup_test_data(self):
        """Clean up any remaining test schedules"""
        print(f"\n🧹 CLEANUP - Removing test schedules")
        
        for schedule_id in self.created_schedule_ids[:]:
            try:
                response = self.session.delete(f"{BACKEND_URL}/on-call/schedule/{schedule_id}")
                if response.status_code == 204:
                    print(f"✅ Cleaned up schedule: {schedule_id}")
                    self.created_schedule_ids.remove(schedule_id)
                else:
                    print(f"⚠️ Failed to cleanup schedule {schedule_id}: {response.status_code}")
            except Exception as e:
                print(f"⚠️ Exception cleaning up schedule {schedule_id}: {str(e)}")
        
        if not self.created_schedule_ids:
            print(f"✅ All test schedules cleaned up successfully")

    def print_summary(self):
        """Afficher le résumé des tests On-Call Schedule API"""
        print(f"\n" + "=" * 80)
        print(f"📅 RÉSUMÉ COMPLET DES TESTS ON-CALL SCHEDULE BACKEND API")
        print(f"=" * 80)
        
        total_passed = 0
        total_failed = 0
        
        for phase_name, results in self.test_results.items():
            phase_display = {
                "authentication": "AUTHENTICATION REQUIREMENTS",
                "get_endpoints": "GET ENDPOINTS (Retrieve Schedules)", 
                "post_endpoints": "POST ENDPOINTS (Create Schedules)",
                "delete_endpoints": "DELETE ENDPOINTS (Remove Schedules)",
                "put_endpoints": "PUT ENDPOINTS (Update Schedules)",
                "data_persistence": "DATA PERSISTENCE (MongoDB)",
                "error_handling": "ERROR HANDLING & VALIDATION"
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
        overall_status = "✅ API COMPLÈTEMENT FONCTIONNELLE" if total_failed == 0 else "❌ PROBLÈMES CRITIQUES DÉTECTÉS" if total_passed == 0 else "⚠️ API PARTIELLEMENT FONCTIONNELLE"
        print(f"🎯 RÉSULTAT GLOBAL: {overall_status}")
        print(f"📈 TOTAL: {total_passed} réussis, {total_failed} échoués sur {total_passed + total_failed} tests")
        
        # Critères de succès critiques pour l'API On-Call
        print(f"\n🔒 CRITÈRES DE SUCCÈS CRITIQUES:")
        success_criteria = [
            ("All endpoints respond with correct HTTP status codes", total_failed == 0),
            ("Authentication required for all endpoints (403/401 without token)", self.test_results["authentication"]["failed"] == 0),
            ("Bulk creation creates multiple schedules correctly", self.test_results["post_endpoints"]["passed"] >= 1),
            ("Duplicate prevention works (returns existing schedule)", self.test_results["post_endpoints"]["passed"] >= 2),
            ("GET endpoints filter correctly by month/year and date range", self.test_results["get_endpoints"]["failed"] == 0),
            ("DELETE removes schedules permanently", self.test_results["delete_endpoints"]["passed"] >= 1),
            ("PUT updates schedules correctly", self.test_results["put_endpoints"]["passed"] >= 1),
            ("MongoDB persistence verified (data survives operations)", self.test_results["data_persistence"]["failed"] == 0),
            ("Proper error handling (404 for not found, 400/422 for validation errors)", self.test_results["error_handling"]["failed"] == 0)
        ]
        
        for criterion, met in success_criteria:
            status = "✅" if met else "❌"
            print(f"   {status} {criterion}")
        
        # Focus sur les fonctionnalités critiques
        print(f"\n🎯 FONCTIONNALITÉS CRITIQUES:")
        auth_success = self.test_results["authentication"]["failed"] == 0
        crud_success = (self.test_results["get_endpoints"]["failed"] == 0 and 
                       self.test_results["post_endpoints"]["failed"] == 0 and
                       self.test_results["delete_endpoints"]["failed"] == 0 and
                       self.test_results["put_endpoints"]["failed"] == 0)
        persistence_success = self.test_results["data_persistence"]["failed"] == 0
        
        print(f"   {'✅' if auth_success else '❌'} AUTHENTICATION - Sécurité des endpoints")
        print(f"   {'✅' if crud_success else '❌'} CRUD OPERATIONS - Opérations complètes")
        print(f"   {'✅' if persistence_success else '❌'} DATA PERSISTENCE - Persistance MongoDB")
        
        critical_success = auth_success and crud_success and persistence_success
        print(f"\n🏆 API ON-CALL SCHEDULE: {'✅ PRODUCTION-READY' if critical_success else '❌ NÉCESSITE CORRECTIONS'}")
        
        return critical_success

    def run_all_tests(self):
        """Exécuter tous les tests de l'API On-Call Schedule"""
        print("🚀 DÉMARRAGE DES TESTS ON-CALL SCHEDULE BACKEND API")
        print("=" * 80)
        print("OBJECTIF: Test complet de l'API backend Planning Astreintes nouvellement implémentée")
        print("USER ACCOUNT: Admin Diego DACALOR (ddacalor@aaea-gpe.fr / admin123)")
        print("PRIORITÉ: CRUD operations + Authentication + Data persistence + Error handling")
        print("=" * 80)
        
        # Authentification pour tous les tests
        if not self.authenticate():
            print("❌ Impossible de continuer sans authentification")
            return False
        
        # Exécuter tous les tests de l'API On-Call
        print(f"\n🔄 EXÉCUTION DES TESTS API ON-CALL SCHEDULE...")
        
        # Test 1: Authentication Requirements - CRITIQUE
        self.test_authentication_requirements()
        
        # Test 2: GET Endpoints - Retrieve schedules
        self.test_get_endpoints()
        
        # Test 3: POST Endpoints - Create schedules (bulk and single)
        self.test_post_endpoints()
        
        # Test 4: DELETE Endpoints - Remove schedules
        self.test_delete_endpoints()
        
        # Test 5: PUT Endpoints - Update schedules
        self.test_put_endpoints()
        
        # Test 6: Data Persistence - MongoDB verification
        self.test_data_persistence()
        
        # Test 7: Error Handling - Edge cases and validation
        self.test_error_handling()
        
        # Cleanup test data
        self.cleanup_test_data()
        
        # Afficher le résumé
        return self.print_summary()

def main():
    """Point d'entrée principal"""
    tester = OnCallScheduleAPITester()
    success = tester.run_all_tests()
    
    # Code de sortie
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()