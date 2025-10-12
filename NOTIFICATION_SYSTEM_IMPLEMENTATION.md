# Système de Notifications - Implémentation

## Date
12 Janvier 2025

## Objectif
Implémenter un vrai système de notifications pour le bouton Notification dans le header, au lieu d'une simple alerte.

## Implémentation

### 1. State Management
Ajout d'un nouveau state dans `Layout.js` :
```javascript
const [showNotifications, setShowNotifications] = useState(false);
```

### 2. Bouton Notification avec Badge
```javascript
<button 
  onClick={() => setShowNotifications(!showNotifications)}
  className="p-2 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500..."
  title="Notifications"
>
  <svg>...</svg>
  {/* Badge de compteur */}
  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
    3
  </span>
</button>
```

**Fonctionnalités du badge:**
- Position absolue en haut à droite du bouton
- Badge rouge avec nombre de notifications non lues (3)
- Petit badge circulaire (h-5 w-5)
- Texte blanc en gras

### 3. Panneau de Notifications

Le panneau s'affiche en dropdown sous le bouton Notification :

#### Structure du Panneau
```
┌─────────────────────────────────────┐
│  🔔 Notifications                   │ ← Header (gradient jaune/orange)
├─────────────────────────────────────┤
│  📝 Nouvelle demande d'absence      │
│  Marie Leblanc a soumis...          │
│  Il y a 5 minutes                   │ ← Notification 1
├─────────────────────────────────────┤
│  📅 Planning à valider              │
│  Le planning du mois prochain...    │
│  Il y a 2 heures                    │ ← Notification 2
├─────────────────────────────────────┤
│  🔔 Astreinte assignée              │
│  Vous êtes d'astreinte ce week-end  │
│  Il y a 1 jour                      │ ← Notification 3
├─────────────────────────────────────┤
│           [Fermer]                  │ ← Footer
└─────────────────────────────────────┘
```

#### Caractéristiques du Panneau
- **Largeur** : 320px (w-80)
- **Position** : Absolute, aligné à droite du bouton
- **Hauteur max** : 384px (max-h-96) avec scroll automatique
- **Ombre** : shadow-2xl pour effet de profondeur
- **Bordure** : border-gray-200
- **Z-index** : 50 pour rester au-dessus du contenu

#### Types de Notifications Mockées

1. **Nouvelle demande d'absence** (📝)
   - Badge bleu (bg-blue-100)
   - Temps : "Il y a 5 minutes"
   - Action possible : Cliquer pour voir les détails

2. **Planning à valider** (📅)
   - Badge violet (bg-purple-100)
   - Temps : "Il y a 2 heures"
   - Rappel pour validation

3. **Astreinte assignée** (🔔)
   - Badge orange (bg-orange-100)
   - Temps : "Il y a 1 jour"
   - Information d'assignation

### 4. Interactions Utilisateur

#### Ouvrir le Panneau
- Clic sur le bouton Notification
- Le panneau apparaît avec animation

#### Fermer le Panneau
- **Méthode 1** : Clic sur le bouton "Fermer" dans le footer
- **Méthode 2** : Clic en dehors du panneau (détection automatique)
- **Méthode 3** : Re-clic sur le bouton Notification

#### Détection de Clic Extérieur
```javascript
useEffect(() => {
  const handleClickOutside = (event) => {
    if (showNotifications && !event.target.closest('.notifications-panel')) {
      setShowNotifications(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [showNotifications]);
```

### 5. Style et UX

#### Hover Effects
- Chaque notification a un effet hover : `hover:bg-gray-50`
- Curseur pointer pour indiquer la cliquabilité
- Transition smooth : `transition-colors`

#### Header du Panneau
- Gradient jaune à orange : `bg-gradient-to-r from-yellow-400 to-orange-500`
- Texte blanc en gras
- Icône 🔔 pour cohérence visuelle

#### Footer du Panneau
- Fond gris clair : `bg-gray-50`
- Bouton "Fermer" en bleu
- Bordure supérieure pour séparer du contenu

#### Structure d'une Notification
```
┌─────────────────────────────────────┐
│ [Icône] [Titre]                     │
│         [Description]               │
│         [Temps relatif]             │
└─────────────────────────────────────┘
```

- **Icône** : Badge circulaire coloré avec emoji
- **Titre** : Texte en gras (font-medium)
- **Description** : Texte gris plus petit (text-xs)
- **Temps** : Texte gris clair très petit (text-xs text-gray-400)

## Améliorations Futures

### Phase 2 - Backend Integration
- [ ] Créer API endpoint `/api/notifications`
- [ ] Stocker notifications dans MongoDB
- [ ] Système de push notifications
- [ ] Marquer notifications comme lues

### Phase 3 - Fonctionnalités Avancées
- [ ] Filtres par type (Absences, Planning, Astreintes, etc.)
- [ ] Recherche dans les notifications
- [ ] Notifications en temps réel (WebSocket)
- [ ] Préférences de notifications
- [ ] Notifications par email/SMS

### Phase 4 - Actions Directes
- [ ] Approuver/Refuser une absence depuis la notification
- [ ] Accès direct au module concerné
- [ ] Archiver/Supprimer notifications
- [ ] Snooze notifications (rappel plus tard)

## État Actuel
- ✅ Panneau de notifications fonctionnel
- ✅ Badge de compteur avec nombre de notifications
- ✅ Fermeture automatique au clic extérieur
- ✅ 3 notifications mockées pour démonstration
- ✅ Design cohérent avec MOZAIK RH
- ✅ Responsive et accessible

## Tests à Effectuer
1. ✅ Vérifier que le bouton Notification ouvre le panneau
2. ✅ Vérifier que le badge affiche le bon nombre
3. ✅ Vérifier la fermeture au clic extérieur
4. ✅ Vérifier le bouton "Fermer"
5. ✅ Vérifier le hover sur chaque notification
6. ✅ Vérifier le style et l'alignement
7. ✅ Vérifier la responsivité mobile

## Fichier Modifié
- `/app/frontend/src/components/Layout.js`

## Prochaines Étapes
1. Valider l'implémentation avec l'utilisateur
2. Connecter au backend pour notifications réelles
3. Ajouter plus de types de notifications
4. Implémenter les actions directes depuis les notifications
