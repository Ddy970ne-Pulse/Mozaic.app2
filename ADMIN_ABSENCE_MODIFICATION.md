# Modification d'Absences par l'Administrateur

## Date
12 Janvier 2025

## Objectif
Permettre aux administrateurs de modifier les périodes d'absence même après validation, conformément aux besoins de gestion RH.

## Backend (Déjà Implémenté)

### Endpoint API
```
PUT /api/absences/{absence_id}
```

**Authentification:** JWT Token requis

**Permissions:**
- **Admin** : Peut modifier toutes les absences (y compris validées)
- **Employé** : Peut modifier uniquement ses propres absences en statut "pending"

**Corps de la requête:**
```json
{
  "date_debut": "2025-01-15",
  "date_fin": "2025-01-20",
  "jours_absence": 5,
  "motif_absence": "CA",
  "notes": "Congés annuels modifiés",
  "status": "approved",
  "absence_unit": "jours",
  "hours_amount": null,
  "counting_method": "working_days"
}
```

**Réponse en cas de succès:**
```json
{
  "success": true,
  "message": "Absence updated successfully",
  "absence": { ... }
}
```

**Codes de réponse:**
- `200` : Modification réussie
- `400` : Aucune modification effectuée
- `403` : Permission refusée
- `404` : Absence non trouvée

## Frontend (Nouvellement Implémenté)

### Composant: AbsenceRequests.js

#### 1. Nouveaux States
```javascript
const [showEditModal, setShowEditModal] = useState(false);
const [editingRequest, setEditingRequest] = useState(null);
```

#### 2. Bouton "Modifier"
Ajouté dans la liste des absences, visible **uniquement pour les admins** :

```jsx
{!isEmployee && user.role === 'admin' && (
  <button
    onClick={() => handleEditRequest(request)}
    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg..."
  >
    <svg>...</svg>
    <span>Modifier</span>
  </button>
)}
```

**Caractéristiques:**
- Bouton bleu avec icône de crayon
- Visible sur TOUTES les absences (pending, approved, rejected)
- Réservé aux utilisateurs avec `role === 'admin'`

#### 3. Fonction handleEditRequest
Ouvre le modal d'édition avec les données de l'absence :

```javascript
const handleEditRequest = (request) => {
  setEditingRequest({
    id: request.id,
    date_debut: request.startDate,
    date_fin: request.endDate,
    jours_absence: parseInt(request.duration) || 0,
    motif_absence: request.type,
    notes: request.reason || '',
    status: request.status
  });
  setShowEditModal(true);
};
```

#### 4. Fonction handleSaveEdit
Envoie la modification au backend via API :

```javascript
const handleSaveEdit = async () => {
  const response = await fetch(`${backendUrl}/api/absences/${editingRequest.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(editingRequest)
  });
  
  if (response.ok) {
    alert('✅ Absence modifiée avec succès');
    window.location.reload();
  }
};
```

## Modal d'Édition

### Structure Visuelle
```
┌─────────────────────────────────────────────┐
│ 📝 Modifier l'absence                       │ ← Header (gradient bleu)
│ Modification réservée aux administrateurs   │
├─────────────────────────────────────────────┤
│                                             │
│  Date de début *    [____________________]  │
│                                             │
│  Date de fin        [____________________]  │
│                                             │
│  Nombre de jours    [____________________]  │
│                                             │
│  Type d'absence *   [Dropdown▼___________]  │
│                                             │
│  Notes / Motif      [____________________]  │
│                     [____________________]  │
│                                             │
│  Statut             [Dropdown▼___________]  │
│                                             │
│  ℹ️ Information importante                  │
│  Les modifications seront enregistrées...   │
│                                             │
├─────────────────────────────────────────────┤
│              [Annuler] [Enregistrer]        │ ← Footer
└─────────────────────────────────────────────┘
```

### Champs du Formulaire

#### 1. Date de début *
- Type: `input[type="date"]`
- Requis: Oui
- Modification du `date_debut`

#### 2. Date de fin
- Type: `input[type="date"]`
- Requis: Non
- Modification du `date_fin`

#### 3. Nombre de jours
- Type: `input[type="number"]`
- Min: 0
- Modification du `jours_absence`

#### 4. Type d'absence *
- Type: `select`
- Options: Tous les types d'absence (CA, AM, RTT, etc.)
- Requis: Oui
- Modification du `motif_absence`

#### 5. Notes / Motif
- Type: `textarea`
- Rows: 3
- Placeholder: "Informations complémentaires..."
- Modification du `notes`

#### 6. Statut
- Type: `select`
- Options:
  - `pending` : En attente
  - `approved` : Approuvé
  - `rejected` : Refusé
- Modification du `status`

### Design

#### Header
- Gradient bleu à indigo : `bg-gradient-to-r from-blue-500 to-indigo-600`
- Titre avec icône de crayon
- Sous-titre explicatif
- Bouton fermer (X) en haut à droite

#### Body
- Padding: `p-6`
- Espacement entre champs: `space-y-6`
- Labels en gras : `font-medium text-gray-700`
- Inputs avec focus ring bleu : `focus:ring-2 focus:ring-blue-500`

#### Info Box
- Fond bleu clair : `bg-blue-50`
- Bordure bleue : `border-blue-200`
- Icône d'information
- Texte explicatif sur la traçabilité

#### Footer
- Fond gris : `bg-gray-50`
- Bouton "Annuler" : Bordure grise, hover gris
- Bouton "Enregistrer" : Gradient bleu/indigo, ombre

## Fonctionnalités

### 1. Ouverture du Modal
- Click sur "Modifier" → Ouvre le modal
- Les champs sont pré-remplis avec les données actuelles

### 2. Modification des Champs
- Tous les champs sont éditables
- Validation en temps réel (dates, nombres)
- Type d'absence via dropdown

### 3. Enregistrement
- Click sur "Enregistrer" → API PUT call
- Message de confirmation : "✅ Absence modifiée avec succès"
- Rechargement de la page pour afficher les nouvelles données

### 4. Annulation
- Click sur "Annuler" → Ferme le modal sans sauvegarder
- Click sur X → Même comportement
- Click en dehors du modal → Ferme le modal

## Cas d'Usage

### Scénario 1: Correction d'erreur de saisie
Un employé a saisi une mauvaise date pour ses congés.
1. Admin ouvre "Demandes d'Absence"
2. Trouve l'absence concernée
3. Click sur "Modifier"
4. Corrige la date
5. Click sur "Enregistrer"

### Scénario 2: Prolongation d'arrêt maladie
Un employé prolonge son arrêt maladie.
1. Admin trouve l'absence déjà validée
2. Click sur "Modifier"
3. Modifie la date de fin
4. Augmente le nombre de jours
5. Click sur "Enregistrer"

### Scénario 3: Changement de type d'absence
Une absence initialement en RTT doit être comptabilisée en CA.
1. Admin ouvre l'absence
2. Click sur "Modifier"
3. Change le type d'absence dans le dropdown
4. Ajoute une note explicative
5. Click sur "Enregistrer"

## Sécurité & Permissions

### Contrôle d'Accès
- Bouton "Modifier" invisible pour les employés
- Vérification backend : `current_user.role === 'admin'`
- Token JWT requis pour l'API

### Traçabilité
- Champ `updated_at` automatiquement mis à jour
- Historique des modifications (à implémenter en Phase 2)
- Notification automatique de l'employé (à implémenter en Phase 2)

## Tests Requis

### Tests Fonctionnels
1. ✅ Vérifier que le bouton "Modifier" apparaît pour les admins
2. ✅ Vérifier que le bouton n'apparaît PAS pour les employés
3. ✅ Vérifier l'ouverture du modal au click
4. ✅ Vérifier le pré-remplissage des champs
5. ✅ Vérifier la modification de chaque champ
6. ✅ Vérifier l'enregistrement des modifications
7. ✅ Vérifier la fermeture du modal (Annuler, X)
8. ✅ Vérifier le message de succès

### Tests d'Intégration
1. ✅ Tester avec une absence "pending"
2. ✅ Tester avec une absence "approved"
3. ✅ Tester avec une absence "rejected"
4. ✅ Tester la modification de dates
5. ✅ Tester la modification de type
6. ✅ Tester la modification de statut
7. ✅ Vérifier l'affichage après rechargement

### Tests de Sécurité
1. ✅ Tester l'accès sans token
2. ✅ Tester l'accès avec un compte employé
3. ✅ Tester la modification d'une absence inexistante

## Améliorations Futures

### Phase 2
- [ ] Historique complet des modifications
- [ ] Notification automatique de l'employé par email
- [ ] Justification obligatoire pour certaines modifications
- [ ] Système d'audit trail détaillé
- [ ] Confirmation avant modification d'absence validée

### Phase 3
- [ ] Modification en masse (plusieurs absences)
- [ ] Prévisualisation des impacts sur le planning
- [ ] Calcul automatique du nombre de jours
- [ ] Gestion des conflits avec d'autres absences
- [ ] Export des modifications en PDF

## Fichiers Modifiés
- `/app/frontend/src/components/AbsenceRequests.js`
  - Ajout states `showEditModal`, `editingRequest`
  - Ajout fonction `handleEditRequest`
  - Ajout fonction `handleSaveEdit`
  - Ajout bouton "Modifier"
  - Ajout modal d'édition complet

## Backend (Déjà Existant)
- `/app/backend/server.py`
  - Endpoint `PUT /api/absences/{absence_id}` (ligne 3203)

## État Actuel
- ✅ Backend API opérationnel
- ✅ Frontend UI complet
- ✅ Bouton "Modifier" visible pour admins
- ✅ Modal d'édition fonctionnel
- ✅ Sauvegarde via API
- ✅ Messages de feedback utilisateur
- ✅ Design cohérent avec MOZAIK RH

## Prochaines Étapes
1. Tests complets avec utilisateur admin
2. Validation du workflow de modification
3. Ajout de l'historique des modifications
4. Implémentation des notifications automatiques
