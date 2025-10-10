#!/usr/bin/env python3
"""
Script de test pour vérifier l'import des employés et la création des comptes utilisateurs
"""

import asyncio
import sys
import os
sys.path.append('/app')

from motor.motor_asyncio import AsyncIOMotorClient
from backend.server import initialize_admin_user, hash_password
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

async def test_import_functionality():
    """Test the import functionality"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🔍 Testing import functionality...")
    
    # Initialize admin user
    await initialize_admin_user()
    
    # Check if admin user exists
    admin_user = await db.users.find_one({"email": "ddacalor@aaea-gpe.fr"})
    if admin_user:
        print("✅ Admin user exists")
        print(f"   Name: {admin_user['name']}")
        print(f"   Email: {admin_user['email']}")
        print(f"   Role: {admin_user['role']}")
    else:
        print("❌ Admin user not found")
    
    # Count total users
    user_count = await db.users.count_documents({"is_active": True})
    print(f"📊 Total active users: {user_count}")
    
    # List all users
    users = await db.users.find({"is_active": True}).to_list(100)
    print("\n👥 Current users:")
    for user in users:
        print(f"   - {user['name']} ({user['email']}) - {user['role']}")
    
    # Count employees
    employee_count = await db.employees.count_documents({})
    print(f"\n📋 Total employees: {employee_count}")
    
    client.close()
    print("\n✅ Test completed!")

if __name__ == "__main__":
    asyncio.run(test_import_functionality())