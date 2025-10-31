"""
Script de correction des membres CSE et nettoyage des données de test
- Définit les vrais membres CSE
- Retire tous les autres
- Supprime les données de test de cessions
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory
env_path = Path(__file__).parent / 'backend' / '.env'
load_dotenv(env_path)

# MEMBRES CSE OFFICIELS
MEMBRES_CSE = [
    {'nom': 'Jacques EDAU', 'email': 'jedau@aaea-gpe.fr', 'statut': 'Titulaire', 'heures': 22},
    {'nom': 'Thierry MARTIAS', 'email': 'tmartias@aaea-gpe.fr', 'statut': 'Titulaire', 'heures': 22},
    {'nom': 'Jean-François BERNARD', 'email': 'jfbernard@aaea-gpe.fr', 'statut': 'Titulaire', 'heures': 22},
    {'nom': 'Richard MANIOC', 'email': 'rmanioc@aaea-gpe.fr', 'statut': 'Suppléant', 'heures': 0}
]

async def corriger_membres_cse():
    # Connexion MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🏛️ Correction des membres CSE et nettoyage des données de test...")
    print()
    
    # ÉTAPE 1 : Retirer TOUS les utilisateurs du CSE (reset complet)
    print("1️⃣ Nettoyage complet des statuts CSE...")
    result_users = await db.users.update_many(
        {},
        {'$set': {'statut_cse': 'Non-membre', 'isDelegateCSE': False}}
    )
    print(f"   ✅ {result_users.modified_count} utilisateur(s) défini(s) comme 'Non-membre'")
    
    # ÉTAPE 2 : Supprimer TOUS les délégués existants
    print("\n2️⃣ Suppression de tous les délégués CSE existants...")
    result_delegates = await db.cse_delegates.delete_many({})
    print(f"   ✅ {result_delegates.deleted_count} délégué(s) supprimé(s)")
    
    # ÉTAPE 3 : Supprimer les données de test (cessions, utilisations)
    print("\n3️⃣ Suppression des données de test...")
    result_cessions = await db.cse_hour_transfers.delete_many({})
    print(f"   ✅ {result_cessions.deleted_count} cession(s) d'heures supprimée(s)")
    
    result_usage = await db.delegation_usage.delete_many({})
    print(f"   ✅ {result_usage.deleted_count} déclaration(s) d'heures supprimée(s)")
    
    # ÉTAPE 4 : Créer les VRAIS membres CSE
    print("\n4️⃣ Création des membres CSE officiels...")
    
    membres_crees = 0
    for membre in MEMBRES_CSE:
        # Trouver l'utilisateur par email
        user = await db.users.find_one({'email': membre['email']})
        
        if not user:
            print(f"   ⚠️ Utilisateur non trouvé: {membre['nom']} ({membre['email']})")
            continue
        
        # Mettre à jour le statut dans users
        await db.users.update_one(
            {'id': user['id']},
            {'$set': {
                'statut_cse': membre['statut'],
                'isDelegateCSE': True
            }}
        )
        
        # Créer le délégué CSE
        categorie = user.get('categorie_employe', '').lower()
        college = 'employes'
        if 'cadre' in categorie:
            college = 'cadres'
        elif 'ouvrier' in categorie or 'agent' in categorie:
            college = 'ouvriers'
        
        delegate_doc = {
            'id': user['id'] + '_cse',
            'user_id': user['id'],
            'user_name': user['name'],
            'email': user['email'],
            'statut': membre['statut'].lower(),
            'heures_mensuelles': membre['heures'],
            'college': college,
            'date_debut': user.get('date_debut_contrat', '2025-01-01'),
            'date_fin': None,
            'actif': True,
            'created_by': 'Script de correction',
            'created_at': '2025-01-31T00:00:00'
        }
        
        await db.cse_delegates.insert_one(delegate_doc)
        
        emoji = '👥' if membre['statut'] == 'Titulaire' else '🔄'
        print(f"   {emoji} {membre['nom']} - {membre['statut']} - {membre['heures']}h/mois")
        membres_crees += 1
    
    print()
    print("=" * 60)
    print("✅ CORRECTION TERMINÉE")
    print("=" * 60)
    print(f"📊 Résumé:")
    print(f"   • Membres CSE créés: {membres_crees}")
    print(f"   • Titulaires: 3 (22h/mois chacun)")
    print(f"   • Suppléants: 1 (0h/mois)")
    print(f"   • Données de test supprimées: {result_cessions.deleted_count + result_usage.deleted_count}")
    print()
    print("🎯 Membres CSE officiels:")
    for membre in MEMBRES_CSE:
        emoji = '👥' if membre['statut'] == 'Titulaire' else '🔄'
        print(f"   {emoji} {membre['nom']} - {membre['statut']}")
    print()
    print("⚠️ IMPORTANT : Cession d'heures possible vers personnes non enregistrées")
    print("   Le système permet de céder des heures à des personnes")
    print("   qui ne sont pas utilisateurs dans la base MOZAIK RH")
    print()

if __name__ == '__main__':
    asyncio.run(corriger_membres_cse())
