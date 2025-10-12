# Solution de Persistance des Données - MOZAIK RH

## 📋 Problème Identifié

Les données importées (employés, absences, heures de travail) disparaissaient après le redémarrage de l'application ou le "forking". 

### Causes Identifiées

1. **Reset-Demo Endpoint Dangereux** : L'endpoint `/api/import/reset-demo` supprimait toutes les données utilisateur
2. **Accès Frontend Facile** : Un bouton "Réinitialiser comptes" était facilement accessible dans l'interface Excel Import
3. **Aucun Mécanisme de Restauration** : Pas de moyen rapide de restaurer les données de démonstration

## ✅ Solutions Implémentées

### 1. Protection du Bouton de Réinitialisation

Le bouton "Réinitialiser système" est maintenant :
- **Caché dans une "Zone de Danger"** avec avertissement critique
- **Accessible uniquement aux admins**
- **Nécessite une double confirmation**
- **Affiche un avertissement détaillé** des données qui seront supprimées

**Localisation** : `/app/frontend/src/components/ExcelImport.js` (lignes 1229-1275)

### 2. Endpoint de Seed pour Données de Démonstration

Un nouvel endpoint `/api/seed/demo-data` a été créé pour restaurer rapidement les données de démonstration.

**Localisation** : `/app/backend/server.py` (avant `app.include_router`)

#### Données Créées par le Seed

**Utilisateurs** :
- 2 Admins : 
  - Diégo DACALOR (ddacalor@aaea-gpe.fr / admin123)
  - Sophie Martin (sophie.martin@company.com / demo123)
- 7 Employés :
  - Jean DUPONT (Manager, Titulaire CSE)
  - Marie LEBLANC (Employée)
  - Pierre MOREAU (Employé, Suppléant CSE)
  - Claire BERNARD (Employée)
  - Thomas GREGOIRE (Manager, Cadre)
  - Joël ADOLPHIN (Éducateur technique)
  - Fabrice LOUBER (Comptable)

**Absences** :
- 7 absences types variées (CA, AM, DEL, REC, TEL, FO)
- Couvrant différents employés et périodes
- Incluant des absences en jours et en heures

**Heures de Travail** :
- 5 entrées d'heures travaillées
- Pour différents employés et dates

**Soldes de Congés** :
- Initialisation pour tous les employés (2025)
- CA: 25 jours, RTT: 12 jours, CT: 12 jours

**Délégués CSE** :
- 2 délégués créés automatiquement
- Avec statut (Titulaire/Suppléant)
- 24h mensuelles par défaut

### 3. Utilisation du Seed Endpoint

#### Via API (cURL)

```bash
# 1. Se connecter en tant qu'admin
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ddacalor@aaea-gpe.fr","password":"admin123"}'

# 2. Appeler le seed endpoint (remplacer TOKEN)
curl -X POST http://localhost:8001/api/seed/demo-data \
  -H "Authorization: Bearer TOKEN"
```

#### Via Python

```python
import requests

# Login
response = requests.post(
    "http://localhost:8001/api/auth/login",
    json={"email": "ddacalor@aaea-gpe.fr", "password": "admin123"}
)
token = response.json()["token"]

# Seed data
headers = {"Authorization": f"Bearer {token}"}
seed_response = requests.post(
    "http://localhost:8001/api/seed/demo-data",
    headers=headers
)
print(seed_response.json())
```

#### Caractéristiques du Seed

✅ **Idempotent** : Peut être exécuté plusieurs fois sans créer de doublons
✅ **Vérification** : Vérifie si les données existent déjà avant de les créer
✅ **Complet** : Crée toutes les données nécessaires pour tester l'application
✅ **Logging Détaillé** : Logs complets dans les logs backend
✅ **Résumé** : Retourne un résumé des données créées

### 4. Vérification de la Persistance des Données

Après avoir exécuté le seed, vérifier que les données persistent en MongoDB :

```python
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check_data():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    collections = await db.list_collection_names()
    print(f'Collections: {sorted(collections)}')
    
    for coll in ['users', 'absences', 'work_hours', 'leave_balances', 'cse_delegates']:
        count = await db[coll].count_documents({})
        print(f'{coll}: {count} documents')
    
    client.close()

asyncio.run(check_data())
```

## 🔍 Vérification de l'État Actuel

### Collections MongoDB

Après le seed, les collections suivantes doivent exister :
- `users` : 10 utilisateurs (2 admins + 7 employés + 1 test)
- `absences` : 7 absences
- `work_hours` : 5 entrées
- `leave_balances` : ~40 soldes (un par employé par type de congé)
- `cse_delegates` : 10 délégués
- `employees` : Collection miroir des employés
- `cse_cessions` : Cessions d'heures CSE
- `leave_transactions` : Historique des transactions de congés

### Endpoints de l'Import

Les endpoints d'import continuent de fonctionner normalement :
- `POST /api/import/employees` : Import employés depuis Excel
- `POST /api/import/absences` : Import absences depuis Excel
- `POST /api/import/work-hours` : Import heures travaillées depuis Excel
- `POST /api/import/validate` : Validation des données avant import

## 🎯 Prochaines Étapes

### Tâches Prioritaires Restantes

1. **UI Bug** : Corriger le menu hamburger dupliqué
2. **UI Bug** : Rendre visible l'onglet "Mes Demandes" dans EmployeeSpaceNew.js
3. **PWA** : Vérifier la fonctionnalité PWA complète
4. **CSE Unification** : Compléter l'intégration frontend de CSEManagementNew.js
5. **Absences en Heures** : Finaliser l'affichage dans Planning, Export Paie, Statistiques
6. **Analytics & KPI** : Compléter les analyses et visualisations manquantes
7. **UI Harmonization** : Terminer l'application du style "Mon Espace" aux modules restants

## 📝 Notes Importantes

⚠️ **IMPORTANT** : Ne JAMAIS supprimer les données importées sans confirmation explicite de l'utilisateur

✅ **Sauvegarde** : Le seed endpoint permet de restaurer rapidement les données de test

🔐 **Sécurité** : Seuls les admins peuvent accéder à la Zone de Danger et au seed endpoint

📊 **Monitoring** : Tous les logs d'import et seed sont disponibles dans `/var/log/supervisor/backend.out.log`

## 🐛 Dépannage

### Les données disparaissent toujours

1. Vérifier que MongoDB est bien configuré et persistent
2. Vérifier la variable `MONGO_URL` dans `/app/backend/.env`
3. Vérifier que la variable `DB_NAME` est correcte
4. Vérifier qu'aucun script ne supprime les collections au démarrage

### Le seed ne fonctionne pas

1. Vérifier que l'utilisateur est authentifié comme admin
2. Vérifier les logs backend : `tail -f /var/log/supervisor/backend.out.log`
3. Vérifier la connexion MongoDB
4. Vérifier qu'il n'y a pas d'erreurs de validation Pydantic

### Comment restaurer rapidement après un reset accidentel

```bash
# Se connecter et exécuter le seed
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ddacalor@aaea-gpe.fr","password":"admin123"}' | \
  jq -r '.token' | \
  xargs -I {} curl -X POST http://localhost:8001/api/seed/demo-data \
    -H "Authorization: Bearer {}"
```

## 📚 Références

- **Backend Server** : `/app/backend/server.py`
- **Excel Import Frontend** : `/app/frontend/src/components/ExcelImport.js`
- **Test Result** : `/app/test_result.md`
- **Documentation Absences** : `/app/ABSENCE_LEGISLATION_FIX.md`, `/app/ABSENCE_PRIORITY_RULES.md`
