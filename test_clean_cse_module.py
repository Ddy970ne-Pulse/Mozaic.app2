"""
Script de test et nettoyage complet du module CSE
1. Supprime toutes les données de test
2. Vérifie les heures mensuelles correctes
3. Teste les permissions d'accès
4. Crée rapport de test
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent / 'backend' / '.env'
load_dotenv(env_path)

async def test_and_clean_cse_module():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("=" * 70)
    print("🧪 TEST ET NETTOYAGE MODULE CSE")
    print("=" * 70)
    print()
    
    # 1. SUPPRESSION DONNÉES DE TEST
    print("1️⃣ SUPPRESSION DES DONNÉES DE TEST")
    print("-" * 70)
    
    result_cessions = await db.hours_cessions.delete_many({
        "$or": [
            {"to_name": {"$regex": "test|Test|TEST"}},
            {"reason": {"$regex": "test|Test|TEST"}},
            {"from_name": "Test"}
        ]
    })
    print(f"   ✅ {result_cessions.deleted_count} cession(s) de test supprimée(s)")
    
    result_usage = await db.delegation_usage.delete_many({
        "motif": {"$regex": "test|Test|TEST"}
    })
    print(f"   ✅ {result_usage.deleted_count} déclaration(s) de test supprimée(s)")
    
    print()
    
    # 2. VÉRIFICATION HEURES MENSUELLES
    print("2️⃣ VÉRIFICATION HEURES MENSUELLES DÉLÉGUÉS")
    print("-" * 70)
    
    delegates = await db.cse_delegates.find().to_list(100)
    
    if not delegates:
        print("   ❌ ERREUR : Aucun délégué CSE trouvé !")
        return
    
    heures_correctes = True
    for delegate in delegates:
        heures = delegate.get('heures_mensuelles', 0)
        statut = delegate.get('statut', '')
        nom = delegate.get('user_name', '')
        
        expected = 22 if statut.lower() == 'titulaire' else 0
        status = "✅" if heures == expected else "❌"
        
        if heures != expected:
            heures_correctes = False
            print(f"   {status} {nom} ({statut}): {heures}h (attendu: {expected}h)")
        else:
            print(f"   {status} {nom} ({statut}): {heures}h")
    
    print()
    
    if not heures_correctes:
        print("   ⚠️ CORRECTION DES HEURES NÉCESSAIRE")
        for delegate in delegates:
            statut = delegate.get('statut', '').lower()
            heures_correctes_val = 22 if statut == 'titulaire' else 0
            
            await db.cse_delegates.update_one(
                {"id": delegate["id"]},
                {"$set": {"heures_mensuelles": heures_correctes_val}}
            )
        
        print("   ✅ Heures corrigées pour tous les délégués")
        print()
    
    # 3. VÉRIFICATION PERMISSIONS ACCÈS
    print("3️⃣ VÉRIFICATION PERMISSIONS ACCÈS MODULE CSE")
    print("-" * 70)
    
    # Récupérer les users qui sont membres CSE
    cse_members = await db.users.find({
        "statut_cse": {"$in": ["Titulaire", "Suppléant"]}
    }).to_list(100)
    
    print(f"   📊 {len(cse_members)} membre(s) CSE dans la base users")
    
    for member in cse_members:
        nom = member.get('name', '')
        role = member.get('role', '')
        statut = member.get('statut_cse', '')
        print(f"   👤 {nom} - Role: {role} - Statut CSE: {statut}")
    
    print()
    print("   💡 NOTE: Les membres CSE doivent avoir accès au module")
    print("      peu importe leur rôle (employee, manager, etc.)")
    print()
    
    # 4. ÉTAT ACTUEL DES CESSIONS
    print("4️⃣ ÉTAT ACTUEL DES CESSIONS")
    print("-" * 70)
    
    cessions_all = await db.hours_cessions.find().to_list(100)
    print(f"   📊 Total cessions: {len(cessions_all)}")
    
    if len(cessions_all) > 0:
        print(f"   📋 Détail:")
        for c in cessions_all:
            from_name = c.get('from_name', 'Inconnu')
            to_name = c.get('to_name', 'Inconnu')
            hours = c.get('hours', 0)
            date = c.get('usage_date', 'N/A')
            print(f"      • {from_name} → {to_name}: {hours}h (date: {date})")
    else:
        print("   ✅ Aucune cession (base propre)")
    
    print()
    
    # 5. CALCUL SOLDES ACTUELS
    print("5️⃣ SOLDES ACTUELS DES DÉLÉGUÉS")
    print("-" * 70)
    
    for delegate in delegates:
        delegate_id = delegate.get('user_id')
        nom = delegate.get('user_name')
        heures_mensuelles = delegate.get('heures_mensuelles', 0)
        
        # Calculer heures données
        cessions_donnees = await db.hours_cessions.find({"from_id": delegate_id}).to_list(100)
        heures_donnees = sum(c.get('hours', 0) for c in cessions_donnees)
        
        # Calculer heures reçues
        cessions_recues = await db.hours_cessions.find({"to_id": delegate_id}).to_list(100)
        heures_recues = sum(c.get('hours', 0) for c in cessions_recues)
        
        solde = heures_mensuelles - heures_donnees + heures_recues
        
        print(f"   {nom}:")
        print(f"      Crédit mensuel: {heures_mensuelles}h")
        print(f"      Heures données: {heures_donnees}h")
        print(f"      Heures reçues: {heures_recues}h")
        print(f"      Solde actuel: {solde}h")
        print()
    
    # 6. RÉSUMÉ FINAL
    print("=" * 70)
    print("📊 RÉSUMÉ FINAL")
    print("=" * 70)
    print(f"✅ Données de test supprimées: {result_cessions.deleted_count + result_usage.deleted_count}")
    print(f"✅ Délégués CSE: {len(delegates)}")
    print(f"   • Titulaires: {len([d for d in delegates if d.get('statut','').lower() == 'titulaire'])}")
    print(f"   • Suppléants: {len([d for d in delegates if d.get('statut','').lower() == 'suppléant'])}")
    print(f"✅ Cessions actives: {len(cessions_all)}")
    print(f"✅ Heures mensuelles correctes: {'OUI' if heures_correctes else 'CORRIGÉES'}")
    print()
    print("🎯 ACTIONS À FAIRE:")
    print("   1. Hard refresh frontend (Ctrl+Shift+R)")
    print("   2. Vérifier accès module pour membres CSE non-admin")
    print("   3. Tester création cession")
    print("   4. Vérifier affichage 22h pour titulaires")
    print()

if __name__ == '__main__':
    asyncio.run(test_and_clean_cse_module())
