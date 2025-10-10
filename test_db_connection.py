#!/usr/bin/env python3
"""
Test MongoDB connection and create admin user
"""

import asyncio
import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import bcrypt
import uuid
from datetime import datetime

# Load environment
ROOT_DIR = Path(__file__).parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

async def test_connection_and_create_admin():
    """Test MongoDB connection and create admin users"""
    try:
        # Test connection
        print("Testing MongoDB connection...")
        await client.admin.command('ping')
        print("✅ MongoDB connection successful")
        
        # Check existing users
        user_count = await db.users.count_documents({})
        print(f"📊 Current user count: {user_count}")
        
        if user_count > 0:
            users = await db.users.find({}).to_list(10)
            print("📋 Existing users:")
            for user in users:
                print(f"  - {user.get('name', 'Unknown')} ({user.get('email', 'No email')}) - Role: {user.get('role', 'Unknown')}")
        
        # Create Sophie Martin admin if not exists
        sophie_email = "sophie.martin@company.com"
        existing_sophie = await db.users.find_one({"email": sophie_email})
        
        if not existing_sophie:
            print(f"Creating Sophie Martin admin user...")
            sophie_user = {
                "id": str(uuid.uuid4()),
                "name": "Sophie Martin",
                "email": sophie_email,
                "role": "admin",
                "department": "Direction",
                "phone": None,
                "address": None,
                "position": "Directrice RH",
                "hire_date": None,
                "isDelegateCSE": False,
                "is_active": True,
                "requires_password_change": False,
                "first_login": False,
                "last_login": None,
                "temp_password_expires": None,
                "date_naissance": None,
                "sexe": None,
                "categorie_employe": None,
                "metier": None,
                "fonction": None,
                "site": None,
                "temps_travail": None,
                "contrat": None,
                "date_debut_contrat": None,
                "date_fin_contrat": None,
                "notes": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "created_by": "system",
                "hashed_password": hash_password("demo123")
            }
            await db.users.insert_one(sophie_user)
            print("✅ Sophie Martin admin created successfully")
        else:
            print("✅ Sophie Martin admin already exists")
        
        # Create DACALOR Diego admin if not exists
        diego_email = "diego.dacalor@company.com"
        existing_diego = await db.users.find_one({"email": diego_email})
        
        if not existing_diego:
            print(f"Creating DACALOR Diego admin user...")
            diego_user = {
                "id": str(uuid.uuid4()),
                "name": "DACALOR Diégo",
                "email": diego_email,
                "role": "admin",
                "department": "Direction",
                "phone": None,
                "address": None,
                "position": "Directeur",
                "hire_date": None,
                "isDelegateCSE": False,
                "is_active": True,
                "requires_password_change": False,
                "first_login": False,
                "last_login": None,
                "temp_password_expires": None,
                "date_naissance": None,
                "sexe": None,
                "categorie_employe": None,
                "metier": None,
                "fonction": None,
                "site": None,
                "temps_travail": None,
                "contrat": None,
                "date_debut_contrat": None,
                "date_fin_contrat": None,
                "notes": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "created_by": "system",
                "hashed_password": hash_password("admin123")
            }
            await db.users.insert_one(diego_user)
            print("✅ DACALOR Diego admin created successfully")
        else:
            print("✅ DACALOR Diego admin already exists")
        
        # Create some sample employees for testing absence import
        sample_employees = [
            {
                "id": str(uuid.uuid4()),
                "name": "Joël ADOLPHIN",
                "email": "joel.adolphin@company.com",
                "role": "employee",
                "department": "Éducatif",
                "phone": None,
                "address": None,
                "position": "Éducateur",
                "hire_date": None,
                "isDelegateCSE": False,
                "is_active": True,
                "requires_password_change": True,
                "first_login": True,
                "last_login": None,
                "temp_password_expires": None,
                "date_naissance": None,
                "sexe": None,
                "categorie_employe": None,
                "metier": None,
                "fonction": None,
                "site": None,
                "temps_travail": None,
                "contrat": None,
                "date_debut_contrat": None,
                "date_fin_contrat": None,
                "notes": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "created_by": "system",
                "hashed_password": hash_password("temp123")
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Fabrice LOUBER",
                "email": "fabrice.louber@company.com",
                "role": "employee",
                "department": "Technique",
                "phone": None,
                "address": None,
                "position": "Technicien",
                "hire_date": None,
                "isDelegateCSE": False,
                "is_active": True,
                "requires_password_change": True,
                "first_login": True,
                "last_login": None,
                "temp_password_expires": None,
                "date_naissance": None,
                "sexe": None,
                "categorie_employe": None,
                "metier": None,
                "fonction": None,
                "site": None,
                "temps_travail": None,
                "contrat": None,
                "date_debut_contrat": None,
                "date_fin_contrat": None,
                "notes": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "created_by": "system",
                "hashed_password": hash_password("temp123")
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Jean-François BERNARD",
                "email": "jf.bernard@company.com",
                "role": "employee",
                "department": "Administratif",
                "phone": None,
                "address": None,
                "position": "Assistant administratif",
                "hire_date": None,
                "isDelegateCSE": False,
                "is_active": True,
                "requires_password_change": True,
                "first_login": True,
                "last_login": None,
                "temp_password_expires": None,
                "date_naissance": None,
                "sexe": None,
                "categorie_employe": None,
                "metier": None,
                "fonction": None,
                "site": None,
                "temps_travail": None,
                "contrat": None,
                "date_debut_contrat": None,
                "date_fin_contrat": None,
                "notes": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "created_by": "system",
                "hashed_password": hash_password("temp123")
            }
        ]
        
        for employee in sample_employees:
            existing = await db.users.find_one({"email": employee["email"]})
            if not existing:
                await db.users.insert_one(employee)
                print(f"✅ Created sample employee: {employee['name']}")
            else:
                print(f"✅ Sample employee already exists: {employee['name']}")
        
        # Final user count
        final_count = await db.users.count_documents({})
        print(f"📊 Final user count: {final_count}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False
    finally:
        client.close()

if __name__ == "__main__":
    result = asyncio.run(test_connection_and_create_admin())
    sys.exit(0 if result else 1)