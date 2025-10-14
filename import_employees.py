#!/usr/bin/env python3
"""
Script d'import des employés depuis le fichier Excel Personnels.xlsx
"""
import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import bcrypt
import uuid
import random
import string

# Données extraites du fichier Excel
EMPLOYEES_DATA = [
    {"NOM": "POULAIN", "PRENOM": "Jean-Max", "Sexe": "Homme", "Catégorie Employé": "Cadre", "Métier": "Chef de Service", "Fonction": "Employé Educatif", "Département": "Siège", "Site": "Temps Plein", "Temps Travail": "CDI - Cadre", "email pro": "jmpoulain@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "FICADIERE", "PRENOM": "Ody", "Sexe": "Homme", "Catégorie Employé": "Cadre", "Métier": "Chef de Service", "Fonction": "Employé Educatif", "Département": "Siège", "Site": "Temps Partiel", "Temps Travail": "CDI - Cadre", "email pro": "oficadiere@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "EDAU", "PRENOM": "Jacques", "Sexe": "Homme", "Catégorie Employé": "Cadre", "Métier": "Chef de Service", "Fonction": "Employé Educatif", "Département": "Pôle Educatif", "Site": "Temps Plein", "Temps Travail": "CDI - Cadre", "email pro": "jedau@aaea-gpe.fr", "Membre CSE": "Titulaire"},
    {"NOM": "DACALOR", "PRENOM": "Diégo", "Sexe": "Homme", "Catégorie Employé": "Cadre", "Métier": "Attaché de Direction", "Fonction": "Employé Direction", "Département": "Siège", "Site": "Temps Plein", "Temps Travail": "CDI - Cadre", "email pro": "ddacalor@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "GREGOIRE", "PRENOM": "Cindy", "Sexe": "Femme", "Catégorie Employé": "Cadre", "Métier": "Comptable", "Fonction": "Employé Comptable", "Département": "Siège", "Site": "Temps Plein", "Temps Travail": "CDI - Cadre", "email pro": "cgregoire@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "BERGINA", "PRENOM": "Marius", "Sexe": "Homme", "Catégorie Employé": "Cadre Supérieur", "Métier": "Directeur", "Fonction": "Employé Direction", "Département": "Siège", "Site": "Temps Plein", "Temps Travail": "CDI - Cadre", "email pro": "mbergina@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "KADER", "PRENOM": "Valérie", "Sexe": "Femme", "Catégorie Employé": "Cadre", "Métier": "Psychologue", "Fonction": "Employé Educatif", "Département": "Pôle Educatif", "Site": "Temps Plein", "Temps Travail": "CDD -Cadre", "email pro": "vkader@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "FERIAUX", "PRENOM": "Stéphy", "Sexe": "Femme", "Catégorie Employé": "Technicien", "Métier": "Educateur Spécialisé", "Fonction": "Employé Educatif", "Département": "Pôle Educatif", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": "sferiaux@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "PAVILI", "PRENOM": "Mverick", "Sexe": "Homme", "Catégorie Employé": "Technicien", "Métier": "Educateur Spécialisé", "Fonction": "Employé Educatif", "Département": "Pôle Educatif", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": "mpavili@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "AUGUSTIN", "PRENOM": "Jean-Marc", "Sexe": "Homme", "Catégorie Employé": "Technicien", "Métier": "Educateur Technique Spécialisé", "Fonction": "Employé Educatif", "Département": "Pôle Educatif", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": "jmaugustin@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "ANASTASE", "PRENOM": "Prescile", "Sexe": "Femme", "Catégorie Employé": "Technicien", "Métier": "Educateur Spécialisé", "Fonction": "Employé Educatif", "Département": "Pôle Educatif", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": "panastase@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "ADOLPHIN", "PRENOM": "Joël", "Sexe": "Homme", "Catégorie Employé": "Ouvrier qualifié", "Métier": "Educateur Technique", "Fonction": "Employé Educatif", "Département": "Menuiserie 44", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": "jadolphin@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "LOUBER", "PRENOM": "Fabrice", "Sexe": "Homme", "Catégorie Employé": "Ouvrier qualifié", "Métier": "Educateur Technique", "Fonction": "Employé Educatif", "Département": "Menuiserie 44", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": "flouber@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "DOLLIN", "PRENOM": "Pascal", "Sexe": "Homme", "Catégorie Employé": "Ouvrier qualifié", "Métier": "Educateur Technique", "Fonction": "Employé Educatif", "Département": "Garage 44", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": "pdollin@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "CATINEL", "PRENOM": "Nicaise", "Sexe": "Femme", "Catégorie Employé": "Agent administratif", "Métier": "Agent administratif", "Fonction": "Employé Administratif", "Département": "Garage 44", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": "ncatinel@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "BARFLEUR", "PRENOM": "Jean-Jacques", "Sexe": "Homme", "Catégorie Employé": "Ouvrier qualifié", "Métier": "Ouvrier qualifié", "Fonction": "Employé Educatif", "Département": "Garage 44", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": None, "Membre CSE": None},
    {"NOM": "GRANVILLE", "PRENOM": "Christine", "Sexe": "Femme", "Catégorie Employé": "Technicien", "Métier": "Educateur Technique", "Fonction": "Employé Educatif", "Département": "Garage 44", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": "cgranville@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "RAMASSAMY", "PRENOM": "Véronique", "Sexe": "Femme", "Catégorie Employé": "Technicien", "Métier": "Educateur Technique Spécialisé", "Fonction": "Employé Educatif", "Département": "Restaurant 44", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": "vramassamy@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "MAXO", "PRENOM": "Andy", "Sexe": "Homme", "Catégorie Employé": "Technicien", "Métier": "Educateur Technique", "Fonction": "Employé Educatif", "Département": "Restaurant 44", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": "amaxo@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "MOULIN", "PRENOM": "Eddy", "Sexe": "Homme", "Catégorie Employé": "Technicien", "Métier": "Educateur Technique", "Fonction": "Employé Educatif", "Département": "Restaurant 44", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": "emoulin@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "MARTIAS", "PRENOM": "Thierry", "Sexe": "Homme", "Catégorie Employé": "Technicien", "Métier": "Educateur Technique", "Fonction": "Employé Educatif", "Département": "Voiles 44", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": "tmartias@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "SEPHO", "PRENOM": "Rodolphe", "Sexe": "Homme", "Catégorie Employé": "Technicien", "Métier": "Educateur Technique", "Fonction": "Employé Educatif", "Département": "Voiles 44", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": "rsepho@aaea-gpe.fr", "Membre CSE": "Titulaire"},
    {"NOM": "BERNARD", "PRENOM": "Jean-François", "Sexe": "Homme", "Catégorie Employé": "Technicien", "Métier": "Moniteur Educateur", "Fonction": "Employé Educatif", "Département": "Voiles 44", "Site": "Temps Partiel", "Temps Travail": "CDI", "email pro": "jfbernard@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "DREUX", "PRENOM": "Jimmy", "Sexe": "Homme", "Catégorie Employé": "Technicien", "Métier": "Moniteur sportif", "Fonction": "Employé Educatif", "Département": "Voiles 44", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": "jdreux@aaea-gpe.fr", "Membre CSE": None, "Notes": "Suppléant"},
    {"NOM": "LORIENT", "PRENOM": "Jean-René", "Sexe": "Homme", "Catégorie Employé": "Technicien", "Métier": "Educateur Technique", "Fonction": "Employé Educatif", "Département": "Ferme 44", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": "jrlorient@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "JOHN-ROSE", "PRENOM": "Michel", "Sexe": "Homme", "Catégorie Employé": "Technicien", "Métier": "Educateur Technique", "Fonction": "Employé Educatif", "Département": "Alpinia 44", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": "mjohnrose@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "ILAN", "PRENOM": "Hilaire", "Sexe": "Homme", "Catégorie Employé": "Technicien", "Métier": "Educateur Technique", "Fonction": "Employé Educatif", "Département": "Alpinia 44", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": "hilan@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "MANIOC", "PRENOM": "Richard", "Sexe": "Homme", "Catégorie Employé": "Technicien", "Métier": "Comptable", "Fonction": "Employé Administratif", "Département": "Siège", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": "rmanioc@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "FLORY", "PRENOM": "Chantal", "Sexe": "Femme", "Catégorie Employé": "Agent administratif", "Métier": "Agent administratif", "Fonction": "Employé Educatif", "Département": "Pôle Educatif", "Site": "Temps Plein", "Temps Travail": "CDI", "email pro": "cflory@aaea-gpe.fr", "Membre CSE": None},
    {"NOM": "URSULE-MEDERIC", "PRENOM": "Swanna", "Sexe": "Femme", "Catégorie Employé": "Technicien", "Métier": "Apprenti(e)", "Fonction": "Employé Educatif", "Département": "Pôle Educatif", "Site": "Temps Plein", "Temps Travail": "CDD - Non Cadre", "email pro": None, "Membre CSE": None},
    {"NOM": "AUGUSTE-MATHIEU", "PRENOM": "Krys", "Sexe": "Homme", "Catégorie Employé": "Ouvrier non qualifié", "Métier": "Employé de production", "Fonction": "Employé ASI", "Département": "Ferme 44", "Site": "Temps Plein", "Temps Travail": "CDD - Non Cadre", "email pro": None, "Membre CSE": None, "Notes": "Remplacement"},
    {"NOM": "MOULIN", "PRENOM": "Euryale Lorraine", "Sexe": "Femme", "Catégorie Employé": "Technicien", "Métier": "Autre Stagiaire", "Fonction": "Educatif", "Département": "Pôle Educatif", "Site": "Temps Plein", "Temps Travail": "Stagiaire", "email pro": None, "Membre CSE": None},
]

def generate_temp_password():
    """Générer un mot de passe temporaire de 8 caractères"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=8))

def generate_internal_email(prenom, nom):
    """Générer un email interne si absent"""
    first_initial = prenom[0].lower() if prenom else 'x'
    last_name = nom.lower().replace(' ', '').replace('-', '')
    return f"{first_initial}{last_name}@aaea-gpe.fr"

def hash_password(password: str) -> str:
    """Hasher un mot de passe avec bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def import_employees():
    """Importer tous les employés dans la base de données"""
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        print("❌ MONGO_URL non défini")
        return
    
    client = AsyncIOMotorClient(mongo_url)
    db = client['mozaik_rh']
    
    print(f"📥 Import de {len(EMPLOYEES_DATA)} employés...")
    
    successful = 0
    updated = 0
    errors = 0
    created_credentials = []
    
    for emp_data in EMPLOYEES_DATA:
        try:
            nom = emp_data.get('NOM', '').strip()
            prenom = emp_data.get('PRENOM', '').strip()
            email_raw = emp_data.get('email pro', '').strip()
            
            if not nom or not prenom:
                print(f"⚠️  Ligne ignorée: NOM ou PRENOM manquant")
                errors += 1
                continue
            
            # Générer email si absent
            if not email_raw:
                email = generate_internal_email(prenom, nom)
                print(f"📧 Email généré pour {prenom} {nom}: {email}")
            else:
                email = email_raw.lower()
            
            # Vérifier si l'utilisateur existe déjà
            existing_user = await db.users.find_one({"email": email})
            
            if existing_user:
                print(f"ℹ️  Utilisateur existant: {prenom} {nom} ({email})")
                updated += 1
                continue
            
            # Détecter membre CSE
            membre_cse_raw = str(emp_data.get('Membre CSE', '')).strip().lower()
            is_cse_delegate = False
            cse_status = None
            
            if membre_cse_raw in ['titulaire', 'délégué', 'delegue']:
                is_cse_delegate = True
                cse_status = 'titulaire'
            elif membre_cse_raw in ['suppléant', 'suppleant']:
                is_cse_delegate = True
                cse_status = 'suppléant'
            
            # Générer mot de passe temporaire
            temp_password = generate_temp_password()
            temp_expires = datetime.now(timezone.utc) + timedelta(days=7)
            
            # Créer l'utilisateur
            user_account = {
                "id": str(uuid.uuid4()),
                "name": f"{prenom} {nom}",
                "email": email,
                "role": "employee",
                "department": emp_data.get('Département', 'Non renseigné'),
                "phone": None,
                "address": None,
                "position": emp_data.get('Fonction'),
                "hire_date": None,
                "isDelegateCSE": is_cse_delegate,
                "is_active": True,
                "requires_password_change": True,
                "first_login": True,
                "last_login": None,
                "temp_password_expires": temp_expires,
                "temp_password_plain": temp_password,
                "initial_password": temp_password,
                "has_temp_email": not email_raw,
                "date_naissance": None,
                "sexe": emp_data.get('Sexe'),
                "categorie_employe": emp_data.get('Catégorie Employé'),
                "metier": emp_data.get('Métier'),
                "fonction": emp_data.get('Fonction'),
                "site": emp_data.get('Site'),
                "temps_travail": emp_data.get('Temps Travail'),
                "contrat": emp_data.get('Temps Travail'),
                "date_debut_contrat": None,
                "date_fin_contrat": None,
                "notes": emp_data.get('Notes'),
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "created_by": "import_script",
                "hashed_password": hash_password(temp_password)
            }
            
            await db.users.insert_one(user_account)
            
            print(f"✅ Créé: {prenom} {nom} ({email}) - Mot de passe: {temp_password}")
            created_credentials.append({
                "name": f"{prenom} {nom}",
                "email": email,
                "password": temp_password,
                "cse": cse_status
            })
            successful += 1
            
        except Exception as e:
            print(f"❌ Erreur pour {emp_data.get('PRENOM')} {emp_data.get('NOM')}: {str(e)}")
            errors += 1
    
    print(f"\n{'='*60}")
    print(f"📊 RÉSUMÉ DE L'IMPORT:")
    print(f"   ✅ Créés: {successful}")
    print(f"   ℹ️  Déjà existants: {updated}")
    print(f"   ❌ Erreurs: {errors}")
    print(f"{'='*60}\n")
    
    if created_credentials:
        print(f"🔑 IDENTIFIANTS CRÉÉS ({len(created_credentials)} comptes):")
        print(f"{'='*60}")
        for cred in created_credentials:
            cse_tag = f" [CSE {cred['cse']}]" if cred['cse'] else ""
            print(f"  {cred['name']}{cse_tag}")
            print(f"    📧 Email: {cred['email']}")
            print(f"    🔑 Mot de passe: {cred['password']}")
            print()
    
    client.close()
    return successful, updated, errors

if __name__ == "__main__":
    asyncio.run(import_employees())
