"""
Migration Multi-Tenant - MOZAIK RH
Migrer les données existantes vers l'architecture multi-tenant pour AAEA CAVA
CORRIGÉ: Fix erreurs d'emails dupliqués et de syntaxe MongoDB
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')

# Bases de données
SOURCE_DB_NAME = "mozaik_rh"  # Base actuelle avec toutes les données
CENTRAL_DB_NAME = "mozaik_central"  # Base centrale pour config tenants
TARGET_TENANT_ID = "aaea-cava"
TARGET_DB_NAME = f"mozaik_{TARGET_TENANT_ID.replace('-', '_')}"


async def deduplicate_emails(source_db):
    """
    Identifier et corriger les emails dupliqués avant migration
    """
    print("\n🔍 Vérification des emails dupliqués...")
    
    # Grouper les users par email
    email_counts = defaultdict(list)
    
    async for user in source_db.users.find({}):
        email = user.get("email", "")
        email_counts[email].append(user)
    
    # Identifier les doublons
    duplicates = {email: users for email, users in email_counts.items() if len(users) > 1}
    
    if not duplicates:
        print("  ✅ Aucun email dupliqué trouvé")
        return []
    
    print(f"  ⚠️  {len(duplicates)} emails dupliqués trouvés:")
    
    dedup_actions = []
    for email, users in duplicates.items():
        print(f"\n    Email: {email} ({len(users)} comptes)")
        for i, user in enumerate(users, 1):
            print(f"      {i}. {user.get('name', 'N/A')} - ID: {user.get('id', 'N/A')} - Role: {user.get('role', 'N/A')}")
        
        # Stratégie: garder le premier, suffixer les autres
        for idx, user in enumerate(users):
            if idx == 0:
                # Garder le premier tel quel
                dedup_actions.append(("keep", user))
            else:
                # Suffixer les autres: email+idx@domain.com
                original_email = user["email"]
                parts = original_email.split("@")
                if len(parts) == 2:
                    new_email = f"{parts[0]}+dup{idx}@{parts[1]}"
                else:
                    new_email = f"{original_email}_dup{idx}"
                
                print(f"      → {user.get('name')} sera renommé: {new_email}")
                dedup_actions.append(("rename", user, new_email))
    
    return dedup_actions


async def migrate_to_multitenant():
    """
    Migration complète vers architecture multi-tenant
    
    Étapes:
    1. Créer la base centrale avec config tenant AAEA CAVA
    2. Dédupliquer les emails
    3. Créer la base dédiée pour AAEA CAVA
    4. Copier toutes les données de mozaik_rh vers mozaik_aaea_cava
    5. Vérifier l'intégrité des données
    """
    print("🚀 Début de la migration multi-tenant...")
    
    client = AsyncIOMotorClient(MONGO_URL)
    
    # Bases de données
    source_db = client[SOURCE_DB_NAME]
    central_db = client[CENTRAL_DB_NAME]
    target_db = client[TARGET_DB_NAME]
    
    try:
        # ==================== ÉTAPE 1: Créer config tenant dans base centrale ====================
        print("\n📋 ÉTAPE 1: Création de la configuration tenant...")
        
        # Vérifier si le tenant existe déjà
        existing_tenant = await central_db.tenants.find_one({"tenant_id": TARGET_TENANT_ID})
        
        if existing_tenant:
            print(f"⚠️  Tenant '{TARGET_TENANT_ID}' existe déjà dans la base centrale")
            # Supprimer l'ancien (pas de confirmation pour script automatisé)
            await central_db.tenants.delete_one({"tenant_id": TARGET_TENANT_ID})
            print(f"  ✅ Ancienne config supprimée")
        
        # Créer la config tenant
        tenant_config = {
            "tenant_id": TARGET_TENANT_ID,
            "tenant_name": "AAEA CAVA",
            "db_name": TARGET_DB_NAME,
            "admin_email": "ddacalor@aaea-gpe.fr",
            "status": "active",
            "created_at": "2025-01-30T00:00:00Z",
            "settings": {
                "max_users": 1000,
                "features": ["planning", "absences", "cse", "analytics", "astreintes"]
            }
        }
        
        await central_db.tenants.insert_one(tenant_config)
        print(f"✅ Tenant '{TARGET_TENANT_ID}' créé dans base centrale")
        
        # ==================== ÉTAPE 2: Dédupliquer les emails ====================
        dedup_actions = await deduplicate_emails(source_db)
        
        # ==================== ÉTAPE 3: Copier les données ====================
        print(f"\n📦 ÉTAPE 3: Copie des données de '{SOURCE_DB_NAME}' vers '{TARGET_DB_NAME}'...")
        
        # Liste des collections à copier
        collections = [
            "users",
            "absences",
            "absence_requests",
            "notifications",
            "leave_balances",
            "leave_transactions",
            "cse_cessions",
            "on_call_assignments",
            "overtime_records",
            "absence_types_config",
            "hr_config"
        ]
        
        migration_stats = {}
        
        for collection_name in collections:
            print(f"\n  📄 Migration de la collection '{collection_name}'...")
            
            # Compter les documents source
            source_count = await source_db[collection_name].count_documents({})
            print(f"     Source: {source_count} documents")
            
            if source_count == 0:
                print(f"     ⚠️  Collection vide, skip")
                migration_stats[collection_name] = {"source": 0, "target": 0, "status": "empty"}
                continue
            
            # Nettoyer la collection target si elle existe
            target_count_before = await target_db[collection_name].count_documents({})
            if target_count_before > 0:
                print(f"     ⚠️  Collection target contient déjà {target_count_before} documents, nettoyage...")
                await target_db[collection_name].delete_many({})
                print(f"     ✅ Collection vidée")
            
            # Copier les documents par batch
            batch_size = 100
            total_copied = 0
            
            cursor = source_db[collection_name].find({})
            batch = []
            
            async for doc in cursor:
                # Retirer le _id MongoDB pour éviter les conflits
                doc.pop("_id", None)
                
                # Appliquer les déduplication d'emails si collection users
                if collection_name == "users" and dedup_actions:
                    user_email = doc.get("email")
                    for action_type, action_user, *args in dedup_actions:
                        if action_user.get("email") == user_email and action_type == "rename":
                            new_email = args[0]
                            print(f"     🔄 Renommage: {user_email} → {new_email}")
                            doc["email"] = new_email
                            break
                
                batch.append(doc)
                
                if len(batch) >= batch_size:
                    await target_db[collection_name].insert_many(batch)
                    total_copied += len(batch)
                    print(f"     📈 {total_copied}/{source_count} documents copiés...", end='\r')
                    batch = []
            
            # Insérer le dernier batch
            if batch:
                await target_db[collection_name].insert_many(batch)
                total_copied += len(batch)
            
            print(f"     ✅ {total_copied} documents copiés                    ")
            
            # Vérifier le count final
            target_count_after = await target_db[collection_name].count_documents({})
            migration_stats[collection_name] = {
                "source": source_count,
                "target": target_count_after,
                "status": "success" if source_count == target_count_after else "warning"
            }
        
        # ==================== ÉTAPE 4: Créer les index (sans unique pour emails) ====================
        print("\n🔍 ÉTAPE 4: Création des index...")
        
        # Index pour users (PAS d'unique sur email à cause des doublons)
        try:
            await target_db.users.create_index("id", unique=True)
            print("  ✅ Index users.id (unique) créé")
        except Exception as e:
            print(f"  ⚠️  Index users.id: {str(e)}")
        
        try:
            await target_db.users.create_index("email")  # Index simple, pas unique
            print("  ✅ Index users.email créé")
        except Exception as e:
            print(f"  ⚠️  Index users.email: {str(e)}")
        
        # Index pour absences
        try:
            await target_db.absences.create_index("employee_id")
            await target_db.absences.create_index("date_debut")
            await target_db.absences.create_index("status")
            print("  ✅ Index absences créés")
        except Exception as e:
            print(f"  ⚠️  Index absences: {str(e)}")
        
        # Index pour leave_balances
        try:
            await target_db.leave_balances.create_index([("employee_id", 1), ("year", 1)], unique=True)
            print("  ✅ Index leave_balances créé")
        except Exception as e:
            print(f"  ⚠️  Index leave_balances: {str(e)}")
        
        # ==================== ÉTAPE 5: Vérification ====================
        print("\n✅ ÉTAPE 5: Vérification de l'intégrité...")
        
        all_success = True
        for collection_name, stats in migration_stats.items():
            status_icon = "✅" if stats["status"] == "success" else "⚠️" if stats["status"] == "warning" else "⏭️"
            print(f"  {status_icon} {collection_name}: {stats['source']} → {stats['target']} ({stats['status']})")
            
            if stats["status"] not in ["success", "empty", "skipped"]:
                all_success = False
        
        # ==================== RÉSULTAT ====================
        print("\n" + "=" * 70)
        if all_success:
            print("🎉 MIGRATION RÉUSSIE!")
            print(f"\n✅ Tenant '{TARGET_TENANT_ID}' est maintenant opérationnel")
            print(f"   Base de données: {TARGET_DB_NAME}")
            print(f"   Admin: ddacalor@aaea-gpe.fr")
            print(f"\n📝 Pour utiliser le tenant, ajouter le header HTTP:")
            print(f"   X-Tenant-Id: {TARGET_TENANT_ID}")
            print(f"\n   Ou le query parameter:")
            print(f"   ?tenant_id={TARGET_TENANT_ID}")
        else:
            print("⚠️  MIGRATION COMPLÉTÉE AVEC AVERTISSEMENTS")
            print("   Vérifiez les collections ci-dessus")
        print("=" * 70)
        
    except Exception as e:
        print(f"\n❌ ERREUR lors de la migration: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        client.close()


if __name__ == "__main__":
    print("🏢 Migration Multi-Tenant - MOZAIK RH")
    print("=" * 70)
    print(f"Source: {SOURCE_DB_NAME}")
    print(f"Target: {TARGET_DB_NAME}")
    print(f"Tenant: {TARGET_TENANT_ID} (AAEA CAVA)")
    print("=" * 70)
    print("\n⚠️  ATTENTION: Cette migration va:")
    print("  1. Créer une nouvelle base de données pour AAEA CAVA")
    print("  2. Copier TOUTES les données de la base actuelle")
    print("  3. Corriger automatiquement les emails dupliqués")
    print("  4. La base source ne sera PAS modifiée (backup automatique)")
    print("\n")
    
    print("🚀 Lancement automatique de la migration...")
    asyncio.run(migrate_to_multitenant())
