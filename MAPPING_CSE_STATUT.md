# 🏛️ Mapping CSE - Import Excel vers Statut CSE

## 📋 Vue d'ensemble

Le système MOZAIK RH importe automatiquement les membres CSE depuis les fichiers Excel et les affiche dans le module **CSE & Délégation**.

## 🔄 Flux de données

### 1. Colonne Excel : `membre_cse`
Dans votre fichier Excel d'import des employés, la colonne **16** doit contenir le statut CSE de chaque employé.

**Valeurs acceptées (insensibles à la casse) :**

| Valeur Excel | Statut CSE Résultant | Remarques |
|--------------|---------------------|-----------|
| `titulaire` | **Titulaire** | Membre titulaire du CSE |
| `délégué` | **Titulaire** | Équivalent à titulaire |
| `delegue` | **Titulaire** | Équivalent à titulaire |
| `suppléant` | **Suppléant** | Membre suppléant du CSE |
| `suppleant` | **Suppléant** | Sans accent |
| `suppléante` | **Suppléant** | Forme féminine |
| `suppleante` | **Suppléant** | Forme féminine sans accent |
| *(vide)* | **Non-membre** | Pas membre du CSE |

### 2. Modèle de données Backend

**Fichier:** `/app/backend/server.py`

**Modèle User (lignes 444-507):**
```python
class User(BaseModel):
    ...
    isDelegateCSE: Optional[bool] = False  # Flag général CSE
    statut_cse: Optional[constr(pattern=r'^(Titulaire|Suppléant|Non-membre)?$')] = 'Non-membre'  # Statut précis
    ...
```

**Import des employés (lignes 3640-3700):**
```python
# Détection automatique du statut CSE
if membre_cse_raw in ['titulaire', 'délégué', 'delegue']:
    is_cse_delegate = True
    cse_status = 'Titulaire'
elif membre_cse_raw in ['suppléant', 'suppleant', 'suppléante', 'suppleante']:
    is_cse_delegate = True
    cse_status = 'Suppléant'

# Création utilisateur avec statut CSE
user_account = UserInDB(
    ...
    isDelegateCSE=is_cse_delegate,
    statut_cse=cse_status.capitalize() if cse_status else 'Non-membre',
    ...
)
```

### 3. Composant Frontend CSE

**Fichier:** `/app/frontend/src/components/CSEManagementNew.js`

**Filtrage des membres (ligne ~70):**
```javascript
const titulaires = users.filter(u => u.statut_cse === 'Titulaire');
const suppleants = users.filter(u => u.statut_cse === 'Suppléant');
```

## 📊 Exemple de fichier Excel

| Nom | Prénom | Email | ... | Membre CSE |
|-----|--------|-------|-----|------------|
| DACALOR | Diégo | ddacalor@aaea-gpe.fr | ... | **titulaire** |
| GREGOIRE | Cindy | cgregoire@aaea-gpe.fr | ... | **titulaire** |
| POULAIN | Jean-Max | jmpoulain@aaea-gpe.fr | ... | **suppléant** |
| MARTIN | Sophie | smartin@aaea-gpe.fr | ... | *(vide)* |

**Résultat dans MOZAIK RH :**
- **Module CSE & Délégation** affiche :
  - 2 Titulaires (Diégo, Cindy)
  - 1 Suppléant (Jean-Max)
  - Sophie n'apparaît pas (Non-membre)

## 🔧 Gestion manuelle (sans import)

Si vous voulez ajouter/modifier des membres CSE sans réimporter tout le fichier Excel :

1. **Menu hamburger** → **Gestion Utilisateurs**
2. Cliquez sur l'utilisateur à modifier
3. Changez le champ **🏛️ Statut CSE** :
   - Non-membre *(par défaut)*
   - Titulaire
   - Suppléant
4. **Sauvegarder**
5. Le membre apparaît immédiatement dans **CSE & Délégation**

## ✅ Vérification

### Test d'import réussi
```bash
cd /app
python init_cse_members.py
```

**Console devrait afficher :**
```
🏛️ Initialisation des membres CSE...
✅ Diégo DACALOR → Titulaire
✅ Cindy GREGOIRE → Titulaire
✅ Jean-Max POULAIN → Suppléant

🎉 3 membre(s) CSE initialisé(s)
```

### Vérification dans l'application
1. Login admin : `ddacalor@aaea-gpe.fr` / `admin123`
2. Menu → **CSE & Délégation**
3. Vous devez voir 2 sections :
   - **👥 Membres Titulaires** (2 personnes)
   - **🔄 Membres Suppléants** (1 personne)

## 🐛 Dépannage

### Problème : Aucun membre n'apparaît

**Solution 1 : Vérifier la base de données**
```bash
# Connexion MongoDB
docker exec -it mongodb mongosh

# Vérifier les statuts CSE
use mozaik_rh
db.users.find({statut_cse: {$ne: 'Non-membre'}}, {name: 1, statut_cse: 1})
```

**Solution 2 : Réimporter les employés**
- Assurez-vous que la colonne **membre_cse** contient bien `titulaire` ou `suppléant`
- Réimportez le fichier Excel via **Import Excel → Données Employés**

**Solution 3 : Script de migration**
Si vous avez des utilisateurs avec `isDelegateCSE=true` mais pas de `statut_cse` :
```python
# Script de migration automatique
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def migrate_cse_status():
    client = AsyncIOMotorClient('mongodb://localhost:27017/')
    db = client['mozaik_rh']
    
    # Mettre à jour les délégués sans statut_cse
    result = await db.users.update_many(
        {'isDelegateCSE': True, 'statut_cse': {'$exists': False}},
        {'$set': {'statut_cse': 'Titulaire'}}
    )
    
    print(f"✅ {result.modified_count} membres CSE migrés")

asyncio.run(migrate_cse_status())
```

## 📝 Notes importantes

1. **Sensibilité à la casse** : Le système accepte `TITULAIRE`, `Titulaire`, `titulaire`, etc.
2. **Accents** : Le système accepte avec ou sans accents (`suppléant` ou `suppleant`)
3. **Persistance** : Le statut CSE est stocké de manière permanente en base
4. **Modification** : Vous pouvez modifier le statut à tout moment via Gestion Utilisateurs
5. **Import multiple** : Chaque import met à jour les utilisateurs existants

## 🎯 Résumé

✅ **Import Excel** → Colonne `membre_cse` détectée automatiquement  
✅ **Backend** → Converti en `statut_cse` (Titulaire/Suppléant/Non-membre)  
✅ **Frontend** → Affiché dans module **CSE & Délégation**  
✅ **Modification manuelle** → Via **Gestion Utilisateurs**
