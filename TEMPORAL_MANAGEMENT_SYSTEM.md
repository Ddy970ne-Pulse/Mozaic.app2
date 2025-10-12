# Système de Gestion Temporelle - MOZAIK RH

## Vue d'ensemble

MOZAIK RH implémente un système de gestion temporelle dynamique qui s'adapte automatiquement au passage des années tout en conservant l'accès aux données historiques.

---

## 🎯 Fonctionnalités Clés

### 1. Détection Automatique de l'Année Courante

```javascript
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth();
```

**Avantages:**
- ✅ Pas de mise à jour manuelle nécessaire
- ✅ S'adapte automatiquement au 1er janvier
- ✅ Affichage de l'année en cours par défaut

### 2. Génération Dynamique des Années Disponibles

```javascript
const getAvailableYears = () => {
  const firstYear = 2024; // Année de démarrage du système
  const years = [];
  for (let year = firstYear; year <= currentYear + 1; year++) {
    years.push(year);
  }
  return years;
};
```

**Résultat:**
- 2024: Année de démarrage (historique)
- 2025: Année courante (actuelle au moment de cette écriture)
- 2026: Année future (pour planification anticipée)
- Etc.

### 3. Filtrage Multi-Niveaux

#### Niveau 1: Par Année
- Sélecteur dropdown avec toutes les années depuis 2024
- Indication visuelle de l'année courante
- Accès complet aux données historiques

#### Niveau 2: Par Mois (Vue Mensuelle)
- Sélection du mois spécifique (1-12)
- Combiné avec l'année sélectionnée
- Affichage détaillé des absences

#### Niveau 3: Période Personnalisée
- Sélection date de début
- Sélection date de fin
- Calcul automatique des données sur la période

---

## 📊 Impact sur les Modules

### Analytics.js (Analyses & KPI)

**Avant:**
```javascript
const [selectedYear, setSelectedYear] = useState(2024); // ❌ Hardcodé
```

**Après:**
```javascript
const currentYear = new Date().getFullYear();
const [selectedYear, setSelectedYear] = useState(currentYear); // ✅ Dynamique
```

**Filtres Disponibles:**
1. **Année**: Dropdown dynamique (2024 → année courante + 1)
2. **Mois**: Janvier à Décembre
3. **Période Personnalisée**: Date début → Date fin

### MonthlyPlanningFinal.js (Planning Mensuel)

**Déjà Implémenté:**
- Sélecteurs d'année et de mois fonctionnels
- Changement dynamique de période
- Chargement automatique des données

**À Vérifier:**
- Années futures disponibles pour planification
- Conservation données historiques

### Dashboard.js

**À Implémenter:**
- Vue d'ensemble adaptative à l'année courante
- KPI année N vs année N-1
- Graphiques évolutifs

---

## 🔄 Passage à 2026 - Scénario Complet

### Situation Actuelle (Décembre 2025)
```
Système en production:
- Année courante détectée: 2025
- Années disponibles: [2024, 2025, 2026]
- Données 2024: Accessibles (historique)
- Données 2025: En cours d'accumulation
- Données 2026: Planification anticipée possible
```

### Le 1er Janvier 2026 à 00:00

**1. Détection Automatique**
```javascript
const currentYear = new Date().getFullYear(); // 2026
```

**2. Mise à Jour Interface**
```javascript
availableYears = [2024, 2025, 2026, 2027]
```
- 2024: Historique (2 ans)
- 2025: Historique (1 an)
- 2026: Année courante ← Sélection par défaut
- 2027: Future (planification)

**3. Données Affichées**
- Dashboard: Statistiques 2026 (vides initialement)
- Comparaison: 2026 vs 2025
- Planning: Janvier 2026 affiché par défaut
- Analytics: KPI 2026 (construction progressive)

**4. Données Historiques**
- ✅ 2024: Toujours accessible
- ✅ 2025: Toujours accessible
- ✅ Aucune perte de données

### Actions Requises: **AUCUNE** ✅

Le système s'adapte automatiquement !

---

## 📁 Structure de Données MongoDB

### Collection: absences
```javascript
{
  id: "uuid",
  employee_id: "uuid",
  date_debut: "01/01/2026",  // Format DD/MM/YYYY
  date_fin: "05/01/2026",
  jours_absence: "5",
  motif_absence: "CA",
  created_at: "2026-01-01T08:00:00", // ISO format
  // Indexé par date_debut pour requêtes rapides
}
```

**Index Recommandé:**
```javascript
db.absences.createIndex({ date_debut: 1, employee_id: 1 })
db.absences.createIndex({ created_at: -1 })
```

### Collection: users
```javascript
{
  id: "uuid",
  name: "Employé",
  hire_date: "2024-03-15", // Permet calcul ancienneté
  // Permet filtres multi-années
}
```

---

## 🔌 API Endpoints

### Endpoint Actuel
```
GET /api/absences/by-period/{year}/{month}
```

**Exemple:**
```bash
# Janvier 2026
GET /api/absences/by-period/2026/1

# Décembre 2025
GET /api/absences/by-period/2025/12
```

### Endpoint Futur Recommandé
```
GET /api/absences/range?start=2025-01-01&end=2026-12-31
```

**Avantages:**
- Périodes multi-années
- Calculs cumulés
- Comparaisons flexibles

---

## 📈 Évolution Future du Système

### Phase 1: ✅ Implémentée (Décembre 2025)
- Détection année courante
- Sélecteurs dynamiques
- Période personnalisée (UI)

### Phase 2: 🔄 En Cours
- Backend API pour période custom
- Chargement données réelles depuis MongoDB
- Remplacement données mockées

### Phase 3: 📅 Planifié (2026)
- Comparaisons inter-annuelles automatiques
- Prédictions basées sur historique
- Exports PDF multi-périodes
- Tableaux de bord configurables

---

## 🛠️ Guide de Maintenance

### Ajout d'une Nouvelle Année

**Réponse:** Rien à faire ! Le système ajoute automatiquement l'année N+1.

### Modification de l'Année de Démarrage

**Fichier:** `Analytics.js`
```javascript
const firstYear = 2024; // Modifier cette valeur
```

### Archivage des Anciennes Données

**Recommandation:**
- Conserver données ≥ 3 ans en base principale
- Archiver données > 3 ans dans collection séparée
- Politique de rétention documentée

**Script d'Archivage (Exemple):**
```javascript
// Exécuter annuellement
const archiveThreshold = new Date();
archiveThreshold.setFullYear(archiveThreshold.getFullYear() - 3);

db.absences.aggregate([
  { $match: { created_at: { $lt: archiveThreshold } } },
  { $out: "absences_archive" }
]);
```

---

## 🔍 Vérifications Recommandées

### Avant le 1er Janvier

**Checklist:**
- [ ] Vérifier que `new Date().getFullYear()` fonctionne correctement
- [ ] Tester sélecteurs d'année (affichage N+1)
- [ ] Valider requêtes API avec année future
- [ ] Sauvegarder données année N
- [ ] Documenter KPI de l'année écoulée

### Après le 1er Janvier

**Checklist:**
- [ ] Confirmer affichage année N (nouvelle)
- [ ] Vérifier accès données N-1 (historique)
- [ ] Tester création nouvelles absences
- [ ] Valider calculs KPI nouvelle année
- [ ] Exporter rapport annuel N-1

---

## 💡 Bonnes Pratiques

### 1. Stockage des Dates

**✅ Recommandé:**
```javascript
{
  date_debut: "2026-01-15",  // ISO format (YYYY-MM-DD)
  date_fin: "2026-01-20",
  created_at: ISODate("2026-01-15T08:30:00Z")
}
```

**❌ À Éviter:**
```javascript
{
  date_debut: "15/01/26",  // Format ambigu
  annee: 26,               // Année incomplète
  timestamp: 1736928600    // Unix timestamp sans timezone
}
```

### 2. Requêtes MongoDB

**✅ Performant:**
```javascript
// Index utilisé efficacement
db.absences.find({
  date_debut: { 
    $gte: "2026-01-01", 
    $lte: "2026-12-31" 
  }
})
```

**❌ Lent:**
```javascript
// Scan complet de la collection
db.absences.find().toArray().filter(a => a.year === 2026)
```

### 3. Interface Utilisateur

**Principes:**
- Année courante sélectionnée par défaut
- Indicateur visuel "(Actuelle)" sur année N
- Années futures accessibles pour planification
- Pas de limite sur historique (sauf archivage)

---

## 🚨 Points de Vigilance

### 1. Changement de Fuseau Horaire

**Problème Potentiel:**
```javascript
// Si serveur en UTC et utilisateur en GMT+1
new Date().getFullYear() // Peut différer le 31/12 à 23h
```

**Solution:**
```javascript
// Utiliser timezone locale explicite
const currentYear = new Date().toLocaleString('fr-FR', { year: 'numeric' });
```

### 2. Données Importées avec Anciennes Dates

**Scénario:** Import d'absences 2023 en 2026

**Solution:**
- Valider année dans plage acceptable
- Alerter si date < firstYear
- Permettre import historique contrôlé

### 3. Performance Requêtes Multi-Années

**Attention:**
```javascript
// Potentiellement lent si millions d'entrées
GET /api/absences/range?start=2024-01-01&end=2026-12-31
```

**Optimisation:**
- Pagination des résultats
- Agrégations côté serveur
- Cache pour périodes fréquemment consultées

---

## 📚 Références Techniques

### Fichiers Modifiés

1. **`/app/frontend/src/components/Analytics.js`**
   - Ligne 5-6: Détection année courante
   - Ligne 11-13: Filtrage période personnalisée
   - Ligne 15-22: Génération années disponibles
   - Ligne 228-245: Sélecteur dynamique
   - Ligne 267-298: UI période personnalisée

2. **`/app/frontend/src/components/MonthlyPlanningFinal.js`**
   - Déjà dynamique (pas de modifications nécessaires)

3. **`/app/backend/server.py`**
   - Endpoint `/api/absences/by-period/{year}/{month}` déjà flexible

### Dépendances JavaScript

```javascript
// Native JavaScript - Pas de bibliothèque externe
new Date().getFullYear()        // Année courante
new Date().getMonth()            // Mois (0-11)
new Date().toLocaleDateString()  // Format locale
```

---

## 🎓 Formation Utilisateurs

### Pour Administrateurs

**Message Clé:**
> "Le système s'adapte automatiquement au changement d'année. Aucune action requise le 1er janvier."

**Points à Communiquer:**
1. Sélecteur d'année toujours à jour
2. Données historiques conservées
3. Année future accessible pour planning
4. Période personnalisée pour analyses spécifiques

### Pour Utilisateurs

**Guide Rapide:**
1. **Vue par défaut:** Année courante, mois courant
2. **Consulter historique:** Changer année dans dropdown
3. **Période spécifique:** Activer "Période personnalisée"
4. **Export:** Sélectionner période puis exporter

---

## ✅ Conclusion

Le système de gestion temporelle de MOZAIK RH est conçu pour être:

- **Autonome:** Aucune intervention manuelle au changement d'année
- **Flexible:** Multi-niveaux de filtrage (année/mois/période)
- **Pérenne:** Conservation historique complète
- **Évolutif:** Anticipation années futures
- **Performant:** Requêtes optimisées avec index

**Prêt pour 2026 et au-delà !** 🚀

---

*Document créé le 12 Décembre 2025*
*Dernière mise à jour: Compatible jusqu'en 2030+*
