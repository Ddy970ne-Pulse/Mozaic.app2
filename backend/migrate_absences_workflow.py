"""
Migration: Ajouter les champs de workflow aux absences existantes
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def migrate():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"🔄 Migration des absences dans la base '{db_name}'...")
    
    # Compter les absences à mettre à jour
    total = await db.absences.count_documents({})
    print(f"📊 {total} absence(s) trouvée(s)\n")
    
    # Mettre à jour toutes les absences existantes
    result = await db.absences.update_many(
        {},
        {"$set": {
            "validated_by_manager": None,
            "manager_validation_date": None,
            "approved_by": None,
            "approved_at": None,
            "rejected_by": None,
            "rejected_at": None,
            "rejection_reason": None
        }}
    )
    
    print(f"✅ {result.modified_count} absence(s) mise(s) à jour avec nouveaux champs workflow")
    
    # Vérifier le résultat
    sample = await db.absences.find_one({})
    if sample:
        print(f"\n📋 Exemple d'absence après migration:")
        print(f"   ID: {sample.get('id', 'N/A')}")
        print(f"   Employee: {sample.get('employee_name', 'N/A')}")
        print(f"   Status: {sample.get('status', 'N/A')}")
        print(f"   validated_by_manager: {sample.get('validated_by_manager', 'N/A')}")
        print(f"   approved_by: {sample.get('approved_by', 'N/A')}")
        print(f"   rejected_by: {sample.get('rejected_by', 'N/A')}")
    
    client.close()
    print(f"\n✅ Migration terminée avec succès!")

if __name__ == "__main__":
    asyncio.run(migrate())
