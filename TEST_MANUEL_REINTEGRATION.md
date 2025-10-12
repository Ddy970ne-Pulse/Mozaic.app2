# 🧪 Guide de Test Manuel - Système de Réintégration des Congés

## Objectif
Vérifier que le système de priorités des absences fonctionne et que les jours de congés interrompus sont automatiquement réintégrés au solde de l'employé.

---

## ✅ Pré-requis

1. **Backend et Frontend lancés**
   ```bash
   sudo supervisorctl status all
   # Tous les services doivent être RUNNING
   ```

2. **Console navigateur ouverte (F12)**
   - Onglet "Console" visible pour voir les logs

3. **Connexion admin**
   - Email: `ddacalor@aaea-gpe.fr` ou `sophie.martin@company.com`
   - Password: `admin123` ou `demo123`

---

## 📋 Test 1 : Initialisation des Soldes (Une seule fois)

### Étapes
1. Ouvrir Postman/Thunder Client/curl
2. Se connecter pour obtenir le token :
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"ddacalor@aaea-gpe.fr","password":"admin123"}'
   ```
3. Copier le token de la réponse
4. Initialiser les soldes :
   ```bash
   curl -X POST http://localhost:3000/api/leave-balance/initialize-all \
     -H "Authorization: Bearer {VOTRE_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{"year":2025}'
   ```

### Résultat Attendu
```json
{
  "success": true,
  "year": 2025,
  "initialized": 33,
  "skipped": 0,
  "total_employees": 33
}
```

✅ **Validation** : Message de succès avec nombre d'employés initialisés

---

## 📋 Test 2 : Import de Congés Annuels (CA)

### Étapes
1. Aller dans **Import Excel** (menu hamburger)
2. Sélectionner type : **Absences**
3. Créer un fichier Excel `test_absences_ca.xlsx` avec :
   ```
   Nom       | Prénom  | Date début | Jours absence | Motif absence
   GREGOIRE  | Jean    | 01/01/2025 | 10           | Congés annuels
   ```
4. Importer le fichier
5. Vérifier les warnings/success messages

### Résultat Attendu
- ✅ Import réussi
- ✅ Message : "1 absence importée"

---

## 📋 Test 3 : Consulter le Planning AVANT Interruption

### Étapes
1. Aller dans **Planning Mensuel**
2. Sélectionner **Janvier 2025**
3. Chercher l'employé **Jean GREGOIRE**
4. Observer les dates du 01/01 au 14/01 (jours ouvrables)

### Résultat Attendu
```
01/01 : (férié - vide si skipHolidays fonctionne)
02/01 : CA (bleu)
03/01 : CA (bleu)
04/01 : CA (bleu)
... (week-ends vides)
10/01 : CA (bleu)
```

✅ **Validation** : 
- Congés affichés uniquement sur jours ouvrables
- Week-ends vides
- Jour férié (1er janvier) vide

---

## 📋 Test 4 : Import d'Arrêt Maladie (AM) qui Interrompt

### Étapes
1. Ouvrir la **Console navigateur** (F12)
2. Aller dans **Import Excel**
3. Créer un fichier `test_absences_am.xlsx` :
   ```
   Nom       | Prénom  | Date début | Jours absence | Motif absence
   GREGOIRE  | Jean    | 05/01/2025 | 6            | Arrêt maladie
   ```
4. Importer le fichier
5. **REGARDER LA CONSOLE** immédiatement après l'import

### Résultat Attendu dans la Console
```javascript
⚠️ Jean GREGOIRE - 5/1: AM (priorité 3) remplace CA (priorité 10)
⚠️ Jean GREGOIRE - 6/1: AM (priorité 3) remplace CA (priorité 10)
⚠️ Jean GREGOIRE - 7/1: AM (priorité 3) remplace CA (priorité 10)
⚠️ Jean GREGOIRE - 8/1: AM (priorité 3) remplace CA (priorité 10)
⚠️ Jean GREGOIRE - 9/1: AM (priorité 3) remplace CA (priorité 10)
⚠️ Jean GREGOIRE - 10/1: AM (priorité 3) remplace CA (priorité 10)

✅ Jean GREGOIRE : 4 jour(s) de CA réintégré(s) (solde: 25 → 29)
```

✅ **Validation Console** :
- Messages de remplacement pour chaque jour
- Message de réintégration avec calcul du solde

---

## 📋 Test 5 : Vérifier le Planning APRÈS Interruption

### Étapes
1. Actualiser le **Planning Mensuel** si nécessaire
2. Observer les dates du 05/01 au 10/01 pour Jean GREGOIRE

### Résultat Attendu
```
02/01 : CA (bleu)
03/01 : CA (bleu)
04/01 : CA (bleu - week-end vide)
05/01 : AM (rouge) ← Remplace CA
06/01 : AM (rouge) ← Remplace CA
07/01 : AM (rouge) ← Remplace CA
08/01 : AM (rouge) ← Remplace CA
09/01 : AM (rouge) ← Remplace CA
10/01 : AM (rouge) ← Remplace CA
11/01 : (vide - week-end)
12/01 : (vide - week-end)
```

✅ **Validation Visuelle** :
- AM (rouge) remplace CA (bleu) du 05 au 10
- Couleur change de bleu à rouge

---

## 📋 Test 6 : Vérifier MongoDB - Soldes et Transactions

### Étapes
1. Ouvrir un terminal
2. Se connecter à MongoDB :
   ```bash
   mongosh test_database
   ```

3. **Consulter le solde de Jean GREGOIRE** :
   ```javascript
   db.leave_balances.findOne({employee_name: "Jean GREGOIRE"})
   ```

### Résultat Attendu
```javascript
{
  _id: ObjectId("..."),
  id: "uuid...",
  employee_id: "...",
  employee_name: "Jean GREGOIRE",
  year: 2025,
  
  // ✅ Vérifier ces valeurs
  ca_initial: 25.0,
  ca_taken: 10.0,        // 10 jours posés initialement
  ca_reintegrated: 4.0,  // 4 jours réintégrés (ouvrables du 05-10)
  ca_balance: 19.0,      // 25 - 10 + 4 = 19 ✅
  
  rtt_initial: 12.0,
  rtt_balance: 12.0,
  ...
}
```

✅ **Validation MongoDB Soldes** :
- `ca_taken = 10` (jours initialement posés)
- `ca_reintegrated = 4` (jours interrompus par AM)
- `ca_balance = 19` (25 - 10 + 4)

4. **Consulter les transactions** :
   ```javascript
   db.leave_transactions.find({employee_name: "Jean GREGOIRE"}).sort({transaction_date: -1})
   ```

### Résultat Attendu
```javascript
[
  {
    _id: ObjectId("..."),
    employee_name: "Jean GREGOIRE",
    leave_type: "CA",
    operation: "reintegrate",
    amount: 4.0,
    reason: "Interrompu par AM (4 jour(s)) en 1/2025",
    interrupting_absence_type: "AM",
    balance_before: 15.0,
    balance_after: 19.0,
    transaction_date: ISODate("2025-01-12T...")
  },
  // ... autres transactions si existantes
]
```

✅ **Validation MongoDB Transactions** :
- Transaction type "reintegrate"
- Amount = 4 jours
- Reason mentionne "Interrompu par AM"
- Balance_before et balance_after cohérents

---

## 📋 Test 7 : Vérifier Mon Espace (Si Widget Soldes Implémenté)

### Étapes
1. Se connecter en tant que Jean GREGOIRE (si possible)
   - Ou consulter via API :
   ```bash
   curl -X GET "http://localhost:3000/api/leave-balance/{employee_id}" \
     -H "Authorization: Bearer {TOKEN}"
   ```

### Résultat Attendu (API)
```json
{
  "id": "...",
  "employee_id": "...",
  "employee_name": "Jean GREGOIRE",
  "year": 2025,
  "ca_initial": 25.0,
  "ca_taken": 10.0,
  "ca_reintegrated": 4.0,
  "ca_balance": 19.0,
  ...
}
```

✅ **Validation API** : Solde CA = 19 jours disponibles

---

## 📋 Test 8 : Test avec Autre Type (RTT)

### Objectif
Vérifier que le système fonctionne aussi pour RTT

### Étapes
1. Importer RTT :
   ```
   Nom       | Prénom  | Date début | Jours absence | Motif absence
   GREGOIRE  | Jean    | 15/01/2025 | 3            | RTT
   ```

2. Importer AM qui interrompt :
   ```
   Nom       | Prénom  | Date début | Jours absence | Motif absence
   GREGOIRE  | Jean    | 16/01/2025 | 2            | Arrêt maladie
   ```

3. Vérifier console pour messages de réintégration RTT

### Résultat Attendu Console
```javascript
✅ Jean GREGOIRE : 2 jour(s) de RTT réintégré(s) (solde: 12 → 14)
```

### Vérifier MongoDB
```javascript
db.leave_balances.findOne(
  {employee_name: "Jean GREGOIRE"},
  {rtt_balance: 1, rtt_reintegrated: 1}
)
// Attendu: rtt_balance: 14, rtt_reintegrated: 2
```

---

## 🎯 Résumé des Validations

| Test | Critère | Statut |
|------|---------|--------|
| 1 | Initialisation soldes | ☐ |
| 2 | Import CA fonctionne | ☐ |
| 3 | Planning affiche CA (jours ouvrables) | ☐ |
| 4 | Console montre remplacements | ☐ |
| 5 | Planning affiche AM au lieu de CA | ☐ |
| 6 | MongoDB solde correct (19j) | ☐ |
| 7 | MongoDB transaction réintégration | ☐ |
| 8 | API retourne solde correct | ☐ |
| 9 | Test RTT réintégration | ☐ |

---

## ❌ Problèmes Courants

### Problème : Pas de message de réintégration dans console
**Solution** : 
- Vérifier que la console est ouverte AVANT l'import
- Actualiser la page et réimporter
- Vérifier que le backend est démarré

### Problème : Solde MongoDB incorrect
**Solution** :
- Vérifier que `initialize-all` a été appelé
- Vérifier les logs backend : `tail -f /var/log/supervisor/backend.*.log`

### Problème : Planning ne change pas
**Solution** :
- Actualiser la page (F5)
- Vérifier que le mois/année sélectionnés sont corrects
- Vérifier les dates des imports

---

## 📊 Formule de Calcul Attendue

```
Solde Final = Solde Initial - Jours Posés + Jours Réintégrés

Exemple Jean GREGOIRE :
CA Balance = 25 (initial) - 10 (posés) + 4 (réintégrés) = 19 jours ✅
```

---

## 📝 Notes

- **Jours Ouvrables** : Lun-Sam (exclu dimanche et fériés)
- **Jours Calendaires** : Tous les jours (maladie)
- **Réintégration** : Uniquement jours ouvrables comptent (4j sur 6j calendaires)

---

Date : 2025-01-12
Version : 1.0
