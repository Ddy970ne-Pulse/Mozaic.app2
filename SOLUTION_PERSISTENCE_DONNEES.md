# 🚨 SOLUTION : Problème de Persistance des Données

## Problème Identifié

**Symptôme** : Les données importées (employés, absences, heures) disparaissent après redémarrage ou problème.

**Cause Racine** : Les données ne sont PAS correctement persistées dans MongoDB OU sont supprimées accidentellement.

---

## ✅ Solution Immédiate : Backup/Restore Automatique

### Script de Backup

Créer un fichier `/app/backup_data.sh` :
```bash
#!/bin/bash
BACKUP_DIR="/app/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

echo "🔄 Backup MongoDB en cours..."
mongodump --db=test_database --out=$BACKUP_DIR/dump_$DATE

echo "✅ Backup créé : $BACKUP_DIR/dump_$DATE"
echo "📊 Statistiques:"
mongosh test_database --quiet --eval "
  print('Users: ' + db.users.countDocuments());
  print('Employees: ' + db.employees.countDocuments());
  print('Absences: ' + db.absences.countDocuments());
  print('Work Hours: ' + db.work_hours.countDocuments());
"
```

### Script de Restore

Créer un fichier `/app/restore_data.sh` :
```bash
#!/bin/bash
BACKUP_DIR="/app/backups"

# Lister les backups disponibles
echo "📁 Backups disponibles:"
ls -lt $BACKUP_DIR

# Demander quel backup restaurer
echo ""
read -p "Entrez le nom du backup à restaurer (ex: dump_20250112_153000): " BACKUP_NAME

if [ -d "$BACKUP_DIR/$BACKUP_NAME" ]; then
  echo "🔄 Restauration en cours..."
  mongorestore --db=test_database --drop $BACKUP_DIR/$BACKUP_NAME/test_database
  echo "✅ Restauration terminée"
  
  mongosh test_database --quiet --eval "
    print('');
    print('📊 Données restaurées:');
    print('Users: ' + db.users.countDocuments());
    print('Employees: ' + db.employees.countDocuments());
    print('Absences: ' + db.absences.countDocuments());
    print('Work Hours: ' + db.work_hours.countDocuments());
  "
else
  echo "❌ Backup non trouvé"
fi
```

### Rendre les scripts exécutables
```bash
chmod +x /app/backup_data.sh
chmod +x /app/restore_data.sh
```

---

## 🔧 Solution Permanente : Corriger le Problème de Persistance

### Investigation Nécessaire

**1. Vérifier que les endpoints sauvegardent vraiment** :
```bash
# Tester l'import d'un employé
curl -X POST https://mozaikhr-fix.preview.emergentagent.com/api/import/employees \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "data_type": "employees",
    "data": [{
      "nom": "TEST",
      "prenom": "User",
      "email": "test@test.com",
      "role": "employee"
    }]
  }'

# Vérifier MongoDB immédiatement après
mongosh test_database --eval "db.employees.find({nom: 'TEST'}).pretty()"
```

**2. Vérifier les logs backend lors de l'import** :
```bash
tail -f /var/log/supervisor/backend.*.log | grep -i "import\|insert\|save"
```

**3. Problèmes Potentiels** :
- ❌ Transactions MongoDB non commitées
- ❌ await manquant dans le code async
- ❌ Erreur silencieuse non loggée
- ❌ Mauvaise collection cible
- ❌ Permissions MongoDB

---

## 🎯 Action Immédiate Recommandée

### Option 1 : Créer un Jeu de Données de Test Persistant

Créer un endpoint spécial pour initialiser des données de test :

```python
# Dans server.py
@api_router.post("/dev/seed-test-data")
async def seed_test_data(current_user: User = Depends(require_admin_access)):
    """
    Crée un jeu de données de test (développement uniquement)
    """
    try:
        # Créer 10 employés
        test_employees = [
            {"nom": "GREGOIRE", "prenom": "Jean", "email": "jean.gregoire@test.fr", "role": "employee"},
            {"nom": "MARTIN", "prenom": "Sophie", "email": "sophie.martin@test.fr", "role": "employee"},
            # ... 8 autres
        ]
        
        for emp in test_employees:
            existing = await db.users.find_one({"email": emp["email"]})
            if not existing:
                user = User(
                    id=str(uuid.uuid4()),
                    name=f"{emp['prenom']} {emp['nom']}",
                    email=emp["email"],
                    role=emp["role"],
                    password=bcrypt.hashpw("test123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                )
                await db.users.insert_one(user.dict())
        
        # Créer 20 absences
        test_absences = [
            {
                "id": str(uuid.uuid4()),
                "employee_id": "...",
                "date_debut": "01/01/2025",
                "jours_absence": "5",
                "motif_absence": "Congés annuels"
            },
            # ... 19 autres
        ]
        
        for absence in test_absences:
            await db.absences.insert_one(absence)
        
        return {
            "success": True,
            "employees_created": len(test_employees),
            "absences_created": len(test_absences)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Option 2 : Export JSON des Données

Créer un script qui exporte les données en JSON :
```bash
#!/bin/bash
mongosh test_database --quiet --eval "
  printjson({
    users: db.users.find().toArray(),
    employees: db.employees.find().toArray(),
    absences: db.absences.find().toArray(),
    work_hours: db.work_hours.find().toArray()
  })
" > /app/data_export_$(date +%Y%m%d_%H%M%S).json
```

---

## 📋 Checklist Diagnostic

- [ ] Vérifier que MongoDB est bien persistent (volume monté)
- [ ] Vérifier les logs backend pendant l'import
- [ ] Tester un import simple et vérifier immédiatement MongoDB
- [ ] Vérifier qu'aucun code ne supprime les données au démarrage
- [ ] Vérifier les permissions MongoDB
- [ ] Vérifier que le code attend (await) les insertions
- [ ] Vérifier qu'il n'y a pas de rollback de transaction

---

## 🔥 Solution d'Urgence : Données Hardcodées Temporaires

En attendant de résoudre le problème, créer des données hardcodées qui se rechargent au démarrage :

```python
# Dans server.py - à l'initialisation
@app.on_event("startup")
async def startup_event():
    # Vérifier si base vide
    user_count = await db.users.count_documents({})
    
    if user_count < 5:  # Si presque vide, recharger données de base
        print("⚠️ Données manquantes, rechargement automatique...")
        await seed_test_data_internal()
```

---

Date : 2025-01-12
Priorité : CRITIQUE
