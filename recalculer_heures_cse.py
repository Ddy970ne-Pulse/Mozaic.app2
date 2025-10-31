"""
Script de recalcul des heures de délégation CSE selon la réglementation
Applique les heures réglementaires basées sur l'effectif de l'entreprise
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory
env_path = Path(__file__).parent / 'backend' / '.env'
load_dotenv(env_path)

def calculer_heures_delegation_reglementaires(effectif: int, statut: str) -> int:
    """Calcule les heures réglementaires selon l'effectif et le statut"""
    # Suppléants n'ont pas d'heures de délégation
    if statut and statut.lower() in ['suppléant', 'suppleant']:
        return 0
    
    # Titulaires selon effectif (règles légales)
    if effectif < 50:
        return 0
    elif 50 <= effectif < 75:
        return 18
    elif 75 <= effectif < 100:
        return 19
    elif 100 <= effectif < 200:
        return 21
    elif 200 <= effectif < 500:
        return 22
    elif 500 <= effectif < 1500:
        return 24
    elif 1500 <= effectif < 3500:
        return 26
    elif 3500 <= effectif < 4000:
        return 27
    elif 4000 <= effectif < 5000:
        return 28
    elif 5000 <= effectif < 6750:
        return 29
    elif 6750 <= effectif < 7500:
        return 30
    elif 7500 <= effectif < 7750:
        return 31
    elif 7750 <= effectif < 9750:
        return 32
    else:  # 9750+
        return 34

async def recalculer_heures_cse():
    # Connexion MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🔄 Recalcul des heures de délégation CSE selon la réglementation...")
    print()
    
    # 1. Récupérer ou créer les paramètres d'entreprise
    settings = await db.company_settings.find_one({})
    
    if not settings:
        print("⚙️ Aucun paramètre d'entreprise trouvé")
        effectif = int(input("📊 Quel est l'effectif de votre entreprise ? (défaut: 250) : ") or "250")
        
        # Créer les paramètres
        settings_doc = {
            "effectif": effectif,
            "nom_entreprise": "MOZAIK RH",
            "accord_entreprise_heures_cse": False
        }
        await db.company_settings.insert_one(settings_doc)
        print(f"✅ Paramètres créés avec effectif: {effectif} salariés")
    else:
        effectif = settings.get('effectif', 250)
        print(f"✅ Effectif entreprise: {effectif} salariés")
    
    print()
    
    # 2. Récupérer tous les délégués CSE
    delegates = await db.cse_delegates.find().to_list(length=100)
    
    if not delegates:
        print("⚠️ Aucun délégué CSE trouvé dans la base")
        return
    
    print(f"📋 {len(delegates)} délégué(s) CSE trouvé(s)\n")
    
    # 3. Recalculer et mettre à jour les heures
    updated_count = 0
    
    for delegate in delegates:
        statut = delegate.get('statut', 'Titulaire')
        heures_actuelles = delegate.get('heures_mensuelles', 0)
        
        # Calculer les nouvelles heures réglementaires
        heures_reglementaires = calculer_heures_delegation_reglementaires(effectif, statut)
        
        # Mettre à jour si différent
        if heures_actuelles != heures_reglementaires:
            await db.cse_delegates.update_one(
                {"id": delegate["id"]},
                {"$set": {"heures_mensuelles": heures_reglementaires}}
            )
            
            emoji_statut = "👥" if statut.lower() == "titulaire" else "🔄"
            print(f"{emoji_statut} {delegate['user_name']}")
            print(f"   Statut: {statut}")
            print(f"   Heures actuelles: {heures_actuelles}h/mois")
            print(f"   Heures réglementaires: {heures_reglementaires}h/mois")
            print(f"   ✅ Mis à jour !")
            print()
            
            updated_count += 1
        else:
            emoji_statut = "👥" if statut.lower() == "titulaire" else "🔄"
            print(f"{emoji_statut} {delegate['user_name']} - {heures_reglementaires}h/mois ✓ (déjà correct)")
    
    print()
    print(f"🎉 Recalcul terminé !")
    print(f"   Effectif entreprise: {effectif} salariés")
    print(f"   Délégués traités: {len(delegates)}")
    print(f"   Mis à jour: {updated_count}")
    print()
    print("📄 Source: https://www.service-public.gouv.fr/particuliers/vosdroits/F34474")
    print()
    
    # 4. Afficher le résumé par statut
    titulaires = [d for d in delegates if d.get('statut', '').lower() == 'titulaire']
    suppleants = [d for d in delegates if d.get('statut', '').lower() == 'suppléant']
    
    if titulaires:
        heures_titulaire = calculer_heures_delegation_reglementaires(effectif, 'Titulaire')
        print(f"👥 Titulaires ({len(titulaires)}): {heures_titulaire}h/mois par personne")
    
    if suppleants:
        print(f"🔄 Suppléants ({len(suppleants)}): 0h/mois (sauf remplacement)")

if __name__ == '__main__':
    asyncio.run(recalculer_heures_cse())
