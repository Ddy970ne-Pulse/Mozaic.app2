"""
Système de Backup et Restauration Automatique pour MOZAIK RH
Permet de sauvegarder et restaurer les données MongoDB en JSON
"""

import asyncio
import json
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
BACKUP_DIR = Path("/app/data/backups")
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

COLLECTIONS_TO_BACKUP = [
    "users",
    "absences",
    "work_hours",
    "leave_balances",
    "leave_transactions",
    "cse_delegates",
    "cse_cessions",
    "employees",
    "absence_requests",
    "overtime"
]

def serialize_doc(doc):
    """Convertit un document MongoDB en format JSON serializable"""
    if doc is None:
        return None
    
    # Supprimer _id MongoDB
    if '_id' in doc:
        del doc['_id']
    
    # Convertir les datetime en ISO string
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    
    return doc

async def backup_database():
    """Sauvegarde complète de la base de données"""
    try:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'test_database')
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Créer un nom de fichier avec timestamp
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        backup_file = BACKUP_DIR / f"backup_{timestamp}.json"
        
        backup_data = {
            "backup_date": datetime.now(timezone.utc).isoformat(),
            "database": db_name,
            "collections": {}
        }
        
        total_docs = 0
        
        for collection_name in COLLECTIONS_TO_BACKUP:
            try:
                docs = await db[collection_name].find().to_list(length=None)
                serialized_docs = [serialize_doc(doc.copy()) for doc in docs]
                backup_data["collections"][collection_name] = serialized_docs
                total_docs += len(serialized_docs)
                logger.info(f"✅ Backed up {len(serialized_docs)} documents from {collection_name}")
            except Exception as e:
                logger.warning(f"⚠️ Could not backup {collection_name}: {str(e)}")
                backup_data["collections"][collection_name] = []
        
        # Sauvegarder dans le fichier
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, indent=2, ensure_ascii=False)
        
        # Créer aussi un lien "latest"
        latest_file = BACKUP_DIR / "backup_latest.json"
        with open(latest_file, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, indent=2, ensure_ascii=False)
        
        client.close()
        
        logger.info(f"✅ Backup completed: {total_docs} documents saved to {backup_file}")
        return str(backup_file)
        
    except Exception as e:
        logger.error(f"❌ Backup failed: {str(e)}")
        raise

async def restore_database(backup_file=None):
    """Restaure la base de données depuis un fichier de backup"""
    try:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'test_database')
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Si pas de fichier spécifié, utiliser le dernier backup
        if backup_file is None:
            backup_file = BACKUP_DIR / "backup_latest.json"
        else:
            backup_file = Path(backup_file)
        
        if not backup_file.exists():
            logger.warning(f"⚠️ No backup file found at {backup_file}")
            return False
        
        # Charger les données de backup
        with open(backup_file, 'r', encoding='utf-8') as f:
            backup_data = json.load(f)
        
        logger.info(f"📦 Restoring from backup: {backup_data.get('backup_date')}")
        
        total_restored = 0
        
        for collection_name, docs in backup_data["collections"].items():
            if not docs:
                logger.info(f"⏭️ Skipping empty collection: {collection_name}")
                continue
            
            try:
                # Insérer les documents
                if len(docs) > 0:
                    await db[collection_name].insert_many(docs)
                    total_restored += len(docs)
                    logger.info(f"✅ Restored {len(docs)} documents to {collection_name}")
            except Exception as e:
                logger.warning(f"⚠️ Could not restore {collection_name}: {str(e)}")
        
        client.close()
        
        logger.info(f"✅ Restore completed: {total_restored} documents restored")
        return True
        
    except Exception as e:
        logger.error(f"❌ Restore failed: {str(e)}")
        raise

async def auto_restore_if_empty():
    """Restaure automatiquement si la base est vide"""
    try:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'test_database')
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Vérifier si la base a des données
        users_count = await db.users.count_documents({})
        
        client.close()
        
        if users_count == 0:
            logger.info("🔄 Database is empty, attempting auto-restore...")
            success = await restore_database()
            if success:
                logger.info("✅ Auto-restore successful")
            else:
                logger.warning("⚠️ No backup available for auto-restore")
        else:
            logger.info(f"✓ Database has data ({users_count} users), no restore needed")
        
    except Exception as e:
        logger.error(f"❌ Auto-restore check failed: {str(e)}")

async def list_backups():
    """Liste tous les fichiers de backup disponibles"""
    backups = sorted(BACKUP_DIR.glob("backup_*.json"), reverse=True)
    
    print("\n=== Backups Disponibles ===")
    for backup in backups:
        size = backup.stat().st_size / 1024  # KB
        print(f"  - {backup.name} ({size:.1f} KB)")
    
    if not backups:
        print("  Aucun backup trouvé")
    
    return backups

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python backup_restore.py backup           # Créer un backup")
        print("  python backup_restore.py restore          # Restaurer le dernier backup")
        print("  python backup_restore.py restore <file>   # Restaurer un backup spécifique")
        print("  python backup_restore.py list             # Lister les backups")
        print("  python backup_restore.py auto             # Auto-restaurer si DB vide")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "backup":
        asyncio.run(backup_database())
    elif command == "restore":
        if len(sys.argv) > 2:
            asyncio.run(restore_database(sys.argv[2]))
        else:
            asyncio.run(restore_database())
    elif command == "list":
        asyncio.run(list_backups())
    elif command == "auto":
        asyncio.run(auto_restore_if_empty())
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
