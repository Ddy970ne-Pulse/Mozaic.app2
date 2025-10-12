# 🚨 Correction Critique : Respect de la Législation pour les Absences

## Problème Identifié

**Symptôme** : Les congés annuels (CA) et autres congés payés étaient affichés sur les dimanches et jours fériés dans le planning mensuel.

**Impact** : Non-conformité avec la législation du travail française qui stipule que :
- Les congés payés ne peuvent pas être posés sur les jours non travaillés (week-ends, jours fériés)
- Ces jours ne comptent pas dans le décompte des congés

## Solution Implémentée

### 1. Ajout de Règles par Type d'Absence

Ajout de deux nouveaux champs dans `absenceColorMap` :
- `skipWeekends` : Si true, l'absence ne peut pas être posée un week-end
- `skipHolidays` : Si true, l'absence ne peut pas être posée un jour férié

### 2. Types d'Absence avec Règles

**Types qui SKIP les week-ends et jours fériés** (Jours Ouvrables/Ouvrés) :
- ✅ CA - Congés annuels
- ✅ CP - Congés Payés
- ✅ CT - Congés Trimestriels
- ✅ RTT - RTT
- ✅ REC - Récupération
- ✅ FO - Formation
- ✅ TEL - Télétravail
- ✅ DEL - Délégation
- ✅ CEX - Congé exceptionnel
- ✅ CSS - Congés Sans Solde
- ✅ RMED - Rendez-vous médical

**Types qui peuvent être posés sur week-ends/jours fériés** (Jours Calendaires) :
- ⏳ AT - Accident du travail/trajet
- ⏳ AM - Arrêt maladie
- ⏳ MAT - Congé maternité
- ⏳ PAT - Congé paternité
- ⏳ FAM - Événement familial
- ⏳ STG - Stage
- ⏳ MPRO - Maladie professionnelle
- ⏳ EMAL - Enfants malades
- ⏳ RH - Repos Hebdomadaire
- ⏳ RHD - Repos Dominical

### 3. Modifications du Code

**Fichier** : `/app/frontend/src/components/MonthlyPlanningFinal.js`

**Fonctions modifiées** :
1. `applyAllAbsencesToPlanning()` - Ligne 447
2. `updatePlanningFromImportedAbsences()` - Ligne 600

**Logique ajoutée** :
```javascript
const shouldSkipThisDay = absenceInfo && (
  (absenceInfo.skipWeekends && isWeekend(day, month, year)) ||
  (absenceInfo.skipHolidays && isHoliday(day, month, year))
);

if (!shouldSkipThisDay && !newAbsences[day.toString()]) {
  newAbsences[day.toString()] = absenceCode;
  totalDays++;
}
```

## Exemples de Comportement

### Avant la Correction ❌
```
Congés annuels du 01/01/2025 au 07/01/2025 (7 jours)
Planning affiché :
Lun 30/12 : CA
Mar 31/12 : CA
Mer 01/01 : CA ← JOUR FÉRIÉ (Nouvel An)
Jeu 02/01 : CA
Ven 03/01 : CA
Sam 04/01 : CA ← WEEK-END
Dim 05/01 : CA ← WEEK-END
```

### Après la Correction ✅
```
Congés annuels du 01/01/2025 au 07/01/2025 (7 jours)
Planning affiché :
Lun 30/12 : CA
Mar 31/12 : CA
Mer 01/01 : (vide - jour férié skippé)
Jeu 02/01 : CA
Ven 03/01 : CA
Sam 04/01 : (vide - week-end skippé)
Dim 05/01 : (vide - week-end skippé)
```

## Calcul Automatique du Décompte

Le système ajuste automatiquement :
- **Jours Ouvrables** : Lun-Sam (exclu dimanches et jours fériés)
- **Jours Ouvrés** : Lun-Ven (exclu week-ends et jours fériés)
- **Jours Calendaires** : Tous les jours (inclut week-ends et jours fériés)

## Conformité Légale

Cette correction assure la conformité avec :
- Code du travail français (Article L3141-5)
- Convention Collective Nationale applicable
- Règles CCN66 pour les établissements concernés

## Testing

Pour vérifier :
1. Importer des absences de type CA qui couvrent un week-end
2. Vérifier dans le planning mensuel que seuls les jours ouvrés sont marqués
3. Vérifier que les congés maladie (AM) continuent d'apparaître sur tous les jours

## Notes Importantes

- ⚠️ Cette correction s'applique UNIQUEMENT à l'affichage dans le planning
- ⚠️ Le décompte total est automatiquement ajusté
- ⚠️ Les imports Excel doivent toujours indiquer le nombre de jours OUVRABLES pour les congés payés
- ⚠️ Le backend calcule automatiquement la date de fin en fonction du type d'absence

## Date de Mise en Place

Date : 2025-01-12
Agent : AI Engineer
Version : 2.1
