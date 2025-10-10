#!/usr/bin/env python3
"""
Script de migration pour créer des comptes utilisateurs pour tous les employés existants
qui n'ont pas encore de compte utilisateur
"""

import asyncio
import sys
import os
sys.path.append('/app')

from motor.motor_asyncio import AsyncIOMotorClient
from backend.server import (
    UserInDB, hash_password, generate_temp_password,
    datetime, timedelta, timezone
)
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

async def migrate_existing_employees():
    """Create user accounts for existing employees who don't have one"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🔄 Starting migration of existing employees...")
    
    # Get all employees
    employees = await db.employees.find({}).to_list(1000)
    print(f"📋 Found {len(employees)} employees")
    
    created_count = 0
    skipped_count = 0
    error_count = 0
    created_users = []
    
    for employee in employees:
        try:
            email = employee.get('email', '').lower().strip()
            nom = employee.get('nom', '').strip()
            prenom = employee.get('prenom', '').strip()
            
            if not email or not nom or not prenom:
                print(f"⚠️  Skipping employee with missing data: {employee.get('nom', 'Unknown')}")
                skipped_count += 1
                continue
            
            # Check if user already exists
            existing_user = await db.users.find_one({"email": email})
            if existing_user:
                print(f"⏭️  User already exists: {email}")
                skipped_count += 1
                continue
            
            # Generate temporary password
            temp_password = generate_temp_password()
            temp_expires = datetime.utcnow().replace(tzinfo=timezone.utc) + timedelta(days=30)  # 30 days for migration
            
            # Create user account
            user_account = UserInDB(
                name=f"{prenom} {nom}",
                email=email,
                role="employee",  # Default role
                department=employee.get('departement', 'Non spécifié'),
                phone=employee.get('telephone') or employee.get('phone'),
                position=employee.get('fonction'),
                hire_date=employee.get('date_debut_contrat'),
                isDelegateCSE=False,  # Default, can be updated later
                is_active=True,
                requires_password_change=True,
                first_login=True,
                last_login=None,
                temp_password_expires=temp_expires,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                created_by="migration_script",
                hashed_password=hash_password(temp_password)
            )
            
            # Store user record
            await db.users.insert_one(user_account.dict())
            
            created_users.append({
                "name": f"{prenom} {nom}",
                "email": email,
                "temp_password": temp_password,
                "expires_at": temp_expires.isoformat(),
                "department": employee.get('departement', 'Non spécifié')
            })
            
            created_count += 1
            print(f"✅ Created user account: {prenom} {nom} ({email})")
            
        except Exception as e:
            error_count += 1
            print(f"❌ Error creating user for {employee.get('nom', 'Unknown')}: {str(e)}")
    
    print(f"\n📊 Migration Summary:")
    print(f"   ✅ Created: {created_count} user accounts")
    print(f"   ⏭️  Skipped: {skipped_count} (already exist or missing data)")
    print(f"   ❌ Errors: {error_count}")
    
    if created_users:
        print(f"\n🔑 Temporary passwords for new users:")
        for user in created_users:
            print(f"   {user['name']} ({user['email']}): {user['temp_password']}")
            print(f"      Department: {user['department']}")
            print(f"      Expires: {user['expires_at']}")
            print()
    
    # Final count
    total_users = await db.users.count_documents({"is_active": True})
    print(f"📊 Total active users after migration: {total_users}")
    
    client.close()
    print("\n✅ Migration completed!")

if __name__ == "__main__":
    asyncio.run(migrate_existing_employees())