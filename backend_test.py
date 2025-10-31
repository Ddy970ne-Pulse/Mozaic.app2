#!/usr/bin/env python3
"""
TESTS DE RÉGRESSION MODULE CSE - CORRECTIONS SPÉCIFIQUES

OBJECTIF: Retest des 2 problèmes corrigés du module CSE selon demande française
USER ACCOUNT: Admin Diego DACALOR (ddacalor@aaea-gpe.fr / admin123)
BACKEND URL: https://oncall-planner-2.preview.emergentagent.com/api

CORRECTIONS EFFECTUÉES:
1. Ajout du champ `is_external` au modèle CSECession
2. Correction de l'erreur 500 sur GET /api/company-settings (removal de _id MongoDB)

TESTS DE RÉGRESSION À EFFECTUER:

### Test 1: Vérifier champ is_external dans cession externe
- POST /api/cse/cessions avec to_id="external" et is_external=true
- **VÉRIFICATION CRITIQUE** : Réponse doit contenir `"is_external": true`
- Vérifier statut 200/201

### Test 2: Endpoint company-settings 
- GET /api/company-settings
- **VÉRIFICATION CRITIQUE** : Ne doit PAS retourner erreur 500
- Doit retourner JSON avec effectif, nom_entreprise, accord_entreprise_heures_cse
- Vérifier effectif = 250

### Test 3: Vérification liste cessions (avec is_external)
- GET /api/cse/cessions
- Vérifier que les cessions externes ont le champ is_external = true
- Vérifier que les cessions internes ont is_external = false (ou absent)

FOCUS: Ces 3 tests de régression doivent être 100% réussis pour confirmer que les corrections fonctionnent.
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

class CSERegressionTester:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.session = requests.Session()
        self.test_results = {
            "authentication": {"passed": 0, "failed": 0, "details": []},
            "external_cession_is_external": {"passed": 0, "failed": 0, "details": []},
            "company_settings_no_500": {"passed": 0, "failed": 0, "details": []},
            "cessions_list_is_external": {"passed": 0, "failed": 0, "details": []}
        }
        self.created_cession_ids = []  # Track created cessions for cleanup
        
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

    def test_external_cession_is_external_field(self):
        """Test 1: Vérifier champ is_external dans cession externe"""
        print(f"\n🌐 TEST 1: VÉRIFIER CHAMP is_external DANS CESSION EXTERNE")
        print("=" * 60)
        
        try:
            # Récupérer un membre CSE pour faire la cession
            delegates_response = self.session.get(f"{BACKEND_URL}/users")
            if delegates_response.status_code != 200:
                self.log_result("external_cession_is_external", "Récupération utilisateurs", False,
                               "Impossible de récupérer les utilisateurs")
                return
            
            users = delegates_response.json()
            
            # Trouver un membre CSE (chercher par email ou nom)
            cse_member_id = None
            cse_member_name = None
            
            for user in users:
                if user.get("email") == "ddacalor@aaea-gpe.fr":  # Admin Diego
                    cse_member_id = user.get("id")
                    cse_member_name = user.get("name", "Diego DACALOR")
                    break
            
            if not cse_member_id:
                self.log_result("external_cession_is_external", "Membre CSE trouvé", False,
                               "Aucun membre CSE trouvé pour effectuer la cession")
                return
            
            print(f"✅ Membre CSE trouvé: {cse_member_name} ({cse_member_id[:8]}...)")
            
            # Test de cession externe avec is_external=true (selon la demande française)
            external_cession_data = {
                "from_id": cse_member_id,
                "from_name": cse_member_name,
                "to_id": "external",
                "to_name": "Test Personne Externe",
                "is_external": True,
                "hours": 2,
                "usage_date": "2025-02-25",
                "reason": "Test correction is_external",
                "created_by": "Test Régression"
            }
            
            print(f"📤 Envoi cession externe: {external_cession_data}")
            
            response = self.session.post(f"{BACKEND_URL}/cse/cessions", json=external_cession_data)
            
            if response.status_code in [200, 201]:
                data = response.json()
                print(f"✅ Cession externe créée avec succès ({response.status_code})")
                print(f"   Réponse: {json.dumps(data, indent=2)}")
                
                # Tracker pour cleanup
                if data.get("id"):
                    self.created_cession_ids.append(data["id"])
                
                # **VÉRIFICATION CRITIQUE** : Réponse doit contenir `"is_external": true`
                is_external_value = data.get("is_external")
                if is_external_value is True:
                    self.log_result("external_cession_is_external", "Champ is_external=true présent", True,
                                   f"is_external={is_external_value} correctement retourné")
                else:
                    self.log_result("external_cession_is_external", "Champ is_external=true présent", False,
                                   f"is_external attendu: true, trouvé: {is_external_value}")
                
                # Vérifier statut 200/201
                self.log_result("external_cession_is_external", "Statut HTTP correct", True,
                               f"Statut {response.status_code} reçu")
                
            else:
                self.log_result("external_cession_is_external", "POST cession externe", False,
                               f"Expected 200/201, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("external_cession_is_external", "POST cession externe", False, f"Exception: {str(e)}")

    def test_company_settings_no_500_error(self):
        """Test 2: Endpoint company-settings ne doit PAS retourner erreur 500"""
        print(f"\n🏢 TEST 2: ENDPOINT COMPANY-SETTINGS (PAS D'ERREUR 500)")
        print("=" * 60)
        
        try:
            response = self.session.get(f"{BACKEND_URL}/company-settings")
            
            print(f"📤 GET /api/company-settings")
            print(f"📥 Status Code: {response.status_code}")
            
            # **VÉRIFICATION CRITIQUE** : Ne doit PAS retourner erreur 500
            if response.status_code != 500:
                self.log_result("company_settings_no_500", "Pas d'erreur 500", True,
                               f"Status code {response.status_code} (pas 500)")
            else:
                self.log_result("company_settings_no_500", "Pas d'erreur 500", False,
                               f"Erreur 500 retournée: {response.text}")
                return
            
            if response.status_code == 200:
                try:
                    settings = response.json()
                    print(f"✅ JSON valide retourné")
                    print(f"   Contenu: {json.dumps(settings, indent=2)}")
                    
                    # Doit retourner JSON avec effectif, nom_entreprise, accord_entreprise_heures_cse
                    required_fields = ["effectif", "nom_entreprise", "accord_entreprise_heures_cse"]
                    missing_fields = [field for field in required_fields if field not in settings]
                    
                    if not missing_fields:
                        self.log_result("company_settings_no_500", "Champs requis présents", True,
                                       f"Tous les champs requis présents: {required_fields}")
                    else:
                        self.log_result("company_settings_no_500", "Champs requis présents", False,
                                       f"Champs manquants: {missing_fields}")
                    
                    # Vérifier effectif = 250
                    effectif = settings.get("effectif")
                    if effectif == 250:
                        self.log_result("company_settings_no_500", "Effectif = 250", True,
                                       f"Effectif correct: {effectif}")
                    else:
                        self.log_result("company_settings_no_500", "Effectif = 250", False,
                                       f"Effectif attendu: 250, trouvé: {effectif}")
                    
                except json.JSONDecodeError as e:
                    self.log_result("company_settings_no_500", "JSON valide", False,
                                   f"Réponse n'est pas du JSON valide: {str(e)}")
            else:
                self.log_result("company_settings_no_500", "Status 200", False,
                               f"Status {response.status_code} au lieu de 200: {response.text}")
                
        except Exception as e:
            self.log_result("company_settings_no_500", "GET company-settings", False, f"Exception: {str(e)}")

    def test_cessions_list_is_external_field(self):
        """Test 3: Vérification liste cessions (avec is_external)"""
        print(f"\n📋 TEST 3: VÉRIFICATION LISTE CESSIONS (AVEC is_external)")
        print("=" * 60)
        
        try:
            response = self.session.get(f"{BACKEND_URL}/cse/cessions")
            
            print(f"📤 GET /api/cse/cessions")
            print(f"📥 Status Code: {response.status_code}")
            
            if response.status_code == 200:
                cessions = response.json()
                print(f"✅ GET /api/cse/cessions successful (200) - Found {len(cessions)} cessions")
                
                if len(cessions) == 0:
                    self.log_result("cessions_list_is_external", "Cessions trouvées", False,
                                   "Aucune cession trouvée dans la liste")
                    return
                
                # Analyser les cessions pour vérifier le champ is_external
                external_cessions_count = 0
                internal_cessions_count = 0
                cessions_with_is_external_field = 0
                
                print(f"\n📊 Analyse des cessions:")
                for i, cession in enumerate(cessions[:10]):  # Analyser les 10 premières
                    to_id = cession.get("to_id", "")
                    to_name = cession.get("to_name", "")
                    is_external = cession.get("is_external")
                    
                    print(f"   {i+1}. {cession.get('from_name', 'N/A')} → {to_name}")
                    print(f"      to_id: {to_id}, is_external: {is_external}")
                    
                    # Compter les cessions avec le champ is_external
                    if "is_external" in cession:
                        cessions_with_is_external_field += 1
                    
                    # Vérifier les cessions externes
                    if to_id == "external":
                        external_cessions_count += 1
                        if is_external is True:
                            print(f"      ✅ Cession externe avec is_external=true")
                        else:
                            print(f"      ❌ Cession externe SANS is_external=true (trouvé: {is_external})")
                    else:
                        internal_cessions_count += 1
                        if is_external is False or is_external is None:
                            print(f"      ✅ Cession interne avec is_external=false/null")
                        else:
                            print(f"      ❌ Cession interne avec is_external=true (incorrect)")
                
                # Vérifier que les cessions externes ont is_external = true
                external_correct = True
                internal_correct = True
                
                for cession in cessions:
                    to_id = cession.get("to_id", "")
                    is_external = cession.get("is_external")
                    
                    if to_id == "external" and is_external is not True:
                        external_correct = False
                    elif to_id != "external" and is_external is True:
                        internal_correct = False
                
                if external_cessions_count > 0:
                    if external_correct:
                        self.log_result("cessions_list_is_external", "Cessions externes is_external=true", True,
                                       f"{external_cessions_count} cessions externes avec is_external=true")
                    else:
                        self.log_result("cessions_list_is_external", "Cessions externes is_external=true", False,
                                       f"Certaines cessions externes n'ont pas is_external=true")
                else:
                    self.log_result("cessions_list_is_external", "Cessions externes trouvées", False,
                                   "Aucune cession externe trouvée pour vérifier is_external")
                
                if internal_cessions_count > 0:
                    if internal_correct:
                        self.log_result("cessions_list_is_external", "Cessions internes is_external=false", True,
                                       f"{internal_cessions_count} cessions internes avec is_external=false/null")
                    else:
                        self.log_result("cessions_list_is_external", "Cessions internes is_external=false", False,
                                       f"Certaines cessions internes ont is_external=true (incorrect)")
                
                # Vérifier que le champ is_external est présent
                if cessions_with_is_external_field > 0:
                    self.log_result("cessions_list_is_external", "Champ is_external présent", True,
                                   f"{cessions_with_is_external_field}/{len(cessions)} cessions ont le champ is_external")
                else:
                    self.log_result("cessions_list_is_external", "Champ is_external présent", False,
                                   "Aucune cession n'a le champ is_external")
                
            else:
                self.log_result("cessions_list_is_external", "GET cse/cessions", False,
                               f"Expected 200, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("cessions_list_is_external", "GET cse/cessions", False, f"Exception: {str(e)}")

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
        """Afficher le résumé des tests de régression CSE"""
        print(f"\n" + "=" * 80)
        print(f"🔧 RÉSUMÉ TESTS DE RÉGRESSION MODULE CSE - CORRECTIONS SPÉCIFIQUES")
        print(f"=" * 80)
        
        total_passed = 0
        total_failed = 0
        
        for phase_name, results in self.test_results.items():
            phase_display = {
                "authentication": "AUTHENTICATION (Login Admin)",
                "external_cession_is_external": "TEST 1: Champ is_external dans cession externe",
                "company_settings_no_500": "TEST 2: Endpoint company-settings (pas d'erreur 500)",
                "cessions_list_is_external": "TEST 3: Liste cessions avec champ is_external"
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
        overall_status = "✅ CORRECTIONS VALIDÉES" if total_failed == 0 else "❌ CORRECTIONS INCOMPLÈTES" if total_passed == 0 else "⚠️ CORRECTIONS PARTIELLES"
        print(f"🎯 RÉSULTAT GLOBAL: {overall_status}")
        print(f"📈 TOTAL: {total_passed} réussis, {total_failed} échoués sur {total_passed + total_failed} tests")
        
        # Critères de succès critiques pour les corrections
        print(f"\n🔒 CRITÈRES DE SUCCÈS CRITIQUES (CORRECTIONS):")
        success_criteria = [
            ("Champ is_external=true présent dans réponse cession externe", self.test_results["external_cession_is_external"]["failed"] == 0),
            ("GET /api/company-settings ne retourne PAS d'erreur 500", self.test_results["company_settings_no_500"]["failed"] == 0),
            ("Liste cessions contient le champ is_external correctement", self.test_results["cessions_list_is_external"]["failed"] == 0)
        ]
        
        for criterion, met in success_criteria:
            status = "✅" if met else "❌"
            print(f"   {status} {criterion}")
        
        # Focus sur les corrections spécifiques
        print(f"\n🔧 CORRECTIONS SPÉCIFIQUES:")
        is_external_fix = self.test_results["external_cession_is_external"]["failed"] == 0
        company_settings_fix = self.test_results["company_settings_no_500"]["failed"] == 0
        list_is_external_fix = self.test_results["cessions_list_is_external"]["failed"] == 0
        
        print(f"   {'✅' if is_external_fix else '❌'} CORRECTION 1: Ajout champ is_external au modèle CSECession")
        print(f"   {'✅' if company_settings_fix else '❌'} CORRECTION 2: Suppression _id MongoDB dans company-settings")
        print(f"   {'✅' if list_is_external_fix else '❌'} VÉRIFICATION: Champ is_external dans liste cessions")
        
        critical_success = is_external_fix and company_settings_fix and list_is_external_fix
        print(f"\n🏆 CORRECTIONS CSE: {'✅ TOUTES VALIDÉES' if critical_success else '❌ NÉCESSITENT INTERVENTION'}")
        
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
    tester = CSEModuleTester()
    success = tester.run_all_tests()
    
    # Code de sortie
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()