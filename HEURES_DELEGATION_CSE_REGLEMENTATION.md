# 📋 Tableau Réglementaire des Heures de Délégation CSE

## Source Officielle
**Service Public** : https://www.service-public.gouv.fr/particuliers/vosdroits/F34474

## Heures de Délégation par Effectif

### ⚠️ RÈGLE IMPORTANTE
- **Titulaires uniquement** : Les heures de délégation sont réservées aux membres titulaires
- **Suppléants** : N'ont PAS d'heures de délégation sauf remplacement d'un titulaire absent
- **Temps de réunion** : Le temps passé en réunion CSE n'est PAS déduit des heures de délégation

| Effectif (salariés) | Titulaires | Heures/mois (par titulaire) | Total heures |
|---------------------|------------|----------------------------|--------------|
| 50-74 | 4 | 18 | 72 |
| 75-99 | 5 | 19 | 95 |
| 100-124 | 6 | 21 | 126 |
| 125-149 | 7 | 21 | 147 |
| 150-174 | 8 | 21 | 168 |
| 175-199 | 9 | 21 | 189 |
| 200-249 | 10 | 22 | 220 |
| **250-299** | **11** | **22** | **242** |
| **300-399** | **11** | **22** | **242** |
| 400-499 | 12 | 22 | 264 |
| 500-599 | 13 | 24 | 312 |
| 600-699 | 14 | 24 | 336 |
| 700-799 | 14 | 24 | 336 |
| 800-899 | 15 | 24 | 360 |
| 900-999 | 16 | 24 | 384 |
| 1000-1249 | 17 | 24 | 408 |
| 1250-1499 | 18 | 24 | 432 |
| 1500-1749 | 20 | 26 | 520 |
| 1750-1999 | 21 | 26 | 546 |
| 2000-2249 | 22 | 26 | 572 |
| 2250-2499 | 23 | 26 | 598 |
| 2500-2749 | 24 | 26 | 624 |
| 2750-2999 | 24 | 26 | 624 |
| 3000-3249 | 25 | 26 | 650 |
| 3250-3499 | 25 | 26 | 650 |
| 3500-3749 | 26 | 27 | 702 |
| 3750-3999 | 26 | 27 | 702 |
| 4000-4249 | 26 | 28 | 728 |
| 4250-4499 | 27 | 28 | 756 |
| 4500-4749 | 27 | 28 | 756 |
| 4750-4999 | 28 | 28 | 784 |
| 5000+ | ... | ... | ... |

## Application dans MOZAIK RH

### 🔧 Configuration à implémenter

```python
# Fonction de calcul automatique selon effectif
def calculer_heures_delegation(effectif: int, statut: str) -> int:
    """
    Calcule les heures de délégation mensuelles selon l'effectif
    
    Args:
        effectif: Nombre de salariés dans l'entreprise
        statut: 'Titulaire' ou 'Suppléant'
    
    Returns:
        Nombre d'heures mensuelles (0 pour suppléants)
    """
    # Suppléants n'ont pas d'heures de délégation
    if statut == 'Suppléant':
        return 0
    
    # Titulaires selon effectif
    if effectif < 50:
        return 0
    elif 50 <= effectif < 75:
        return 18
    elif 75 <= effectif < 100:
        return 19
    elif 100 <= effectif < 200:
        return 21
    elif 200 <= effectif < 500:
        return 22
    elif 500 <= effectif < 1500:
        return 24
    elif 1500 <= effectif < 3500:
        return 26
    elif 3500 <= effectif < 4000:
        return 27
    elif 4000 <= effectif < 5000:
        return 28
    elif 5000 <= effectif < 6750:
        return 29
    elif 6750 <= effectif < 7500:
        return 30
    elif 7500 <= effectif < 7750:
        return 31
    elif 7750 <= effectif < 9750:
        return 32
    elif 9750 <= effectif < 10000:
        return 34
    else:  # 10000+
        return 34
```

## Cas d'Usage MOZAIK RH

### Entreprise de 250+ salariés (exemple client)

**Configuration actuelle :**
- Effectif : 250+ salariés
- **Heures par titulaire : 22h/mois** ✅ (actuellement 24h ❌)
- **Heures pour suppléants : 0h/mois** ✅ (actuellement 24h ❌)

### Actions Correctives Requises

1. **Backend** : Modifier la fonction de calcul des heures
2. **Import Excel** : Calculer automatiquement selon effectif
3. **Module CSE** : Afficher les bonnes heures pour chaque membre
4. **Formulaire** : Permettre la modification manuelle (accord d'entreprise)

## Notes Légales

### Modifications possibles
✅ Un **accord d'entreprise** peut prévoir :
- Un nombre d'heures **supérieur** au minimum légal
- Mutualisation des heures entre titulaires
- Report d'heures non utilisées (dans la limite de 12 mois)

❌ Ne peut PAS prévoir :
- Un nombre d'heures **inférieur** au minimum légal
- Des heures de délégation pour suppléants (sauf remplacement)

### Temps de Réunion
⚠️ **IMPORTANT** : Le temps passé en réunion CSE :
- Est rémunéré comme temps de travail
- N'est PAS déduit des heures de délégation
- Est comptabilisé séparément

## Prochaines Étapes MOZAIK RH

1. ✅ **Créer fonction de calcul automatique** selon effectif
2. ✅ **Mettre à jour import Excel** pour calculer heures
3. ✅ **Modifier module CSE** pour afficher bonnes heures
4. ✅ **Ajouter champ effectif entreprise** dans paramètres
5. ✅ **Permettre override manuel** (accord d'entreprise)
