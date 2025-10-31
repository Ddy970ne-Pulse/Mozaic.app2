#!/usr/bin/env python3
"""
Cleanup old leave balance data and initialize using new System 2
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "test_database")

async def cleanup_and_initialize():
    """Clean up old data and initialize new system"""
    
    print("🧹 MOZAIK RH - Leave Balance Cleanup & Migration")
    print("=" * 70)
    print(f"MongoDB: {MONGO_URL}")
    print(f"Database: {DB_NAME}")
    print("=" * 70)
    print()
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Step 1: Backup existing data count
        print("📊 Step 1: Checking existing data...")
        old_balance_count = await db.leave_balances.count_documents({})
        old_transaction_count = await db.leave_transactions.count_documents({})
        print(f"  - Leave balances: {old_balance_count}")
        print(f"  - Leave transactions: {old_transaction_count}")
        print()
        
        # Step 2: Drop old indices
        print("🗑️  Step 2: Dropping old indices...")
        try:
            await db.leave_balances.drop_index("employee_id_1_year_1")
            print("  ✅ Dropped employee_id_1_year_1 index")
        except Exception as e:
            print(f"  ⚠️  Could not drop employee_id_1_year_1: {e}")
        
        try:
            await db.leave_balances.drop_index("employee_id_1")
            print("  ✅ Dropped employee_id_1 index")
        except Exception as e:
            print(f"  ⚠️  Could not drop employee_id_1: {e}")
        print()
        
        # Step 3: Clear collections
        print("🗑️  Step 3: Clearing collections...")
        result1 = await db.leave_balances.delete_many({})
        result2 = await db.leave_transactions.delete_many({})
        print(f"  ✅ Deleted {result1.deleted_count} leave balance documents")
        print(f"  ✅ Deleted {result2.deleted_count} leave transaction documents")
        print()
        
        # Step 4: Create new indices for System 2
        print("📝 Step 4: Creating new indices for System 2...")
        await db.leave_balances.create_index(
            [("user_id", 1), ("fiscal_year", 1)],
            unique=True,
            name="user_id_1_fiscal_year_1"
        )
        print("  ✅ Created user_id_1_fiscal_year_1 (unique) index")
        
        await db.leave_balances.create_index("user_id")
        print("  ✅ Created user_id index")
        
        await db.leave_transactions.create_index(
            [("user_id", 1), ("created_at", -1)],
            name="user_id_1_created_at_-1"
        )
        print("  ✅ Created user_id_1_created_at_-1 index on transactions")
        print()
        
        print("=" * 70)
        print("✅ CLEANUP COMPLETE")
        print("=" * 70)
        print()
        print("💡 Next steps:")
        print("  1. Use the API endpoint: POST /api/leave-balances/initialize-all")
        print("  2. Or test individual initialization via POST /api/leave-balances/initialize")
        print()
        
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(cleanup_and_initialize())
