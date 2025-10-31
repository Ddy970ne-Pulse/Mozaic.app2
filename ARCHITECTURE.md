# 🏗️ ARCHITECTURE & WORKFLOW - Système de Réintégration des Congés

## 📐 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                      MOZAIK RH - Leave Balance                  │
│                  Système de Gestion des Congés                  │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│   MongoDB    │
│   (React)    │◀────│   (FastAPI)  │◀────│              │
└──────────────┘     └──────────────┘     └──────────────┘
     │                     │                     │
     │                     │                     │
     ▼                     ▼                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Widgets     │     │  API Routes  │     │  Collections │
│  - Soldes    │     │  - GET /api/ │     │  - balances  │
│  - Historique│     │  - POST /api/│     │  - transactions│
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 🔄 Workflow de Réintégration

### Scénario : Arrêt Maladie pendant Congés Annuels

```
ÉTAPE 1 : POSE DE CONGÉS
─────────────────────────
Employé                     Backend                     MongoDB
   │                          │                            │
   │──[Pose 10j CA]────────▶ │                            │
   │                          │──[Décompte CA]──────────▶ │
   │                          │                            │─[ca_balance: 25→15]
   │                          │◀─[Solde MAJ]──────────────│
   │◀──[Confirmation]─────────│                            │

Résultat : CA = 15 jours restants ✅


ÉTAPE 2 : ARRÊT MALADIE (Interruption)
───────────────────────────────────────
Employé                     Backend                     MongoDB
   │                          │                            │
   │──[Arrêt maladie]──────▶ │                            │
   │   [05/01→10/01]          │                            │
   │                          │                            │
   │                      ┌───┴───┐                        │
   │                      │ 🔍 DÉTECTION                   │
   │                      │ Chevauchement                  │
   │                      │ CA + AM                        │
   │                      └───┬───┘                        │
   │                          │                            │
   │                      ┌───┴───┐                        │
   │                      │ 📊 CALCUL                      │
   │                      │ 4 jours ouvrables              │
   │                      │ à réintégrer                   │
   │                      └───┬───┘                        │
   │                          │                            │
   │                          │──[Réintégration]────────▶ │
   │                          │   [+4j CA]                 │─[ca_balance: 15→19]
   │                          │                            │─[ca_reintegrated: 0→4]
   │                          │                            │─[Transaction créée]
   │                          │◀─[Succès]─────────────────│
   │                          │                            │
   │                          │──[Email]────────────────▶ │
   │◀──[Notification]─────────│   "4j réintégrés"         │

Résultat : CA = 19 jours (15 + 4 réintégrés) ✅
```

---

## 🗂️ Structure des Données MongoDB

### Collection : `leave_balances`

```javascript
{
  "_id": "507f1f77bcf86cd799439011",
  "employee_id": "507f1f77bcf86cd799439012",
  "year": 2025,
  
  // Congés Annuels
  "ca_initial": 25.0,           // ← Attribution annuelle
  "ca_taken": 10.0,             // ← Jours consommés
  "ca_reintegrated": 4.0,       // ← Jours réintégrés (AM)
  "ca_balance": 19.0,           // ← Disponible = 25 - 10 + 4
  
  // RTT
  "rtt_initial": 12.0,
  "rtt_taken": 0.0,
  "rtt_reintegrated": 0.0,
  "rtt_balance": 12.0,
  
  // Autres types...
  "rec_balance": 0.0,
  "ct_balance": 0.0,
  
  "last_updated": ISODate("2025-01-12T10:30:00Z")
}
```

### Collection : `leave_transactions`

```javascript
{
  "_id": "507f1f77bcf86cd799439013",
  "employee_id": "507f1f77bcf86cd799439012",
  "transaction_date": ISODate("2025-01-12T10:30:00Z"),
  
  "leave_type": "CA",
  "operation": "reintegrate",        // deduct | reintegrate | grant | correction
  
  "amount": 4.0,                     // Nombre de jours
  "balance_before": 15.0,            // Avant l'opération
  "balance_after": 19.0,             // Après l'opération
  
  "reason": "Réintégration suite à arrêt maladie du 05/01 au 10/01",
  
  "related_absence_id": "507f...",   // ID de l'absence CA interrompue
  "interrupting_absence_id": "507f...", // ID de l'absence AM
  
  "is_automatic": true               // Réintégration automatique
}
```

---

## 🎯 Logique de Priorités

```
┌────────────────────────────────────────────────────────┐
│              RÈGLES DE REMPLACEMENT                    │
└────────────────────────────────────────────────────────┘

Priorité 1 (Remplace tout)          Priorité 3 (Remplaçable)
┌──────────────────┐                ┌──────────────────┐
│  AM  (Maladie)   │────remplace────│  CA  (Congés)    │
│  MA  (Maladie)   │       ▶        │  CP  (Congés)    │
│  AT  (Accident)  │                │  RTT             │
│  MP  (Maladie Pro)│               │  REC (Récup)     │
└──────────────────┘                └──────────────────┘

Priorité 2 (Intermédiaire)          Priorité 4 (Jamais remplacé)
┌──────────────────┐                ┌──────────────────┐
│  PAT (Paternité) │                │  TEL (Télétravail)│
│  MAT (Maternité) │                │  DEL (Délégation) │
│  CF  (Formation) │                │  FO  (Formation)  │
└──────────────────┘                └──────────────────┘

Règle : new_priority < existing_priority ⇒ REMPLACEMENT
```

---

## 📊 Endpoints API

```
┌─────────────────────────────────────────────────────────────┐
│                     API ENDPOINTS                           │
└─────────────────────────────────────────────────────────────┘

┌─── SOLDES ────────────────────────────────────────────────┐
│                                                            │
│  GET  /api/leave-balance/{employee_id}                    │
│  ├─ Paramètres : year (optionnel)                         │
│  └─ Retourne : { balances: { CA: 19.0, RTT: 12.0, ... } } │
│                                                            │
│  POST /api/leave-balance/deduct                           │
│  ├─ Body : { employee_id, leave_type, days, absence_id } │
│  └─ Action : Décompte jours lors de pose                  │
│                                                            │
│  POST /api/leave-balance/reintegrate                      │
│  ├─ Body : { employee_id, leave_type, days, reason }     │
│  └─ Action : Réintègre jours (interruption)               │
│                                                            │
│  POST /api/leave-balance/grant                            │
│  ├─ Body : { employee_id, leave_type, days, reason }     │
│  └─ Action : Attribue jours (ajustement)                  │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─── HISTORIQUE ────────────────────────────────────────────┐
│                                                            │
│  GET  /api/leave-balance/transactions/{employee_id}       │
│  ├─ Paramètres : year, leave_type, limit                  │
│  └─ Retourne : Liste des transactions                     │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─── ADMIN ─────────────────────────────────────────────────┐
│                                                            │
│  POST /api/leave-balance/admin/initialize-balances        │
│  ├─ Body : { year, ca_initial, rtt_initial }             │
│  └─ Action : Initialise tous les employés (migration)     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 🧪 Tests de Validation

```
┌──────────────────────────────────────────────────────────┐
│                  SCÉNARIOS DE TEST                       │
└──────────────────────────────────────────────────────────┘

✅ Test 1 : Pose Simple
─────────────────────────
1. Solde initial : 25 CA
2. Pose 10j CA
3. ✓ Solde = 15 CA
4. ✓ Transaction "deduct" créée

✅ Test 2 : Réintégration Simple
──────────────────────────────────
1. Pose 10j CA (01/01→14/01)
2. Solde = 15 CA
3. AM (05/01→10/01)
4. ✓ Détection : 4j ouvrables à réintégrer
5. ✓ Solde = 19 CA (15 + 4)
6. ✓ Transaction "reintegrate" créée
7. ✓ Email envoyé

✅ Test 3 : Solde Insuffisant
────────────────────────────────
1. Solde = 5 CA
2. Tenter de poser 10 CA
3. ✓ Erreur 400 : "Solde insuffisant"
4. ✓ Aucune modification du solde

✅ Test 4 : Chevauchements Multiples
──────────────────────────────────────
1. Pose 5j CA + 3j RTT (chevauchant)
2. AM interrompt les deux
3. ✓ CA réintégré : +3j
4. ✓ RTT réintégré : +2j
5. ✓ 2 transactions créées

✅ Test 5 : Priorités
──────────────────────
1. TEL posé sur CA
2. ✓ CA reste visible (TEL priorité < CA)
3. AM posé sur CA
4. ✓ CA remplacé (AM priorité > CA)
```

---

## 🚀 Performance

```
┌────────────────────────────────────────────────────────┐
│              OPTIMISATIONS                             │
└────────────────────────────────────────────────────────┘

Index MongoDB
─────────────
1. leave_balances : (employee_id, year) UNIQUE
2. leave_transactions : (employee_id, transaction_date DESC)
3. leave_transactions : (related_absence_id)

Résultats Attendus
──────────────────
• GET soldes : < 50ms
• POST deduct : < 100ms  
• POST reintegrate : < 200ms (avec email)
• GET transactions (20) : < 100ms

Charge Supportée
────────────────
• 1000 employés
• 100k absences/an
• 500k transactions/an
```

---

## 📈 Monitoring

```
┌────────────────────────────────────────────────────────┐
│                LOGS À SURVEILLER                       │
└────────────────────────────────────────────────────────┘

✅ Logs Normaux
───────────────
[INFO] ✅ Solde créé pour employee_id=...
[INFO] 💾 CA mis à jour : balance=25.0 → 15.0
[INFO] 📝 Transaction créée : ...
[INFO] ✅ Réintégration : 4j CA pour employee=...

⚠️ Logs d'Alerte
────────────────
[WARN] ⚠️ Solde insuffisant : disponible=5, demandé=10
[WARN] ⚠️ RÉINTÉGRATION MANQUANTE détectée

❌ Logs d'Erreur
────────────────
[ERROR] ❌ Erreur réintégration : ...
[ERROR] ❌ Échec envoi email : ...
```

---

## 🎓 Conformité Légale

```
┌────────────────────────────────────────────────────────┐
│        ARTICLE L3141-5 CODE DU TRAVAIL                 │
└────────────────────────────────────────────────────────┘

"La maladie survenant pendant les congés payés 
 suspend l'exécution du contrat de travail. 
 Les jours de congés non pris du fait de la maladie 
 doivent être réintégrés au compteur."

✅ Implémentation Conforme
──────────────────────────
▪ Détection automatique des interruptions
▪ Réintégration immédiate au compteur
▪ Notification systématique à l'employé
▪ Traçabilité complète (transactions)
▪ Audit trail pour inspection du travail
```

---

## 📞 Questions ?

Consultez les fichiers fournis :

1. **README.md** → Installation & démarrage
2. **INTEGRATION_GUIDE.py** → Intégration dans server.py
3. **PLAN_ACTION_COMPLET.py** → Phases 3 & 4 (Frontend, Notifications)
4. **leave_reintegration_service.py** → Logique de réintégration
5. **retroactive_correction.py** → Correction historique

**🎉 Bonne chance avec votre implémentation !**
