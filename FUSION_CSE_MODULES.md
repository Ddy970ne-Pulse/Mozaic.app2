# Fusion Modules CSE - Analyse et Plan

## 🔍 Problèmes Identifiés

### 1. Redondance des Modules
- ⚖️ **DelegationHours.js** (2287 lignes) - Gestion heures délégation
- 🏛️ **CSEManagement.js** - Gestion CSE complète

**Résultat:** Duplication fonctionnelle, confusion utilisateur

---

### 2. Titulaires Non Automatiques
**Problème:** Les utilisateurs avec `statut_cse = "Titulaire"` dans UserManagement n'apparaissent pas automatiquement dans les modules CSE

**Solution:** Chargement dynamique depuis `GET /api/users?statut_cse=Titulaire`

---

### 3. Règles Légales Cession (Vérifiées)

**Code du travail L.2315-9 + CCN66:**

```
┌─────────────────────────────────────────────────────┐
│ QUI PEUT CÉDER ?                                    │
├─────────────────────────────────────────────────────┤
│ ✅ TITULAIRE UNIQUEMENT                             │
│    - Seul détenteur du crédit d'heures             │
│    - Peut céder tout ou partie                      │
│                                                     │
│ ❌ SUPPLÉANT NE PEUT PAS CÉDER                      │
│    - Sauf si remplace temporairement titulaire     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ À QUI CÉDER ?                                       │
├─────────────────────────────────────────────────────┤
│ ✅ Autres TITULAIRES                                │
│ ✅ SUPPLÉANTS                                       │
│ ✅ Sans limitation de collège                       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ LIMITES                                             │
├─────────────────────────────────────────────────────┤
│ 📏 Max 1.5x le crédit mensuel d'un titulaire       │
│    Exemple: Crédit titulaire = 12h                 │
│             → Max bénéficiaire = 18h                │
│                                                     │
│ 📝 Formalisation OBLIGATOIRE                        │
│    - Écrite                                         │
│    - Employeur informé 8 jours avant               │
│    - Préciser: cédant, bénéficiaire, nb heures     │
└─────────────────────────────────────────────────────┘
```

---

## 📋 Plan de Fusion

### Objectif
Fusionner DelegationHours → CSEManagement pour créer un module CSE complet et cohérent

### Architecture Cible

```
🏛️ GESTION CSE (Module Unique)
├── 👥 Membres CSE
│   ├── Liste Titulaires (chargés depuis users)
│   ├── Liste Suppléants (chargés depuis users)
│   └── Ajout/Modification (sync avec UserManagement)
│
├── ⚖️ Heures de Délégation
│   ├── Crédits mensuels par titulaire
│   ├── Soldes actuels
│   └── Historique utilisation
│
├── 🔄 Cessions d'Heures
│   ├── Nouvelle cession (Titulaire → Titulaire/Suppléant)
│   ├── Validation limite 1.5x
│   ├── Historique cessions
│   └── Export formalisation
│
└── 📊 Rapports & Statistiques
    ├── Utilisation globale
    ├── Cessions par période
    └── Soldes par membre
```

---

## 🔧 Modifications Requises

### 1. Chargement Dynamique Membres CSE

**Endpoint:** `GET /api/users`

**Filtre côté frontend:**
```javascript
const cseMembers = users.filter(u => 
  u.statut_cse === 'Titulaire' || u.statut_cse === 'Suppléant'
);

const titulaires = cseMembers.filter(m => m.statut_cse === 'Titulaire');
const suppleants = cseMembers.filter(m => m.statut_cse === 'Suppléant');
```

**Avantage:** Synchronisation automatique avec UserManagement

---

### 2. Formulaire Cession Amélioré

**Avant (Non conforme):**
```
Cédant: [Tous les membres ▼]  ❌ Incorrect
```

**Après (Conforme):**
```
┌────────────────────────────────────────┐
│ 🔄 Nouvelle Cession d'Heures          │
├────────────────────────────────────────┤
│                                        │
│ Cédant (Titulaire uniquement)*        │
│ [Jean DUPONT (Titulaire) ▼]           │
│                                        │
│ Bénéficiaire*                          │
│ [Sophie MARTIN (Suppléant) ▼]         │
│   ├─ Titulaire 1                      │
│   ├─ Titulaire 2                      │
│   ├─ Suppléant 1                      │
│   └─ Suppléant 2                      │
│                                        │
│ Nombre d'heures*                       │
│ [5]                                    │
│ ⚠️ Max: 18h (1.5x 12h crédit)         │
│                                        │
│ Date d'utilisation*                    │
│ [2025-12-15]                           │
│ ℹ️ Employeur informé 8j avant         │
│                                        │
│ Motif                                  │
│ [Réunion importante...]                │
│                                        │
│     [Annuler]  [📤 Soumettre]         │
└────────────────────────────────────────┘
```

**Validation:**
```javascript
// Vérifier que cédant est titulaire
if (cedant.statut_cse !== 'Titulaire') {
  error('Seuls les titulaires peuvent céder des heures');
}

// Vérifier limite 1.5x
const currentBalance = getBeneficiaireBalance(beneficiaire);
const creditTitulaire = 12; // ou dynamique
const maxAllowed = creditTitulaire * 1.5;

if (currentBalance + hours > maxAllowed) {
  error(`Dépassement limite: max ${maxAllowed}h (1.5x ${creditTitulaire}h)`);
}

// Vérifier délai 8 jours
const today = new Date();
const useDate = new Date(usageDate);
const daysDiff = (useDate - today) / (1000 * 60 * 60 * 24);

if (daysDiff < 8) {
  warning('Employeur doit être informé au moins 8 jours avant');
}
```

---

### 3. Suppression Module Redondant

**Fichiers à modifier:**
- ❌ Supprimer entrée `delegation-hours` du menu
- ✅ Garder uniquement `cse-management`
- ✅ Rediriger anciennes routes vers CSE

**Layout.js:**
```javascript
// AVANT
{ id: 'delegation-hours', name: 'Heures de Délégation', ... }
{ id: 'cse-management', name: 'Gestion CSE', ... }

// APRÈS
{ id: 'cse-management', name: 'Gestion CSE & Délégation', ... }
```

---

## ✅ Checklist Implémentation

- [ ] Créer CSEManagementNew.js fusionné
- [ ] Charger membres depuis `users.statut_cse`
- [ ] Formulaire cession conforme (Titulaire → Tous)
- [ ] Validation limite 1.5x
- [ ] Validation délai 8 jours
- [ ] Historique cessions
- [ ] Export formalisation (PDF/CSV)
- [ ] Supprimer DelegationHours du menu
- [ ] Tester avec données réelles
- [ ] Documentation utilisateur

---

## 📊 Exemple de Données

**Collection `users`:**
```json
{
  "id": "uuid-1",
  "name": "Jean DUPONT",
  "statut_cse": "Titulaire",
  "delegation_hours_monthly": 12
}
```

**Collection `cse_hour_transfers`:**
```json
{
  "id": "uuid-transfer-1",
  "from_id": "uuid-1",
  "from_name": "Jean DUPONT (Titulaire)",
  "to_id": "uuid-2",
  "to_name": "Sophie MARTIN (Suppléant)",
  "hours": 5,
  "usage_date": "2025-12-15",
  "reason": "Réunion extraordinaire",
  "created_at": "2025-12-01",
  "notification_sent": true
}
```

---

## 🎯 Bénéfices de la Fusion

1. **Cohérence** - Un seul module pour tout le CSE
2. **Conformité** - Respect strict Code du travail + CCN66
3. **Automatisation** - Sync avec UserManagement
4. **Simplicité** - Moins de confusion utilisateur
5. **Maintenance** - Code centralisé et maintenable

---

**Date:** 12/10/2025
**Statut:** Planifié - En attente validation
