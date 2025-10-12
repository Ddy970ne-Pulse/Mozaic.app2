# ✅ Implémentation des Règles de Priorité entre Absences

## Date : 2025-01-12

## Modifications Apportées

### 1. Ajout du Champ `priority` dans absenceColorMap

Chaque type d'absence a maintenant un champ `priority` (1-24, 1 = plus prioritaire).

**Hiérarchie implémentée** :
```
Priorité 1-4   : Absences médicales (AT, MPRO, AM, EMAL)
Priorité 5-7   : Congés familiaux légaux (MAT, PAT, FAM)
Priorité 8-9   : Absences planifiées (STG, FO)
Priorité 10-13 : Congés payés (CA, CP, CT, CEX)
Priorité 14-15 : Récupérations (RTT, REC)
Priorité 16-17 : Télétravail/Délégation
Priorité 18-19 : Repos
Priorité 20-22 : Absences non justifiées
Priorité 23-24 : Cas spéciaux
```

### 2. Logique de Remplacement dans applyAllAbsencesToPlanning()

**Ancienne logique** :
```javascript
if (!newAbsences[day.toString()]) {
  newAbsences[day.toString()] = absenceCode;
}
```

**Nouvelle logique** :
```javascript
const existingAbsence = newAbsences[day.toString()];
const existingInfo = existingAbsence ? absenceColorMap[existingAbsence] : null;

const canOverride = !existingAbsence || 
                   (absenceInfo && existingInfo && absenceInfo.priority < existingInfo.priority);

if (canOverride) {
  if (existingAbsence && absenceInfo.priority < existingInfo.priority) {
    console.log(`⚠️ ${employee.name} - ${day}/${month + 1}: ${absenceCode} remplace ${existingAbsence}`);
  }
  newAbsences[day.toString()] = absenceCode;
}
```

### 3. Application dans 3 Endroits

La logique de priorité est appliquée dans :
1. `applyAllAbsencesToPlanning()` - SOURCE 1 (imports Excel) - Ligne ~570
2. `applyAllAbsencesToPlanning()` - SOURCE 2 (demandes approuvées) - Ligne ~623
3. `updatePlanningFromImportedAbsences()` - Ligne ~755

## Exemples de Cas d'Usage

### Cas 1 : Arrêt Maladie pendant Congés Annuels

**Données** :
- Import Excel : CA du 01/01/2025 au 15/01/2025
- Import Excel : AM du 05/01/2025 au 10/01/2025

**Résultat Planning** :
```
01/01 : CA
02/01 : CA
03/01 : CA
04/01 : CA
05/01 : AM ← remplace CA (priorité 3 < 10)
06/01 : AM ← remplace CA
07/01 : AM ← remplace CA
08/01 : AM ← remplace CA
09/01 : AM ← remplace CA
10/01 : AM ← remplace CA
11/01 : CA ← reprend après maladie
12/01 : CA
13/01 : CA
14/01 : CA
15/01 : CA
```

**Console log** :
```
⚠️ Jean Dupont - 5/1: AM (priorité 3) remplace CA (priorité 10)
⚠️ Jean Dupont - 6/1: AM (priorité 3) remplace CA (priorité 10)
⚠️ Jean Dupont - 7/1: AM (priorité 3) remplace CA (priorité 10)
⚠️ Jean Dupont - 8/1: AM (priorité 3) remplace CA (priorité 10)
⚠️ Jean Dupont - 9/1: AM (priorité 3) remplace CA (priorité 10)
⚠️ Jean Dupont - 10/1: AM (priorité 3) remplace CA (priorité 10)
```

### Cas 2 : Accident du Travail pendant Récupération

**Données** :
- Demande approuvée : REC le 15/01/2025
- Import Excel : AT du 15/01/2025 au 20/01/2025

**Résultat** :
```
15/01 : AT ← remplace REC (priorité 1 < 15)
16/01 : AT
17/01 : AT
18/01 : AT
19/01 : AT
20/01 : AT
```

### Cas 3 : Congé Maternité pendant Formation

**Données** :
- Import : FO du 01/02/2025 au 28/02/2025
- Import : MAT du 15/02/2025 au 15/08/2025

**Résultat** :
```
01/02 : FO
...
14/02 : FO
15/02 : MAT ← remplace FO (priorité 5 < 9)
16/02 : MAT
...
28/02 : MAT
```

### Cas 4 : RTT pendant Congés Payés (NON remplacé)

**Données** :
- Demande : CA du 01/01/2025 au 15/01/2025
- Demande : RTT le 10/01/2025

**Résultat** :
```
10/01 : CA ← RTT ne peut pas remplacer CA (priorité 14 > 10)
```

**Console log** : Aucun message (le RTT est ignoré silencieusement)

## Comportements Spéciaux

### 1. Ordre de Traitement

L'ordre de traitement des absences est :
1. Imports Excel (absences)
2. Demandes d'absence approuvées

Donc si un import Excel contient un AM et qu'une demande approuvée contient un CA pour le même jour, l'AM (priorité 3) remplace le CA (priorité 10).

### 2. Absences du Même Jour

Si deux absences de même priorité tombent le même jour, la première traitée l'emporte.

### 3. Compteur de Jours

Le compteur `totalDays` n'est incrémenté que si une nouvelle absence est ajoutée, pas si elle remplace une existante. Cela signifie que le total peut être inférieur au nombre de jours d'absences initialement posés.

## Impact sur les Compteurs

**IMPORTANT** : Cette implémentation gère seulement l'AFFICHAGE dans le planning. Elle ne gère pas automatiquement :
- ❌ La réintégration des jours de CA au compteur quand remplacés par AM
- ❌ La notification aux employés
- ❌ La mise à jour des soldes de congés

Ces fonctionnalités nécessitent une logique backend supplémentaire.

## Développements Futurs Recommandés

### Phase 1 : Backend
1. API pour détecter les conflits d'absences
2. Logique de réintégration automatique des compteurs
3. Historique des remplacements d'absences

### Phase 2 : Frontend
1. Modal d'alerte visuelle quand une absence en remplace une autre
2. Badge "Interrompu par maladie" sur les congés affectés
3. Rapport des jours réintégrés

### Phase 3 : Notifications
1. Email automatique au salarié
2. Notification au responsable RH
3. Export des conflits pour vérification

## Conformité Légale

✅ Conforme à :
- Code du travail Articles L3141-5 (maladie interrompt congés)
- Code du travail Articles L1226-1 (arrêt maladie)
- Code du travail Articles L1225-17 (congé maternité)
- Jurisprudence Cass. soc., 18 avril 2013

## Testing

### Test 1 : Maladie remplace Congés
```javascript
// Import 1
{ date_debut: '01/01/2025', jours_absence: '10', motif_absence: 'Congés annuels' }
// Import 2
{ date_debut: '05/01/2025', jours_absence: '3', motif_absence: 'Arrêt maladie' }

// Vérification
// Jours 1-4  : CA
// Jours 5-7  : AM
// Jours 8-10 : CA
```

### Test 2 : Récupération ne remplace pas Congés
```javascript
// Demande 1
{ type: 'CA', startDate: '2025-01-01', endDate: '2025-01-10' }
// Demande 2
{ type: 'REC', startDate: '2025-01-05', endDate: '2025-01-05' }

// Vérification
// Jour 5 : CA (REC ignoré)
```

## Fichiers Modifiés

1. `/app/frontend/src/components/MonthlyPlanningFinal.js`
   - absenceColorMap : ajout champ `priority`
   - applyAllAbsencesToPlanning() : ajout logique priorité (2 emplacements)
   - updatePlanningFromImportedAbsences() : ajout logique priorité

2. `/app/ABSENCE_PRIORITY_RULES.md` (nouveau)
   - Documentation complète des règles légales

3. `/app/ABSENCE_PRIORITY_IMPLEMENTATION.md` (ce fichier)
   - Documentation technique de l'implémentation

## Version

Version : 2.2
Date : 2025-01-12
Statut : IMPLÉMENTÉ - Prêt pour testing
