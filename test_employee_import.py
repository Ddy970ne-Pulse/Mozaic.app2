#!/usr/bin/env python3
"""
Script de test pour simuler l'import d'un employé avec création automatique de compte utilisateur
"""

import asyncio
import sys
import os
sys.path.append('/app')

from motor.motor_asyncio import AsyncIOMotorClient
from backend.server import (
    ImportEmployee, UserInDB, hash_password, generate_temp_password,
    datetime, timedelta, timezone
)
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

async def test_employee_import():
    """Test importing an employee with automatic user account creation"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🧪 Testing employee import with user account creation...")
    
    # Sample employee data
    employee_data = {
        'nom': 'Dupont',
        'prenom': 'Marie',
        'email': 'marie.dupont@test.fr',
        'departement': 'Ressources Humaines',
        'fonction': 'Assistante RH',
        'date_debut_contrat': '2024-01-15'
    }
    
    email = employee_data.get('email', '').lower().strip()
    nom = employee_data.get('nom', '').strip()
    prenom = employee_data.get('prenom', '').strip()
    
    print(f"📝 Importing employee: {prenom} {nom} ({email})")
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        print(f"⚠️  User {email} already exists - skipping")
        client.close()
        return
    
    # Create employee record
    employee = ImportEmployee(
        nom=nom,
        prenom=prenom,
        email=email,
        date_naissance=employee_data.get('date_naissance'),
        sexe=employee_data.get('sexe'),
        categorie_employe=employee_data.get('categorie_employe'),
        metier=employee_data.get('metier'),
        fonction=employee_data.get('fonction'),
        departement=employee_data.get('departement', ''),
        site=employee_data.get('site'),
        temps_travail=employee_data.get('temps_travail'),
        contrat=employee_data.get('contrat'),
        date_debut_contrat=employee_data.get('date_debut_contrat'),
        date_fin_contrat=employee_data.get('date_fin_contrat'),
        notes=employee_data.get('notes'),
        created_by="test_script"
    )
    
    # Generate temporary password
    temp_password = generate_temp_password()
    temp_expires = datetime.utcnow().replace(tzinfo=timezone.utc) + timedelta(days=7)
    
    print(f"🔑 Generated temporary password: {temp_password}")
    print(f"⏰ Expires at: {temp_expires}")
    
    # Create user account automatically
    user_account = UserInDB(
        name=f"{prenom} {nom}",
        email=email,
        role="employee",  # Default role
        department=employee_data.get('departement', 'Non spécifié'),
        phone=employee_data.get('telephone') or employee_data.get('phone'),
        position=employee_data.get('fonction'),
        hire_date=employee_data.get('date_debut_contrat'),
        isDelegateCSE=False,  # Default, can be updated later
        is_active=True,
        requires_password_change=True,
        first_login=True,
        last_login=None,
        temp_password_expires=temp_expires,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        created_by="test_script",
        hashed_password=hash_password(temp_password)
    )
    
    # Store both employee and user records
    await db.employees.insert_one(employee.dict())
    await db.users.insert_one(user_account.dict())
    
    print("✅ Employee and user account created successfully!")
    
    # Verify creation
    created_user = await db.users.find_one({"email": email})
    if created_user:
        print(f"✅ User verification successful:")
        print(f"   Name: {created_user['name']}")
        print(f"   Email: {created_user['email']}")
        print(f"   Role: {created_user['role']}")
        print(f"   Department: {created_user['department']}")
        print(f"   Requires password change: {created_user['requires_password_change']}")
    
    # Count total users now
    user_count = await db.users.count_documents({"is_active": True})
    print(f"\n📊 Total active users after import: {user_count}")
    
    client.close()
    print("\n✅ Test completed!")

if __name__ == "__main__":
    asyncio.run(test_employee_import())