#!/usr/bin/env python3
"""
Script d'import des absences depuis le fichier Excel absences.xlsx
"""
import asyncio
import sys
import os
import pandas as pd
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import uuid

# Mapping des types d'absence vers les valeurs correctes de la base
ABSENCE_TYPE_MAPPING = {
    "Congés Trimestriels": "Congés Trimestriels",
    "Congés annuels": "Congés Payés",
    "Arrêt maladie": "Maladie",
    "Récupération": "Récupération",
    "Télétravail": "Télétravail",
    "Congés Sans Solde": "Congé sans solde",
    "Raison familiale": "Congé pour événement familial",
    "Délégation": "Heures de délégation",
    "Stage": "Formation",
    "Rendez-vous médical récup sur h.supp": "Absence autorisée",
    "Evènement familial": "Congé pour événement familial",
    "Anticipé sur CA 2025": "Congés Payés",
    "Solde 2023-2024": "Congés Payés",
    "Absence autorisée": "Absence autorisée"
}

def format_date_for_db(date_value):
    """Convertir une date pandas en format DD/MM/YYYY"""
    if pd.isna(date_value):
        return None
    if isinstance(date_value, pd.Timestamp):
        return date_value.strftime('%d/%m/%Y')
    return str(date_value)

def calculate_end_date(start_date, days):
    """Calculer la date de fin en ajoutant les jours (jours ouvrables)"""
    if pd.isna(start_date) or not days:
        return None
    
    try:
        days_int = int(float(days))
    except:
        days_int = 1
    
    # Ajouter les jours (en tenant compte des weekends)
    current_date = start_date
    days_added = 0
    
    while days_added < days_int:
        current_date += timedelta(days=1)
        # Compter tous les jours sauf dimanche (jour 6)
        if current_date.weekday() != 6:  # 6 = Dimanche
            days_added += 1
    
    return current_date

def normalize_name(name):
    """Normaliser un nom pour le matching"""
    if pd.isna(name):
        return ""
    # Gérer les variations comme Méverick/Mverick
    name = str(name).strip().upper()
    # Remplacer les caractères accentués
    replacements = {
        'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
        'À': 'A', 'Â': 'A', 'Ä': 'A',
        'Ô': 'O', 'Ö': 'O',
        'Ù': 'U', 'Û': 'U', 'Ü': 'U',
        'Ç': 'C',
        'Ï': 'I', 'Î': 'I'
    }
    for old, new in replacements.items():
        name = name.replace(old, new)
    return name

async def import_absences():
    """Importer toutes les absences depuis le fichier Excel"""
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        print("❌ MONGO_URL non défini")
        return
    
    client = AsyncIOMotorClient(mongo_url)
    db = client['mozaik_rh']
    
    # Lire le fichier Excel
    df = pd.read_excel('/app/absences_temp.xlsx')
    
    print(f"📥 Import de {len(df)} absences...")
    print(f"📊 Colonnes: {list(df.columns)}")
    
    # Charger tous les utilisateurs pour le matching
    users = await db.users.find({}).to_list(length=1000)
    
    # Créer un dictionnaire pour le matching rapide
    user_map = {}
    for user in users:
        nom = normalize_name(user.get('name', '').split()[-1] if user.get('name') else '')
        prenom = normalize_name(user.get('name', '').split()[0] if user.get('name') else '')
        key = f"{nom}_{prenom}"
        user_map[key] = user
    
    print(f"👥 {len(users)} utilisateurs chargés pour matching")
    
    successful = 0
    errors = 0
    skipped = 0
    
    for idx, row in df.iterrows():
        try:
            nom = normalize_name(row.get('NOM', ''))
            prenom = normalize_name(row.get('PRENOM', ''))
            date_debut = row.get('Date Début')
            jours = row.get('Jours Absence')
            motif = row.get('Motif Absence', '')
            notes = row.get('Notes', '')
            
            if not nom or not prenom:
                print(f"⚠️  Ligne {idx+1}: NOM ou PRENOM manquant")
                errors += 1
                continue
            
            # Matcher l'utilisateur
            key = f"{nom}_{prenom}"
            user = user_map.get(key)
            
            if not user:
                print(f"⚠️  Ligne {idx+1}: Utilisateur non trouvé: {prenom} {nom}")
                errors += 1
                continue
            
            # Calculer la date de fin
            date_fin = calculate_end_date(date_debut, jours)
            
            # Mapper le type d'absence
            absence_type = ABSENCE_TYPE_MAPPING.get(motif, motif)
            
            # Créer l'absence
            absence = {
                "id": str(uuid.uuid4()),
                "employee_id": user.get('id'),
                "employee_name": user.get('name'),
                "email": user.get('email'),
                "motif_absence": absence_type,
                "date_debut": format_date_for_db(date_debut),
                "date_fin": format_date_for_db(date_fin),
                "jours_absence": str(jours) if not pd.isna(jours) else "1",
                "absence_unit": "jours",
                "status": "approved",  # Toutes les absences importées sont approuvées
                "notes": str(notes) if not pd.isna(notes) else "",
                "created_at": datetime.now(timezone.utc),
                "created_by": "import_script"
            }
            
            await db.absences.insert_one(absence)
            
            if (idx + 1) % 20 == 0:
                print(f"✅ {idx + 1}/{len(df)} absences importées...")
            
            successful += 1
            
        except Exception as e:
            print(f"❌ Erreur ligne {idx+1}: {str(e)}")
            errors += 1
    
    print(f"\n{'='*60}")
    print(f"📊 RÉSUMÉ DE L'IMPORT:")
    print(f"   ✅ Importées avec succès: {successful}")
    print(f"   ⚠️  Ignorées: {skipped}")
    print(f"   ❌ Erreurs: {errors}")
    print(f"   📦 Total: {len(df)}")
    print(f"{'='*60}\n")
    
    # Vérifier le total dans la base
    total_in_db = await db.absences.count_documents({})
    print(f"✅ Total d'absences dans la base: {total_in_db}")
    
    client.close()
    return successful, errors

if __name__ == "__main__":
    asyncio.run(import_absences())
