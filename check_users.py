#!/usr/bin/env python3
"""
Check what users are in the database
"""

import asyncio
import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment
ROOT_DIR = Path(__file__).parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def check_users():
    """Check users in database"""
    try:
        users = await db.users.find({}).to_list(100)
        print(f"📊 Total users: {len(users)}")
        
        for user in users:
            print(f"  - Name: '{user.get('name', 'Unknown')}' | Email: {user.get('email', 'No email')} | Role: {user.get('role', 'Unknown')}")
        
        # Test regex search for Joël ADOLPHIN
        print(f"\n🔍 Testing regex search for 'Joël ADOLPHIN':")
        
        # Try different search patterns
        patterns = [
            {"name": {"$regex": ".*Joël.*ADOLPHIN.*", "$options": "i"}},
            {"name": {"$regex": ".*ADOLPHIN.*Joël.*", "$options": "i"}},
            {"name": {"$regex": "Joël ADOLPHIN", "$options": "i"}},
            {"name": "Joël ADOLPHIN"}
        ]
        
        for i, pattern in enumerate(patterns):
            result = await db.users.find_one(pattern)
            print(f"  Pattern {i+1} {pattern}: {'✅ Found' if result else '❌ Not found'}")
            if result:
                print(f"    Found: {result.get('name')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False
    finally:
        client.close()

if __name__ == "__main__":
    result = asyncio.run(check_users())
    sys.exit(0 if result else 1)