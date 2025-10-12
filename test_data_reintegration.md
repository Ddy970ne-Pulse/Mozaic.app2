# 📊 Données de Test pour Réintégration

## Fichier Excel 1 : test_absences_ca.xlsx

**Type de données** : Absences - Congés Annuels

| Nom      | Prénom | Date début | Jours absence | Motif absence   |
|----------|--------|------------|---------------|-----------------|
| GREGOIRE | Jean   | 01/01/2025 | 10            | Congés annuels  |
| DACALOR  | Diego  | 02/01/2025 | 8             | Congés annuels  |

**Attendu** :
- Jean GREGOIRE : 10 jours CA posés (jours ouvrables seulement)
- Diego DACALOR : 8 jours CA posés

---

## Fichier Excel 2 : test_absences_am.xlsx

**Type de données** : Absences - Arrêt Maladie (interrompt les CA)

| Nom      | Prénom | Date début | Jours absence | Motif absence  |
|----------|--------|------------|---------------|----------------|
| GREGOIRE | Jean   | 05/01/2025 | 6             | Arrêt maladie  |

**Attendu** :
- Interrompt les CA du 05/01 au 10/01
- 4 jours ouvrables réintégrés (exclu week-end)
- Solde Jean GREGOIRE : 25 - 10 + 4 = 19 jours

---

## Fichier Excel 3 : test_absences_rtt.xlsx

**Type de données** : Absences - RTT

| Nom      | Prénom | Date début | Jours absence | Motif absence |
|----------|--------|------------|---------------|---------------|
| GREGOIRE | Jean   | 15/01/2025 | 3             | RTT           |
| DACALOR  | Diego  | 16/01/2025 | 2             | RTT           |

---

## Fichier Excel 4 : test_absences_am2.xlsx

**Type de données** : Absences - Arrêt Maladie (interrompt les RTT)

| Nom      | Prénom | Date début | Jours absence | Motif absence  |
|----------|--------|------------|---------------|----------------|
| GREGOIRE | Jean   | 16/01/2025 | 2             | Arrêt maladie  |

**Attendu** :
- Interrompt les RTT du 16/01 au 17/01
- 2 jours RTT réintégrés
- Solde RTT Jean GREGOIRE : 12 - 3 + 2 = 11 jours

---

## Instructions Création Fichiers Excel

### Option 1 : Excel/LibreOffice
1. Ouvrir Excel ou LibreOffice Calc
2. Créer les colonnes : Nom, Prénom, Date début, Jours absence, Motif absence
3. Copier les données du tableau
4. Sauvegarder en .xlsx

### Option 2 : Google Sheets
1. Créer une nouvelle feuille
2. Copier les données
3. Télécharger en format .xlsx

### Option 3 : CSV (puis convertir)
Créer un fichier CSV avec ce format :
```csv
Nom,Prénom,Date début,Jours absence,Motif absence
GREGOIRE,Jean,01/01/2025,10,Congés annuels
```

---

## Scénarios de Test Avancés

### Scénario 1 : Congé Maternité interrompt CA
```
CA du 01/03 au 31/03 (23 jours ouvrables)
MAT débute le 15/03
→ 12 jours CA réintégrés (15-31 mars)
```

### Scénario 2 : Accident du Travail interrompt Formation
```
FO du 10/02 au 14/02 (5 jours)
AT débute le 12/02
→ 3 jours FO réintégrés (12-14 fév)
```

### Scénario 3 : Plusieurs interruptions successives
```
CA du 01/04 au 30/04
AM du 05/04 au 08/04 (4j réintégrés)
AT du 20/04 au 22/04 (3j réintégrés)
→ Total : 7 jours CA réintégrés
```

---

## Vérifications Attendues par Scénario

### Scénario Jean GREGOIRE (CA + AM)

**Avant imports** :
```javascript
ca_balance: 25.0
ca_taken: 0
ca_reintegrated: 0
```

**Après CA** :
```javascript
ca_balance: 15.0  (25 - 10)
ca_taken: 10.0
ca_reintegrated: 0
```

**Après AM** :
```javascript
ca_balance: 19.0  (15 + 4)
ca_taken: 10.0
ca_reintegrated: 4.0
```

### Transactions Attendues

Transaction 1 - Pose CA :
```javascript
{
  operation: "deduct",
  leave_type: "CA",
  amount: 10.0,
  balance_before: 25.0,
  balance_after: 15.0
}
```

Transaction 2 - Réintégration :
```javascript
{
  operation: "reintegrate",
  leave_type: "CA",
  amount: 4.0,
  interrupting_absence_type: "AM",
  balance_before: 15.0,
  balance_after: 19.0
}
```

---

Date : 2025-01-12
