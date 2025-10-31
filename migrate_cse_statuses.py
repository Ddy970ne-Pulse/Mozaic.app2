"""
Script de migration pour les utilisateurs CSE existants
Convertit isDelegateCSE en statut_cse approprié
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory
env_path = Path(__file__).parent / 'backend' / '.env'
load_dotenv(env_path)

async def migrate_cse_statuses():
    # Connexion MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🔄 Migration des statuts CSE...")
    
    # 1. Mettre à jour tous les utilisateurs sans statut_cse
    result1 = await db.users.update_many(
        {'statut_cse': {'$exists': False}},
        {'$set': {'statut_cse': 'Non-membre'}}
    )
    print(f"✅ {result1.modified_count} utilisateur(s) défini(s) comme 'Non-membre' par défaut")
    
    # 2. Pour les utilisateurs qui ont isDelegateCSE mais statut_cse='Non-membre', les définir comme Titulaire
    result2 = await db.users.update_many(
        {'isDelegateCSE': True, 'statut_cse': 'Non-membre'},
        {'$set': {'statut_cse': 'Titulaire'}}
    )
    print(f"✅ {result2.modified_count} délégué(s) CSE converti(s) en 'Titulaire'")
    
    # 3. Afficher le résumé
    titulaires_count = await db.users.count_documents({'statut_cse': 'Titulaire'})
    suppleants_count = await db.users.count_documents({'statut_cse': 'Suppléant'})
    non_membres_count = await db.users.count_documents({'statut_cse': 'Non-membre'})
    
    print(f"\n📊 Résumé des statuts CSE:")
    print(f"   👥 Titulaires: {titulaires_count}")
    print(f"   🔄 Suppléants: {suppleants_count}")
    print(f"   ⚪ Non-membres: {non_membres_count}")
    
    # 4. Afficher les membres CSE
    print(f"\n🏛️ Liste des membres CSE:")
    cse_members = await db.users.find(
        {'statut_cse': {'$in': ['Titulaire', 'Suppléant']}},
        {'name': 1, 'statut_cse': 1, '_id': 0}
    ).to_list(length=100)
    
    for member in cse_members:
        status_emoji = '👥' if member['statut_cse'] == 'Titulaire' else '🔄'
        print(f"   {status_emoji} {member['name']} - {member['statut_cse']}")
    
    print("\n✅ Migration terminée !")

if __name__ == '__main__':
    asyncio.run(migrate_cse_statuses())
