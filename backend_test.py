#!/usr/bin/env python3
"""
TEST COMPLET MODULE CSE - BACKEND VALIDATION FINALE

OBJECTIF: Test complet du module CSE selon demande française spécifique
USER ACCOUNT: Admin Diego DACALOR (ddacalor@aaea-gpe.fr / admin123)
BACKEND URL: https://oncall-planner-2.preview.emergentagent.com/api

TESTS PRIORITAIRES:

### 1. Vérification membres CSE et heures mensuelles
- GET /api/cse/delegates
- VÉRIFIER: 4 délégués retournés
- VÉRIFIER heures mensuelles:
  - Jacques EDAU (titulaire): 22h
  - Thierry MARTIAS (titulaire): 22h
  - Jean-François BERNARD (titulaire): 22h
  - Richard MANIOC (suppléant): 0h

### 2. Test calcul solde avec report
- GET /api/cse/balance/{jacques_edau_id}?year=2025&month=1
- VÉRIFIER structure réponse:
  - credit_mensuel: 22
  - report_12_mois: (nombre)
  - solde_disponible: (nombre)

### 3. Test création cession avec exception délai
- POST /api/cse/cessions
- Body: {
    "from_id": "jacques_id",
    "from_name": "Jacques EDAU",
    "to_id": "thierry_id", 
    "to_name": "Thierry MARTIAS",
    "is_external": false,
    "hours": 3,
    "usage_date": "2025-02-05",
    "reason": "Test final",
    "delai_inferieur_8jours": true,
    "justification_urgence": "Urgence test final module",
    "created_by": "Test Backend"
  }
- VÉRIFIER: statut 200/201
- VÉRIFIER champs délai et justification dans réponse

### 4. Test création cession vers externe
- POST /api/cse/cessions
- Body: {
    "from_id": "jacques_id",
    "from_name": "Jacques EDAU", 
    "to_id": "external",
    "to_name": "Marie Dupont (Personne Externe)",
    "is_external": true,
    "hours": 2,
    "usage_date": "2025-02-20",
    "reason": "Formation externe",
    "delai_inferieur_8jours": false,
    "created_by": "Test Backend"
  }
- VÉRIFIER: statut 200/201
- VÉRIFIER is_external: true dans réponse

### 5. Vérification liste cessions
- GET /api/cse/cessions
- VÉRIFIER: 2 cessions créées apparaissent
- VÉRIFIER présence champs: delai_inferieur_8jours, justification_urgence, is_external

### 6. Paramètres entreprise
- GET /api/company-settings
- VÉRIFIER effectif = 250

OBJECTIF: Validation complète avant tests frontend finaux
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

class CSECompleteTester:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.session = requests.Session()
        self.test_results = {
            "authentication": {"passed": 0, "failed": 0, "details": []},
            "cse_delegates": {"passed": 0, "failed": 0, "details": []},
            "cse_balance": {"passed": 0, "failed": 0, "details": []},
            "cession_internal_delai": {"passed": 0, "failed": 0, "details": []},
            "cession_external": {"passed": 0, "failed": 0, "details": []},
            "cessions_list": {"passed": 0, "failed": 0, "details": []},
            "company_settings": {"passed": 0, "failed": 0, "details": []}
        }
        self.created_cession_ids = []  # Track created cessions for cleanup
        self.jacques_edau_id = None
        self.thierry_martias_id = None
        
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

    def test_cse_delegates_and_hours(self):
        """Test 1: Vérification membres CSE et heures mensuelles"""
        print(f"\n👥 TEST 1: VÉRIFICATION MEMBRES CSE ET HEURES MENSUELLES")
        print("=" * 60)
        
        try:
            response = self.session.get(f"{BACKEND_URL}/cse/delegates")
            
            print(f"📤 GET /api/cse/delegates")
            print(f"📥 Status Code: {response.status_code}")
            
            if response.status_code == 200:
                delegates = response.json()
                print(f"✅ GET /api/cse/delegates successful - Found {len(delegates)} delegates")
                
                # VÉRIFIER: 4 délégués retournés
                if len(delegates) == 4:
                    self.log_result("cse_delegates", "4 délégués retournés", True,
                                   f"Nombre correct de délégués: {len(delegates)}")
                else:
                    self.log_result("cse_delegates", "4 délégués retournés", False,
                                   f"Attendu: 4 délégués, trouvé: {len(delegates)}")
                
                # Vérifier les heures mensuelles spécifiques
                expected_delegates = {
                    "Jacques EDAU": {"statut": "Titulaire", "heures": 22},
                    "Thierry MARTIAS": {"statut": "Titulaire", "heures": 22},
                    "Jean-François BERNARD": {"statut": "Titulaire", "heures": 22},
                    "Richard MANIOC": {"statut": "Suppléant", "heures": 0}
                }
                
                found_delegates = {}
                for delegate in delegates:
                    name = delegate.get("user_name", "")
                    heures = delegate.get("heures_mensuelles", 0)
                    statut = delegate.get("statut", "")
                    user_id = delegate.get("user_id", "")
                    
                    print(f"   Délégué: {name} - {statut} - {heures}h - ID: {user_id[:8]}...")
                    
                    # Store IDs for later tests
                    if "Jacques EDAU" in name:
                        self.jacques_edau_id = user_id
                    elif "Thierry MARTIAS" in name:
                        self.thierry_martias_id = user_id
                    
                    found_delegates[name] = {"statut": statut, "heures": heures}
                
                # Vérifier chaque délégué attendu
                for expected_name, expected_data in expected_delegates.items():
                    found = False
                    for found_name, found_data in found_delegates.items():
                        if expected_name in found_name or found_name in expected_name:
                            found = True
                            if found_data["heures"] == expected_data["heures"]:
                                self.log_result("cse_delegates", f"{expected_name} heures correctes", True,
                                               f"{expected_name}: {found_data['heures']}h (attendu: {expected_data['heures']}h)")
                            else:
                                self.log_result("cse_delegates", f"{expected_name} heures correctes", False,
                                               f"{expected_name}: {found_data['heures']}h (attendu: {expected_data['heures']}h)")
                            break
                    
                    if not found:
                        self.log_result("cse_delegates", f"{expected_name} trouvé", False,
                                       f"Délégué {expected_name} non trouvé")
                
            else:
                self.log_result("cse_delegates", "GET cse/delegates", False,
                               f"Expected 200, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("cse_delegates", "GET cse/delegates", False, f"Exception: {str(e)}")

    def test_cse_balance_calculation(self):
        """Test 2: Test calcul solde avec report"""
        print(f"\n💰 TEST 2: TEST CALCUL SOLDE AVEC REPORT")
        print("=" * 60)
        
        if not self.jacques_edau_id:
            self.log_result("cse_balance", "Jacques EDAU ID disponible", False,
                           "ID de Jacques EDAU non trouvé dans le test précédent")
            return
        
        try:
            response = self.session.get(f"{BACKEND_URL}/cse/balance/{self.jacques_edau_id}?year=2025&month=1")
            
            print(f"📤 GET /api/cse/balance/{self.jacques_edau_id[:8]}...?year=2025&month=1")
            print(f"📥 Status Code: {response.status_code}")
            
            if response.status_code == 200:
                balance_data = response.json()
                print(f"✅ GET balance successful")
                print(f"   Réponse: {json.dumps(balance_data, indent=2)}")
                
                # VÉRIFIER structure réponse: credit_mensuel: 22
                credit_mensuel = balance_data.get("credit_mensuel")
                if credit_mensuel == 22:
                    self.log_result("cse_balance", "credit_mensuel = 22", True,
                                   f"Crédit mensuel correct: {credit_mensuel}")
                else:
                    self.log_result("cse_balance", "credit_mensuel = 22", False,
                                   f"Crédit mensuel attendu: 22, trouvé: {credit_mensuel}")
                
                # VÉRIFIER présence report_12_mois
                if "report_12_mois" in balance_data:
                    report_value = balance_data.get("report_12_mois")
                    self.log_result("cse_balance", "report_12_mois présent", True,
                                   f"Report 12 mois: {report_value}")
                else:
                    self.log_result("cse_balance", "report_12_mois présent", False,
                                   "Champ report_12_mois manquant dans la réponse")
                
                # VÉRIFIER présence solde_disponible
                if "solde_disponible" in balance_data:
                    solde_value = balance_data.get("solde_disponible")
                    self.log_result("cse_balance", "solde_disponible présent", True,
                                   f"Solde disponible: {solde_value}")
                else:
                    self.log_result("cse_balance", "solde_disponible présent", False,
                                   "Champ solde_disponible manquant dans la réponse")
                
            else:
                self.log_result("cse_balance", "GET cse/balance", False,
                               f"Expected 200, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("cse_balance", "GET cse/balance", False, f"Exception: {str(e)}")

    def test_cession_internal_with_delai_exception(self):
        """Test 3: Test création cession avec exception délai"""
        print(f"\n⚡ TEST 3: TEST CRÉATION CESSION AVEC EXCEPTION DÉLAI")
        print("=" * 60)
        
        if not self.jacques_edau_id or not self.thierry_martias_id:
            self.log_result("cession_internal_delai", "IDs membres CSE disponibles", False,
                           "IDs de Jacques EDAU ou Thierry MARTIAS non trouvés")
            return
        
        try:
            cession_data = {
                "from_id": self.jacques_edau_id,
                "from_name": "Jacques EDAU",
                "to_id": self.thierry_martias_id,
                "to_name": "Thierry MARTIAS",
                "is_external": False,
                "hours": 3,
                "usage_date": "2025-02-05",
                "reason": "Test final",
                "delai_inferieur_8jours": True,
                "justification_urgence": "Urgence test final module",
                "created_by": "Test Backend"
            }
            
            print(f"📤 Envoi cession interne avec exception délai:")
            print(f"   {json.dumps(cession_data, indent=2)}")
            
            response = self.session.post(f"{BACKEND_URL}/cse/cessions", json=cession_data)
            
            print(f"📥 Status Code: {response.status_code}")
            
            if response.status_code in [200, 201]:
                data = response.json()
                print(f"✅ Cession interne créée avec succès")
                print(f"   Réponse: {json.dumps(data, indent=2)}")
                
                # Tracker pour cleanup
                if data.get("id"):
                    self.created_cession_ids.append(data["id"])
                
                # VÉRIFIER: statut 200/201
                self.log_result("cession_internal_delai", "Statut HTTP correct", True,
                               f"Statut {response.status_code} reçu")
                
                # VÉRIFIER champs délai et justification dans réponse
                delai_field = data.get("delai_inferieur_8jours")
                justification_field = data.get("justification_urgence")
                
                if delai_field is True:
                    self.log_result("cession_internal_delai", "delai_inferieur_8jours présent", True,
                                   f"delai_inferieur_8jours: {delai_field}")
                else:
                    self.log_result("cession_internal_delai", "delai_inferieur_8jours présent", False,
                                   f"delai_inferieur_8jours attendu: true, trouvé: {delai_field}")
                
                if justification_field == "Urgence test final module":
                    self.log_result("cession_internal_delai", "justification_urgence présente", True,
                                   f"justification_urgence: {justification_field}")
                else:
                    self.log_result("cession_internal_delai", "justification_urgence présente", False,
                                   f"justification_urgence incorrecte: {justification_field}")
                
            else:
                self.log_result("cession_internal_delai", "POST cession interne", False,
                               f"Expected 200/201, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("cession_internal_delai", "POST cession interne", False, f"Exception: {str(e)}")

    def test_cession_external(self):
        """Test 4: Test création cession vers externe"""
        print(f"\n🌐 TEST 4: TEST CRÉATION CESSION VERS EXTERNE")
        print("=" * 60)
        
        if not self.jacques_edau_id:
            self.log_result("cession_external", "Jacques EDAU ID disponible", False,
                           "ID de Jacques EDAU non trouvé")
            return
        
        try:
            cession_data = {
                "from_id": self.jacques_edau_id,
                "from_name": "Jacques EDAU",
                "to_id": "external",
                "to_name": "Marie Dupont (Personne Externe)",
                "is_external": True,
                "hours": 2,
                "usage_date": "2025-02-20",
                "reason": "Formation externe",
                "delai_inferieur_8jours": False,
                "created_by": "Test Backend"
            }
            
            print(f"📤 Envoi cession externe:")
            print(f"   {json.dumps(cession_data, indent=2)}")
            
            response = self.session.post(f"{BACKEND_URL}/cse/cessions", json=cession_data)
            
            print(f"📥 Status Code: {response.status_code}")
            
            if response.status_code in [200, 201]:
                data = response.json()
                print(f"✅ Cession externe créée avec succès")
                print(f"   Réponse: {json.dumps(data, indent=2)}")
                
                # Tracker pour cleanup
                if data.get("id"):
                    self.created_cession_ids.append(data["id"])
                
                # VÉRIFIER: statut 200/201
                self.log_result("cession_external", "Statut HTTP correct", True,
                               f"Statut {response.status_code} reçu")
                
                # VÉRIFIER is_external: true dans réponse
                is_external_value = data.get("is_external")
                if is_external_value is True:
                    self.log_result("cession_external", "is_external = true", True,
                                   f"is_external: {is_external_value}")
                else:
                    self.log_result("cession_external", "is_external = true", False,
                                   f"is_external attendu: true, trouvé: {is_external_value}")
                
            else:
                self.log_result("cession_external", "POST cession externe", False,
                               f"Expected 200/201, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("cession_external", "POST cession externe", False, f"Exception: {str(e)}")

    def test_cessions_list_verification(self):
        """Test 5: Vérification liste cessions"""
        print(f"\n📋 TEST 5: VÉRIFICATION LISTE CESSIONS")
        print("=" * 60)
        
        try:
            response = self.session.get(f"{BACKEND_URL}/cse/cessions")
            
            print(f"📤 GET /api/cse/cessions")
            print(f"📥 Status Code: {response.status_code}")
            
            if response.status_code == 200:
                cessions = response.json()
                print(f"✅ GET /api/cse/cessions successful - Found {len(cessions)} cessions")
                
                # VÉRIFIER: 2 cessions créées apparaissent (au minimum)
                created_cessions_found = 0
                for cession in cessions:
                    if cession.get("id") in self.created_cession_ids:
                        created_cessions_found += 1
                
                if created_cessions_found >= 2:
                    self.log_result("cessions_list", "2 cessions créées apparaissent", True,
                                   f"{created_cessions_found} cessions créées trouvées dans la liste")
                else:
                    self.log_result("cessions_list", "2 cessions créées apparaissent", False,
                                   f"Seulement {created_cessions_found} cessions créées trouvées")
                
                # VÉRIFIER présence champs: delai_inferieur_8jours, justification_urgence, is_external
                required_fields = ["delai_inferieur_8jours", "justification_urgence", "is_external"]
                cessions_with_all_fields = 0
                
                print(f"\n📊 Analyse des champs requis:")
                for i, cession in enumerate(cessions[:5]):  # Analyser les 5 premières
                    fields_present = []
                    for field in required_fields:
                        if field in cession:
                            fields_present.append(field)
                    
                    print(f"   Cession {i+1}: {len(fields_present)}/{len(required_fields)} champs présents")
                    print(f"      Présents: {fields_present}")
                    
                    if len(fields_present) == len(required_fields):
                        cessions_with_all_fields += 1
                
                if cessions_with_all_fields > 0:
                    self.log_result("cessions_list", "Champs requis présents", True,
                                   f"{cessions_with_all_fields} cessions ont tous les champs requis")
                else:
                    self.log_result("cessions_list", "Champs requis présents", False,
                                   "Aucune cession n'a tous les champs requis")
                
            else:
                self.log_result("cessions_list", "GET cse/cessions", False,
                               f"Expected 200, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("cessions_list", "GET cse/cessions", False, f"Exception: {str(e)}")

    def test_company_settings(self):
        """Test 6: Paramètres entreprise"""
        print(f"\n🏢 TEST 6: PARAMÈTRES ENTREPRISE")
        print("=" * 60)
        
        try:
            response = self.session.get(f"{BACKEND_URL}/company-settings")
            
            print(f"📤 GET /api/company-settings")
            print(f"📥 Status Code: {response.status_code}")
            
            if response.status_code == 200:
                settings = response.json()
                print(f"✅ GET /api/company-settings successful")
                print(f"   Contenu: {json.dumps(settings, indent=2)}")
                
                # VÉRIFIER effectif = 250
                effectif = settings.get("effectif")
                if effectif == 250:
                    self.log_result("company_settings", "Effectif = 250", True,
                                   f"Effectif correct: {effectif}")
                else:
                    self.log_result("company_settings", "Effectif = 250", False,
                                   f"Effectif attendu: 250, trouvé: {effectif}")
                
                # Vérifier autres champs importants
                nom_entreprise = settings.get("nom_entreprise")
                if nom_entreprise:
                    self.log_result("company_settings", "nom_entreprise présent", True,
                                   f"Nom entreprise: {nom_entreprise}")
                else:
                    self.log_result("company_settings", "nom_entreprise présent", False,
                                   "Champ nom_entreprise manquant")
                
                accord_cse = settings.get("accord_entreprise_heures_cse")
                if accord_cse is not None:
                    self.log_result("company_settings", "accord_entreprise_heures_cse présent", True,
                                   f"Accord CSE: {accord_cse}")
                else:
                    self.log_result("company_settings", "accord_entreprise_heures_cse présent", False,
                                   "Champ accord_entreprise_heures_cse manquant")
                
            else:
                self.log_result("company_settings", "GET company-settings", False,
                               f"Expected 200, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("company_settings", "GET company-settings", False, f"Exception: {str(e)}")

    def cleanup_test_data(self):
        """Clean up any remaining test cessions"""
        """Clean up any remaining test cessions"""
        print(f"\n🧹 CLEANUP - Removing test cessions")
        
        for cession_id in self.created_cession_ids[:]:
            try:
                # Note: Assuming there's a DELETE endpoint for cessions
                # If not available, we'll just log the cleanup attempt
                print(f"ℹ️ Cession {cession_id} created during testing (cleanup may require manual intervention)")
                self.created_cession_ids.remove(cession_id)
            except Exception as e:
                print(f"⚠️ Exception noting cession {cession_id}: {str(e)}")
        
        print(f"✅ Test cessions noted for cleanup")

    # Cleanup method already defined above

    def print_summary(self):
        """Afficher le résumé des tests complets du module CSE"""
        print(f"\n" + "=" * 80)
        print(f"🏛️ RÉSUMÉ TEST COMPLET MODULE CSE - BACKEND VALIDATION FINALE")
        print(f"=" * 80)
        
        total_passed = 0
        total_failed = 0
        
        phase_display = {
            "authentication": "AUTHENTICATION (Login Admin)",
            "cse_delegates": "TEST 1: Vérification membres CSE et heures mensuelles",
            "cse_balance": "TEST 2: Test calcul solde avec report",
            "cession_internal_delai": "TEST 3: Test création cession avec exception délai",
            "cession_external": "TEST 4: Test création cession vers externe",
            "cessions_list": "TEST 5: Vérification liste cessions",
            "company_settings": "TEST 6: Paramètres entreprise"
        }
        
        for phase_name, results in self.test_results.items():
            passed = results["passed"]
            failed = results["failed"]
            total = passed + failed
            
            total_passed += passed
            total_failed += failed
            
            status_icon = "✅" if failed == 0 else "❌" if passed == 0 else "⚠️"
            print(f"\n{status_icon} {phase_display.get(phase_name, phase_name)}")
            print(f"   Tests réussis: {passed}/{total}")
            print(f"   Tests échoués: {failed}/{total}")
            
            if failed > 0:
                print(f"   Échecs critiques:")
                for detail in results["details"]:
                    if "❌ FAIL" in detail["status"]:
                        print(f"     - {detail['test']}: {detail['message']}")
        
        print(f"\n" + "=" * 80)
        overall_status = "✅ MODULE CSE VALIDÉ" if total_failed == 0 else "❌ MODULE CSE DÉFAILLANT" if total_passed == 0 else "⚠️ MODULE CSE PARTIEL"
        print(f"🎯 RÉSULTAT GLOBAL: {overall_status}")
        print(f"📈 TOTAL: {total_passed} réussis, {total_failed} échoués sur {total_passed + total_failed} tests")
        
        # Critères de succès critiques pour le module CSE complet
        print(f"\n🔒 CRITÈRES DE SUCCÈS CRITIQUES (MODULE CSE):")
        success_criteria = [
            ("4 délégués CSE avec heures correctes", self.test_results["cse_delegates"]["failed"] == 0),
            ("Calcul solde avec report fonctionnel", self.test_results["cse_balance"]["failed"] == 0),
            ("Cession interne avec exception délai", self.test_results["cession_internal_delai"]["failed"] == 0),
            ("Cession externe avec is_external=true", self.test_results["cession_external"]["failed"] == 0),
            ("Liste cessions avec champs requis", self.test_results["cessions_list"]["failed"] == 0),
            ("Paramètres entreprise effectif=250", self.test_results["company_settings"]["failed"] == 0)
        ]
        
        for criterion, met in success_criteria:
            status = "✅" if met else "❌"
            print(f"   {status} {criterion}")
        
        # Focus sur les fonctionnalités critiques
        print(f"\n🏛️ FONCTIONNALITÉS CSE:")
        delegates_ok = self.test_results["cse_delegates"]["failed"] == 0
        balance_ok = self.test_results["cse_balance"]["failed"] == 0
        cessions_ok = (self.test_results["cession_internal_delai"]["failed"] == 0 and 
                      self.test_results["cession_external"]["failed"] == 0 and
                      self.test_results["cessions_list"]["failed"] == 0)
        settings_ok = self.test_results["company_settings"]["failed"] == 0
        
        print(f"   {'✅' if delegates_ok else '❌'} GESTION DÉLÉGUÉS: Membres CSE et heures mensuelles")
        print(f"   {'✅' if balance_ok else '❌'} CALCUL SOLDES: Solde avec report 12 mois")
        print(f"   {'✅' if cessions_ok else '❌'} CESSIONS D'HEURES: Interne/externe avec validations")
        print(f"   {'✅' if settings_ok else '❌'} PARAMÈTRES: Configuration entreprise")
        
        critical_success = delegates_ok and balance_ok and cessions_ok and settings_ok
        print(f"\n🏆 MODULE CSE: {'✅ ENTIÈREMENT FONCTIONNEL' if critical_success else '❌ NÉCESSITE CORRECTIONS'}")
        
        return critical_success

    def run_all_tests(self):
        """Exécuter tous les tests de régression CSE"""
        print("🚀 DÉMARRAGE DES TESTS DE RÉGRESSION MODULE CSE")
        print("=" * 80)
        print("OBJECTIF: Retest des 2 problèmes corrigés du module CSE")
        print("USER ACCOUNT: Admin Diego DACALOR (ddacalor@aaea-gpe.fr / admin123)")
        print("BACKEND URL: https://oncall-planner-2.preview.emergentagent.com/api")
        print("CORRECTIONS TESTÉES:")
        print("  1. Ajout du champ `is_external` au modèle CSECession")
        print("  2. Correction de l'erreur 500 sur GET /api/company-settings")
        print("=" * 80)
        
        # Authentification pour tous les tests
        if not self.authenticate():
            print("❌ Impossible de continuer sans authentification")
            return False
        
        # Exécuter tous les tests de régression
        print(f"\n🔄 EXÉCUTION DES TESTS DE RÉGRESSION...")
        
        # Test 1: Vérifier champ is_external dans cession externe
        self.test_external_cession_is_external_field()
        
        # Test 2: Endpoint company-settings ne doit PAS retourner erreur 500
        self.test_company_settings_no_500_error()
        
        # Test 3: Vérification liste cessions (avec is_external)
        self.test_cessions_list_is_external_field()
        
        # Cleanup test data
        self.cleanup_test_data()
        
        # Afficher le résumé
        return self.print_summary()

def main():
    """Point d'entrée principal"""
    tester = CSERegressionTester()
    success = tester.run_all_tests()
    
    # Code de sortie
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()