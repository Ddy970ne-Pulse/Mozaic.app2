#!/usr/bin/env python3
"""
TEST COMPLET DES FONCTIONNALITÉS MOZAIK RH APRÈS IMPLÉMENTATION WEBSOCKET
Test complet des fonctionnalités MOZAIK RH après implémentation WebSocket et ajout rapide d'absence

OBJECTIF: Vérifier que toutes les nouvelles fonctionnalités WebSocket et ajout rapide d'absence fonctionnent correctement.
USER ACCOUNT: Admin Diego DACALOR (ddacalor@aaea-gpe.fr / admin123)

TESTS À EFFECTUER:
1. Test WebSocket Connection - wss://hr-multi-saas.preview.emergentagent.com/api/ws/{user_id}
2. Test API Absences (Ajout Rapide) - POST /api/absences
3. Test GET /api/users - vérifier champ email non undefined
4. Tests Existants - valider endpoints existants
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
BACKEND_URL = "https://hr-multi-saas.preview.emergentagent.com/api"
WEBSOCKET_URL = "wss://hr-multi-saas.preview.emergentagent.com/api/ws"
ADMIN_EMAIL = "ddacalor@aaea-gpe.fr"
ADMIN_PASSWORD = "admin123"

class WebSocketAbsenceTester:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.session = requests.Session()
        self.websocket_messages = []
        self.websocket_connected = False
        self.test_results = {
            "websocket": {"passed": 0, "failed": 0, "details": []},
            "absence_api": {"passed": 0, "failed": 0, "details": []},
            "users_api": {"passed": 0, "failed": 0, "details": []},
            "existing_apis": {"passed": 0, "failed": 0, "details": []}
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

    async def test_websocket_connection(self):
        """TEST 1: WebSocket Connection"""
        print(f"\n🔌 TEST 1 - WEBSOCKET CONNECTION")
        print("=" * 60)
        
        if not self.user_id:
            self.log_result("websocket", "WebSocket Connection", False, "User ID manquant pour test WebSocket")
            return
        
        websocket_url = f"{WEBSOCKET_URL}/{self.user_id}"
        print(f"🔗 URL WebSocket: {websocket_url}")
        
        try:
            # Test de connexion WebSocket
            async with websockets.connect(websocket_url) as websocket:
                self.websocket_connected = True
                print(f"✅ Connexion WebSocket établie")
                
                # Attendre un message de bienvenue
                try:
                    welcome_message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    print(f"✅ Message de bienvenue reçu: {welcome_message}")
                    self.log_result("websocket", "Connexion WebSocket acceptée", True, 
                                   f"Connexion réussie sur {websocket_url}")
                    self.log_result("websocket", "Message de bienvenue reçu", True, 
                                   f"Message: {welcome_message}")
                except asyncio.TimeoutError:
                    print(f"⚠️ Aucun message de bienvenue reçu dans les 5 secondes")
                    self.log_result("websocket", "Message de bienvenue reçu", False, 
                                   "Timeout - aucun message de bienvenue")
                
                # Tester l'envoi d'un message
                test_message = {"type": "ping", "data": "test"}
                await websocket.send(json.dumps(test_message))
                print(f"✅ Message de test envoyé")
                
                # Attendre une réponse
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=3.0)
                    print(f"✅ Réponse reçue: {response}")
                    self.log_result("websocket", "Communication bidirectionnelle", True, 
                                   f"Réponse: {response}")
                except asyncio.TimeoutError:
                    print(f"⚠️ Aucune réponse au message de test")
                    self.log_result("websocket", "Communication bidirectionnelle", False, 
                                   "Timeout - aucune réponse")
                
        except websockets.exceptions.InvalidStatusCode as e:
            if e.status_code == 404:
                self.log_result("websocket", "Connexion WebSocket acceptée", False, 
                               f"Erreur 404 - Endpoint WebSocket non trouvé: {websocket_url}")
            else:
                self.log_result("websocket", "Connexion WebSocket acceptée", False, 
                               f"Erreur HTTP {e.status_code}: {str(e)}")
        except Exception as e:
            self.log_result("websocket", "Connexion WebSocket acceptée", False, 
                           f"Erreur de connexion: {str(e)}")
    
    def run_websocket_test(self):
        """Wrapper pour exécuter le test WebSocket de manière synchrone"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(self.test_websocket_connection())
        except Exception as e:
            self.log_result("websocket", "Test WebSocket", False, f"Erreur d'exécution: {str(e)}")
        finally:
            loop.close()

    def test_users_api_email_field(self):
        """TEST 3: GET /api/users - Vérifier champ email non undefined"""
        print(f"\n👥 TEST 3 - GET /api/users - VÉRIFICATION CHAMP EMAIL")
        print("=" * 60)
        
        try:
            # Test 1: GET /api/users
            response = self.session.get(f"{BACKEND_URL}/users")
            
            if response.status_code == 200:
                users = response.json()
                print(f"✅ GET /api/users accessible (200)")
                print(f"✅ Nombre d'utilisateurs: {len(users)}")
                
                # Test 2: Vérifier que chaque user a un champ email (pas undefined)
                users_with_email = 0
                users_without_email = 0
                invalid_emails = []
                
                for user in users:
                    email = user.get("email")
                    if email and email != "undefined" and email.strip():
                        users_with_email += 1
                        # Vérifier format email basique
                        if "@" not in email or "." not in email:
                            invalid_emails.append(f"{user.get('name', 'Unknown')} - {email}")
                    else:
                        users_without_email += 1
                        invalid_emails.append(f"{user.get('name', 'Unknown')} - {email}")
                
                # Résultats
                all_have_valid_email = users_without_email == 0
                self.log_result("users_api", "Tous les users ont un champ email", 
                               all_have_valid_email,
                               f"{users_with_email} users avec email valide, {users_without_email} sans email" if all_have_valid_email else f"PROBLÈME: {users_without_email} users sans email valide")
                
                # Test 3: Vérifier format email valide
                has_valid_format = len(invalid_emails) == 0
                self.log_result("users_api", "Format email valide", 
                               has_valid_format,
                               "Tous les emails ont un format valide" if has_valid_format else f"Emails invalides: {invalid_emails[:3]}")
                
                # Afficher quelques exemples
                print(f"\n📋 EXEMPLES D'UTILISATEURS:")
                for i, user in enumerate(users[:5]):
                    email = user.get("email", "MANQUANT")
                    name = user.get("name", "Unknown")
                    print(f"   {i+1}. {name} - {email}")
                
                if len(users) > 5:
                    print(f"   ... et {len(users) - 5} autres utilisateurs")
                
                if invalid_emails:
                    print(f"\n⚠️ EMAILS PROBLÉMATIQUES:")
                    for invalid in invalid_emails[:5]:
                        print(f"   - {invalid}")
                
            else:
                self.log_result("users_api", "GET /api/users accessible", 
                               False, f"Erreur {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("users_api", "Test GET /api/users", 
                           False, f"Exception: {str(e)}")

    def test_absence_api_quick_add(self):
        """TEST 2: API Absences (Ajout Rapide) - POST /api/absences"""
        print(f"\n📝 TEST 2 - API ABSENCES (AJOUT RAPIDE)")
        print("=" * 60)
        
        try:
            # Étape a) Login déjà fait dans authenticate()
            print(f"✅ a) Login admin réussi")
            
            # Étape b) GET /api/users pour récupérer un employé
            users_response = self.session.get(f"{BACKEND_URL}/users")
            
            if users_response.status_code != 200:
                self.log_result("absence_api", "GET /api/users pour récupérer employé", 
                               False, f"Erreur {users_response.status_code}: {users_response.text}")
                return
            
            users = users_response.json()
            print(f"✅ b) GET /api/users réussi - {len(users)} utilisateurs trouvés")
            
            # Trouver un employé avec un email valide
            target_employee = None
            for user in users:
                email = user.get("email")
                if email and email != "undefined" and "@" in email and user.get("id"):
                    target_employee = user
                    break
            
            if not target_employee:
                self.log_result("absence_api", "Employé avec email valide trouvé", 
                               False, "Aucun employé avec email valide trouvé")
                return
            
            employee_id = target_employee.get("id")
            employee_name = target_employee.get("name")
            employee_email = target_employee.get("email")
            
            print(f"✅ Employé sélectionné: {employee_name} ({employee_email})")
            self.log_result("absence_api", "Employé avec email valide trouvé", 
                           True, f"Employé: {employee_name} - Email: {employee_email}")
            
            # Étape c) POST /api/absences avec les données spécifiées
            absence_data = {
                "employee_id": employee_id,
                "employee_name": employee_name,
                "email": employee_email,
                "motif_absence": "CA",
                "jours_absence": "2",
                "date_debut": "2025-11-05",
                "date_fin": "2025-11-06",
                "notes": "Test ajout rapide automatisé",
                "status": "approved",
                "created_by": "admin"
            }
            
            print(f"📤 c) Envoi POST /api/absences...")
            print(f"   Données: {json.dumps(absence_data, indent=2)}")
            
            absence_response = self.session.post(f"{BACKEND_URL}/absences", json=absence_data)
            
            # Étape d) Vérifier réponse 200 OK (pas 422)
            if absence_response.status_code == 200:
                absence_result = absence_response.json()
                absence_id = absence_result.get("id")
                print(f"✅ d) POST /api/absences réussi (200 OK)")
                print(f"✅ Absence créée avec ID: {absence_id}")
                
                self.log_result("absence_api", "POST /api/absences réponse 200 OK", 
                               True, f"Absence créée avec succès - ID: {absence_id}")
                
                # Étape e) Vérifier que l'absence est bien créée
                # Récupérer les absences de l'employé pour vérifier
                get_absences_response = self.session.get(f"{BACKEND_URL}/absences/{employee_id}")
                
                if get_absences_response.status_code == 200:
                    employee_absences = get_absences_response.json()
                    
                    # Chercher l'absence que nous venons de créer
                    created_absence = None
                    for absence in employee_absences:
                        if absence.get("id") == absence_id:
                            created_absence = absence
                            break
                    
                    if created_absence:
                        print(f"✅ e) Absence bien créée et récupérable")
                        self.log_result("absence_api", "Absence bien créée en base", 
                                       True, f"Absence trouvée avec motif: {created_absence.get('motif_absence')}")
                        
                        # Afficher les détails de l'absence créée
                        print(f"\n📋 DÉTAILS ABSENCE CRÉÉE:")
                        print(f"   ID: {created_absence.get('id')}")
                        print(f"   Employé: {created_absence.get('employee_name')}")
                        print(f"   Email: {created_absence.get('email')}")
                        print(f"   Motif: {created_absence.get('motif_absence')}")
                        print(f"   Jours: {created_absence.get('jours_absence')}")
                        print(f"   Date début: {created_absence.get('date_debut')}")
                        print(f"   Date fin: {created_absence.get('date_fin')}")
                        print(f"   Status: {created_absence.get('status')}")
                        print(f"   Notes: {created_absence.get('notes')}")
                        
                        # Nettoyer - supprimer l'absence de test
                        delete_response = self.session.delete(f"{BACKEND_URL}/absences/{absence_id}")
                        if delete_response.status_code == 200:
                            print(f"✅ Absence de test supprimée")
                        else:
                            print(f"⚠️ Impossible de supprimer l'absence de test: {delete_response.status_code}")
                    else:
                        self.log_result("absence_api", "Absence bien créée en base", 
                                       False, f"Absence {absence_id} non trouvée dans les absences de l'employé")
                else:
                    self.log_result("absence_api", "Vérification absence créée", 
                                   False, f"Erreur récupération absences: {get_absences_response.status_code}")
                
            elif absence_response.status_code == 422:
                error_detail = absence_response.json()
                self.log_result("absence_api", "POST /api/absences réponse 200 OK", 
                               False, f"Erreur 422 (validation): {error_detail}")
                print(f"❌ d) Erreur 422 - Problème de validation:")
                print(f"   {json.dumps(error_detail, indent=2)}")
            else:
                self.log_result("absence_api", "POST /api/absences réponse 200 OK", 
                               False, f"Erreur {absence_response.status_code}: {absence_response.text}")
                print(f"❌ d) Erreur {absence_response.status_code}: {absence_response.text}")
                
        except Exception as e:
            self.log_result("absence_api", "Test API Absences", 
                           False, f"Exception: {str(e)}")

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
        print(f"📊 RÉSUMÉ COMPLET DES TESTS DE MIGRATION")
        print(f"=" * 80)
        
        total_passed = 0
        total_failed = 0
        
        for phase_name, results in self.test_results.items():
            phase_display = {
                "phase1": "PHASE 1 - SUPPRESSION FICHIERS TEST",
                "phase2": "PHASE 2 - ANALYTICS RÉELLES", 
                "phase3": "PHASE 3 - ABSENCE TYPES EN BDD",
                "phase4": "PHASE 4 - INTÉGRATION CRÉATION ABSENCE"
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
        
        # Critères de succès selon la demande
        print(f"\n📋 CRITÈRES DE SUCCÈS:")
        success_criteria = [
            ("Fichiers test supprimés", self.test_results["phase1"]["failed"] == 0),
            ("Analytics retourne données RÉELLES", self.test_results["phase2"]["failed"] == 0),
            ("22 types absence depuis MongoDB", self.test_results["phase3"]["failed"] == 0),
            ("Création absence utilise config BDD", self.test_results["phase4"]["failed"] == 0)
        ]
        
        for criterion, met in success_criteria:
            status = "✅" if met else "❌"
            print(f"   {status} {criterion}")
        
        all_success = all(met for _, met in success_criteria)
        print(f"\n🏆 MIGRATION COMPLÈTE: {'✅ RÉUSSIE' if all_success else '❌ INCOMPLÈTE'}")
        
        return all_success

    def run_all_tests(self):
        """Exécuter tous les tests de migration"""
        print("🚀 DÉMARRAGE DES TESTS DE MIGRATION COMPLÈTE")
        print("=" * 80)
        print("OBJECTIF: Vérifier que toutes les modifications de la migration complète (Phases 1+2+3) fonctionnent correctement")
        print("USER ACCOUNT: Admin Diego DACALOR (ddacalor@aaea-gpe.fr / admin123)")
        print("=" * 80)
        
        # Authentification
        if not self.authenticate():
            print("❌ Impossible de continuer sans authentification")
            return False
        
        # Exécuter tous les tests
        self.test_phase1_file_deletion()
        self.test_phase2_real_analytics()
        self.test_phase3_absence_types_db()
        self.test_phase4_absence_creation_integration()
        
        # Afficher le résumé
        return self.print_summary()

def main():
    """Point d'entrée principal"""
    tester = MigrationTester()
    success = tester.run_all_tests()
    
    # Code de sortie
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()