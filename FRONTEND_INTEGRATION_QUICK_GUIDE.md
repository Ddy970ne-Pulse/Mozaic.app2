# 🎨 INTÉGRATION FRONTEND - Guide Rapide

## ✅ Fichiers Installés

**Composants React** (dans `/app/frontend/src/components/`):
- ✅ `LeaveBalanceWidget.jsx` (13 KB) - Widget affichage soldes
- ✅ `LeaveTransactionHistory.jsx` (14 KB) - Historique transactions

**Dépendances**:
- ✅ `lucide-react` (déjà installé)

---

## 🚀 Intégration dans AbsenceRequests.js

### Option 1 : Intégration Minimale (5 min)

Ajoutez simplement les imports et widgets dans `AbsenceRequests.js` :

```javascript
// En haut du fichier, avec les autres imports
import LeaveBalanceWidget from './LeaveBalanceWidget';
import LeaveTransactionHistory from './LeaveTransactionHistory';

// Dans le JSX, après la section des demandes
const AbsenceRequests = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Mes Demandes d'Absence</h1>
      
      {/* NOUVEAU : Widget soldes */}
      <div className="mb-6">
        <LeaveBalanceWidget employeeId={user.id} />
      </div>
      
      {/* Reste du code existant... */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* ... */}
      </div>
      
      {/* NOUVEAU : Historique en bas */}
      <div className="mt-8">
        <LeaveTransactionHistory employeeId={user.id} />
      </div>
    </div>
  );
};
```

### Option 2 : Intégration Avancée avec Validation (15 min)

Ajoutez la validation de solde avant création d'absence :

```javascript
import { useState, useEffect } from 'react';
import LeaveBalanceWidget from './LeaveBalanceWidget';

const AbsenceRequests = () => {
  const [balances, setBalances] = useState(null);
  const [showInsufficientBalanceAlert, setShowInsufficientBalanceAlert] = useState(false);
  
  // Charger les soldes
  useEffect(() => {
    const loadBalances = async () => {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/leave-balance/${user.id}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        setBalances(await response.json());
      }
    };
    
    loadBalances();
  }, []);
  
  // Fonction de validation avant création
  const validateBalance = (absenceType, days) => {
    if (!balances) return true; // Si pas de solde chargé, on laisse passer
    
    const typeMap = {
      'CA': 'ca_balance',
      'RTT': 'rtt_balance',
      'REC': 'rec_balance',
      'CT': 'ct_balance',
      'CP': 'cp_balance',
      'CEX': 'cex_balance'
    };
    
    const balanceKey = typeMap[absenceType];
    if (!balanceKey) return true; // Type non géré
    
    const available = balances[balanceKey] || 0;
    
    if (days > available) {
      setShowInsufficientBalanceAlert(true);
      return false;
    }
    
    return true;
  };
  
  // Dans le formulaire de création
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const absenceType = formData.motif_absence;
    const days = parseFloat(formData.jours_absence);
    
    // Valider le solde avant soumission
    if (!validateBalance(absenceType, days)) {
      alert(`⚠️ Solde insuffisant!\n\nVous avez ${balances[typeMap[absenceType]]} jour(s) disponible(s) mais vous demandez ${days} jour(s).`);
      return;
    }
    
    // Suite du code de création d'absence...
  };
  
  return (
    <div className="p-6">
      {/* Widget soldes */}
      <LeaveBalanceWidget employeeId={user.id} />
      
      {/* Alerte solde insuffisant */}
      {showInsufficientBalanceAlert && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Solde insuffisant pour cette demande d'absence.
                Veuillez ajuster votre demande ou contacter les RH.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Reste du code... */}
    </div>
  );
};
```

---

## 📋 Checklist d'Intégration

### Étape 1 : Vérification (1 min)
- [x] Composants copiés dans `src/components/`
- [x] `lucide-react` installé (déjà fait)

### Étape 2 : Intégration Minimale (5 min)
- [ ] Importer `LeaveBalanceWidget` dans `AbsenceRequests.js`
- [ ] Importer `LeaveTransactionHistory` dans `AbsenceRequests.js`
- [ ] Ajouter `<LeaveBalanceWidget />` dans le JSX
- [ ] Ajouter `<LeaveTransactionHistory />` dans le JSX
- [ ] Tester l'affichage

### Étape 3 : Validation Soldes (10 min - Optionnel)
- [ ] Ajouter `loadBalances()` dans `useEffect`
- [ ] Créer fonction `validateBalance()`
- [ ] Appeler validation dans `handleSubmit()`
- [ ] Ajouter alerte visuelle solde insuffisant

### Étape 4 : Tests (5 min)
- [ ] Test affichage widget avec soldes
- [ ] Test historique transactions
- [ ] Test validation solde insuffisant
- [ ] Test actualisation après création absence

---

## 🎨 Emplacements Suggérés

### Dans AbsenceRequests.js (Espace Employé)
```
┌─────────────────────────────────────────┐
│ 📝 Mes Demandes d'Absence              │
├─────────────────────────────────────────┤
│                                         │
│ [LeaveBalanceWidget - Mes Soldes]      │  ← Widget soldes en haut
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Créer une Nouvelle Demande          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Demandes en Attente (3)                │
│ Demandes Approuvées (12)               │
│                                         │
│ [LeaveTransactionHistory]              │  ← Historique en bas
└─────────────────────────────────────────┘
```

### Dans MonthlyPlanningFinal.js (Vue Planning)
```
┌─────────────────────────────────────────┐
│ 📅 Planning Mensuel Janvier 2025       │
├─────────────────────────────────────────┤
│                                         │
│ [LeaveBalanceWidget compact=true]      │  ← Version compacte en sidebar
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │     Calendrier du mois              │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Dans Dashboard.js (Admin)
```
┌─────────────────────────────────────────┐
│ 📊 Tableau de Bord RH                   │
├─────────────────────────────────────────┤
│                                         │
│ Vue Globale Entreprise                  │
│ Total CA disponible : 450j              │
│ Total RTT disponible : 180j             │
│                                         │
│ [Possibilité d'ajouter stats agrégées] │
└─────────────────────────────────────────┘
```

---

## 🔧 Personnalisation

### Mode Compact
```jsx
<LeaveBalanceWidget employeeId={user.id} compact={true} />
```

### Actualisation Manuelle
```jsx
const widgetRef = useRef();

// Forcer le rechargement
widgetRef.current?.reload();
```

### Événements Personnalisés
```jsx
// Écouter les changements de solde
window.addEventListener('leaveBalanceChanged', (e) => {
  console.log('Solde mis à jour:', e.detail);
});
```

---

## 🎯 Prochaines Étapes

1. **Immédiat** : Intégrer dans `AbsenceRequests.js`
2. **Court terme** : Ajouter validation avant création
3. **Moyen terme** : Intégrer dans planning mensuel
4. **Long terme** : Dashboard admin avec stats globales

---

## 📚 Documentation Complète

- **Installation** : `/app/README_PHASE3_FRONTEND.md`
- **Guide détaillé** : `/app/INTEGRATION_FRONTEND_GUIDE.js`
- **Architecture** : `/app/ARCHITECTURE.md`

---

## ✅ Résumé

**Temps d'intégration** : 5-15 minutes  
**Difficulté** : Facile  
**Impact visuel** : Élevé  
**Conformité légale** : Article L3141-5 ✅

**Les widgets sont prêts à l'emploi !** 🚀
