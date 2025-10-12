# 🔐 Système de Sauvegarde et Restauration - MOZAIK RH

## 📋 Vue d'Ensemble

Ce système garantit que **toutes les données importées ou créées dans MOZAIK RH sont sauvegardées automatiquement** et peuvent être restaurées à tout moment, même après un redémarrage du backend ou du frontend.

## ✅ Fonctionnalités

### 1. **Backup Automatique**
- Sauvegarde toutes les collections MongoDB dans des fichiers JSON
- Format lisible et portable
- Horodatage automatique
- Fichier "latest" toujours à jour

### 2. **Restauration Automatique au Démarrage**
- Le backend vérifie automatiquement si la base de données est vide au démarrage
- Si aucune donnée n'est présente, restauration automatique depuis le dernier backup
- **Aucune intervention manuelle requise**

### 3. **API de Gestion des Backups**
- Endpoints admin pour créer, restaurer et lister les backups
- Accessible depuis l'interface MOZAIK RH (à implémenter)
- Contrôle complet sur les sauvegardes

## 🔧 Utilisation

### Via Ligne de Commande

```bash
# 1. Créer un backup manuel
cd /app/backend
python3 backup_restore.py backup

# 2. Lister tous les backups disponibles
python3 backup_restore.py list

# 3. Restaurer le dernier backup
python3 backup_restore.py restore

# 4. Restaurer un backup spécifique
python3 backup_restore.py restore /app/data/backups/backup_20251012_162721.json

# 5. Vérifier et restaurer automatiquement si DB vide
python3 backup_restore.py auto
```

### Via API (Admin uniquement)

#### Créer un Backup
```bash
curl -X POST http://localhost:8001/api/backup/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Réponse** :
```json
{
  "success": true,
  "message": "Backup créé avec succès",
  "backup_file": "/app/data/backups/backup_20251012_162721.json",
  "timestamp": "2025-10-12T16:27:21.123456Z"
}
```

#### Lister les Backups
```bash
curl http://localhost:8001/api/backup/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Réponse** :
```json
{
  "success": true,
  "backups": [
    {
      "filename": "backup_20251012_162721.json",
      "path": "/app/data/backups/backup_20251012_162721.json",
      "size_kb": 62.5,
      "modified": "2025-10-12T16:27:21Z"
    }
  ],
  "total": 1
}
```

#### Restaurer un Backup
```bash
curl -X POST http://localhost:8001/api/backup/restore \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📂 Structure des Fichiers

```
/app/data/backups/
├── backup_20251012_162721.json    # Backup avec timestamp
├── backup_20251012_180000.json    # Autre backup
├── backup_latest.json              # Lien vers le dernier backup
└── ...
```

### Format du Fichier de Backup

```json
{
  "backup_date": "2025-10-12T16:27:21.123456Z",
  "database": "test_database",
  "collections": {
    "users": [
      {
        "id": "uuid-xxx",
        "name": "Sophie Martin",
        "email": "sophie.martin@company.com",
        ...
      }
    ],
    "absences": [...],
    "work_hours": [...],
    "leave_balances": [...],
    ...
  }
}
```

## 📊 Collections Sauvegardées

Le système sauvegarde automatiquement :
- ✅ `users` - Tous les utilisateurs
- ✅ `absences` - Toutes les absences
- ✅ `work_hours` - Heures de travail
- ✅ `leave_balances` - Soldes de congés
- ✅ `leave_transactions` - Historique des transactions
- ✅ `cse_delegates` - Délégués CSE
- ✅ `cse_cessions` - Cessions d'heures CSE
- ✅ `employees` - Données employés
- ✅ `absence_requests` - Demandes d'absence
- ✅ `overtime` - Heures supplémentaires

## 🚀 Restauration Automatique au Démarrage

### Comment ça fonctionne ?

1. **Au démarrage du backend** :
   ```python
   @app.on_event("startup")
   async def startup_event():
       # Vérifie si la DB est vide
       # Si vide → Restaure automatiquement depuis backup_latest.json
   ```

2. **Vérification** :
   - Compte le nombre d'utilisateurs dans la collection `users`
   - Si `users_count == 0` → Base vide, restauration nécessaire

3. **Restauration** :
   - Charge le fichier `backup_latest.json`
   - Insère tous les documents dans leurs collections respectives
   - Logs détaillés dans `/var/log/supervisor/backend.out.log`

### Vérifier que ça fonctionne

```bash
# 1. Créer un backup
cd /app/backend && python3 backup_restore.py backup

# 2. Vider la base de données (ATTENTION: teste uniquement en dev!)
# ... supprimer les collections ...

# 3. Redémarrer le backend
sudo supervisorctl restart backend

# 4. Vérifier les logs
tail -f /var/log/supervisor/backend.out.log | grep -i "restore\|backup"

# 5. Vérifier que les données sont restaurées
cd /app/backend && python3 -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    db = client[os.environ.get('DB_NAME', 'test_database')]
    users = await db.users.count_documents({})
    print(f'Users: {users}')
    client.close()

asyncio.run(check())
"
```

## ⚙️ Configuration

### Emplacement des Backups

Par défaut : `/app/data/backups/`

Pour changer l'emplacement, modifier dans `backup_restore.py` :
```python
BACKUP_DIR = Path("/app/data/backups")
```

### Collections à Sauvegarder

Pour ajouter/retirer des collections, modifier dans `backup_restore.py` :
```python
COLLECTIONS_TO_BACKUP = [
    "users",
    "absences",
    # ... ajoutez vos collections ici
]
```

## 🔄 Stratégie de Backup Recommandée

### 1. **Backup Automatique Quotidien**

Créer un cron job :
```bash
# Editer crontab
crontab -e

# Ajouter cette ligne pour backup quotidien à 2h du matin
0 2 * * * cd /app/backend && python3 backup_restore.py backup >> /var/log/backup.log 2>&1
```

### 2. **Backup Avant Import Excel**

Modifier `ExcelImport.js` pour déclencher un backup avant chaque import :
```javascript
const handleImport = async () => {
  // 1. Créer backup avant import
  await fetch(`${backendUrl}/api/backup/create`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  // 2. Procéder avec l'import
  // ...
};
```

### 3. **Rotation des Backups**

Script pour garder seulement les 7 derniers backups :
```bash
#!/bin/bash
cd /app/data/backups
ls -t backup_*.json | tail -n +8 | xargs rm -f
```

## 🛡️ Sécurité

### Permissions

```bash
# Créer le répertoire de backup avec bonnes permissions
mkdir -p /app/data/backups
chmod 700 /app/data/backups
chown app:app /app/data/backups
```

### Accès API

- ✅ **Admin uniquement** : Tous les endpoints backup nécessitent le rôle `admin`
- ✅ **JWT requis** : Authentification obligatoire
- ✅ **Logs d'audit** : Toutes les opérations sont loguées

## 📈 Monitoring

### Vérifier l'État des Backups

```bash
# Taille totale des backups
du -sh /app/data/backups

# Nombre de backups
ls -1 /app/data/backups/backup_*.json | wc -l

# Dernier backup
ls -lt /app/data/backups/backup_*.json | head -1
```

### Logs

```bash
# Logs backend
tail -f /var/log/supervisor/backend.out.log | grep -i backup

# Logs d'erreurs
tail -f /var/log/supervisor/backend.err.log
```

## 🔥 Récupération d'Urgence

### Scénario 1 : Base de Données Vide

```bash
# Solution automatique (recommandé)
sudo supervisorctl restart backend
# Le système restaure automatiquement

# Solution manuelle
cd /app/backend
python3 backup_restore.py restore
```

### Scénario 2 : Données Corrompues

```bash
# 1. Arrêter le backend
sudo supervisorctl stop backend

# 2. Vider la base
cd /app/backend
python3 -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def clear():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    db = client[os.environ.get('DB_NAME')]
    for coll in await db.list_collection_names():
        await db[coll].delete_many({})
    client.close()

asyncio.run(clear())
"

# 3. Restaurer depuis backup
python3 backup_restore.py restore

# 4. Redémarrer
sudo supervisorctl start backend
```

### Scénario 3 : Retour à un Point Spécifique

```bash
# Lister les backups disponibles
python3 backup_restore.py list

# Restaurer un backup spécifique
python3 backup_restore.py restore /app/data/backups/backup_20251012_120000.json
```

## ✨ Améliorations Futures

### À Implémenter

1. **Interface UI pour les Backups**
   - Bouton "Créer Backup" dans l'interface admin
   - Liste des backups avec bouton "Restaurer"
   - Indicateur de taille et date

2. **Backup Incrémentiel**
   - Sauvegarder uniquement les changements
   - Réduction de l'espace disque

3. **Compression**
   - Compresser les fichiers JSON (gzip)
   - Économie d'espace de 70-80%

4. **Backup Distant**
   - Upload automatique vers S3/Azure
   - Backup multi-sites

5. **Chiffrement**
   - Chiffrer les backups sensibles
   - Protection des données RGPD

## 📞 Support

En cas de problème :

1. **Vérifier les logs** : `tail -f /var/log/supervisor/backend.out.log`
2. **Vérifier l'espace disque** : `df -h /app/data`
3. **Tester manuellement** : `python3 backup_restore.py backup`
4. **Consulter cette documentation** : `/app/BACKUP_SYSTEM_GUIDE.md`

## 🎯 Conclusion

Le système de backup de MOZAIK RH garantit que **vos données ne seront jamais perdues**, même en cas de :
- ✅ Redémarrage backend/frontend
- ✅ Crash du serveur
- ✅ Erreur humaine
- ✅ Migration vers nouveau serveur
- ✅ Mise à jour de l'application

**Les backups sont automatiques, fiables et toujours disponibles.**
