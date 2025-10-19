"""
Nettoie les doublons d'emails dans la base tenant
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from collections import defaultdict

async def clean_duplicates():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['mozaik_rh_aaeacava']
    
    # Récupérer tous les users
    users = await db.users.find({}).to_list(1000)
    
    # Grouper par email
    email_groups = defaultdict(list)
    for user in users:
        email = user.get('email', '')
        if email:
            email_groups[email].append(user)
    
    # Trouver les doublons
    duplicates = {email: docs for email, docs in email_groups.items() if len(docs) > 1}
    
    print(f"Doublons trouvés: {len(duplicates)}")
    
    for email, docs in duplicates.items():
        print(f"\nEmail: {email} ({len(docs)} occurrences)")
        
        # Garder le premier document (avec le plus d'infos ou le plus récent)
        keep = docs[0]
        to_delete = docs[1:]
        
        print(f"  Garder: {keep.get('name')} (id: {keep.get('id', 'N/A')})")
        
        for doc in to_delete:
            print(f"  Supprimer: {doc.get('name')} (id: {doc.get('id', 'N/A')})")
            await db.users.delete_one({'_id': doc['_id']})
    
    print(f"\n✅ Nettoyage terminé")
    
    # Créer les index
    print("\n🔨 Création des index...")
    
    try:
        await db.users.create_index("email", unique=True)
        print("✅ Index email créé")
    except Exception as e:
        print(f"⚠️  Index email: {e}")
    
    try:
        await db.users.create_index("id", unique=True)
        print("✅ Index id créé")
    except Exception as e:
        print(f"⚠️  Index id: {e}")
    
    try:
        await db.absences.create_index("id", unique=True)
        await db.absences.create_index("employee_id")
        await db.absences.create_index("date_debut")
        print("✅ Index absences créés")
    except Exception as e:
        print(f"⚠️  Index absences: {e}")
    
    try:
        await db.absence_types_config.create_index("code", unique=True)
        print("✅ Index absence_types_config créé")
    except Exception as e:
        print(f"⚠️  Index absence_types_config: {e}")
    
    try:
        await db.notifications.create_index("user_id")
        await db.notifications.create_index("created_at")
        print("✅ Index notifications créés")
    except Exception as e:
        print(f"⚠️  Index notifications: {e}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(clean_duplicates())
