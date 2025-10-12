# Corrections Urgentes - MOZAIK RH

## 🚨 Problèmes Identifiés

### 1. Mon Espace - Modifications Non Sauvegardées
**Statut:** ❌ CRITIQUE
**Fichier:** `/app/frontend/src/components/EmployeeSpace.js`

**Problème:**
- Données **hardcodées** dans le composant
- Aucune fonction de sauvegarde (handleSave)
- Pas de chargement depuis l'API utilisateur
- Modifications dans UserManagement ne se reflètent pas

**Impact:**
- Utilisateurs ne peuvent pas modifier leurs informations
- Données affichées obsolètes/incorrectes
- Incohérence avec la gestion des utilisateurs

**Solution:**
- ✅ Charger les données utilisateur depuis `/api/users/{user_id}`
- ✅ Implémenter fonction de sauvegarde `PUT /api/users/{user_id}`
- ✅ Actualiser les données après modification
- ✅ Charger les vrais soldes (congés, heures sup, etc.)

---

### 2. Heures de Délégation - Seuils Incorrects CCN66
**Statut:** ❌ NON CONFORME
**Fichier:** `/app/frontend/src/components/DelegationHours.js`

**Problème:**
- Seuils affichés ne correspondent PAS à la CCN66
- Valeur par défaut : 18h/mois (INCORRECT)
- Pas de distinction selon l'effectif

**Règles CCN66 (Vérifiées):**
```
Effectif              Heures/mois titulaire
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
50 à 150 salariés     10 heures
151 à 500 salariés    15 heures
> 500 salariés        20 heures

Mutualisation: Max 1.5x le crédit titulaire
```

**Solution:**
- ✅ Corriger valeur par défaut : `monthlyHours: 10`
- ✅ Ajouter sélection effectif dans modal
- ✅ Calcul automatique selon effectif
- ✅ Validation mutualisation < 1.5x

---

### 3. Module Nouvelle Cession - Sélecteurs Non Fonctionnels
**Statut:** ❌ BLOQUANT
**Fichier:** `/app/frontend/src/components/DelegationHours.js`

**Problèmes:**
1. **Impossible de sélectionner un titulaire:**
   - Liste vide si aucun délégué actif
   - Filtre trop restrictif

2. **Impossible d'ajouter un destinataire:**
   - Pas de champ pour destinataire
   - Logique de cession incomplète

3. **Données de test présentes:**
   - Pollue le module
   - Demande de suppression

**Solution:**
- ✅ Corriger le chargement de la liste des délégués
- ✅ Ajouter champ destinataire dans le formulaire
- ✅ Endpoint pour supprimer les données de test
- ✅ Validation : destinataire ≠ titulaire

---

## 📋 Plan d'Action

### Phase 1 - IMMÉDIATE (Maintenant)
1. ✅ Nettoyer données de test délégation
2. ⏳ Corriger seuils CCN66 (10h par défaut)
3. ⏳ Corriger modal nouvelle cession
4. ⏳ Refaire module "Mon Espace" avec API

### Phase 2 - TESTS
5. Tester avec compte employé
6. Vérifier flux complet cession
7. Valider conformité CCN66

---

## 🔧 Détails Techniques

### Mon Espace - Structure API
```javascript
// GET /api/users/{user_id}
const response = await fetch(url, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const userData = await response.json();

// PUT /api/users/{user_id}
const response = await fetch(url, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(updatedData)
});
```

### Délégation - Seuils CCN66
```javascript
const delegationTypes = {
  'CSE': {
    name: 'CSE',
    defaultHours: {
      '50-150': 10,   // ✅ CCN66 conforme
      '151-500': 15,  // ✅ CCN66 conforme
      '500+': 20      // ✅ CCN66 conforme
    },
    maxMutualization: 1.5  // Max 1.5x crédit titulaire
  }
};
```

### Modal Cession - Champs Requis
```javascript
{
  fromDelegateId: '',      // Titulaire (cédant)
  toDelegateId: '',        // ← MANQUANT: Destinataire (bénéficiaire)
  hours: '',
  reason: '',
  date: ''
}
```

---

## ✅ Checklist Tests

- [ ] Mon Espace charge les vraies données utilisateur
- [ ] Modifications sauvegardées dans Mon Espace
- [ ] Seuils délégation conformes CCN66 (10h/15h/20h)
- [ ] Nouvelle cession : sélection titulaire OK
- [ ] Nouvelle cession : ajout destinataire OK
- [ ] Validation mutualisation < 1.5x
- [ ] Données de test supprimées

---

**Date création:** 12/10/2025
**Priorité:** CRITIQUE
