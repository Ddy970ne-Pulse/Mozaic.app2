"""
🔄 MIGRATION VERS ARCHITECTURE MULTI-TENANT
Migre les données existantes de MOZAIK RH vers le système multi-tenant
avec AAEA CAVA comme premier établissement
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone, timedelta
import uuid

# Configuration
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
OLD_DB_NAME = os.environ.get('DB_NAME', 'mozaik_rh')
CENTRAL_DB_NAME = 'mozaik_rh_central'

# Configuration du tenant AAEA CAVA
TENANT_CONFIG = {
    "_id": "etab_aaeacava001",
    "slug": "aaea-cava",
    "name": "AAEA CAVA",
    "legal_name": "Association AAEA CAVA",
    "siret": "12345678900012",
    "status": "active",
    "subscription": {
        "plan": "professional",
        "max_users": 50,
        "max_storage_gb": 20,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
    },
    "database": {
        "db_name": "mozaik_rh_aaeacava",
        "mongo_url": MONGO_URL,
        "isolation_level": "database"
    },
    "admin": {
        "name": "Diego DACALOR",
        "email": "ddacalor@aaea-gpe.fr",
        "phone": "+33612345678"
    },
    "settings": {
        "timezone": "Europe/Paris",
        "locale": "fr-FR",
        "primary_color": "#2563eb",
        "ccn_number": "66"
    },
    "features": {
        "cse_module": True,
        "overtime_tracking": True,
        "planning": True,
        "leave_counters": True,
        "analytics": True
    },
    "created_at": datetime.now(timezone.utc).isoformat(),
    "created_by": "migration_script",
    "last_activity": datetime.now(timezone.utc).isoformat()
}

# Collections à migrer
COLLECTIONS_TO_MIGRATE = [
    'users',
    'absences',
    'absence_requests',
    'leave_balances',
    'leave_transactions',
    'overtime',
    'notifications',
    'on_call_assignments',
    'absence_types_config'
]

class MultiTenantMigration:
    def __init__(self):
        self.client = None
        self.old_db = None
        self.central_db = None
        self.tenant_db = None
        
        self.stats = {
            'collections_migrated': 0,
            'documents_migrated': 0,
            'errors': [],
            'warnings': []
        }
    
    async def connect(self):
        """Connexion aux bases de données"""
        print("=" * 80)
        print("🔌 CONNEXION AUX BASES DE DONNÉES")
        print("=" * 80)
        
        self.client = AsyncIOMotorClient(MONGO_URL)
        self.old_db = self.client[OLD_DB_NAME]
        self.central_db = self.client[CENTRAL_DB_NAME]
        self.tenant_db = self.client[TENANT_CONFIG['database']['db_name']]
        
        print(f"✅ Connexion établie à {MONGO_URL}")
        print(f"   • Base source: {OLD_DB_NAME}")
        print(f"   • Base centrale: {CENTRAL_DB_NAME}")
        print(f"   • Base tenant: {TENANT_CONFIG['database']['db_name']}")
        print()
    
    async def create_central_database(self):
        """Crée la base centrale et le tenant AAEA CAVA"""
        print("=" * 80)
        print("🏗️  CRÉATION BASE CENTRALE & TENANT")
        print("=" * 80)
        
        # Vérifier si le tenant existe déjà
        existing_tenant = await self.central_db.tenants.find_one({"_id": TENANT_CONFIG["_id"]})
        
        if existing_tenant:
            print(f"⚠️  Tenant {TENANT_CONFIG['name']} existe déjà")
            response = input("Voulez-vous le remplacer ? (o/n): ")
            if response.lower() != 'o':
                print("❌ Migration annulée")
                return False
            
            await self.central_db.tenants.delete_one({"_id": TENANT_CONFIG["_id"]})
            print("✅ Ancien tenant supprimé")
        
        # Créer le tenant
        await self.central_db.tenants.insert_one(TENANT_CONFIG)
        print(f"✅ Tenant créé: {TENANT_CONFIG['name']}")
        print(f"   • Slug: {TENANT_CONFIG['slug']}")
        print(f"   • DB: {TENANT_CONFIG['database']['db_name']}")
        print(f"   • URL: https://{TENANT_CONFIG['slug']}.mozaik-rh.fr")
        print()
        
        # Créer un super-admin (optionnel)
        super_admin = {
            "_id": str(uuid.uuid4()),
            "email": "superadmin@mozaik-rh.fr",
            "name": "Super Admin",
            "role": "super_admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        existing_super = await self.central_db.super_admins.find_one({"email": super_admin["email"]})
        if not existing_super:
            await self.central_db.super_admins.insert_one(super_admin)
            print(f"✅ Super-admin créé: {super_admin['email']}")
        
        print()
        return True
    
    async def migrate_collections(self):
        """Migre toutes les collections vers la base tenant"""
        print("=" * 80)
        print("📦 MIGRATION DES COLLECTIONS")
        print("=" * 80)
        
        for collection_name in COLLECTIONS_TO_MIGRATE:
            try:
                print(f"\n📋 Migration: {collection_name}")
                
                # Compter documents dans la source
                count_source = await self.old_db[collection_name].count_documents({})
                
                if count_source == 0:
                    print(f"   ℹ️  Collection vide, passage...")
                    continue
                
                print(f"   📊 {count_source} documents à migrer")
                
                # Récupérer tous les documents
                documents = await self.old_db[collection_name].find({}).to_list(10000)
                
                if not documents:
                    continue
                
                # Nettoyer les documents (supprimer _id MongoDB)
                cleaned_docs = []
                for doc in documents:
                    # Supprimer _id MongoDB (sera regénéré)
                    if '_id' in doc and not isinstance(doc['_id'], str):
                        del doc['_id']
                    cleaned_docs.append(doc)
                
                # Insérer dans la base tenant
                if cleaned_docs:
                    result = await self.tenant_db[collection_name].insert_many(cleaned_docs)
                    migrated_count = len(result.inserted_ids)
                    
                    print(f"   ✅ {migrated_count} documents migrés")
                    
                    self.stats['collections_migrated'] += 1
                    self.stats['documents_migrated'] += migrated_count
                
            except Exception as e:
                error_msg = f"Erreur migration {collection_name}: {str(e)}"
                print(f"   ❌ {error_msg}")
                self.stats['errors'].append(error_msg)
        
        print()
    
    async def verify_migration(self):
        """Vérifie que la migration s'est bien passée"""
        print("=" * 80)
        print("🔍 VÉRIFICATION DE LA MIGRATION")
        print("=" * 80)
        
        all_ok = True
        
        for collection_name in COLLECTIONS_TO_MIGRATE:
            count_source = await self.old_db[collection_name].count_documents({})
            count_tenant = await self.tenant_db[collection_name].count_documents({})
            
            status = "✅" if count_source == count_tenant else "❌"
            
            print(f"{status} {collection_name:30s} Source: {count_source:4d} → Tenant: {count_tenant:4d}")
            
            if count_source != count_tenant:
                all_ok = False
                self.stats['warnings'].append(f"{collection_name}: {count_source} ≠ {count_tenant}")
        
        print()
        
        if all_ok:
            print("✅ VÉRIFICATION RÉUSSIE : Toutes les données ont été migrées")
        else:
            print("⚠️  ATTENTION : Certaines collections ont des écarts")
        
        print()
        return all_ok
    
    async def create_indexes(self):
        """Crée les index nécessaires dans la base tenant"""
        print("=" * 80)
        print("🔨 CRÉATION DES INDEX")
        print("=" * 80)
        
        # Index sur users
        await self.tenant_db.users.create_index("email", unique=True)
        await self.tenant_db.users.create_index("id", unique=True)
        print("✅ Index users créés")
        
        # Index sur absences
        await self.tenant_db.absences.create_index("id", unique=True)
        await self.tenant_db.absences.create_index("employee_id")
        await self.tenant_db.absences.create_index("date_debut")
        print("✅ Index absences créés")
        
        # Index sur absence_types_config
        await self.tenant_db.absence_types_config.create_index("code", unique=True)
        print("✅ Index absence_types_config créés")
        
        # Index sur notifications
        await self.tenant_db.notifications.create_index("user_id")
        await self.tenant_db.notifications.create_index("created_at")
        print("✅ Index notifications créés")
        
        print()
    
    async def update_env_variables(self):
        """Affiche les nouvelles variables d'environnement à utiliser"""
        print("=" * 80)
        print("⚙️  CONFIGURATION À METTRE À JOUR")
        print("=" * 80)
        
        print("\n📝 Variables d'environnement backend (.env):")
        print(f"CENTRAL_MONGO_URL={MONGO_URL}")
        print(f"CENTRAL_DB_NAME={CENTRAL_DB_NAME}")
        print(f"# MONGO_URL et DB_NAME ne sont plus utilisés (système multi-tenant)")
        
        print("\n📝 URL d'accès:")
        print(f"Production: https://{TENANT_CONFIG['slug']}.mozaik-rh.fr")
        print(f"Dev: http://localhost:3000?tenant={TENANT_CONFIG['slug']}")
        
        print("\n📝 Identifiants admin AAEA CAVA:")
        print(f"Email: {TENANT_CONFIG['admin']['email']}")
        print(f"Le mot de passe existant reste valide")
        
        print()
    
    async def finalize(self):
        """Affiche le rapport final"""
        print("=" * 80)
        print("📊 RAPPORT FINAL DE MIGRATION")
        print("=" * 80)
        
        print(f"\n✅ Collections migrées: {self.stats['collections_migrated']}")
        print(f"✅ Documents migrés: {self.stats['documents_migrated']}")
        
        if self.stats['warnings']:
            print(f"\n⚠️  Avertissements ({len(self.stats['warnings'])}):")
            for warning in self.stats['warnings']:
                print(f"   • {warning}")
        
        if self.stats['errors']:
            print(f"\n❌ Erreurs ({len(self.stats['errors'])}):")
            for error in self.stats['errors']:
                print(f"   • {error}")
        
        print("\n" + "=" * 80)
        print("🎉 MIGRATION TERMINÉE")
        print("=" * 80)
        
        print("\n📋 PROCHAINES ÉTAPES:")
        print("1. Redémarrer le backend avec le nouveau code multi-tenant")
        print("2. Tester la connexion avec ?tenant=aaea-cava")
        print("3. Vérifier que toutes les données sont accessibles")
        print("4. Configurer le DNS pour *.mozaik-rh.fr (production)")
        print()
    
    async def run(self):
        """Exécution complète de la migration"""
        try:
            # Connexion
            await self.connect()
            
            # Création base centrale
            if not await self.create_central_database():
                return
            
            # Migration des collections
            await self.migrate_collections()
            
            # Vérification
            await self.verify_migration()
            
            # Création des index
            await self.create_indexes()
            
            # Configuration
            await self.update_env_variables()
            
            # Rapport final
            await self.finalize()
            
        except Exception as e:
            print(f"\n❌ ERREUR CRITIQUE: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            if self.client:
                self.client.close()

if __name__ == "__main__":
    migration = MultiTenantMigration()
    asyncio.run(migration.run())
