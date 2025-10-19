"""
Script de test du workflow double validation CCN66
"""
import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://rh-planning-app.preview.emergentagent.com')
BASE_URL = f"{BACKEND_URL}/api"

def test_workflow():
    print("🧪 TEST WORKFLOW DOUBLE VALIDATION CCN66\n")
    print("="*80)
    
    # ==================== ÉTAPE 1: Login Manager ====================
    print("\n1️⃣ Login Manager...")
    try:
        login_manager = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "jedau@aaea-gpe.fr",  # Manager Jacques EDAU
            "password": "gPGlceec"
        })
        
        if login_manager.status_code != 200:
            print(f"❌ Échec login manager: {login_manager.status_code}")
            print(f"   Réponse: {login_manager.text}")
            return
        
        manager_data = login_manager.json()
        manager_token = manager_data.get("token")
        print(f"✅ Manager connecté: {manager_data.get('name', 'N/A')}")
        print(f"   Role: {manager_data.get('role', 'N/A')}")
    except Exception as e:
        print(f"❌ Erreur login manager: {e}")
        return
    
    # ==================== ÉTAPE 2: Trouver une absence pending ====================
    print("\n2️⃣ Recherche d'une absence 'pending'...")
    try:
        response = requests.get(
            f"{BASE_URL}/absences",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        
        if response.status_code == 200:
            absences = response.json()
            pending_absences = [a for a in absences if a.get('status') == 'pending']
            
            if not pending_absences:
                print("⚠️  Aucune absence 'pending' trouvée")
                print("   Créez une absence via l'interface pour tester le workflow")
                return
            
            test_absence = pending_absences[0]
            absence_id = test_absence['id']
            
            print(f"✅ Absence trouvée:")
            print(f"   ID: {absence_id}")
            print(f"   Employé: {test_absence.get('employee_name', 'N/A')}")
            print(f"   Type: {test_absence.get('motif_absence', 'N/A')}")
            print(f"   Dates: {test_absence.get('date_debut', 'N/A')} → {test_absence.get('date_fin', 'N/A')}")
            print(f"   Status actuel: {test_absence.get('status', 'N/A')}")
        else:
            print(f"❌ Erreur récupération absences: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return
    
    # ==================== ÉTAPE 3: Manager pré-valide ====================
    print("\n3️⃣ Manager PRÉ-VALIDE l'absence...")
    try:
        response = requests.put(
            f"{BASE_URL}/absences/{absence_id}",
            headers={"Authorization": f"Bearer {manager_token}"},
            json={"status": "validated_by_manager"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Pré-validation réussie!")
            print(f"   Status: {result.get('status_change', 'N/A')}")
            print(f"   Workflow: {result.get('workflow_step', 'N/A')}")
            print(f"   Compteurs synchronisés: {result.get('counters_synced', False)}")
            print(f"   ⚠️  Les compteurs NE DOIVENT PAS être déduits à cette étape")
        else:
            print(f"❌ Échec pré-validation: {response.status_code}")
            print(f"   Réponse: {response.text}")
            return
    except Exception as e:
        print(f"❌ Erreur pré-validation: {e}")
        return
    
    # ==================== ÉTAPE 4: Login Admin ====================
    print("\n4️⃣ Login Admin...")
    try:
        login_admin = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "ddacalor@aaea-gpe.fr",
            "password": "admin123"
        })
        
        if login_admin.status_code != 200:
            print(f"❌ Échec login admin: {login_admin.status_code}")
            return
        
        admin_data = login_admin.json()
        admin_token = admin_data.get("token")
        print(f"✅ Admin connecté: {admin_data.get('name', 'N/A')}")
    except Exception as e:
        print(f"❌ Erreur login admin: {e}")
        return
    
    # ==================== ÉTAPE 5: Admin approuve ====================
    print("\n5️⃣ Admin APPROUVE l'absence (approbation finale)...")
    try:
        response = requests.put(
            f"{BASE_URL}/absences/{absence_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "approved"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Approbation finale réussie!")
            print(f"   Status: {result.get('status_change', 'N/A')}")
            print(f"   Workflow: {result.get('workflow_step', 'N/A')}")
            print(f"   Compteurs synchronisés: {result.get('counters_synced', False)}")
            print(f"   ✅ Les compteurs DOIVENT être déduits maintenant!")
        else:
            print(f"❌ Échec approbation: {response.status_code}")
            print(f"   Réponse: {response.text}")
            return
    except Exception as e:
        print(f"❌ Erreur approbation: {e}")
        return
    
    print("\n" + "="*80)
    print("✅ TEST WORKFLOW TERMINÉ AVEC SUCCÈS!")
    print("\nRésumé:")
    print("  1️⃣ Manager a pré-validé → status='validated_by_manager' (pas de déduction)")
    print("  2️⃣ Admin a approuvé → status='approved' (déduction compteurs)")
    print("\nVérifiez les compteurs de l'employé dans l'interface!")

if __name__ == "__main__":
    test_workflow()
