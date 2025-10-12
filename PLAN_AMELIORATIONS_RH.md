# Plan d'Améliorations RH - MOZAIK

## 🎯 Objectifs

### 1. Gestion Inter-Annuelle (Clôture/Report)
**Statut**: À implémenter

**Éléments à reporter au 1er janvier:**
- ✅ Heures supplémentaires (solde N-1 → N, limite 1 an légale)
- ✅ Heures de délégation CSE (report partiel, max 12h/an selon CCN)
- ✅ Congés payés (report jusqu'au 31 mai N+1)
- ✅ RTT (report selon accord d'entreprise)

**Solution proposée:**
1. Créer une collection `annual_closures` pour tracer les clôtures
2. Endpoint `/api/admin/annual-closure/{year}` pour clôturer une année
3. Calcul automatique des reports selon les règles légales
4. Dashboard admin pour visualiser les clôtures et reports

---

### 2. RTT vs Congés Trimestriels (CCN66)
**Statut**: ✅ EN COURS

**Problème actuel:**
- Un seul motif "CT" (Congés Trimestriels)
- Pas de distinction avec RTT

**Solution:**
- ✅ Ajouter motif "RTT" dans ABSENCE_MOTIFS
- ✅ Garder "CT" pour CCN66
- ✅ Les deux catégories distinctes dans l'analyse
- ✅ Mapping correct dans AbsenceAnalytics.js

**Fichiers à modifier:**
- `/app/backend/server.py` - Ajouter RTT dans ABSENCE_MOTIFS
- `/app/frontend/src/components/AbsenceAnalytics.js` - Colonne RTT séparée

---

### 3. Lien Récupération ↔ Heures Supplémentaires
**Statut**: ❌ MANQUANT - PRIORITÉ HAUTE

**Problème actuel:**
- Demande de récupération (REC) ne déduit PAS du solde heures sup
- Collections séparées sans liaison

**Solution:**
1. Lors de validation d'une absence "REC":
   - Créer automatiquement une entrée `overtime` avec `type: 'recovered'`
   - Déduire les heures du solde
2. Ajouter vérification: solde suffisant avant validation
3. Webhook/trigger sur validation absence REC

**Flux:**
```
Employé demande récupération 8h
  ↓
Manager valide
  ↓
API crée:
  - Absence validée (db.absences)
  - Overtime recovered (db.overtime) ← MANQUANT
  ↓
Solde heures sup réduit automatiquement
```

---

### 4. Espace Employé pour Managers/Admins
**Statut**: ✅ EN COURS

**Solution:**
- ✅ Utiliser "Mon Espace" existant
- ✅ Ajouter section "Mes demandes personnelles"
- ✅ Permettre aux admins de faire leurs propres demandes
- ✅ Afficher leur solde personnel (heures sup, congés, etc.)

**Fichiers à modifier:**
- `/app/frontend/src/components/EmployeeSpace.js`

---

### 5. Compte Employé de Test
**Statut**: ✅ CRÉÉ

**Compte test:**
- Email: `sophie.martin@test.fr`
- Mot de passe temporaire: `vH5LuaGjKyLU`
- Rôle: employee
- Département: Educatif

---

## 📋 Ordre d'Implémentation

### Phase 1 - IMMÉDIATE (Aujourd'hui)
1. ✅ Créer compte test employé
2. ⏳ Ajouter motif RTT
3. ⏳ Créer lien Récupération → Heures Sup
4. ⏳ Améliorer "Mon Espace" pour admins

### Phase 2 - COURT TERME (Prochaine session)
5. Système de clôture/report annuel
6. Dashboard de gestion des reports
7. Tests complets avec compte employé

---

## 🔧 Détails Techniques

### Lien Récupération → Overtime

**Endpoint à modifier:** `PUT /api/absence-requests/{request_id}/validate`

```python
# Après validation d'une absence REC
if validated_request.type == "REC":
    # Créer entrée overtime "recovered"
    overtime_entry = {
        "employee_id": validated_request.employee_id,
        "employee_name": validated_request.employee,
        "date": validated_request.startDate,
        "hours": validated_request.duration_hours,  # Calculer à partir de jours
        "type": "recovered",
        "reason": f"Récupération validée - {validated_request.reason}",
        "validated": True,
        "validated_by": current_user.name,
        "validated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.overtime.insert_one(overtime_entry)
```

---

## ✅ Tests à Effectuer

1. **Test Récupération:**
   - Employé a 10h accumulées
   - Demande récupération 5h
   - Après validation: solde = 5h

2. **Test RTT vs CT:**
   - Demander RTT
   - Demander CT
   - Vérifier distinction dans analyse

3. **Test Mon Espace Admin:**
   - Se connecter en admin
   - Faire demande absence personnelle
   - Vérifier affichage soldes personnels

---

## 📊 Conformité Légale

### CCN66
- ✅ Congés Trimestriels (CT) spécifiques
- ✅ RTT séparés
- ⏳ Heures délégation CSE (12h/an report)

### Code du Travail
- ⏳ Report heures sup (max 1 an)
- ⏳ Congés payés (report 31 mai N+1)
- ✅ Validation managériale

---

**Date de création:** 12/10/2025
**Dernière mise à jour:** 12/10/2025
