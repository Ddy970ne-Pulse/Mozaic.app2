#!/usr/bin/env python3
"""
Script to initialize leave balances for all employees in MOZAIK RH
Implements CCN66 rules for automatic balance calculation
"""

import asyncio
import os
import sys
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/test_database")

async def calculate_ccn66_balances(user):
    """
    Calculate CCN66-compliant leave balances based on employee profile
    
    CCN66 Rules:
    - CA (Congés Annuels): 25 days base for full-time, prorated for part-time
    - CT (Congés Trimestriels): 
        * Category A (Educateurs/Ouvriers qualifiés/Chefs): 18 days
        * Category B (Cadres/Others): 9 days
        * Prorated for part-time
    - Ancienneté bonus: 2 days per 5 years of service, max 6 days (not prorated)
    - RTT: 12 days base (if applicable)
    - REC/CP/CEX: Start at 0
    """
    
    # Get employee profile data
    categorie = user.get("categorie_employe", "").upper()
    metier = user.get("metier", "").lower()
    temps_travail = user.get("temps_travail", "100%")
    date_embauche = user.get("date_embauche")
    
    # Parse temps_travail percentage
    try:
        if isinstance(temps_travail, str):
            temps_percent = float(temps_travail.replace("%", "").strip()) / 100.0
        else:
            temps_percent = float(temps_travail) / 100.0
    except:
        temps_percent = 1.0  # Default to full-time
    
    # Calculate CA (prorated for part-time)
    ca_initial = 25.0 if temps_percent == 1.0 else round(25.0 * temps_percent, 1)
    
    # Calculate CT based on category
    # Category A: Éducateur, Ouvrier qualifié, Chef
    category_a_keywords = ["educateur", "éducateur", "ouvrier", "chef"]
    is_category_a = categorie == "A" or any(kw in metier for kw in category_a_keywords)
    
    ct_base = 18.0 if is_category_a else 9.0
    ct_initial = ct_base if temps_percent == 1.0 else round(ct_base * temps_percent, 1)
    
    # Calculate ancienneté (seniority) bonus
    # 2 days per 5 years, max 6 days, NOT prorated
    cex_initial = 0.0
    if date_embauche:
        try:
            if isinstance(date_embauche, str):
                # Try multiple date formats
                for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"]:
                    try:
                        hire_date = datetime.strptime(date_embauche, fmt)
                        break
                    except:
                        continue
            else:
                hire_date = date_embauche
            
            years_service = (datetime.now() - hire_date).days / 365.25
            # 2 days per 5 years completed
            if years_service >= 5:
                cex_initial = min(6.0, (int(years_service / 5) * 2))
        except Exception as e:
            print(f"  ⚠️  Could not parse date_embauche for {user.get('email')}: {e}")
    
    # RTT: 12 days base
    rtt_initial = 12.0
    
    return {
        "ca_initial": ca_initial,
        "rtt_initial": rtt_initial,
        "rec_initial": 0.0,
        "ct_initial": ct_initial,
        "cp_initial": 0.0,
        "cex_initial": cex_initial,
        "ca_balance": ca_initial,
        "rtt_balance": rtt_initial,
        "rec_balance": 0.0,
        "ct_balance": ct_initial,
        "cp_balance": 0.0,
        "cex_balance": cex_initial
    }


async def initialize_all_balances():
    """Initialize leave balances for all employees"""
    
    print("🏢 MOZAIK RH - Leave Balance Initialization")
    print("=" * 60)
    print(f"MongoDB URL: {MONGO_URL}")
    print("=" * 60)
    print()
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    # Extract database name from URL
    db_name = MONGO_URL.split("/")[-1].split("?")[0] if "/" in MONGO_URL else "test_database"
    db = client[db_name]
    print(f"📊 Using database: {db_name}")
    print()
    
    try:
        # Get all users
        print("📋 Fetching all users...")
        users = await db.users.find({}).to_list(None)
        print(f"✅ Found {len(users)} users")
        print()
        
        # Get current year
        current_year = datetime.now().year
        
        # Statistics
        initialized_count = 0
        skipped_count = 0
        error_count = 0
        
        print(f"🚀 Starting initialization for fiscal year {current_year}...")
        print()
        
        for user in users:
            user_id = user.get("id")
            user_name = f"{user.get('prenom', '')} {user.get('nom', '')}".strip()
            user_email = user.get("email", "")
            
            if not user_id:
                print(f"  ⚠️  Skipping user without ID: {user_email}")
                skipped_count += 1
                continue
            
            try:
                # Check if balance already exists
                existing = await db.leave_balances.find_one({
                    "user_id": user_id,
                    "fiscal_year": current_year
                })
                
                if existing:
                    print(f"  ⏭️  {user_name} ({user_email}) - Already initialized")
                    skipped_count += 1
                    continue
                
                # Calculate CCN66-compliant balances
                balances = await calculate_ccn66_balances(user)
                
                # Create leave balance document
                balance_doc = {
                    "id": f"lb_{user_id}_{current_year}",
                    "user_id": user_id,
                    "employee_name": user_name,
                    "employee_email": user_email,
                    "fiscal_year": current_year,
                    **balances,
                    "ca_taken": 0.0,
                    "rtt_taken": 0.0,
                    "rec_taken": 0.0,
                    "ct_taken": 0.0,
                    "cp_taken": 0.0,
                    "cex_taken": 0.0,
                    "ca_reintegrated": 0.0,
                    "rtt_reintegrated": 0.0,
                    "rec_reintegrated": 0.0,
                    "ct_reintegrated": 0.0,
                    "cp_reintegrated": 0.0,
                    "cex_reintegrated": 0.0,
                    "created_at": datetime.utcnow().isoformat(),
                    "last_updated": datetime.utcnow().isoformat()
                }
                
                # Insert into database
                await db.leave_balances.insert_one(balance_doc)
                
                print(f"  ✅ {user_name} ({user_email})")
                print(f"     CA={balances['ca_initial']}j | RTT={balances['rtt_initial']}j | CT={balances['ct_initial']}j | CEX={balances['cex_initial']}j")
                
                initialized_count += 1
                
            except Exception as e:
                print(f"  ❌ Error for {user_name} ({user_email}): {e}")
                error_count += 1
        
        print()
        print("=" * 60)
        print("📊 SUMMARY")
        print("=" * 60)
        print(f"✅ Initialized: {initialized_count}")
        print(f"⏭️  Skipped (already exists): {skipped_count}")
        print(f"❌ Errors: {error_count}")
        print(f"📋 Total users: {len(users)}")
        print()
        
        # Verify collections
        balance_count = await db.leave_balances.count_documents({})
        print(f"💾 Total leave_balances records: {balance_count}")
        print()
        
        if initialized_count > 0:
            print("🎉 Leave balances initialized successfully!")
        else:
            print("ℹ️  No new balances to initialize")
        
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(initialize_all_balances())
