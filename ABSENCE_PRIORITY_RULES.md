# 🏛️ Règles de Priorité entre Types d'Absence - Droit du Travail Français

## Principe Général

En droit du travail français, certains types d'absence **interrompent et suspendent** d'autres absences en cours. Le salarié retrouve ses droits à congés après la fin de l'absence prioritaire.

## Hiérarchie des Priorités (du plus prioritaire au moins prioritaire)

### Niveau 1 : ABSENCES MÉDICALES PRIORITAIRES (Priorité Absolue)
Ces absences interrompent TOUS les autres types d'absence.

1. **AT** - Accident du travail/trajet
2. **MPRO** - Maladie professionnelle
3. **AM** - Arrêt maladie
4. **EMAL** - Enfants malades

**Règle** : Si un salarié tombe malade pendant ses congés, l'arrêt maladie suspend les congés payés. Les jours de congés non pris sont réintégrés au compteur.

**Base légale** : Article L3141-5 du Code du travail

---

### Niveau 2 : CONGÉS FAMILIAUX LÉGAUX (Priorité Très Haute)
Ces absences interrompent les congés payés et récupérations.

5. **MAT** - Congé maternité
6. **PAT** - Congé paternité
7. **FAM** - Événement familial (selon nature)

**Règle** : Un congé maternité suspend automatiquement tout congé en cours.

**Base légale** : Articles L1225-17 et suivants du Code du travail

---

### Niveau 3 : ABSENCES PLANIFIÉES (Priorité Haute)
Ces absences sont planifiées à l'avance et ne peuvent être interrompues que par les niveaux 1 et 2.

8. **STG** - Stage
9. **FO** - Formation professionnelle

**Règle** : Une fois validées, ces absences ne peuvent être annulées que pour raison médicale.

---

### Niveau 4 : CONGÉS PAYÉS (Priorité Moyenne-Haute)
Les congés payés légaux ont priorité sur les repos et récupérations.

10. **CA** - Congés annuels
11. **CP** - Congés payés
12. **CT** - Congés trimestriels
13. **CEX** - Congés exceptionnels

**Règle** : Les congés payés validés ont priorité sur les récupérations et repos.

---

### Niveau 5 : RÉCUPÉRATIONS ET RTT (Priorité Moyenne)
Ces absences peuvent être annulées par les niveaux supérieurs.

14. **RTT** - RTT
15. **REC** - Récupération

**Règle** : Peuvent être reportés si besoin du service ou raison médicale.

---

### Niveau 6 : TÉLÉTRAVAIL ET DÉLÉGATION (Priorité Moyenne-Basse)
Ces "absences" sont en réalité du temps de travail spécial.

16. **TEL** - Télétravail
17. **DEL** - Heures de délégation
18. **HS** - Heures supplémentaires

**Règle** : Peuvent être annulés/modifiés selon les besoins.

---

### Niveau 7 : REPOS (Priorité Basse)
Ces jours sont des repos normaux.

19. **RH** - Repos hebdomadaire
20. **RHD** - Repos dominical

---

### Niveau 8 : ABSENCES NON JUSTIFIÉES (Priorité Minimale)
21. **NAUT** - Absence non autorisée
22. **AUT** - Absence autorisée
23. **CSS** - Congés sans solde

---

### Niveau 9 : AUTRES (Cas Spéciaux)
24. **AST** - Astreinte (peut se superposer avec repos)
25. **RMED** - Rendez-vous médical (ponctuel, quelques heures)

---

## Règles d'Interruption Spécifiques

### 1. Arrêt Maladie pendant Congés Payés
```
Situation : Salarié en CA du 01/01 au 15/01
Événement : Arrêt maladie du 05/01 au 10/01

Résultat :
- 01/01 au 04/01 : CA (4 jours)
- 05/01 au 10/01 : AM (6 jours - congés suspendus)
- 11/01 au 15/01 : CA reprend (5 jours)

Compteur : 4 + 5 = 9 jours de CA consommés (au lieu de 15)
           6 jours de maladie comptabilisés
```

### 2. Accident du Travail pendant RTT
```
Situation : Salarié en REC le 05/01
Événement : AT le 05/01

Résultat :
- 05/01 : AT (priorité absolue)
- REC est annulée et réintégrée au compteur
```

### 3. Congé Maternité pendant Congés Annuels
```
Situation : Salariée en CA du 01/03 au 31/03
Événement : Congé maternité débute le 15/03

Résultat :
- 01/03 au 14/03 : CA (14 jours)
- 15/03 → : MAT (congé maternité démarre)
- CA restants (17 jours) : réintégrés au compteur
```

### 4. Formation pendant Congés Payés
**Cas particulier** : Si une formation obligatoire tombe pendant des congés validés, deux scénarios :
- Formation refusée (congés prioritaires)
- OU congés reportés avec accord du salarié

### 5. Télétravail et autres absences
Le télétravail ne peut pas se superposer avec une absence. Si un salarié est en arrêt maladie, il ne peut pas télétravailler (sauf exceptions médicales spécifiques).

---

## Règles de Gestion des Conflits

### Principe de Résolution
```javascript
if (nouvelleAbsence.priorité > absenceExistante.priorité) {
  // Annuler l'absence existante
  // Réintégrer les jours au compteur approprié
  // Poser la nouvelle absence
} else {
  // Refuser la nouvelle absence
  // OU demander confirmation pour forcer
}
```

### Cas de Superposition
Certaines absences peuvent se superposer sans conflit :
- **Astreinte (AST)** peut se superposer avec un repos (RH, RHD)
- **Rendez-vous médical (RMED)** ponctuel peut se superposer avec du télétravail

---

## Notifications Requises

Quand une absence interrompt une autre :
1. ✉️ Notification automatique au salarié
2. 📧 Notification au responsable RH
3. 📝 Mise à jour automatique des compteurs
4. 🔄 Régularisation du planning

---

## Implémentation Technique

### Structure de Données
```javascript
absenceTypes = {
  'AT': { priority: 1, canInterrupt: ['AM', 'CA', 'CP', 'CT', 'REC', 'RTT', 'TEL', 'DEL', ...] },
  'AM': { priority: 3, canInterrupt: ['CA', 'CP', 'CT', 'REC', 'RTT', 'TEL', 'DEL'] },
  'CA': { priority: 10, canInterrupt: ['REC', 'RTT', 'TEL'] },
  // ...
}
```

### Fonction de Vérification
```javascript
function canOverrideAbsence(newType, existingType) {
  return absenceTypes[newType].priority < absenceTypes[existingType].priority;
}
```

---

## Références Légales

- **Code du travail** : Articles L3141-1 à L3141-33 (Congés payés)
- **Code du travail** : Articles L1226-1 et suivants (Arrêt maladie)
- **Code du travail** : Articles L1225-17 et suivants (Maternité/Paternité)
- **Jurisprudence** : Cass. soc., 18 avril 2013, n° 11-27.145 (Maladie pendant congés)

---

## Date de Documentation

Date : 2025-01-12
Version : 1.0
Conformité : CCN66 + Code du travail français
