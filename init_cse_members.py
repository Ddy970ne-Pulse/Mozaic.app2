"""
Script d'initialisation des membres CSE
Ajoute le champ statut_cse à quelques utilisateurs existants pour tester le module CSE
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def init_cse_members():
    # Connexion MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🏛️ Initialisation des membres CSE...")
    
    # Récupérer quelques utilisateurs
    users = await db.users.find().limit(10).to_list(length=10)
    
    if len(users) < 3:
        print("❌ Pas assez d'utilisateurs dans la base. Créez d'abord des utilisateurs.")
        return
    
    # Définir quelques membres CSE
    cse_assignments = [
        {'index': 0, 'statut': 'Titulaire'},
        {'index': 1, 'statut': 'Titulaire'},
        {'index': 2, 'statut': 'Suppléant'},
    ]
    
    updated_count = 0
    for assignment in cse_assignments:
        if assignment['index'] < len(users):
            user = users[assignment['index']]
            result = await db.users.update_one(
                {'id': user['id']},
                {'$set': {'statut_cse': assignment['statut']}}
            )
            if result.modified_count > 0:
                print(f"✅ {user['name']} → {assignment['statut']}")
                updated_count += 1
    
    print(f"\n🎉 {updated_count} membre(s) CSE initialisé(s)")
    print("\nPour voir les membres:")
    print("1. Connectez-vous en tant qu'admin")
    print("2. Allez dans 'Gestion Utilisateurs'")  
    print("3. Pour chaque utilisateur, définissez le 'Statut CSE' (Titulaire/Suppléant)")
    print("4. Les membres apparaîtront dans 'CSE & Délégation'")

if __name__ == '__main__':
    asyncio.run(init_cse_members())
