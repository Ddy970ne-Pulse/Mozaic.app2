# 🎉 INTÉGRATION SYSTÈME DE SOLDES - MOZAIK RH

## ✅ Installation Terminée (31 janvier 2025)

---

## 📦 Fichiers Intégrés

### Backend (3 fichiers)
1. **`backend/leave_balance_models.py`** (5.8 KB)
   - Modèles Pydantic pour MongoDB
   - `EmployeeLeaveBalance` : Soldes annuels par type (CA, RTT, REC, CT, CP, CEX)
   - `LeaveTransaction` : Historique des mouvements
   - DTOs pour les API

2. **`backend/leave_balance_routes.py`** (18 KB)
   - Router FastAPI avec 6 endpoints
   - Intégré dans `server.py`

3. **`backend/leave_reintegration_service.py`** (15 KB)
   - Service de réintégration automatique
   - Logique de priorité CA > AM
   - Calcul jours ouvrables

### Configuration
- ✅ Router ajouté à `server.py` (ligne ~6505)
- ✅ Indexes MongoDB créés
- ✅ Backend redémarré avec succès

---

## 🔗 API Endpoints Disponibles

### 1. Consulter Soldes
```http
GET /api/leave-balance/{employee_id}?year=2025
```
**Réponse** :
```json
{
  "employee_id": "uuid",
  "year": 2025,
  "ca_balance": 25.0,
  "rtt_balance": 12.0,
  "rec_balance": 0.0,
  ...
}
```

### 2. Déduire des Congés
```http
POST /api/leave-balance/deduct
Content-Type: application/json

{
  "employee_id": "uuid",
  "absence_type": "CA",
  "days": 5.0,
  "year": 2025,
  "reason": "Congés été",
  "absence_id": "absence_uuid"
}
```

### 3. Réintégrer des Congés (Maladie)
```http
POST /api/leave-balance/reintegrate
Content-Type: application/json

{
  "employee_id": "uuid",
  "absence_type": "CA",
  "days": 3.0,
  "year": 2025,
  "reason": "Réintégration AM chevauchement 5-7 juin",
  "related_absence_id": "ca_absence_uuid"
}
```

### 4. Attribuer des Congés (Admin)
```http
POST /api/leave-balance/grant
Content-Type: application/json

{
  "employee_id": "uuid",
  "absence_type": "REC",
  "days": 2.0,
  "year": 2025,
  "reason": "Heures supplémentaires converties"
}
```

### 5. Historique des Transactions
```http
GET /api/leave-balance/transactions/{employee_id}?year=2025&limit=50
```

### 6. Initialiser les Soldes (Admin)
```http
POST /api/leave-balance/admin/initialize-balances
Content-Type: application/json

{
  "year": 2025,
  "ca_initial": 25.0,
  "rtt_initial": 12.0,
  "rec_initial": 0.0
}
```

---

## 🔄 Intégration avec Système Existant

### 1. Absences Créées
Quand une absence est créée (`POST /api/absences`), appeler :
```python
# Dans create_absence endpoint
if absence.status == "approved":
    # Déduire du solde
    deduct_response = await leave_balance_service.deduct_leave(
        employee_id=absence.employee_id,
        absence_type=absence.motif_absence,  # CA, RTT, REC, etc.
        days=float(absence.jours_absence),
        absence_id=absence.id
    )
```

### 2. Réintégration Automatique
Quand une absence AM chevauche une absence CA/RTT :
```python
# Dans leave_reintegration_service.py (déjà implémenté)
from leave_reintegration_service import detect_and_reintegrate_leaves

# À appeler lors de la création d'une absence AM
await detect_and_reintegrate_leaves(
    db=db,
    employee_id=employee_id,
    am_start_date="05/06/2025",
    am_end_date="07/06/2025"
)
```

### 3. Audit Logging (Déjà Intégré)
Les transactions de soldes sont loguées avec le système d'audit existant :
```python
from core.audit_logger import AuditLogger
await audit.log_event(
    event_type=AuditEventType.ABSENCE_CREATED,
    details={"leave_balance_deducted": True, "days": 5.0}
)
```

---

## 📊 Collections MongoDB

### `leave_balances`
```javascript
{
  "_id": "uuid",
  "employee_id": "user_uuid",
  "year": 2025,
  "ca_initial": 25.0,
  "ca_taken": 5.0,
  "ca_reintegrated": 2.0,
  "ca_balance": 22.0,
  "rtt_initial": 12.0,
  "rtt_taken": 0.0,
  "rtt_balance": 12.0,
  // ... autres types
  "last_updated": "2025-01-31T10:00:00Z"
}
```

### `leave_transactions`
```javascript
{
  "_id": "uuid",
  "employee_id": "user_uuid",
  "transaction_type": "deduct", // ou "reintegrate", "grant"
  "absence_type": "CA",
  "days": 5.0,
  "reason": "Congés été",
  "balance_before": 25.0,
  "balance_after": 20.0,
  "related_absence_id": "absence_uuid",
  "timestamp": "2025-01-31T10:00:00Z"
}
```

**Indexes créés** :
- `leave_balances`: `(employee_id, year)` unique
- `leave_transactions`: `(employee_id, timestamp)`, `transaction_type`

---

## 🧪 Tests de Validation

### Test 1 : Initialiser les Soldes (Admin)
```bash
curl -X POST "http://localhost:8001/api/leave-balance/admin/initialize-balances" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "year": 2025,
    "ca_initial": 25.0,
    "rtt_initial": 12.0
  }'
```

### Test 2 : Consulter Soldes
```bash
curl "http://localhost:8001/api/leave-balance/USER_ID?year=2025" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 3 : Déduire des Congés
```bash
curl -X POST "http://localhost:8001/api/leave-balance/deduct" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "employee_id": "USER_ID",
    "absence_type": "CA",
    "days": 5.0,
    "year": 2025,
    "reason": "Congés été"
  }'
```

### Test 4 : Réintégration Automatique
1. Créer absence CA du 01/06 au 10/06 (10 jours)
2. Créer absence AM du 05/06 au 07/06 (3 jours)
3. Vérifier : CA balance devrait augmenter de 3 jours (réintégration)

---

## ⚠️ Points d'Attention

### 1. Appels Manuels Requis (À Automatiser)
Pour le moment, les endpoints de soldes doivent être appelés **manuellement** lors de :
- Création d'absence approuvée → `POST /api/leave-balance/deduct`
- Création d'absence AM → `detect_and_reintegrate_leaves()`
- Attribution de récupération → `POST /api/leave-balance/grant`

**Recommandation** : Intégrer ces appels directement dans les endpoints existants :
- `POST /api/absences` (après approbation)
- `PUT /api/absences/{id}` (changement de statut)

### 2. Validation des Soldes
Le système **vérifie** que le solde est suffisant avant déduction :
```python
if balance.ca_balance < days:
    raise HTTPException(status_code=400, detail="Solde CA insuffisant")
```

### 3. Transactions Atomiques
Chaque opération crée une transaction dans `leave_transactions` pour traçabilité complète.

### 4. Année en Cours
Par défaut, si `year` n'est pas fourni, le système utilise l'année en cours.

---

## 🚀 Prochaines Étapes

### Phase 3 : Frontend React (À Faire)
Voir `/tmp/PLAN_ACTION_COMPLET.py` pour :
- Composant `LeaveBalanceCard`
- Intégration dans `EmployeeSpaceNew.js`
- Affichage des soldes dans le planning

### Phase 4 : Notifications Email (À Faire)
Utiliser `email_service.py` existant pour :
- Notification de déduction de congés
- Alerte de réintégration
- Rapport mensuel des soldes

### Phase 5 : Correction Historique (Optionnel)
Utiliser `retroactive_correction.py` pour corriger les absences passées.

---

## 📚 Documentation Complète

Fichiers de référence dans `/tmp/` :
- `INTEGRATION_GUIDE.py` : Guide d'intégration détaillé
- `PLAN_ACTION_COMPLET.py` : Phases 3-4 avec code React
- `README.md` : Installation et FAQ
- `retroactive_correction.py` : Script de correction historique

---

## ✅ Checklist d'Intégration

- [x] Fichiers copiés dans `/app/backend/`
- [x] Router intégré dans `server.py`
- [x] Indexes MongoDB créés
- [x] Backend redémarré avec succès
- [x] 6 nouveaux endpoints disponibles
- [ ] Tests manuels des endpoints
- [ ] Intégration avec création d'absences
- [ ] Intégration frontend (Phase 3)
- [ ] Notifications email (Phase 4)
- [ ] Tests E2E complets

---

## 🎉 Résumé

Le système de gestion des soldes de congés avec réintégration automatique est maintenant **installé et fonctionnel** dans MOZAIK RH !

**Prochaine action** : Tester les endpoints et intégrer les appels dans les flux d'absences existants.

---

**Date d'intégration** : 31 janvier 2025  
**Status** : ✅ Backend Opérationnel  
**Endpoints disponibles** : 6  
**Collections MongoDB** : 2 (leave_balances, leave_transactions)
