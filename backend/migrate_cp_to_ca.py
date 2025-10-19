"""
🔄 MIGRATION CP → CA
Script de migration pour basculer tous les types CP (Congés Payés) vers CA (Congés Annuels)

Opérations :
1. Migrer collection absences (CP → CA)
2. Migrer collection absence_requests (CP → CA)
3. Fusionner compteurs leave_balances (CP + CA → CA)
4. Migrer historique leave_transactions (CP → CA)
5. Rapport détaillé des modifications
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.mozaik_rh

async def migrate_cp_to_ca():
    """Migration complète CP → CA"""
    
    print("=" * 80)
    print("🔄 MIGRATION CP → CA - DÉBUT")
    print("=" * 80)
    
    # Statistiques
    stats = {
        "absences_updated": 0,
        "absence_requests_updated": 0,
        "leave_balances_merged": 0,
        "leave_transactions_updated": 0
    }
    
    # 1️⃣ MIGRATION COLLECTION ABSENCES
    print("\n📅 1. Migration collection 'absences'...")
    
    # Variantes possibles de CP
    cp_variants = ["CP", "Congés Payés", "Congés payés", "Congé payé", "cp", "CONGES PAYES"]
    
    for variant in cp_variants:
        result = await db.absences.update_many(
            {"motif_absence": variant},
            {"$set": {
                "motif_absence": "CA",
                "migrated_from_cp": True,
                "migration_date": datetime.utcnow().isoformat()
            }}
        )
        stats["absences_updated"] += result.modified_count
        if result.modified_count > 0:
            print(f"   ✅ Migré {result.modified_count} absences '{variant}' → 'CA'")
    
    print(f"   📊 Total absences migrées: {stats['absences_updated']}")
    
    # 2️⃣ MIGRATION COLLECTION ABSENCE_REQUESTS
    print("\n📝 2. Migration collection 'absence_requests'...")
    
    for variant in cp_variants:
        result = await db.absence_requests.update_many(
            {"type": variant},
            {"$set": {
                "type": "CA",
                "migrated_from_cp": True,
                "migration_date": datetime.utcnow().isoformat()
            }}
        )
        stats["absence_requests_updated"] += result.modified_count
        if result.modified_count > 0:
            print(f"   ✅ Migré {result.modified_count} demandes '{variant}' → 'CA'")
    
    print(f"   📊 Total demandes migrées: {stats['absence_requests_updated']}")
    
    # 3️⃣ FUSION COMPTEURS LEAVE_BALANCES (CP + CA → CA)
    print("\n💰 3. Fusion compteurs 'leave_balances' (CP + CA → CA)...")
    
    # Récupérer tous les compteurs
    all_balances = await db.leave_balances.find({}).to_list(1000)
    
    for balance in all_balances:
        employee_id = balance.get("employee_id")
        
        # Récupérer les soldes CP et CA
        cp_balance = balance.get("cp_balance", 0.0)
        cp_taken = balance.get("cp_taken", 0.0)
        cp_initial = balance.get("cp_initial", 0.0)
        
        ca_balance = balance.get("ca_balance", 0.0)
        ca_taken = balance.get("ca_taken", 0.0)
        ca_initial = balance.get("ca_initial", 0.0)
        
        # Fusionner CP dans CA
        if cp_balance > 0 or cp_taken > 0 or cp_initial > 0:
            new_ca_balance = ca_balance + cp_balance
            new_ca_taken = ca_taken + cp_taken
            new_ca_initial = ca_initial + cp_initial
            
            await db.leave_balances.update_one(
                {"employee_id": employee_id},
                {"$set": {
                    "ca_balance": new_ca_balance,
                    "ca_taken": new_ca_taken,
                    "ca_initial": new_ca_initial,
                    "cp_balance": 0.0,
                    "cp_taken": 0.0,
                    "cp_initial": 0.0,
                    "cp_migrated_to_ca": True,
                    "migration_date": datetime.utcnow().isoformat()
                }}
            )
            
            stats["leave_balances_merged"] += 1
            print(f"   ✅ Fusionné compteurs pour {balance.get('employee_name', employee_id)}: CP({cp_balance}j) + CA({ca_balance}j) = CA({new_ca_balance}j)")
    
    print(f"   📊 Total compteurs fusionnés: {stats['leave_balances_merged']}")
    
    # 4️⃣ MIGRATION HISTORIQUE LEAVE_TRANSACTIONS
    print("\n📜 4. Migration historique 'leave_transactions'...")
    
    result = await db.leave_transactions.update_many(
        {"leave_type": "CP"},
        {"$set": {
            "leave_type": "CA",
            "original_type": "CP",
            "migrated_from_cp": True,
            "migration_date": datetime.utcnow().isoformat()
        }}
    )
    stats["leave_transactions_updated"] = result.modified_count
    print(f"   ✅ Migré {result.modified_count} transactions CP → CA")
    
    # 5️⃣ RAPPORT FINAL
    print("\n" + "=" * 80)
    print("✅ MIGRATION CP → CA - TERMINÉE")
    print("=" * 80)
    print("\n📊 STATISTIQUES FINALES:")
    print(f"   • Absences migrées:           {stats['absences_updated']}")
    print(f"   • Demandes migrées:           {stats['absence_requests_updated']}")
    print(f"   • Compteurs fusionnés:        {stats['leave_balances_merged']}")
    print(f"   • Transactions migrées:       {stats['leave_transactions_updated']}")
    print(f"\n   📌 TOTAL MODIFICATIONS:       {sum(stats.values())}")
    
    # 6️⃣ VÉRIFICATION POST-MIGRATION
    print("\n🔍 VÉRIFICATION POST-MIGRATION:")
    
    # Vérifier qu'il ne reste plus de CP
    cp_absences_count = await db.absences.count_documents({"motif_absence": {"$in": cp_variants}})
    cp_requests_count = await db.absence_requests.count_documents({"type": {"$in": cp_variants}})
    cp_transactions_count = await db.leave_transactions.count_documents({"leave_type": "CP"})
    
    print(f"   • Absences CP restantes:      {cp_absences_count} {'✅' if cp_absences_count == 0 else '❌'}")
    print(f"   • Demandes CP restantes:      {cp_requests_count} {'✅' if cp_requests_count == 0 else '❌'}")
    print(f"   • Transactions CP restantes:  {cp_transactions_count} {'✅' if cp_transactions_count == 0 else '❌'}")
    
    # Compter les nouveaux CA
    ca_absences_count = await db.absences.count_documents({"motif_absence": "CA"})
    ca_requests_count = await db.absence_requests.count_documents({"type": "CA"})
    
    print(f"\n   • Total absences CA:          {ca_absences_count}")
    print(f"   • Total demandes CA:          {ca_requests_count}")
    
    if cp_absences_count == 0 and cp_requests_count == 0 and cp_transactions_count == 0:
        print("\n🎉 MIGRATION RÉUSSIE ! Tous les CP ont été convertis en CA.")
    else:
        print("\n⚠️ ATTENTION : Il reste des entrées CP à migrer.")
    
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(migrate_cp_to_ca())
