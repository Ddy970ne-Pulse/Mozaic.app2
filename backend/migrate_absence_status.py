"""
Script de migration pour ajouter le champ 'status' aux absences existantes
Toutes les absences importées sans statut seront marquées comme 'approved'
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def migrate_absence_status():
    # Connexion à MongoDB
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017/mozaikrh')
    client = AsyncIOMotorClient(mongo_url)
    db = client.get_database()
    
    print("🔄 Migration des statuts d'absence...")
    
    # Compter les absences sans statut
    count_no_status = await db.absences.count_documents({"status": {"$exists": False}})
    count_empty_status = await db.absences.count_documents({"status": ""})
    count_null_status = await db.absences.count_documents({"status": None})
    
    total_to_update = count_no_status + count_empty_status + count_null_status
    
    print(f"📊 Absences à mettre à jour:")
    print(f"  - Sans champ status: {count_no_status}")
    print(f"  - Status vide: {count_empty_status}")
    print(f"  - Status null: {count_null_status}")
    print(f"  - TOTAL: {total_to_update}")
    
    if total_to_update == 0:
        print("✅ Toutes les absences ont déjà un statut!")
        client.close()
        return
    
    # Mettre à jour les absences sans statut
    result1 = await db.absences.update_many(
        {"status": {"$exists": False}},
        {"$set": {"status": "approved"}}
    )
    
    # Mettre à jour les absences avec statut vide
    result2 = await db.absences.update_many(
        {"status": ""},
        {"$set": {"status": "approved"}}
    )
    
    # Mettre à jour les absences avec statut null
    result3 = await db.absences.update_many(
        {"status": None},
        {"$set": {"status": "approved"}}
    )
    
    total_updated = result1.modified_count + result2.modified_count + result3.modified_count
    
    print(f"\n✅ Migration terminée!")
    print(f"📝 {total_updated} absences mises à jour avec status='approved'")
    
    # Vérification
    count_pending = await db.absences.count_documents({"status": "pending"})
    count_approved = await db.absences.count_documents({"status": "approved"})
    count_rejected = await db.absences.count_documents({"status": "rejected"})
    count_total = await db.absences.count_documents({})
    
    print(f"\n📊 Statut final:")
    print(f"  - En attente: {count_pending}")
    print(f"  - Approuvées: {count_approved}")
    print(f"  - Rejetées: {count_rejected}")
    print(f"  - TOTAL: {count_total}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_absence_status())
