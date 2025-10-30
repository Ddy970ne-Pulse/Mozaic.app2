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

    def test_phase3_absence_types_db(self):
        """PHASE 3 - ABSENCE TYPES EN BDD"""
        print(f"\n🗃️ PHASE 3 - ABSENCE TYPES EN BDD")
        print("=" * 60)
        
        try:
            # Test 1: GET /api/absence-types
            response = self.session.get(f"{BACKEND_URL}/absence-types")
            
            if response.status_code == 200:
                absence_types = response.json()
                print(f"✅ Absence types endpoint accessible (200)")
                
                # Test 2: Vérifier 22 types d'absence retournés depuis MongoDB
                types_count = len(absence_types)
                expected_count = 22
                has_correct_count = types_count == expected_count
                self.log_result("phase3", "22 types d'absence retournés", 
                               has_correct_count,
                               f"{types_count} types trouvés" if has_correct_count else f"Nombre incorrect: {types_count}",
                               expected_count, types_count)
                
                # Test 3: Vérifier structure correcte (code, name, category, counting_method, etc.)
                if absence_types:
                    first_type = absence_types[0]
                    required_fields = ["code", "name", "category", "counting_method", "requires_validation", "requires_acknowledgment"]
                    has_correct_structure = all(field in first_type for field in required_fields)
                    self.log_result("phase3", "Structure correcte des types", 
                                   has_correct_structure,
                                   f"Champs présents: {list(first_type.keys())}" if has_correct_structure else f"Champs manquants dans: {list(first_type.keys())}")
                
                # Afficher quelques types pour vérification
                print(f"\n📋 TYPES D'ABSENCE TROUVÉS ({types_count}):")
                for i, abs_type in enumerate(absence_types[:5]):  # Afficher les 5 premiers
                    print(f"   {i+1}. {abs_type.get('code')} - {abs_type.get('name')} ({abs_type.get('counting_method')})")
                if types_count > 5:
                    print(f"   ... et {types_count - 5} autres")
                
            else:
                self.log_result("phase3", "Absence types endpoint accessible", 
                               False, f"Erreur {response.status_code}: {response.text}")
                return
                
            # Test 4: GET /api/absence-types/CA
            response_ca = self.session.get(f"{BACKEND_URL}/absence-types/CA")
            
            if response_ca.status_code == 200:
                ca_type = response_ca.json()
                print(f"✅ Type CA endpoint accessible (200)")
                
                # Test 5: Vérifier retourne "CA - Congés Annuels" depuis BDD
                ca_name = ca_type.get("name", "")
                expected_ca_name = "CA - Congés Annuels"
                has_correct_ca_name = ca_name == expected_ca_name
                self.log_result("phase3", "Type CA correct depuis BDD", 
                               has_correct_ca_name,
                               f"Nom CA: '{ca_name}'" if has_correct_ca_name else f"Nom incorrect: '{ca_name}'",
                               expected_ca_name, ca_name)
                
                # Test 6: Vérifier counting_method = "Jours Ouvrables"
                ca_counting = ca_type.get("counting_method", "")
                expected_counting = "Jours Ouvrables"
                has_correct_counting = ca_counting == expected_counting
                self.log_result("phase3", "CA counting_method correct", 
                               has_correct_counting,
                               f"Counting method: '{ca_counting}'" if has_correct_counting else f"Counting method incorrect: '{ca_counting}'",
                               expected_counting, ca_counting)
                
                print(f"\n📋 DÉTAILS TYPE CA:")
                print(f"   Code: {ca_type.get('code')}")
                print(f"   Name: {ca_type.get('name')}")
                print(f"   Category: {ca_type.get('category')}")
                print(f"   Counting Method: {ca_type.get('counting_method')}")
                print(f"   Requires Validation: {ca_type.get('requires_validation')}")
                
            else:
                self.log_result("phase3", "Type CA endpoint accessible", 
                               False, f"Erreur {response_ca.status_code}: {response_ca.text}")
                
        except Exception as e:
            self.log_result("phase3", "Absence types test", 
                           False, f"Exception: {str(e)}")

    def test_phase4_absence_creation_integration(self):
        """PHASE 4 - INTÉGRATION - CRÉATION ABSENCE"""
        print(f"\n🔄 PHASE 4 - INTÉGRATION - CRÉATION ABSENCE")
        print("=" * 60)
        
        try:
            # Préparer les données de test pour création d'absence
            test_absence_data = {
                "employee_id": "test-employee-id",  # Sera remplacé par l'ID admin
                "employee_name": "Diego DACALOR",
                "email": ADMIN_EMAIL,
                "date_debut": "15/01/2026",
                "jours_absence": "5",
                "motif_absence": "CA",
                "notes": "Test migration - création absence avec type CA"
            }
            
            # Récupérer l'ID de l'utilisateur admin pour le test
            me_response = self.session.get(f"{BACKEND_URL}/auth/me")
            if me_response.status_code == 200:
                admin_user = me_response.json()
                test_absence_data["employee_id"] = admin_user.get("id")
                print(f"✅ Admin user ID récupéré: {admin_user.get('id')}")
            
            # Test 1: POST /api/absences avec type "CA"
            response = self.session.post(f"{BACKEND_URL}/absences", json=test_absence_data)
            
            if response.status_code == 200:
                creation_response = response.json()
                absence_id = creation_response.get("id")
                print(f"✅ Absence créée avec succès (200)")
                
                # Récupérer l'absence créée depuis la base pour vérifier les champs enrichis
                get_response = self.session.get(f"{BACKEND_URL}/absences/{test_absence_data['employee_id']}")
                if get_response.status_code == 200:
                    absences_list = get_response.json()
                    # Trouver l'absence que nous venons de créer
                    created_absence = None
                    for abs_item in absences_list:
                        if abs_item.get("id") == absence_id:
                            created_absence = abs_item
                            break
                    
                    if created_absence:
                        # Test 2: Vérifier counting_method récupéré depuis BDD (via get_absence_type_config)
                        counting_method = created_absence.get("counting_method")
                        expected_counting = "Jours Ouvrables"
                        has_correct_counting = counting_method == expected_counting
                        self.log_result("phase4", "counting_method récupéré depuis BDD", 
                                       has_correct_counting,
                                       f"Counting method: '{counting_method}'" if has_correct_counting else f"Counting method incorrect: '{counting_method}'",
                                       expected_counting, counting_method)
                        
                        # Test 3: Vérifier date fin calculée correctement
                        date_fin = created_absence.get("date_fin")
                        has_date_fin = date_fin is not None and date_fin != "" and date_fin != "None"
                        self.log_result("phase4", "Date fin calculée correctement", 
                                       has_date_fin,
                                       f"Date fin calculée: {date_fin}" if has_date_fin else "Date fin manquante")
                        
                        # Test 4: Vérifier absence créée avec succès
                        has_absence_id = absence_id is not None and absence_id != ""
                        self.log_result("phase4", "Absence créée avec succès", 
                                       has_absence_id,
                                       f"Absence ID: {absence_id}" if has_absence_id else "ID absence manquant")
                        
                        print(f"\n📋 DÉTAILS ABSENCE CRÉÉE:")
                        print(f"   ID: {created_absence.get('id')}")
                        print(f"   Employee: {created_absence.get('employee_name')}")
                        print(f"   Type: {created_absence.get('motif_absence')}")
                        print(f"   Date début: {created_absence.get('date_debut')}")
                        print(f"   Date fin: {created_absence.get('date_fin')}")
                        print(f"   Jours: {created_absence.get('jours_absence')}")
                        print(f"   Counting method: {created_absence.get('counting_method')}")
                        print(f"   Status: {created_absence.get('status')}")
                    else:
                        self.log_result("phase4", "Récupération absence créée", 
                                       False, f"Absence {absence_id} non trouvée dans la liste")
                else:
                    self.log_result("phase4", "Récupération absence créée", 
                                   False, f"Erreur récupération absences: {get_response.status_code}")
                
                # Nettoyer - supprimer l'absence de test
                if absence_id:
                    delete_response = self.session.delete(f"{BACKEND_URL}/absences/{absence_id}")
                    if delete_response.status_code == 200:
                        print(f"✅ Absence de test supprimée")
                    else:
                        print(f"⚠️ Impossible de supprimer l'absence de test: {delete_response.status_code}")
                
            else:
                self.log_result("phase4", "Création absence avec type CA", 
                               False, f"Erreur {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("phase4", "Test création absence", 
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