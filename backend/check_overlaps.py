"""
Script pour vérifier les chevauchements d'absences
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime

async def check_overlapping_absences():
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017/mozaikrh')
    client = AsyncIOMotorClient(mongo_url)
    db_name = mongo_url.split('/')[-1] if '/' in mongo_url else 'mozaikrh'
    db = client[db_name]
    
    print("🔍 Recherche des absences de Cindy GREGOIRE...\n")
    
    # Chercher Cindy
    cindy_absences = await db.absences.find({
        "employee_name": {"$regex": "Cindy", "$options": "i"}
    }).sort("date_debut", 1).to_list(length=None)
    
    print(f"📊 {len(cindy_absences)} absences trouvées pour Cindy\n")
    
    # Grouper par statut
    approved = [a for a in cindy_absences if a.get('status', '').lower() == 'approved']
    pending = [a for a in cindy_absences if a.get('status', '').lower() == 'pending']
    
    print(f"✅ Approuvées: {len(approved)}")
    print(f"⏳ En attente: {len(pending)}\n")
    
    print("=" * 80)
    print("ABSENCES APPROUVÉES (par date de début):")
    print("=" * 80)
    
    for i, absence in enumerate(approved, 1):
        print(f"\n{i}. Type: {absence.get('motif_absence', 'N/A')}")
        print(f"   Dates: {absence.get('date_debut', 'N/A')} → {absence.get('date_fin', 'N/A')}")
        print(f"   Jours: {absence.get('jours_absence', 'N/A')}")
        print(f"   ID: {absence.get('id', 'N/A')}")
        print(f"   Approbateur: {absence.get('approver_name', absence.get('approver', 'N/A'))}")
        print(f"   Date approbation: {absence.get('approved_date', 'N/A')}")
    
    # Vérifier les chevauchements
    print("\n" + "=" * 80)
    print("🔍 VÉRIFICATION DES CHEVAUCHEMENTS:")
    print("=" * 80)
    
    def dates_overlap(start1, end1, start2, end2):
        """Vérifie si deux périodes se chevauchent"""
        try:
            # Convertir les dates en format comparable
            if isinstance(start1, str):
                if '/' in start1:
                    d, m, y = start1.split('/')
                    start1 = f"{y}-{m.zfill(2)}-{d.zfill(2)}"
            if isinstance(end1, str):
                if '/' in end1:
                    d, m, y = end1.split('/')
                    end1 = f"{y}-{m.zfill(2)}-{d.zfill(2)}"
            if isinstance(start2, str):
                if '/' in start2:
                    d, m, y = start2.split('/')
                    start2 = f"{y}-{m.zfill(2)}-{d.zfill(2)}"
            if isinstance(end2, str):
                if '/' in end2:
                    d, m, y = end2.split('/')
                    end2 = f"{y}-{m.zfill(2)}-{d.zfill(2)}"
            
            return not (end1 < start2 or end2 < start1)
        except:
            return False
    
    overlaps_found = []
    for i, abs1 in enumerate(approved):
        for j, abs2 in enumerate(approved):
            if i >= j:
                continue
            
            if dates_overlap(
                abs1.get('date_debut'), abs1.get('date_fin'),
                abs2.get('date_debut'), abs2.get('date_fin')
            ):
                overlaps_found.append((abs1, abs2))
                print(f"\n⚠️  CHEVAUCHEMENT DÉTECTÉ:")
                print(f"   Absence 1: {abs1.get('motif_absence')} ({abs1.get('date_debut')} → {abs1.get('date_fin')})")
                print(f"   Absence 2: {abs2.get('motif_absence')} ({abs2.get('date_debut')} → {abs2.get('date_fin')})")
                print(f"   Même type: {'OUI ❌' if abs1.get('motif_absence') == abs2.get('motif_absence') else 'NON'}")
    
    if not overlaps_found:
        print("\n✅ Aucun chevauchement détecté")
    else:
        print(f"\n⚠️  TOTAL: {len(overlaps_found)} chevauchement(s) trouvé(s)")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_overlapping_absences())
