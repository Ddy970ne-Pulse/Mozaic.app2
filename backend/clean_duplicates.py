"""
Script de nettoyage des doublons et chevauchements d'absences
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from collections import defaultdict

async def clean_absences():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["test_database"]
    
    print("🧹 NETTOYAGE DES ABSENCES - DOUBLONS ET CHEVAUCHEMENTS\n")
    print("="*80)
    
    # Récupérer toutes les absences approuvées
    all_absences = await db.absences.find({"status": "approved"}).to_list(length=None)
    
    print(f"📊 Total absences approuvées: {len(all_absences)}\n")
    
    # Grouper par employé
    by_employee = defaultdict(list)
    for absence in all_absences:
        by_employee[absence.get('employee_id')].append(absence)
    
    total_duplicates_removed = 0
    total_overlaps_found = 0
    
    for employee_id, absences in by_employee.items():
        employee_name = absences[0].get('employee_name', 'Unknown')
        
        if len(absences) < 2:
            continue
        
        print(f"\n👤 {employee_name} ({len(absences)} absences)")
        print("-" * 80)
        
        # Trier par date de début
        absences.sort(key=lambda x: x.get('date_debut', ''))
        
        # ÉTAPE 1: Supprimer les doublons exacts
        seen = {}
        duplicates = []
        
        for absence in absences:
            key = (
                absence.get('employee_id'),
                absence.get('motif_absence'),
                absence.get('date_debut'),
                absence.get('date_fin')
            )
            
            if key in seen:
                # C'est un doublon !
                duplicates.append(absence)
                print(f"   🔄 DOUBLON: {absence.get('motif_absence')} {absence.get('date_debut')} → {absence.get('date_fin')}")
            else:
                seen[key] = absence
        
        # Supprimer les doublons
        if duplicates:
            for dup in duplicates:
                result = await db.absences.delete_one({"id": dup.get('id')})
                if result.deleted_count > 0:
                    total_duplicates_removed += 1
            
            print(f"   ✅ {len(duplicates)} doublon(s) supprimé(s)")
        
        # ÉTAPE 2: Vérifier les chevauchements restants
        remaining = [a for a in absences if a not in duplicates]
        
        def parse_date(date_str):
            if '/' in date_str:
                d, m, y = date_str.split('/')
                return f"{y}-{m.zfill(2)}-{d.zfill(2)}"
            return date_str
        
        def dates_overlap(start1, end1, start2, end2):
            s1 = parse_date(start1)
            e1 = parse_date(end1)
            s2 = parse_date(start2)
            e2 = parse_date(end2)
            return not (e1 < s2 or e2 < s1)
        
        overlaps = []
        for i, abs1 in enumerate(remaining):
            for j, abs2 in enumerate(remaining):
                if i >= j:
                    continue
                
                if dates_overlap(
                    abs1.get('date_debut'), abs1.get('date_fin'),
                    abs2.get('date_debut'), abs2.get('date_fin')
                ):
                    overlaps.append((abs1, abs2))
        
        if overlaps:
            print(f"   ⚠️  {len(overlaps)} chevauchement(s) restant(s) (non-doublons)")
            total_overlaps_found += len(overlaps)
            
            # Pour les chevauchements, on garde le plus ancien créé (created_at)
            for abs1, abs2 in overlaps:
                created1 = abs1.get('created_at', '')
                created2 = abs2.get('created_at', '')
                
                # Convertir en string pour comparaison si nécessaire
                if isinstance(created1, datetime):
                    created1 = created1.isoformat()
                if isinstance(created2, datetime):
                    created2 = created2.isoformat()
                
                # Supprimer le plus récent (ou le deuxième si pas de date)
                if created2 and created1 and created2 > created1:
                    to_delete = abs2
                    to_keep = abs1
                else:
                    to_delete = abs1
                    to_keep = abs2
                
                print(f"      ❌ Suppression: {to_delete.get('motif_absence')} {to_delete.get('date_debut')} → {to_delete.get('date_fin')}")
                print(f"      ✅ Conservation: {to_keep.get('motif_absence')} {to_keep.get('date_debut')} → {to_keep.get('date_fin')}")
                
                await db.absences.delete_one({"id": to_delete.get('id')})
                total_duplicates_removed += 1
    
    print("\n" + "="*80)
    print("📊 RÉSUMÉ DU NETTOYAGE")
    print("="*80)
    print(f"✅ {total_duplicates_removed} absence(s) en doublon/chevauchement supprimée(s)")
    print(f"⚠️  {total_overlaps_found} chevauchement(s) non-doublons traité(s)")
    
    # Vérification finale
    remaining_total = await db.absences.count_documents({"status": "approved"})
    print(f"\n📊 Absences approuvées restantes: {remaining_total}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(clean_absences())
