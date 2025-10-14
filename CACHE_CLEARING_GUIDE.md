# 🔄 Guide de Vidage du Cache Navigateur - MOZAIK RH

## ⚠️ PROBLÈME ACTUEL

Vous voyez toujours l'erreur **422 (Unprocessable Content)** car votre navigateur utilise une **ancienne version du code JavaScript** mise en cache.

L'erreur affiche : `[object Object],[object Object]` au lieu du message d'erreur détaillé.

## ✅ SOLUTION : Vider Complètement le Cache

### Méthode 1 : Rechargement Forcé (Recommandé)

#### Sur Windows / Linux :
1. Ouvrez l'application MOZAIK RH
2. Appuyez sur : **Ctrl + Shift + R** (ou **Ctrl + F5**)
3. Attendez que la page se recharge complètement

#### Sur Mac :
1. Ouvrez l'application MOZAIK RH  
2. Appuyez sur : **Cmd + Shift + R** (ou **Cmd + Option + R**)
3. Attendez que la page se recharge complètement

---

### Méthode 2 : Vider le Cache Complet (Si Méthode 1 ne fonctionne pas)

#### Chrome / Edge :
1. Ouvrez les **Outils de développement** : 
   - Windows/Linux : **F12** ou **Ctrl + Shift + I**
   - Mac : **Cmd + Option + I**
2. Faites un **clic droit** sur le bouton de rechargement (⟳) à côté de la barre d'adresse
3. Sélectionnez **"Vider le cache et effectuer une actualisation forcée"**

#### Firefox :
1. Ouvrez le menu (**☰** en haut à droite)
2. Allez dans **Paramètres** → **Vie privée et sécurité**
3. Section **Cookies et données de sites** → cliquez **Effacer les données...**
4. Cochez **Contenu web en cache** → cliquez **Effacer**
5. Rechargez la page : **Ctrl + Shift + R** (Windows/Linux) ou **Cmd + Shift + R** (Mac)

#### Safari (Mac) :
1. Menu **Safari** → **Préférences** → **Avancées**
2. Cochez **"Afficher le menu Développement dans la barre des menus"**
3. Menu **Développement** → **Vider les caches**
4. Rechargez la page : **Cmd + R**

---

### Méthode 3 : Mode Navigation Privée (Test Rapide)

Si vous voulez juste tester sans vider le cache principal :

1. Ouvrez une **fenêtre de navigation privée** :
   - Chrome/Edge : **Ctrl + Shift + N** (Windows) ou **Cmd + Shift + N** (Mac)
   - Firefox : **Ctrl + Shift + P** (Windows) ou **Cmd + Shift + P** (Mac)
   - Safari : **Cmd + Shift + N**

2. Connectez-vous à MOZAIK RH dans cette fenêtre
3. Testez la création de demande d'absence

---

## 🔍 Comment Vérifier que le Cache est Vidé ?

Après avoir vidé le cache :

1. Ouvrez la console développeur (**F12**)
2. Allez dans l'onglet **Console**
3. Créez une demande d'absence
4. Si vous voyez maintenant un message d'erreur **détaillé** au lieu de `[object Object]`, le cache a été vidé avec succès

Exemple de message d'erreur détaillé (si erreur) :
```
❌ Erreur backend: body.jours_absence: Input should be a valid string
```

---

## ✅ Vérification Finale

Une fois le cache vidé :

1. Connectez-vous à MOZAIK RH
2. Allez dans **Mon Espace** → Onglet **Mes Demandes**
3. Remplissez le formulaire :
   - Type d'absence : Congés Annuels (CA)
   - Nombre de jours : 5
   - Date début : 01/09/2025
   - Date fin : 09/09/2025
   - Commentaire : Test
4. Cliquez sur **📤 Soumettre Ma Demande**

**Résultat attendu** :
- ✅ Message de succès : "✅ Demande soumise avec succès"
- ✅ Le formulaire se vide automatiquement
- ✅ La demande apparaît dans la liste "Mes Demandes d'Absence" avec statut "⏳ En attente"
- ✅ La demande apparaît aussi dans le module "Demandes d'Absence" (menu principal)

---

## 🆘 Si le Problème Persiste

Si après avoir vidé le cache, l'erreur 422 persiste :

1. Ouvrez la console (F12) → Onglet **Console**
2. Recherchez la ligne `📤 Envoi demande d'absence:`
3. Vérifiez la valeur de `jours_absence` :
   - ✅ Doit être une **string** : `"5"`
   - ❌ Ne doit PAS être un **nombre** : `5`

4. Prenez une capture d'écran de la console et partagez-la

---

## 📋 Résumé Rapide

```
Windows/Linux : Ctrl + Shift + R
Mac          : Cmd + Shift + R
Alternative  : F12 → Clic droit sur ⟳ → Vider cache et recharger
```

---

**Date de mise à jour** : 14 octobre 2025  
**Version** : v7 - Fix erreur 422
