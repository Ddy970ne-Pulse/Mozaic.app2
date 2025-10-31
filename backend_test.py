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

    def test_cse_cessions_list(self):
        """Test 4: Vérification Liste Cessions - GET /api/cse/cessions"""
        print(f"\n📋 TEST 4: VÉRIFICATION LISTE CESSIONS")
        print("=" * 60)
        
        try:
            response = self.session.get(f"{BACKEND_URL}/cse/cessions")
            
            if response.status_code == 200:
                cessions = response.json()
                print(f"✅ GET /api/cse/cessions successful (200) - Found {len(cessions)} cessions")
                
                # Vérifier que les cessions créées apparaissent
                created_cessions_found = 0
                external_cession_found = False
                internal_cession_found = False
                
                for cession in cessions:
                    cession_id = cession.get("id")
                    to_name = cession.get("to_name", "")
                    to_id = cession.get("to_id", "")
                    
                    if cession_id in self.created_cession_ids:
                        created_cessions_found += 1
                        
                        # Vérifier la cession externe
                        if to_id == "external" and "Marie Dupont (Externe)" in to_name:
                            external_cession_found = True
                            print(f"   ✅ Cession externe trouvée: {to_name}")
                        
                        # Vérifier la cession interne
                        elif "Thierry MARTIAS" in to_name:
                            internal_cession_found = True
                            print(f"   ✅ Cession interne trouvée: {to_name}")
                
                if created_cessions_found >= 2:
                    self.log_result("cse_cessions_list", "Cessions créées apparaissent", True,
                                   f"{created_cessions_found} cessions créées trouvées dans la liste")
                else:
                    self.log_result("cse_cessions_list", "Cessions créées apparaissent", False,
                                   f"Seulement {created_cessions_found} cessions trouvées sur {len(self.created_cession_ids)} créées")
                
                # Vérifier l'affichage correct de la cession externe
                if external_cession_found:
                    self.log_result("cse_cessions_list", "Affichage cession externe correct", True,
                                   "Cession externe 'Marie Dupont (Externe)' correctement affichée")
                else:
                    self.log_result("cse_cessions_list", "Affichage cession externe correct", False,
                                   "Cession externe 'Marie Dupont (Externe)' non trouvée dans la liste")
                
                # Vérifier l'affichage de la cession interne
                if internal_cession_found:
                    self.log_result("cse_cessions_list", "Affichage cession interne correct", True,
                                   "Cession interne vers 'Thierry MARTIAS' correctement affichée")
                else:
                    self.log_result("cse_cessions_list", "Affichage cession interne correct", False,
                                   "Cession interne vers 'Thierry MARTIAS' non trouvée dans la liste")
                
                # Afficher un échantillon des cessions pour debug
                print(f"\n📊 Échantillon des cessions trouvées:")
                for i, cession in enumerate(cessions[:3]):  # Afficher les 3 premières
                    print(f"   {i+1}. {cession.get('from_name')} → {cession.get('to_name')} ({cession.get('hours')}h)")
                
            else:
                self.log_result("cse_cessions_list", "GET cse/cessions", False,
                               f"Expected 200, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("cse_cessions_list", "GET cse/cessions", False, f"Exception: {str(e)}")

    def test_company_settings(self):
        """Test 5: Paramètres Entreprise - GET /api/company-settings"""
        print(f"\n🏢 TEST 5: PARAMÈTRES ENTREPRISE")
        print("=" * 60)
        
        try:
            response = self.session.get(f"{BACKEND_URL}/company-settings")
            
            if response.status_code == 200:
                settings = response.json()
                print(f"✅ GET /api/company-settings successful (200)")
                
                # Vérifier effectif = 250 salariés
                effectif = settings.get("effectif")
                if effectif == 250:
                    self.log_result("company_settings", "Effectif correct (250)", True,
                                   f"Effectif = {effectif} salariés comme attendu")
                else:
                    self.log_result("company_settings", "Effectif correct (250)", False,
                                   f"Effectif attendu: 250, trouvé: {effectif}")
                
                # Vérifier accord_entreprise_heures_cse = false
                accord_cse = settings.get("accord_entreprise_heures_cse")
                if accord_cse == False:
                    self.log_result("company_settings", "accord_entreprise_heures_cse = false", True,
                                   f"accord_entreprise_heures_cse = {accord_cse} comme attendu")
                else:
                    self.log_result("company_settings", "accord_entreprise_heures_cse = false", False,
                                   f"accord_entreprise_heures_cse attendu: false, trouvé: {accord_cse}")
                
                # Afficher les paramètres pour information
                print(f"\n📊 Paramètres entreprise:")
                print(f"   - Effectif: {settings.get('effectif')} salariés")
                print(f"   - Nom entreprise: {settings.get('nom_entreprise')}")
                print(f"   - Accord entreprise heures CSE: {settings.get('accord_entreprise_heures_cse')}")
                print(f"   - Secteur d'activité: {settings.get('secteur_activite')}")
                print(f"   - Convention collective: {settings.get('convention_collective')}")
                
                # Vérifier la structure complète
                required_fields = ["effectif", "nom_entreprise", "accord_entreprise_heures_cse"]
                missing_fields = [field for field in required_fields if field not in settings]
                
                if not missing_fields:
                    self.log_result("company_settings", "Structure paramètres complète", True,
                                   "Tous les champs requis présents")
                else:
                    self.log_result("company_settings", "Structure paramètres complète", False,
                                   f"Champs manquants: {missing_fields}")
                
            else:
                self.log_result("company_settings", "GET company-settings", False,
                               f"Expected 200, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("company_settings", "GET company-settings", False, f"Exception: {str(e)}")

    def cleanup_test_data(self):
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
        """Afficher le résumé des tests CSE Module"""
        print(f"\n" + "=" * 80)
        print(f"🏛️ RÉSUMÉ COMPLET DES TESTS MODULE CSE - MEMBRES ET CESSIONS")
        print(f"=" * 80)
        
        total_passed = 0
        total_failed = 0
        
        for phase_name, results in self.test_results.items():
            phase_display = {
                "authentication": "AUTHENTICATION (Login Admin)",
                "cse_delegates": "MEMBRES CSE (GET /api/cse/delegates)", 
                "cse_cessions_internal": "CESSIONS INTERNES (Membre → Membre)",
                "cse_cessions_external": "CESSIONS EXTERNES (Membre → Externe) - PRIORITAIRE",
                "cse_cessions_list": "LISTE CESSIONS (GET /api/cse/cessions)",
                "company_settings": "PARAMÈTRES ENTREPRISE (GET /api/company-settings)"
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
        overall_status = "✅ MODULE CSE COMPLÈTEMENT FONCTIONNEL" if total_failed == 0 else "❌ PROBLÈMES CRITIQUES DÉTECTÉS" if total_passed == 0 else "⚠️ MODULE CSE PARTIELLEMENT FONCTIONNEL"
        print(f"🎯 RÉSULTAT GLOBAL: {overall_status}")
        print(f"📈 TOTAL: {total_passed} réussis, {total_failed} échoués sur {total_passed + total_failed} tests")
        
        # Critères de succès critiques pour le Module CSE
        print(f"\n🔒 CRITÈRES DE SUCCÈS CRITIQUES:")
        success_criteria = [
            ("4 membres CSE retournés avec heures correctes", self.test_results["cse_delegates"]["failed"] == 0),
            ("3 titulaires (22h/mois) et 1 suppléant (0h/mois)", self.test_results["cse_delegates"]["passed"] >= 2),
            ("Cession vers membre CSE existant fonctionne", self.test_results["cse_cessions_internal"]["failed"] == 0),
            ("Cession vers personne externe (to_id='external') fonctionne - PRIORITAIRE", self.test_results["cse_cessions_external"]["failed"] == 0),
            ("Stockage correct du nom externe en texte libre", self.test_results["cse_cessions_external"]["passed"] >= 2),
            ("Liste des cessions affiche correctement les cessions créées", self.test_results["cse_cessions_list"]["failed"] == 0),
            ("Paramètres entreprise: effectif=250, accord_entreprise_heures_cse=false", self.test_results["company_settings"]["failed"] == 0)
        ]
        
        for criterion, met in success_criteria:
            status = "✅" if met else "❌"
            print(f"   {status} {criterion}")
        
        # Focus sur les fonctionnalités critiques CSE
        print(f"\n🎯 FONCTIONNALITÉS CRITIQUES CSE:")
        delegates_success = self.test_results["cse_delegates"]["failed"] == 0
        cessions_success = (self.test_results["cse_cessions_internal"]["failed"] == 0 and 
                           self.test_results["cse_cessions_external"]["failed"] == 0 and
                           self.test_results["cse_cessions_list"]["failed"] == 0)
        settings_success = self.test_results["company_settings"]["failed"] == 0
        
        print(f"   {'✅' if delegates_success else '❌'} MEMBRES CSE - Gestion des délégués")
        print(f"   {'✅' if cessions_success else '❌'} CESSIONS D'HEURES - Internes et externes")
        print(f"   {'✅' if settings_success else '❌'} PARAMÈTRES ENTREPRISE - Configuration")
        
        # Focus spécial sur la fonctionnalité PRIORITAIRE
        external_cessions_success = self.test_results["cse_cessions_external"]["failed"] == 0
        print(f"\n🌟 FONCTIONNALITÉ PRIORITAIRE:")
        print(f"   {'✅' if external_cessions_success else '❌'} CESSIONS VERS PERSONNES EXTERNES - to_id='external' + nom libre")
        
        critical_success = delegates_success and cessions_success and settings_success
        print(f"\n🏆 MODULE CSE: {'✅ PRODUCTION-READY' if critical_success else '❌ NÉCESSITE CORRECTIONS'}")
        
        return critical_success

    def run_all_tests(self):
        """Exécuter tous les tests du Module CSE"""
        print("🚀 DÉMARRAGE DES TESTS MODULE CSE - MEMBRES ET CESSIONS D'HEURES")
        print("=" * 80)
        print("OBJECTIF: Test exhaustif du module CSE selon la demande française spécifique")
        print("USER ACCOUNT: Admin Diego DACALOR (ddacalor@aaea-gpe.fr / admin123)")
        print("BACKEND URL: https://oncall-planner-2.preview.emergentagent.com/api")
        print("PRIORITÉ: Cessions vers personnes externes (to_id='external') - NOUVEAU PRIORITAIRE")
        print("=" * 80)
        
        # Authentification pour tous les tests
        if not self.authenticate():
            print("❌ Impossible de continuer sans authentification")
            return False
        
        # Exécuter tous les tests du Module CSE
        print(f"\n🔄 EXÉCUTION DES TESTS MODULE CSE...")
        
        # Test 1: Vérification Membres CSE - CRITIQUE
        self.test_cse_delegates()
        
        # Test 2: Cession vers Membre CSE (existant)
        self.test_cse_cessions_internal()
        
        # Test 3: Cession vers Personne Externe - PRIORITAIRE
        self.test_cse_cessions_external()
        
        # Test 4: Vérification Liste Cessions
        self.test_cse_cessions_list()
        
        # Test 5: Paramètres Entreprise
        self.test_company_settings()
        
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