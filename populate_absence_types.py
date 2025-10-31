#!/usr/bin/env python3
"""
Script pour peupler la collection absence_types_config avec les 22 types d'absence
"""

import requests
import json
import sys

# Configuration
BACKEND_URL = "https://oncall-planner-2.preview.emergentagent.com/api"
ADMIN_EMAIL = "ddacalor@aaea-gpe.fr"
ADMIN_PASSWORD = "admin123"

# Les 22 types d'absence selon la spécification
ABSENCE_TYPES = [
    {"code": "AT", "name": "Accident du travail/Trajet", "category": "medical", "type": "Absentéisme", "counting_method": "Jours Calendaires", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "AM", "name": "Arrêt maladie", "category": "medical", "type": "Absentéisme", "counting_method": "Jours Calendaires", "requires_validation": False, "requires_acknowledgment": True},
    {"code": "MPRO", "name": "Maladie Professionnelle", "category": "medical", "type": "Absentéisme", "counting_method": "Jours Calendaires", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "EMAL", "name": "Enfants malades", "category": "medical", "type": "Absentéisme", "counting_method": "Jours Calendaires", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "RMED", "name": "Rendez-vous médical", "category": "medical", "type": "Absentéisme", "counting_method": "Jours Ouvrés", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "MAT", "name": "Congé maternité", "category": "family", "type": "Absence Programmée", "counting_method": "Jours Calendaires", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "PAT", "name": "Congé paternité", "category": "family", "type": "Absence Programmée", "counting_method": "Jours Calendaires", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "FAM", "name": "Évènement familial", "category": "family", "type": "Absentéisme", "counting_method": "Jours Calendaires", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "CA", "name": "CA - Congés Annuels", "category": "vacation", "type": "Absence Programmée", "counting_method": "Jours Ouvrables", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "CT", "name": "Congés Trimestriels", "category": "vacation", "type": "Absence Programmée", "counting_method": "Jours Ouvrés", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "RTT", "name": "RTT (Réduction Temps Travail)", "category": "vacation", "type": "Absence Programmée", "counting_method": "Jours Ouvrables", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "REC", "name": "Récupération", "category": "vacation", "type": "Absence Programmée", "counting_method": "Jours Ouvrables", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "RH", "name": "Repos Hebdomadaire", "category": "vacation", "type": "Absence Programmée", "counting_method": "Jours Ouvrables", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "RHD", "name": "Repos Dominical", "category": "vacation", "type": "Absence Programmée", "counting_method": "Jours Calendaires", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "CEX", "name": "Congé exceptionnel", "category": "vacation", "type": "Absentéisme", "counting_method": "Jours Ouvrables", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "TEL", "name": "Télétravail", "category": "work", "type": "Absentéisme", "counting_method": "Jours Ouvrables", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "DEL", "name": "Délégation", "category": "work", "type": "Absentéisme", "counting_method": "Jours Ouvrables", "requires_validation": False, "requires_acknowledgment": False},
    {"code": "FO", "name": "Congé formation", "category": "work", "type": "Absentéisme", "counting_method": "Jours Ouvrables", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "STG", "name": "Stage", "category": "work", "type": "Absence Programmée", "counting_method": "Jours Ouvrés", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "NAUT", "name": "Absence non autorisée", "category": "other", "type": "Absentéisme", "counting_method": "Jours Calendaires", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "AUT", "name": "Absence autorisée", "category": "other", "type": "Absentéisme", "counting_method": "Jours Calendaires", "requires_validation": True, "requires_acknowledgment": False},
    {"code": "CSS", "name": "Congés Sans Solde", "category": "other", "type": "Absentéisme", "counting_method": "Jours Ouvrables", "requires_validation": True, "requires_acknowledgment": False}
]

def authenticate():
    """Authenticate as admin"""
    try:
        response = requests.post(f"{BACKEND_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            print(f"✅ Authenticated as {data.get('user', {}).get('name')}")
            return token
        else:
            print(f"❌ Authentication failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Authentication error: {str(e)}")
        return None

def populate_absence_types_via_mongodb():
    """Populate absence types directly via MongoDB connection"""
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        import asyncio
        import os
        from dotenv import load_dotenv
        from pathlib import Path
        
        # Load environment
        ROOT_DIR = Path(__file__).parent / "backend"
        load_dotenv(ROOT_DIR / '.env')
        
        async def insert_types():
            # MongoDB connection
            mongo_url = os.environ['MONGO_URL']
            client = AsyncIOMotorClient(mongo_url)
            db = client[os.environ['DB_NAME']]
            
            # Clear existing types
            await db.absence_types_config.delete_many({})
            print("🗑️ Cleared existing absence types")
            
            # Insert new types
            result = await db.absence_types_config.insert_many(ABSENCE_TYPES)
            print(f"✅ Inserted {len(result.inserted_ids)} absence types")
            
            # Verify
            count = await db.absence_types_config.count_documents({})
            print(f"📊 Total absence types in DB: {count}")
            
            # Show some examples
            types = await db.absence_types_config.find({}).limit(5).to_list(5)
            print("📋 Examples:")
            for t in types:
                print(f"   {t['code']} - {t['name']} ({t['counting_method']})")
            
            client.close()
            return count
        
        return asyncio.run(insert_types())
        
    except Exception as e:
        print(f"❌ MongoDB population error: {str(e)}")
        return 0

def main():
    """Main function"""
    print("🚀 POPULATION DES TYPES D'ABSENCE")
    print("=" * 50)
    
    # Try to populate via MongoDB
    count = populate_absence_types_via_mongodb()
    
    if count == 22:
        print(f"\n✅ SUCCESS: {count} types d'absence peuplés avec succès!")
        
        # Verify via API
        token = authenticate()
        if token:
            headers = {"Authorization": f"Bearer {token}"}
            
            # Test GET /api/absence-types
            response = requests.get(f"{BACKEND_URL}/absence-types", headers=headers)
            if response.status_code == 200:
                types = response.json()
                print(f"✅ API verification: {len(types)} types returned")
                
                # Test GET /api/absence-types/CA
                response_ca = requests.get(f"{BACKEND_URL}/absence-types/CA", headers=headers)
                if response_ca.status_code == 200:
                    ca_type = response_ca.json()
                    print(f"✅ CA type: {ca_type.get('name')} - {ca_type.get('counting_method')}")
                else:
                    print(f"❌ CA type test failed: {response_ca.status_code}")
            else:
                print(f"❌ API verification failed: {response.status_code}")
    else:
        print(f"❌ FAILED: Only {count} types populated")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)