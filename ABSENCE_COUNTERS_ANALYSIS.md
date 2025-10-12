# 🚨 ANALYSE CRITIQUE : Gestion des Compteurs lors d'Interruption d'Absence

## Problème Identifié

### Cas Concret
```
Employé : Jean Dupont
Action 1 : Pose 10 jours de CA du 01/01 au 14/01 (hors week-ends)
           → Solde CA : 25 - 10 = 15 jours restants

Action 2 : Arrêt maladie du 05/01 au 10/01 (6 jours calendaires = 4 jours ouvrables)
           → Planning affiche correctement AM au lieu de CA

❌ PROBLÈME : Que devient le solde de CA ?
```

### Comportement Attendu selon la Loi

**Article L3141-5 du Code du Travail** :
> "La maladie survenant pendant les congés payés suspend l'exécution du contrat de travail. 
> Les jours de congés non pris du fait de la maladie doivent être réintégrés au compteur."

**Résultat attendu** :
```
Solde initial CA    : 25 jours
CA posés           : 10 jours (01/01-14/01)
AM du 05/01-10/01  : Interrompt 4 jours ouvrables de CA

Solde CA après     : 25 - 10 + 4 = 19 jours
                     └── posés  └── réintégrés

CA réellement pris : 6 jours (01-04/01 + 11-14/01)
AM comptabilisés   : 6 jours calendaires
```

---

## État Actuel de l'Application

### ✅ Ce qui fonctionne
1. **Affichage Planning** : AM remplace CA visuellement ✅
2. **Priorités** : Logique de remplacement correcte ✅
3. **Console logs** : Trace des remplacements ✅

### ❌ Ce qui manque (CRITIQUE)

#### 1. Pas de Système de Compteurs Persistant
```javascript
// Actuellement inexistant dans le backend
{
  employee_id: "uuid",
  solde_ca: 25,        // ❌ N'existe pas
  solde_rtt: 12,       // ❌ N'existe pas
  solde_rec: 8,        // ❌ N'existe pas
  historique: []       // ❌ N'existe pas
}
```

#### 2. Pas de Réintégration Automatique
Quand AM remplace CA :
- ❌ Les jours de CA ne sont PAS réintégrés au solde
- ❌ Le salarié perd définitivement ces jours
- ❌ Aucune trace de la réintégration

#### 3. Pas de Notification
- ❌ Pas d'alerte au salarié sur les jours réintégrés
- ❌ Pas d'email de confirmation
- ❌ Pas d'historique visible

#### 4. Pas de Validation à la Pose
- ❌ On ne vérifie pas si le salarié a assez de jours disponibles
- ❌ On peut poser plus de CA que disponible

---

## Répercussions pour le Salarié

### Scénario 1 : SANS Réintégration (Situation actuelle) ❌

```
Janvier :
- Pose 10 jours CA (solde : 25 → 15)
- AM interrompt 4 jours CA
- Solde reste à 15 ← PROBLÈME : perte de 4 jours !

Impact sur l'année :
- Salarié perd définitivement 4 jours de congés
- Non-conformité légale
- Risque contentieux prud'homal
```

### Scénario 2 : AVEC Réintégration (Conforme) ✅

```
Janvier :
- Pose 10 jours CA (solde : 25 → 15)
- AM interrompt 4 jours CA
- Réintégration automatique (solde : 15 → 19) ✅
- Notification au salarié : "4 jours de CA réintégrés suite à arrêt maladie"

Impact sur l'année :
- Salarié conserve tous ses droits
- Conformité légale
- Transparence totale
```

---

## Impact Multi-Types d'Absence

### Types Concernés par la Réintégration

**Doivent être réintégrés quand interrompus** :
- ✅ CA (Congés Annuels)
- ✅ CP (Congés Payés)
- ✅ CT (Congés Trimestriels)
- ✅ RTT
- ✅ REC (Récupération)
- ✅ CEX (Congé exceptionnel)

**Ne sont PAS réintégrés** (absences non décomptées) :
- ⏸️ TEL (Télétravail) - pas de compteur
- ⏸️ DEL (Délégation) - compteur horaire séparé
- ⏸️ FO (Formation) - obligation employeur

---

## Solution Requise

### Architecture Complète

#### 1. Backend - Modèle de Données

```python
# Nouveau modèle dans server.py
class EmployeeLeaveBalance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    year: int
    
    # Soldes par type
    ca_initial: float = 25.0      # Congés annuels (ex: 25 jours/an)
    ca_taken: float = 0.0          # CA consommés
    ca_reintegrated: float = 0.0   # CA réintégrés après interruption
    ca_balance: float = 25.0       # Solde disponible
    
    rtt_initial: float = 12.0      # RTT (ex: 12 jours/an)
    rtt_taken: float = 0.0
    rtt_reintegrated: float = 0.0
    rtt_balance: float = 12.0
    
    rec_balance: float = 0.0       # Récupération (accumulation variable)
    
    ct_balance: float = 0.0        # Congés trimestriels
    
    # Historique
    last_updated: datetime
    
class LeaveTransaction(BaseModel):
    """Historique des mouvements de compteurs"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    transaction_date: datetime
    leave_type: str                # CA, RTT, REC, etc.
    
    operation: str                 # "deduct" (pose), "reintegrate" (réintégration), "grant" (attribution)
    amount: float                  # Nombre de jours
    
    reason: str                    # Ex: "Maladie du 05/01 au 10/01"
    related_absence_id: Optional[str] = None
    
    balance_before: float
    balance_after: float
```

#### 2. Backend - API Endpoints

```python
@api_router.get("/leave-balance/{employee_id}")
async def get_leave_balance(employee_id: str):
    """Récupère les soldes actuels d'un employé"""
    pass

@api_router.post("/leave-balance/deduct")
async def deduct_leave(employee_id: str, leave_type: str, days: float):
    """Décompte des jours lors de la pose d'absence"""
    # Vérifie le solde disponible
    # Déduit les jours
    # Crée une transaction
    pass

@api_router.post("/leave-balance/reintegrate")
async def reintegrate_leave(employee_id: str, leave_type: str, days: float, reason: str):
    """Réintègre des jours suite à interruption"""
    # Ajoute les jours au solde
    # Crée une transaction avec raison
    # Envoie notification
    pass

@api_router.get("/leave-transactions/{employee_id}")
async def get_leave_history(employee_id: str):
    """Récupère l'historique des mouvements"""
    pass
```

#### 3. Frontend - Logique de Réintégration

```javascript
// Dans MonthlyPlanningFinal.js
const handleAbsenceReplacement = async (employee, day, oldType, newType) => {
  // 1. Déterminer si oldType doit être réintégré
  const shouldReintegrate = ['CA', 'CP', 'CT', 'RTT', 'REC', 'CEX'].includes(oldType);
  
  if (shouldReintegrate) {
    // 2. Calculer le nombre de jours à réintégrer
    const daysToReintegrate = 1; // ou calcul plus complexe
    
    // 3. Appeler API de réintégration
    await fetch(`${API_URL}/api/leave-balance/reintegrate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        employee_id: employee.id,
        leave_type: oldType,
        days: daysToReintegrate,
        reason: `Interrompu par ${newType} le ${day}`
      })
    });
    
    // 4. Afficher notification
    showNotification({
      type: 'info',
      message: `${employee.name} : ${daysToReintegrate} jour(s) de ${oldType} réintégré(s)`
    });
  }
};
```

#### 4. Frontend - Affichage des Soldes

```javascript
// Nouveau composant LeaveBalanceWidget.js
const LeaveBalanceWidget = ({ employee }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-bold mb-3">Soldes de Congés</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Congés Annuels (CA)</span>
          <span className="font-bold">{employee.ca_balance} jours</span>
        </div>
        <div className="flex justify-between">
          <span>RTT</span>
          <span className="font-bold">{employee.rtt_balance} jours</span>
        </div>
        <div className="flex justify-between">
          <span>Récupération</span>
          <span className="font-bold">{employee.rec_balance} jours</span>
        </div>
      </div>
      
      {employee.ca_reintegrated > 0 && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-800">
            ✅ {employee.ca_reintegrated} jour(s) réintégré(s) cette année
          </p>
        </div>
      )}
    </div>
  );
};
```

#### 5. Notifications

```javascript
// Service de notification
const notifyLeaveReintegration = async (employee, details) => {
  // Email au salarié
  await sendEmail({
    to: employee.email,
    subject: 'Réintégration de jours de congés',
    template: 'leave_reintegration',
    data: {
      employee_name: employee.name,
      leave_type: details.leave_type,
      days_reintegrated: details.days,
      reason: details.reason,
      new_balance: details.new_balance
    }
  });
  
  // Notification dans l'app
  await createNotification({
    user_id: employee.id,
    type: 'leave_reintegration',
    message: `${details.days} jour(s) de ${details.leave_type} réintégré(s)`,
    read: false
  });
};
```

---

## Workflow Complet

### Cas : Arrêt Maladie pendant Congés

```
1. Import Excel : CA du 01/01 au 14/01 (10 jours)
   └─> API : POST /leave-balance/deduct
       └─> Solde CA : 25 → 15 jours
       └─> Transaction créée : "Pose CA 01-14/01 : -10j"

2. Import Excel : AM du 05/01 au 10/01 (6 jours)
   └─> Planning : Détecte remplacement de 4 jours ouvrables de CA
       └─> API : POST /leave-balance/reintegrate
           └─> Solde CA : 15 → 19 jours
           └─> Transaction créée : "Réintégration CA suite AM 05-10/01 : +4j"
       └─> Notification : Email + notification in-app
       └─> Log : "⚠️ Jean Dupont : 4 jours CA réintégrés suite à maladie"

3. Affichage Mon Espace :
   └─> Widget Soldes : "CA : 19 jours disponibles"
   └─> Badge : "✅ 4 jour(s) réintégré(s) cette année"
   └─> Historique : Liste des transactions
```

---

## Priorité d'Implémentation

### Phase 1 : Backend (CRITIQUE)
1. Créer modèles `EmployeeLeaveBalance` et `LeaveTransaction`
2. Créer endpoints API
3. Migration données : initialiser soldes pour tous les employés

### Phase 2 : Logique de Réintégration
4. Détecter les remplacements dans planning
5. Appeler API de réintégration automatiquement
6. Logger les opérations

### Phase 3 : Frontend Affichage
7. Widget soldes dans Mon Espace
8. Historique des transactions
9. Badges de réintégration

### Phase 4 : Notifications
10. Emails automatiques
11. Notifications in-app
12. Alertes managers

---

## Estimation Temps

- **Phase 1** : 2-3h (backend + API)
- **Phase 2** : 1-2h (logique réintégration)
- **Phase 3** : 2h (frontend affichage)
- **Phase 4** : 1h (notifications)

**TOTAL** : 6-8h de développement

---

## Risques si Non Implémenté

### Risques Légaux
- ⚖️ Non-conformité Code du Travail
- ⚖️ Contentieux prud'homaux
- ⚖️ Amendes inspection du travail

### Risques Opérationnels
- 📉 Perte de confiance des salariés
- 📉 Erreurs de comptabilité RH
- 📉 Litiges internes

### Risques Financiers
- 💰 Indemnisation des jours perdus
- 💰 Frais contentieux
- 💰 Corrections manuelles chronophages

---

## Recommandation

🚨 **CRITIQUE** : Cette fonctionnalité est OBLIGATOIRE pour la conformité légale.

**Plan d'action** :
1. ✅ Tester d'abord les priorités visuelles (Option A)
2. ⚠️ Implémenter ENSUITE le système de compteurs (PRIORITAIRE)
3. ✅ Puis continuer avec B, C, D

---

## Date
Date : 2025-01-12
Statut : ANALYSE COMPLÉTÉE - Implémentation requise
Priorité : CRITIQUE
