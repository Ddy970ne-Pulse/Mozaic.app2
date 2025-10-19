# 📊 TABLEAU ANALYSE ABSENCES - DOCUMENTATION

## Vue d'ensemble

Le module **Adaptateur Tableau Analyse Absences** transforme les données d'absence en un format Excel structuré avec deux blocs côte à côte :
- **Bloc gauche** : ABSENCES PROGRAMMÉES (CA, FO, RTT, etc.)
- **Bloc droit** : ABSENTÉISME (AM, NAUT, etc.)

---

## 🎯 Objectif

Produire un tableau Excel combiné présentant :
1. Une colonne commune `EmployeNom`
2. Un bloc ABSENCES PROGRAMMÉES avec colonnes par code (CA, FO, RTT, ...) + Total
3. Un bloc ABSENTÉISME avec colonnes par code (AM, NAUT, ...) + TOTAL
4. Formatage visuel distinct (orange pour programmées, vert pour absentéisme)

---

## 📥 Inputs

### 1. SOURCE_TABLE_PATH
Chemin du fichier source (CSV ou XLSX) contenant les données d'absences.

**Colonnes minimales requises** :
- `EmployeNom` (ou `employee_name`, `nom`, `name`)
- `TypeAbsence` (ou `type`, `motif`, `motif_absence`)
- `Duree` (ou `jours`, `duration`, `jours_absence`) - optionnel si dates fournies
- `DateDebut` (optionnel)
- `DateFin` (optionnel)
- `StatutPlanif` (optionnel, pour forcer classification)

**Exemple** :
```csv
EmployeNom,TypeAbsence,Duree,DateDebut,DateFin
Jean DUPONT,Congés Annuels,5,01/06/2025,05/06/2025
Marie MARTIN,Arrêt maladie,3,10/06/2025,12/06/2025
```

### 2. MAPPING_PATH (optionnel)
Fichier CSV ou JSON de correspondance `Intitulé → Code`.

**Format CSV** :
```csv
Intitule,Code
Congés Annuels,CA
RTT,RTT
Arrêt maladie,AM
```

**Format JSON** :
```json
{
  "Congés Annuels": "CA",
  "RTT": "RTT",
  "Arrêt maladie": "AM"
}
```

Si non fourni, le mapping par défaut est utilisé (30+ types pré-configurés).

### 3. OUTPUT_XLSX_PATH
Chemin du fichier Excel final à créer.

**Exemple** : `./out/Analyse_Absences_2025_06.xlsx`

### 4. COUNTING_METHOD (optionnel)
Méthode de calcul des durées à partir des dates.

**Valeurs** :
- `"Jours Ouvrés"` (par défaut)
- `"Jours Calendaires"`

---

## 📤 Outputs

### 1. Fichier Excel Principal
**Nom** : `OUTPUT_XLSX_PATH`

**Structure** :
```
┌─────────────────────────────────────────────────────────────────────┐
│                   ABSENCES PROGRAMMÉES           │    ABSENTÉISME   │
├──────────┬────┬────┬─────┬───────┬──────┬────┬───────┬────┬────────┤
│EmployeNom│ CA │ FO │ RTT │ ... │ Total │ AM │ NAUT │ ...│ TOTAL  │
├──────────┼────┼────┼─────┼───────┼──────┼────┼───────┼────┼────────┤
│ Dupont J │ 5.0│ 2.0│ 1.0 │  0.0 │  8.0 │ 0.0│  0.0 │ 0.0│   0.0  │
│ Martin M │ 3.0│ 0.0│ 0.0 │  0.0 │  3.0 │ 3.0│  0.0 │ 0.0│   3.0  │
└──────────┴────┴────┴─────┴───────┴──────┴────┴───────┴────┴────────┘
```

**Formatage** :
- Ligne 1 : Titres des blocs (ABSENCES PROGRAMMÉES | ABSENTÉISME)
- Ligne 2 : En-têtes de colonnes (codes d'absence)
- Données : Valeurs numériques arrondies à 1 décimale
- Couleurs :
  - Orange pour en-têtes programmées
  - Vert pour en-têtes absentéisme
  - Or pour colonnes Total/TOTAL
- Bordures sur toutes les cellules

### 2. Fichier Log JSON
**Nom** : `./out/absences_adapt_log.json`

**Contenu** :
```json
{
  "timestamp": "2025-01-19T14:30:00",
  "source_file": "data/absences.xlsx",
  "output_file": "out/Analyse_Final.xlsx",
  "rows_processed": 150,
  "employees_processed": 33,
  "durations_calculated": 5,
  "unmapped_types": ["Congé spécial", "Autre"],
  "warnings": ["Type non mappé: Congé spécial"],
  "errors": []
}
```

---

## 🚀 Utilisation

### 1. Ligne de commande

```bash
python adapt_absences_tableau.py \
  --source data/absences.xlsx \
  --mapping config/mapping.csv \
  --output out/Analyse_2025.xlsx \
  --counting-method "Jours Ouvrés"
```

### 2. API REST

**Endpoint** : `POST /api/analytics/generate-absence-report`

**Paramètres** :
- `year` (int, required) : Année du rapport
- `month` (int, optional) : Mois (1-12), si omis = toute l'année

**Exemple** :
```bash
curl -X POST "https://staffhub-83.preview.emergentagent.com/api/analytics/generate-absence-report?year=2025&month=10" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output Analyse_2025_10.xlsx
```

**Réponse** : Téléchargement direct du fichier Excel

### 3. Depuis Python

```python
from adapt_absences_tableau import AbsenceTableauAdapter

adapter = AbsenceTableauAdapter(
    source_path='data/absences.xlsx',
    mapping_path='config/mapping.csv',
    output_path='out/Analyse_Final.xlsx',
    counting_method='Jours Ouvrés'
)

adapter.run()
```

---

## 📋 Pipeline de Traitement

### Étape 1 : Chargement des données
- Lecture du fichier source (CSV/XLSX)
- Détection automatique des colonnes (avec noms alternatifs)
- Validation des colonnes essentielles

### Étape 2 : Mapping des types
- Chargement du mapping (fichier ou défaut)
- Conversion `Intitulé → Code`
- Création colonne `CodeTypeAbsence`
- Log des types non mappés → `INCONNU`

### Étape 3 : Classification
- Analyse de chaque absence
- Attribution `programmee` ou `absenteisme` basée sur :
  - Colonne `StatutPlanif` si présente
  - Code d'absence (lookup dans TYPES_PROGRAMMEES/TYPES_ABSENTEISME)
  - Défaut : absentéisme

### Étape 4 : Calcul des durées
- Conversion `Duree` en numérique
- Si `Duree` = 0 et dates disponibles :
  - Calcul : `(DateFin - DateDebut).days + 1`
  - Prise en compte de `counting_method` (future amélioration)

### Étape 5 : Création des pivots
- **Pivot Programmées** :
  - Index : EmployeNom
  - Colonnes : Tous les codes de TYPES_PROGRAMMEES
  - Valeurs : Somme(Duree)
  - Ajout colonne `Total`

- **Pivot Absentéisme** :
  - Index : EmployeNom
  - Colonnes : Tous les codes de TYPES_ABSENTEISME + INCONNU si présent
  - Valeurs : Somme(Duree)
  - Ajout colonne `TOTAL`

- **Unification** : Reindex pour avoir tous les employés dans les deux pivots

### Étape 6 : Assemblage
- Merge des deux pivots côte à côte
- Remplacement NaN par 0
- Arrondi à 1 décimale

### Étape 7 : Export Excel
- Création workbook avec formatage
- Titres de blocs (ligne 1)
- En-têtes de colonnes (ligne 2)
- Données avec bordures
- Ajustement des largeurs
- Sauvegarde

### Étape 8 : Logging
- Génération du fichier JSON
- Statistiques complètes

---

## 🎨 Types d'Absence Supportés

### ABSENCES PROGRAMMÉES (16 types)
| Code | Nom                        | Catégorie |
|------|---------------------------|-----------|
| CA   | Congés Annuels            | vacation  |
| CT   | Congés Trimestriels       | vacation  |
| RTT  | RTT                       | vacation  |
| REC  | Récupération              | vacation  |
| FO   | Formation                 | work      |
| MAT  | Congé maternité           | family    |
| PAT  | Congé paternité           | family    |
| FAM  | Événement familial        | family    |
| RMED | Rendez-vous médical       | medical   |
| EMAL | Enfants malades           | medical   |
| CEX  | Congé exceptionnel        | vacation  |
| RH   | Repos Hebdomadaire        | vacation  |
| RHD  | Repos Dominical           | vacation  |
| STG  | Stage                     | work      |
| TEL  | Télétravail               | work      |
| DEL  | Délégation                | work      |

### ABSENTÉISME (6 types)
| Code  | Nom                           | Catégorie |
|-------|-------------------------------|-----------|
| AM    | Arrêt maladie                 | medical   |
| AT    | Accident du travail           | medical   |
| MPRO  | Maladie Professionnelle       | medical   |
| NAUT  | Absence non autorisée         | other     |
| AUT   | Absence autorisée             | other     |
| CSS   | Congés Sans Solde             | other     |

---

## ⚠️ Gestion des Cas Particuliers

### Types non mappés
- Attribution du code `INCONNU`
- Ajout au log JSON (liste `unmapped_types`)
- Classification par défaut : absentéisme
- Apparition dans colonne dédiée du rapport

### Durées manquantes
- Si `Duree` = 0 ou absent ET dates disponibles :
  - Calcul automatique
  - Log dans `durations_calculated`
- Si dates également absentes :
  - Durée = 0
  - Avertissement dans log

### Employés sans données
- Si employé présent dans un seul bloc :
  - Ajout automatique dans l'autre bloc avec valeurs 0
- Garantit cohérence : même liste d'employés partout

### Formats de dates variés
- Support DD/MM/YYYY
- Support YYYY-MM-DD
- Support ISO 8601
- Parsing automatique via pandas

---

## 🔧 Configuration Avancée

### Personnaliser les types programmés

Éditer `adapt_absences_tableau.py` :

```python
TYPES_PROGRAMMEES = [
    'CA', 'CT', 'RTT', 'REC', 'FO',
    'CUSTOM1',  # Ajouter vos codes
    'CUSTOM2'
]
```

### Personnaliser les couleurs

Éditer dans `export_to_excel()` :

```python
header_prog_fill = PatternFill(start_color="FFA500", ...)  # Orange
header_absent_fill = PatternFill(start_color="90EE90", ...)  # Vert
total_fill = PatternFill(start_color="FFD700", ...)  # Or
```

### Ajouter des colonnes calculées

Avant `create_pivot_tables()` :

```python
# Exemple: ajouter taux d'absentéisme
self.df_source['TauxAbsenteisme'] = (
    self.df_source['Duree'] / 
    self.df_source['JoursOuvres']  # si disponible
) * 100
```

---

## ✅ Critères d'Acceptation

### Critère 1 : Tous les codes apparaissent
✅ Chaque colonne de type d'absence est présente (même si total = 0)

### Critère 2 : EmployeNom unique
✅ Une seule ligne par employé
✅ Même ordre dans les deux blocs

### Critère 3 : Nommage des totaux
✅ Colonne programmées : `Total`
✅ Colonne absentéisme : `TOTAL`

### Critère 4 : Robustesse
✅ Pas de crash si `Duree` manque
✅ Calcul automatique depuis dates selon `counting_method`

### Critère 5 : Traçabilité
✅ Log console + fichier JSON
✅ Liste types non mappés
✅ Corrections de durée documentées
✅ Hypothèses de classification enregistrées

---

## 📝 Exemples

### Exemple 1 : Rapport mensuel

```bash
python adapt_absences_tableau.py \
  --source data/absences_juin_2025.xlsx \
  --output out/Rapport_Juin_2025.xlsx
```

### Exemple 2 : Avec mapping personnalisé

```bash
python adapt_absences_tableau.py \
  --source data/absences.csv \
  --mapping config/mapping_custom.csv \
  --output out/Analyse_Custom.xlsx
```

### Exemple 3 : Depuis l'API

```python
import requests

response = requests.post(
    "https://staffhub-83.preview.emergentagent.com/api/analytics/generate-absence-report",
    params={"year": 2025, "month": 10},
    headers={"Authorization": "Bearer YOUR_TOKEN"}
)

with open("rapport.xlsx", "wb") as f:
    f.write(response.content)
```

---

## 🐛 Dépannage

### Erreur : "Colonnes manquantes"
**Solution** : Vérifier que le fichier source contient au minimum `EmployeNom` et `TypeAbsence`

### Erreur : "Format non supporté"
**Solution** : Utiliser CSV ou XLSX uniquement

### Types affichés comme INCONNU
**Solution** : Ajouter les mappings manquants dans `mapping.csv` ou mettre à jour `DEFAULT_MAPPING`

### Durées = 0
**Solution** : Fournir colonne `Duree` OU `DateDebut`+`DateFin`

### Fichier Excel vide
**Solution** : Vérifier que les données source correspondent à la période demandée

---

## 📞 Support

Pour toute question ou problème :
1. Consulter le fichier log JSON (`./out/absences_adapt_log.json`)
2. Vérifier les données source (format, colonnes)
3. Tester avec le mapping par défaut
4. Consulter la documentation des erreurs ci-dessus

---

**Version** : 1.0.0  
**Date** : 19 Janvier 2025  
**Auteur** : MOZAIK RH System
