# ARCHITECTURE DE SYNCHRONISATION GLOBALE - MOZAIK RH

## Principe Fondamental
**Toute modification de données dans n'importe quel module doit se propager automatiquement dans tous les modules concernés**

---

## 🔄 FLUX DE SYNCHRONISATION PAR MODULE

### 1️⃣ UTILISATEURS (✅ IMPLÉMENTÉ)

**Déclencheur:** Modification dans Gestion Utilisateurs
**Impact:**
- ✅ Absences (`employee_name`, `email`)
- ✅ Compteurs de congés (`employee_name`)
- ✅ Transactions de congés (`employee_name`)
- ✅ Heures supplémentaires (`employee_name`)
- ✅ Astreintes (`employee_name`)
- ✅ Heures de travail (`employee_name`)
- ✅ Employees collection (`name`, `email`)
- ✅ Cessions CSE (`from/to_employee_name`)
- ✅ Heures de délégation (`employee_name`)
- ✅ Demandes d'absence (`employee_name`, `email`)

**Endpoint:** `PUT /api/users/{user_id}`

---

### 2️⃣ ABSENCES (⚠️ CRITIQUE - À IMPLÉMENTER)

#### A. Création d'absence (status="approved")
**Déclencheur:** POST /api/absences avec status="approved"
**Impact:**
1. Déduire des compteurs appropriés:
   - Congés Payés → `ca_taken` += jours
   - Congés Trimestriels → `ct_taken` += jours
   - Congés d'ancienneté → `cex_taken` += jours
   - Récupération → `rec_taken` += jours/heures
2. Créer transaction dans `leave_transactions`
3. Mettre à jour `ca_balance`, `ct_balance`, etc.

#### B. Validation d'absence (pending → approved)
**Déclencheur:** PUT /api/absences/{id} avec status="approved"
**Impact:**
1. Déduire des compteurs (comme création)
2. Créer transaction
3. Notifier employé par email

#### C. Rejet d'absence (pending → rejected)
**Déclencheur:** PUT /api/absences/{id} avec status="rejected"
**Impact:**
1. NE PAS déduire des compteurs
2. Notifier employé par email

#### D. Modification d'absence approuvée
**Déclencheur:** PUT /api/absences/{id} (changement de dates/durée)
**Impact:**
1. Réintégrer l'ancienne déduction
2. Déduire avec la nouvelle durée
3. Mettre à jour transactions
4. Recalculer balances

#### E. Suppression d'absence
**Déclencheur:** DELETE /api/absences/{id}
**Impact:**
1. Réintégrer dans les compteurs
2. Marquer transaction comme annulée
3. Recalculer balances

---

### 3️⃣ PLANNING MENSUEL (⚠️ CRITIQUE - À IMPLÉMENTER)

#### A. Ajout absence depuis planning
**Déclencheur:** Création interactive dans MonthlyPlanningFinal
**Impact:**
1. Créer l'absence dans `db.absences`
2. Déduire des compteurs
3. Créer transaction
4. Rafraîchir le planning

#### B. Modification depuis planning
**Déclencheur:** Modification interactive
**Impact:**
1. Modifier l'absence dans `db.absences`
2. Recalculer compteurs
3. Mettre à jour transactions

#### C. Suppression depuis planning
**Déclencheur:** Suppression interactive
**Impact:**
1. Supprimer de `db.absences`
2. Réintégrer dans compteurs
3. Annuler transaction

---

### 4️⃣ COMPTEURS DE CONGÉS (À IMPLÉMENTER)

#### A. Modification manuelle par admin
**Déclencheur:** PUT /api/leave-balance/{id}
**Impact:**
1. Créer transaction manuelle
2. Logger dans audit
3. Notifier employé si changement significatif

#### B. Réinitialisation annuelle
**Déclencheur:** Début d'année ou action admin
**Impact:**
1. Créer nouveaux compteurs selon CCN66
2. Reporter soldes non utilisés (selon règles)
3. Créer transactions de report

---

### 5️⃣ HEURES SUPPLÉMENTAIRES (À IMPLÉMENTER)

#### A. Validation heures sup
**Déclencheur:** PUT /api/overtime/{id} avec status="approved"
**Impact:**
1. Ajouter au compteur récupération (`rec_accumulated`)
2. Créer transaction
3. Notifier employé

#### B. Prise en récupération
**Déclencheur:** POST /api/absences avec type="Récupération"
**Impact:**
1. Déduire de `rec_taken`
2. Mettre à jour `rec_balance`
3. Créer transaction

#### C. Modification/Annulation
**Déclencheur:** PUT/DELETE /api/overtime/{id}
**Impact:**
1. Recalculer compteur récupération
2. Ajuster transactions

---

### 6️⃣ ASTREINTES (À IMPLÉMENTER)

#### A. Création astreinte
**Déclencheur:** POST /api/on-call
**Impact:**
1. Apparaît dans planning astreintes
2. Comptabiliser dans analytics

#### B. Modification
**Déclencheur:** PUT /api/on-call/{id}
**Impact:**
1. Mettre à jour planning
2. Recalculer analytics

---

### 7️⃣ CSE / DÉLÉGATION (À IMPLÉMENTER)

#### A. Utilisation heures de délégation
**Déclencheur:** POST /api/delegation-hours/use
**Impact:**
1. Déduire du solde membre CSE
2. Créer transaction
3. Mettre à jour analytics

#### B. Cession d'heures
**Déclencheur:** POST /api/cse/cessions
**Impact:**
1. Déduire du donneur
2. Ajouter au receveur
3. Créer transactions des deux côtés
4. Notifier les deux parties

---

## 🎯 PRIORITÉS D'IMPLÉMENTATION

### Phase 1 (URGENT) :
1. ✅ Utilisateurs → Tout (FAIT)
2. ⚠️ Absences validation → Déduction compteurs
3. ⚠️ Planning → Absences → Compteurs

### Phase 2 (IMPORTANT) :
4. Heures sup → Compteur récupération
5. Modification absence → Recalcul compteurs
6. Suppression absence → Réintégration

### Phase 3 (SOUHAITABLE) :
7. CSE cessions → Soldes
8. Astreintes → Planning
9. Compteurs manuels → Transactions

---

## 🔧 ARCHITECTURE TECHNIQUE

### Approche 1: Triggers dans les endpoints
```python
@api_router.post("/absences")
async def create_absence(...):
    # 1. Créer l'absence
    absence = await db.absences.insert_one(...)
    
    # 2. Si status="approved", déduire compteurs
    if absence.status == "approved":
        await sync_absence_to_counters(absence)
    
    return absence
```

### Approche 2: Service de synchronisation centralisé
```python
class SyncService:
    async def sync_absence_create(self, absence):
        # Déduire compteurs
        # Créer transactions
        # Logger
        pass
    
    async def sync_absence_update(self, old, new):
        # Recalculer
        pass
```

### Approche 3: Event-driven (futur)
```python
# Publier événement
await event_bus.publish("absence.created", absence)

# Listeners
@event_listener("absence.created")
async def update_counters(absence):
    ...
```

---

## 📋 CHECKLIST DE SYNCHRONISATION

Pour chaque endpoint de modification :
- [ ] Identifier les données impactées
- [ ] Mettre à jour toutes les collections concernées
- [ ] Créer des transactions/logs
- [ ] Recalculer les soldes/compteurs
- [ ] Notifier les utilisateurs concernés
- [ ] Logger les changements
- [ ] Tester la cohérence

---

## 🧪 TESTS DE COHÉRENCE

Tests à exécuter régulièrement :
1. Vérifier que `ca_balance` = `ca_initial` - `ca_taken` + `ca_reintegrated`
2. Vérifier que somme des absences approuvées = compteurs taken
3. Vérifier que toutes les absences ont un employee_name valide
4. Vérifier que tous les compteurs ont un employee_id valide
5. Vérifier qu'il n'y a pas d'orphelins (absences sans utilisateur)

---

## 📊 MONITORING

Logs à surveiller :
- Nombre de synchronisations par jour
- Temps moyen de synchronisation
- Erreurs de synchronisation
- Incohérences détectées

---

**Date de création:** 2025-10-15
**Version:** 1.0
**Statut:** En cours d'implémentation
