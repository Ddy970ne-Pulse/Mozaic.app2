"""
🔄 MIGRATION demo_absence_types → MongoDB
Déplace la configuration hardcodée des types d'absence vers la base de données
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.mozaik_rh

# Configuration des types d'absence (depuis server.py)
ABSENCE_TYPES_CONFIG = [
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

async def migrate_absence_types():
    """Migration de demo_absence_types vers MongoDB"""
    
    print("=" * 80)
    print("🔄 MIGRATION demo_absence_types → MongoDB")
    print("=" * 80)
    
    # 1️⃣ Vérifier si collection existe déjà
    existing_count = await db.absence_types_config.count_documents({})
    
    if existing_count > 0:
        print(f"\n⚠️  Collection 'absence_types_config' existe déjà avec {existing_count} documents")
        response = input("Voulez-vous la remplacer ? (o/n): ")
        
        if response.lower() != 'o':
            print("❌ Migration annulée")
            return
        
        # Supprimer la collection existante
        await db.absence_types_config.drop()
        print("✅ Ancienne collection supprimée")
    
    # 2️⃣ Insérer les types d'absence
    print(f"\n📥 Insertion de {len(ABSENCE_TYPES_CONFIG)} types d'absence...")
    
    result = await db.absence_types_config.insert_many(ABSENCE_TYPES_CONFIG)
    
    print(f"✅ {len(result.inserted_ids)} types d'absence insérés")
    
    # 3️⃣ Créer un index sur le code
    await db.absence_types_config.create_index("code", unique=True)
    print("✅ Index créé sur 'code'")
    
    # 4️⃣ Vérification
    print("\n🔍 VÉRIFICATION:")
    all_types = await db.absence_types_config.find({}).to_list(100)
    
    print(f"   • Total types: {len(all_types)}")
    print(f"   • Catégories:")
    categories = {}
    for t in all_types:
        cat = t.get("category", "unknown")
        categories[cat] = categories.get(cat, 0) + 1
    
    for cat, count in categories.items():
        print(f"     - {cat}: {count}")
    
    # 5️⃣ Afficher quelques exemples
    print("\n📋 EXEMPLES DE TYPES INSÉRÉS:")
    for absence_type in all_types[:5]:
        print(f"   • {absence_type['code']}: {absence_type['name']} ({absence_type['category']})")
    
    print("\n" + "=" * 80)
    print("✅ MIGRATION TERMINÉE AVEC SUCCÈS")
    print("=" * 80)
    
    print("\n💡 PROCHAINE ÉTAPE:")
    print("   Modifier server.py pour utiliser db.absence_types_config au lieu de demo_absence_types")

if __name__ == "__main__":
    asyncio.run(migrate_absence_types())
