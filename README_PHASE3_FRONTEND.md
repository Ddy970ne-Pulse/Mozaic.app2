# 🎨 PHASE 3 : FRONTEND REACT - Système de Gestion des Soldes

## 📦 Composants Créés

Vous venez de recevoir **3 nouveaux fichiers React** pour intégrer la gestion des soldes de congés dans votre interface MOZAIK RH.

---

## 📁 Fichiers Fournis

### 1. **LeaveBalanceWidget.jsx** (Widget des Soldes)
🎯 **Fonction** : Affiche les soldes de congés de l'employé en temps réel

**Caractéristiques** :
- ✅ Affichage temps réel des soldes (CA, RTT, REC, etc.)
- ✅ Badge de réintégration automatique
- ✅ Barres de progression visuelles
- ✅ Actualisation automatique
- ✅ Mode compact pour dashboard
- ✅ Info légale Article L3141-5

**Props** :
```jsx
<LeaveBalanceWidget 
  employeeId="user-id-here"  // Required
  compact={false}            // Optional: mode mini pour dashboard
/>
```

---

### 2. **LeaveTransactionHistory.jsx** (Historique)
🎯 **Fonction** : Affiche l'historique complet des mouvements de congés

**Caractéristiques** :
- ✅ Historique des déductions, réintégrations, attributions
- ✅ Filtres par type de congé et année
- ✅ Affichage détaillé des changements de solde
- ✅ Icônes et couleurs par type d'opération
- ✅ Mode compact pour dashboard
- ✅ Actualisation automatique

**Props** :
```jsx
<LeaveTransactionHistory 
  employeeId="user-id-here"  // Required
  limit={20}                 // Optional: nombre max de transactions
  compact={false}            // Optional: mode mini
/>
```

---

### 3. **INTEGRATION_FRONTEND_GUIDE.js** (Guide d'Intégration)
📚 **Guide complet** avec toutes les instructions pour intégrer les composants dans `AbsenceRequests.jsx`

---

## 🚀 Installation Rapide (10 minutes)

### Étape 1 : Copier les Fichiers

```bash
# Placer les composants dans votre dossier src/components/
cp LeaveBalanceWidget.jsx /path/to/your/frontend/src/components/
cp LeaveTransactionHistory.jsx /path/to/your/frontend/src/components/
```

### Étape 2 : Installer les Dépendances

```bash
# Si vous n'avez pas encore lucide-react (pour les icônes)
npm install lucide-react
```

### Étape 3 : Importer dans AbsenceRequests.jsx

```jsx
// En haut de AbsenceRequests.jsx
import LeaveBalanceWidget from './LeaveBalanceWidget';
import LeaveTransactionHistory from './LeaveTransactionHistory';
import { AlertTriangle } from 'lucide-react';
```

### Étape 4 : Ajouter les Widgets dans la Page

```jsx
// Dans le return de AbsenceRequests, après le ModuleHeader
{isEmployee && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    <LeaveBalanceWidget employeeId={user.id} />
    <LeaveTransactionHistory employeeId={user.id} limit={10} />
  </div>
)}
```

### Étape 5 : Ajouter la Validation du Solde

Suivez les instructions détaillées dans **INTEGRATION_FRONTEND_GUIDE.js** pour :
- ✅ Vérifier le solde avant création d'absence
- ✅ Afficher les alertes de solde insuffisant
- ✅ Mettre à jour automatiquement après approbation

---

## 🎨 Aperçu Visuel

### Widget des Soldes
```
┌─────────────────────────────────────────┐
│ 💼 Mes Soldes de Congés                │
│ Année 2025 • Mis à jour 10:30          │
├─────────────────────────────────────────┤
│                                         │
│ 🏖️ Congés Annuels          19.0 jours  │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░                   │
│                                         │
│ ⚡ RTT                      12.0 jours  │
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░                   │
│                                         │
│ 🔄 Récupération             2.5 jours  │
│ ▓▓▓░░░░░░░░░░░░░░░░░░                   │
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ ✅ Réintégration automatique    │   │
│ │ 4 jour(s) réintégré(s) suite à │   │
│ │ arrêt maladie                   │   │
│ └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Historique des Transactions
```
┌─────────────────────────────────────────┐
│ 📜 Historique des Mouvements            │
│ 15 transaction(s) • Année 2025         │
├─────────────────────────────────────────┤
│                                         │
│ ⬆️ Réintégration - CA         +4j      │
│ 12/01/2025 10:30                       │
│ Interrompu par AM du 05/01 au 10/01    │
│ Solde: 15.0j → 19.0j                   │
│                                         │
│ ⬇️ Déduction - CA             -10j     │
│ 01/01/2025 09:00                       │
│ Pose CA été 2025                       │
│ Solde: 25.0j → 15.0j                   │
│                                         │
│ 🏆 Attribution - CA           +25j     │
│ 01/01/2025 00:00                       │
│ Attribution annuelle 2025              │
│ Solde: 0.0j → 25.0j                    │
└─────────────────────────────────────────┘
```

---

## ⚙️ Configuration

### Personnalisation des Couleurs

Dans `LeaveBalanceWidget.jsx`, modifiez `leaveTypeConfig` :

```jsx
const leaveTypeConfig = {
  CA: {
    name: 'Congés Annuels',
    icon: '🏖️',
    color: 'blue',
    gradient: 'from-blue-400 to-blue-600',
    // ... autres propriétés
  }
  // ... autres types
};
```

### Ajuster la Limite d'Historique

```jsx
<LeaveTransactionHistory 
  employeeId={user.id} 
  limit={50}  // ← Augmenter pour plus d'historique
/>
```

### Mode Compact pour Dashboard

```jsx
<LeaveBalanceWidget employeeId={user.id} compact={true} />
<LeaveTransactionHistory employeeId={user.id} limit={5} compact={true} />
```

---

## 🧪 Tests de Validation

### Test 1 : Affichage des Soldes
```
1. Se connecter en tant qu'employé
2. Naviguer vers "Mes Demandes d'Absence"
3. ✅ Le widget des soldes doit s'afficher avec les valeurs correctes
4. ✅ Les barres de progression doivent être proportionnelles
```

### Test 2 : Validation Solde Insuffisant
```
1. Cliquer sur "Nouvelle Demande"
2. Sélectionner type "CA" et 30 jours (alors que solde = 25j)
3. ✅ Alerte rouge doit s'afficher
4. ✅ Message : "Solde insuffisant : vous avez 25 jour(s)..."
5. ✅ Détails disponible/demandé/manquant affichés
```

### Test 3 : Mise à Jour Après Approbation
```
1. Créer une demande CA de 10 jours
2. Admin approuve la demande
3. ✅ Widget soldes se met à jour : 25 → 15 jours
4. ✅ Historique affiche nouvelle transaction "Déduction"
```

### Test 4 : Réintégration Automatique
```
1. Créer CA 10j (01/01 → 14/01)
2. Créer AM (05/01 → 10/01)
3. ✅ Widget affiche badge vert "4 jour(s) réintégré(s)"
4. ✅ Solde CA : 25 - 10 + 4 = 19 jours
5. ✅ Historique montre transaction "Réintégration"
```

### Test 5 : Filtres Historique
```
1. Cliquer sur icône Filtres dans l'historique
2. Sélectionner "RTT" et année "2024"
3. ✅ Seules les transactions RTT de 2024 s'affichent
```

---

## 🐛 Dépannage

### Problème : "Employee balance not found (404)"
**Cause** : Solde pas encore initialisé pour cet employé  
**Solution** : 
```bash
# Initialiser les soldes pour tous les employés
curl -X POST "http://localhost:8000/api/leave-balance/admin/initialize-balances" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"year": 2025, "ca_initial": 25.0, "rtt_initial": 12.0}'
```

### Problème : Widgets ne se rafraîchissent pas
**Cause** : Événements WebSocket pas émis  
**Solution** : Vérifier que `window.dispatchEvent(new CustomEvent('websocket-absence-change'))` est appelé après modifications

### Problème : "Cannot find module 'lucide-react'"
**Cause** : Dépendance manquante  
**Solution** : `npm install lucide-react`

### Problème : Styles Tailwind non appliqués
**Cause** : Tailwind pas configuré ou fichiers pas dans content  
**Solution** : Vérifier `tailwind.config.js` inclut `./src/components/**/*.{js,jsx}`

---

## 📊 Intégration Avancée

### Option 1 : Page Dédiée "Mes Soldes"

Créer une nouvelle route `/my-balances` :

```jsx
// MyBalances.jsx
import React from 'react';
import LeaveBalanceWidget from './components/LeaveBalanceWidget';
import LeaveTransactionHistory from './components/LeaveTransactionHistory';

const MyBalances = ({ user }) => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">💼 Mes Soldes de Congés</h1>
      
      <div className="grid grid-cols-1 gap-6">
        <LeaveBalanceWidget employeeId={user.id} />
        <LeaveTransactionHistory employeeId={user.id} limit={50} />
      </div>
    </div>
  );
};

export default MyBalances;
```

### Option 2 : Dashboard Widget Compact

Dans un dashboard, utiliser le mode compact :

```jsx
// Dashboard.jsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <LeaveBalanceWidget employeeId={user.id} compact={true} />
  <LeaveTransactionHistory employeeId={user.id} limit={3} compact={true} />
  {/* Autres widgets */}
</div>
```

### Option 3 : Modal de Soldes

Afficher les soldes dans un modal contextuel :

```jsx
{showBalancesModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl max-w-4xl w-full p-6">
      <LeaveBalanceWidget employeeId={selectedEmployee} />
      <button onClick={() => setShowBalancesModal(false)}>Fermer</button>
    </div>
  </div>
)}
```

---

## 🔗 Liens avec le Backend

Ces composants communiquent avec les endpoints suivants :

| Endpoint | Méthode | Usage |
|----------|---------|-------|
| `/api/leave-balance/{employee_id}` | GET | Récupérer soldes |
| `/api/leave-balance/transactions/{employee_id}` | GET | Récupérer historique |
| `/api/leave-balance/deduct` | POST | (Backend: décompte automatique) |
| `/api/leave-balance/reintegrate` | POST | (Backend: réintégration auto) |

**Important** : Les déductions et réintégrations sont gérées **automatiquement par le backend** lors de la création/approbation d'absences. Le frontend n'appelle que les endpoints GET.

---

## 📚 Documentation Complémentaire

- **Backend Phase 1 & 2** : Voir fichiers précédents
  - `leave_balance_models.py`
  - `leave_balance_routes.py`
  - `leave_reintegration_service.py`

- **Guide d'intégration détaillé** : `INTEGRATION_FRONTEND_GUIDE.js`

- **Architecture complète** : `ARCHITECTURE.md`

---

## ✅ Checklist d'Intégration

- [ ] Copier `LeaveBalanceWidget.jsx` dans `src/components/`
- [ ] Copier `LeaveTransactionHistory.jsx` dans `src/components/`
- [ ] Installer `lucide-react` : `npm install lucide-react`
- [ ] Importer les composants dans `AbsenceRequests.jsx`
- [ ] Ajouter les widgets dans la page (après header)
- [ ] Ajouter state `employeeBalances` et `validationError`
- [ ] Créer fonction `checkLeaveBalance()`
- [ ] Modifier `handleSubmitRequest()` pour valider le solde
- [ ] Ajouter bloc d'alerte de validation dans le formulaire
- [ ] Tester avec solde suffisant ✅
- [ ] Tester avec solde insuffisant ❌
- [ ] Tester réintégration après AM 🔄
- [ ] Vérifier actualisation automatique 🔄
- [ ] Documenter pour l'équipe 📚

---

## 🎉 Résultat Final

Une fois intégré, vos employés auront :

✅ **Vue temps réel de leurs soldes**  
✅ **Historique complet et transparent**  
✅ **Validation automatique avant création de demande**  
✅ **Badge de réintégration visible**  
✅ **Conformité légale garantie**  

---

## 📞 Support

Pour toute question sur l'intégration :
1. Consulter `INTEGRATION_FRONTEND_GUIDE.js`
2. Vérifier la section Dépannage ci-dessus
3. Examiner les logs console du navigateur

**Date de création** : 30 Octobre 2025  
**Version** : 1.0.0 - Phase 3 Frontend  
**Auteur** : Claude (Anthropic) pour MOZAIK RH
