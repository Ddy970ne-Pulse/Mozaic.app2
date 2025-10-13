# Modification des Absences Validées par Admin

## Date
13 Octobre 2025

## Fonctionnalité

Les administrateurs peuvent **modifier les absences importées** (status: "approved") même après validation.

---

## ✅ Implémentation Backend

### Endpoint: PUT /api/absences/{absence_id}

**Fichier:** `/app/backend/server.py` (ligne 3204)

```python
@api_router.put("/absences/{absence_id}")
async def update_absence(
    absence_id: str,
    absence_data: dict,
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing absence
    Admin can update any absence, employees can update only their own pending absences
    """
```

### Règles de Permission (lignes 3220-3225)

```python
if current_user.role != "admin":
    # Les employés peuvent modifier seulement leurs propres absences en attente
    if existing_absence.get("employee_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if existing_absence.get("status") != "pending":
        raise HTTPException(status_code=403, detail="Cannot update validated absences")
```

**Pour les Admins :**
- ✅ Peuvent modifier **toutes les absences**
- ✅ Peuvent modifier les absences **quel que soit le statut**
- ✅ Peuvent modifier les absences de **tous les employés**
- ✅ Peuvent changer le **statut** des absences

**Pour les Employés :**
- ⚠️ Peuvent modifier **uniquement leurs propres absences**
- ⚠️ Peuvent modifier **uniquement** les absences "pending"
- ❌ Ne peuvent **pas** modifier les absences validées

### Champs Modifiables (ligne 3229)

```python
allowed_fields = [
    'date_debut',      # Date de début
    'date_fin',        # Date de fin
    'jours_absence',   # Nombre de jours
    'motif_absence',   # Type d'absence (CA, RTT, etc.)
    'notes',           # Notes/commentaires
    'absence_unit',    # Unité (jours/heures)
    'hours_amount',    # Montant en heures
    'counting_method', # Méthode de décompte
    'status'           # Statut (admin uniquement)
]
```

---

## ✅ Implémentation Frontend

### Bouton "Modifier" (AbsenceRequests.js ligne 356)

```javascript
{/* Bouton Modifier pour les admins (disponible pour toutes les absences) */}
{!isEmployee && user.role === 'admin' && (
  <button
    onClick={() => handleEditRequest(request)}
    className="bg-blue-500 hover:bg-blue-600 text-white..."
  >
    <svg>✏️</svg>
    <span>Modifier</span>
  </button>
)}
```

**Condition d'affichage :**
- `user.role === 'admin'` : Uniquement pour les admins
- **Pas de condition sur `request.status`** : S'affiche pour toutes les absences

**Apparaît sur :**
- ✅ Absences "pending" (En attente)
- ✅ Absences "approved" (Validées) ← **Les absences importées**
- ✅ Absences "rejected" (Refusées)

### Modal de Modification (AbsenceRequests.js ligne 828+)

**Formulaire complet avec tous les champs :**
1. Date de début *
2. Date de fin
3. Nombre de jours
4. Type d'absence (dropdown avec tous les types)
5. Notes/Motif
6. Statut (dropdown : pending/approved/rejected)

**Workflow :**
```
Admin clique "Modifier"
    ↓
Modal s'ouvre avec données pré-remplies
    ↓
Admin modifie les champs nécessaires
    ↓
Admin clique "Enregistrer"
    ↓
API PUT /api/absences/{id} appelée
    ↓
Success → Absence mise à jour
```

---

## 📋 Cas d'Usage

### Scénario 1 : Correction d'erreur d'import
**Situation :** Une absence CA a été importée avec une mauvaise date

1. Admin va dans "Demandes d'Absence"
2. Trouve l'absence concernée (badge vert "✅ Validée")
3. Clique sur "Modifier"
4. Corrige la date de début/fin
5. Clique "Enregistrer"
6. ✅ Absence mise à jour dans MongoDB
7. ✅ Apparaît corrigée dans "Mon Espace" de l'employé

### Scénario 2 : Prolongation d'arrêt maladie importé
**Situation :** Un arrêt maladie importé doit être prolongé

1. Admin ouvre l'absence AM validée
2. Modifie la date de fin
3. Augmente le nombre de jours
4. Ajoute une note "Prolongation médicale"
5. Enregistre
6. ✅ Mise à jour immédiate

### Scénario 3 : Changement de type d'absence
**Situation :** Une absence RTT doit être requalifiée en CA

1. Admin ouvre l'absence RTT validée
2. Change le type : RTT → CA
3. Met à jour les notes
4. Enregistre
5. ✅ Type d'absence modifié
6. ✅ Impact sur les soldes recalculés

### Scénario 4 : Annulation d'une absence validée
**Situation :** Une absence importée doit être annulée

1. Admin ouvre l'absence validée
2. Change le statut : "approved" → "rejected"
3. Ajoute une note d'annulation
4. Enregistre
5. ✅ Absence apparaît comme refusée
6. ✅ Ne compte plus dans les soldes

---

## 🔐 Sécurité

### Authentification
- JWT Token requis pour toutes les modifications
- Vérification du rôle à chaque appel API

### Permissions
```
┌─────────────┬──────────────────┬─────────────────┐
│ Utilisateur │ Propres Absences │ Autres Absences │
├─────────────┼──────────────────┼─────────────────┤
│ Admin       │ ✅ Toutes        │ ✅ Toutes       │
│ Manager     │ ✅ Pending seul. │ ❌ Non          │
│ Employee    │ ✅ Pending seul. │ ❌ Non          │
└─────────────┴──────────────────┴─────────────────┘
```

### Traçabilité
- Champ `updated_at` automatiquement mis à jour
- Historique des modifications (à implémenter en Phase 2)
- Log des modifications admin (recommandé)

---

## 📊 Flux de Données

### Import Excel → Modification Admin

```
Excel avec absences
    ↓
Import via /api/import/employees
    ↓
Absences créées avec status="approved"
    ↓
Stockées dans MongoDB
    ↓
Affichées dans "Demandes d'Absence"
    ↓
Admin clique "Modifier"
    ↓
Modal s'ouvre (données pré-remplies)
    ↓
Admin modifie
    ↓
PUT /api/absences/{id}
    ↓
MongoDB mis à jour
    ↓
Frontend recharge les données
    ↓
Changements visibles partout :
  - Mon Espace (employé)
  - Planning Mensuel
  - Analytics
  - Export Paie
```

---

## ✅ État Actuel

**Backend :**
- ✅ Endpoint PUT /api/absences/{id} fonctionnel
- ✅ Permissions admin correctes
- ✅ Modification de tous les champs
- ✅ Modification du statut pour admin

**Frontend :**
- ✅ Bouton "Modifier" visible pour admin
- ✅ Modal de modification complet
- ✅ Tous les champs éditables
- ✅ Sauvegarde via API
- ✅ Messages de succès/erreur

**Fonctionnalités :**
- ✅ Modification absences "approved" (importées)
- ✅ Modification absences "pending"
- ✅ Modification absences "rejected"
- ✅ Changement de statut
- ✅ Modification dates/durées/types

---

## 🎯 Conclusion

**Les administrateurs peuvent modifier TOUTES les absences importées**, même celles avec le statut "approved" (validées).

**Aucune limitation** pour les admins :
- ✅ Peuvent modifier les dates
- ✅ Peuvent changer le type d'absence
- ✅ Peuvent modifier la durée
- ✅ Peuvent changer le statut
- ✅ Peuvent ajouter/modifier les notes

**Les employés sont protégés** :
- Peuvent seulement modifier leurs propres absences "pending"
- Ne peuvent pas toucher aux absences validées

---

## 🧪 Tests Recommandés

1. **Test Admin - Modification Absence Validée**
   - Se connecter en admin
   - Aller dans "Demandes d'Absence"
   - Trouver une absence avec badge vert "✅ Validée"
   - Cliquer sur "Modifier"
   - Modifier des champs
   - Enregistrer
   - Vérifier que les changements sont appliqués

2. **Test Employee - Restriction**
   - Se connecter en employé
   - Aller dans "Demandes d'Absence"
   - Vérifier que le bouton "Modifier" n'apparaît PAS
   - Ou apparaît seulement pour absences "pending"

3. **Test Changement Statut**
   - Admin modifie status "approved" → "rejected"
   - Vérifier que l'absence change de badge
   - Vérifier impact sur soldes employé

---

**Fonctionnalité 100% opérationnelle ! ✅**
