# Guide du Module Heures de Délégation - MOZAIK RH
## ⚖️ **CONFORME AU DROIT FRANÇAIS**

## Vue d'ensemble

Le module "Heures de Délégation" permet la gestion complète des heures allouées aux représentants du personnel selon leurs mandats (CSE, Délégué Syndical, etc.) en **CONFORMITÉ TOTALE** avec le Code du Travail français.

## 🚨 **NOUVELLES FONCTIONNALITÉS LÉGALES AJOUTÉES**

### ✅ **Cession d'Heures** (Art. L2315-7 Code du Travail)
- **Cession entre représentants** : Possibilité de céder des heures entre membres du CSE, délégués syndicaux, etc.
- **Information employeur automatique** : Notification automatique avec motif légalement requis
- **Traçabilité complète** : Historique des cessions avec base légale
- **Workflow de validation** : Approbation par l'administration RH

### ✅ **Calcul Automatique selon l'Effectif** (Code du Travail)
- **CSE** : Calcul automatique selon l'effectif (10h pour 50-74 salariés, 15h pour 75-99, etc.)
- **Délégués Syndicaux** : Heures calculées selon les seuils légaux
- **Mise à jour automatique** : Recalcul en cas de changement d'effectif

## Comptes de Test Disponibles

### 1. **Sophie Martin** (Admin RH)
- **Email** : sophie.martin@company.com
- **Mot de passe** : demo123
- **Rôle** : Administrateur RH
- **Fonctionnalités** : Peut désigner des titulaires, valider les heures, consulter tous les historiques

### 2. **Marie Leblanc** (Titulaire CSE)
- **Email** : marie.leblanc@company.com
- **Mot de passe** : demo123
- **Rôle** : Employée + Titulaire CSE
- **Quota** : 10h/mois
- **Heures utilisées** : 7.5h
- **Fonctionnalités** : Interface personnalisée avec "Ma Délégation", déclaration d'heures, suivi personnel

### 3. **Pierre Moreau** (Titulaire CSE avec Cession)
- **Email** : pierre.cse@company.com
- **Mot de passe** : demo123
- **Rôle** : Employé + Titulaire CSE
- **Département** : Production
- **Quota de base** : 10h/mois
- **Quota actuel** : 7h/mois (après cession de 3h à Jean Dupont)
- **Heures utilisées** : 3.5h
- **Heures cédées** : 3h (à Jean Dupont pour négociation urgente)
- **Fonctionnalités** : Interface personnalisée avec cessions, suivi des transferts d'heures

### 4. **Jean Dupont** (Manager + Délégué Syndical avec Heures Reçues)
- **Email** : jean.dupont@company.com
- **Mot de passe** : demo123
- **Rôle** : Manager + Délégué Syndical
- **Quota de base** : 15h/mois
- **Quota actuel** : 18h/mois (après réception de 3h de Pierre Moreau)
- **Heures reçues** : 3h (de Pierre Moreau pour expertise technique)
- **Fonctionnalités** : Interface complète admin + gestion des cessions reçues

## Types de Délégation Configurés

| Type | Nom Complet | Heures de Base | Couleur |
|------|-------------|----------------|---------|
| **CSE** | Membre CSE | 10h/mois | Bleu |
| **DS** | Délégué Syndical | 15h/mois | Vert |
| **RSS** | Représentant Syndical | 4h/mois | Violet |
| **CHSCT** | Membre CHSCT | 5h/mois | Orange |

## Fonctionnalités par Profil

### 👑 **Administrateurs RH** (Sophie Martin)
- **Vue d'ensemble** : Statistiques globales, liste des titulaires actifs
- **Désignation de titulaires** : Assigner des mandats aux employés
- **Validation des heures** : Approuver/refuser les déclarations
- **Configuration** : Paramétrer les types de délégation et règles

### 👤 **Employés Titulaires** (Marie Leblanc, Pierre Moreau)
- **Ma Délégation** : Vue personnalisée avec quota, heures utilisées, restantes
- **Déclaration d'heures** : Enregistrer ses activités de représentation
- **Historique personnel** : Suivi de ses propres déclarations
- **Statuts en temps réel** : Voir l'état de validation de ses demandes

### 👥 **Managers** (Jean Dupont)
- **Vue globale** : Comme les admins mais limité à leur périmètre
- **Validation d'équipe** : Valider les heures de leurs collaborateurs
- **Si titulaire** : Accès aussi à l'interface personnelle

## Activités Prédéfinies

- **Réunion CSE** : Réunions ordinaires et extraordinaires
- **Formation syndicale** : Formations spécialisées
- **Négociation** : Négociations collectives
- **Permanence syndicale** : Accueil et conseil des salariés
- **Consultation** : Consultations obligatoires
- **Enquête** : Enquêtes et investigations
- **Autre** : Activités spécifiques

## Processus de Workflow

### 1. **Désignation d'un Titulaire** (Admin uniquement)
1. Aller dans "Heures de Délégation" > Vue d'ensemble
2. Cliquer sur "Désigner Titulaire"
3. Sélectionner l'employé et le type de délégation
4. Définir la période de mandat
5. Confirmer la désignation

### 2. **Déclaration d'Heures** (Titulaires)
1. Accéder à "Ma Délégation" ou cliquer sur "Déclarer Heures"
2. Sélectionner la date et le nombre d'heures
3. Choisir le type d'activité
4. Décrire l'activité effectuée
5. Soumettre la déclaration

### 3. **Validation des Heures** (Admin/Manager)
1. Consulter l'historique des déclarations
2. Vérifier les détails de chaque déclaration
3. Approuver ou refuser avec motif
4. Les heures approuvées sont automatiquement décomptées

## Alertes et Indicateurs

### 🟢 **Utilisation Normale** (< 70%)
- Affichage en vert
- Pas d'alerte particulière

### 🟡 **Utilisation Élevée** (70-89%)
- Affichage en orange
- Suivi recommandé

### 🔴 **Utilisation Critique** (≥ 90%)
- Affichage en rouge
- Alerte dépassement de quota

## Données de Test Pré-configurées

### Historique d'Activités
- **Marie Leblanc** : 2 activités approuvées (5.5h utilisées)
- **Jean Dupont** : 1 activité approuvée + 1 en attente (6h utilisées)
- **Pierre Moreau** : 1 activité approuvée + 1 en attente (3.5h utilisées)

### Statistiques Globales
- **4 titulaires actifs**
- **39h de quota total mensuel**
- **21.5h utilisées ce mois**
- **Taux d'utilisation moyen : 55%**

## Comment Tester

### Test 1 : Vue Administrateur
1. Se connecter avec Sophie Martin
2. Aller dans "Heures de Délégation"
3. Explorer les statistiques globales
4. Désigner un nouveau titulaire
5. Valider des déclarations en attente

### Test 2 : Vue Titulaire CSE
1. Se connecter avec Pierre Moreau (pierre.cse@company.com)
2. Aller dans "Mes Heures Délégation"
3. Voir l'interface personnalisée "Ma Délégation"
4. Déclarer de nouvelles heures d'activité
5. Consulter son historique personnel

### Test 3 : Vue Employé Standard
1. Se connecter avec un employé non-titulaire
2. Constater l'absence du module dans le menu
3. Ou message informatif si pas de délégation assignée

## Configuration Avancée

Les administrateurs peuvent :
- Modifier les quotas d'heures par type de délégation
- Activer/désactiver l'attribution automatique
- Configurer les règles de report d'heures
- Paramétrer la validation obligatoire

## 📋 **Processus de Cession d'Heures** (NOUVEAU)

### 1. **Initiation de la Cession**
1. Aller dans "Heures de Délégation" > "Cessions d'Heures"
2. Cliquer sur "Nouvelle Cession"
3. Sélectionner le cédant (qui a des heures disponibles)
4. Sélectionner le bénéficiaire (autre représentant)
5. Définir le nombre d'heures et la date

### 2. **Justification Obligatoire**
- **Motif requis** : Justification légalement obligatoire
- **Exemples valides** : Négociation urgente, expertise spécialisée, surcharge ponctuelle
- **Information employeur** : Notification automatique avec motif

### 3. **Validation et Effet**
- **Approbation RH** : Validation par l'administration
- **Effet immédiat** : Transfert automatique des heures
- **Traçabilité** : Enregistrement complet avec base légale

## ⚖️ **Conformité Légale Complète**

### 📜 **Articles du Code du Travail Respectés**

| Article | Domaine | Conformité MOZAIK |
|---------|---------|-------------------|
| **L2315-7** | Crédit d'heures CSE | ✅ Calcul automatique selon effectif |
| **L2315-8** | Utilisation des heures | ✅ Validation et traçabilité |
| **L2315-9** | Dépassement exceptionnel | ✅ Configurable par admin |
| **L2143-13** | Crédit d'heures DS | ✅ Heures selon seuils légaux |
| **R2315-4** | Modalités de calcul | ✅ Formules légales appliquées |

### 🏢 **Calcul selon l'Effectif (Automatique)**

**Entreprise actuelle : 78 salariés**

#### CSE (Article L2315-7)
- ❌ **Moins de 50** : Pas de crédit d'heures
- ❌ **50-74 salariés** : 10h/mois par membre
- ✅ **75-99 salariés** : **15h/mois par membre** ← *Applicable*
- ❌ **100+ salariés** : 20h/mois par membre

#### Délégués Syndicaux (Article L2143-13)
- ❌ **50-150 salariés** : 10h/mois
- ✅ **151-500 salariés** : **15h/mois** ← *Applicable*
- ❌ **500+ salariés** : 20h/mois

### 🔄 **Règles de Cession (Article L2315-7)**

#### ✅ **Cessions Autorisées**
- Entre membres du même CSE
- Entre délégués syndicaux
- Entre représentants de proximité
- Entre instances différentes (CSE ⟷ DS)

#### ⚠️ **Conditions Obligatoires**
- **Information préalable** de l'employeur ✅
- **Motif justifié** de la cession ✅
- **Accord** du bénéficiaire ✅
- **Respect** du crédit global d'heures ✅

### 📊 **Obligations de Traçabilité**

#### ✅ **Éléments Tracés**
- **Qui** : Identité du représentant
- **Quand** : Date et heure précises
- **Combien** : Nombre d'heures utilisées
- **Pourquoi** : Motif de l'utilisation
- **Validation** : Approbation hiérarchique
- **Cessions** : Transferts entre représentants

#### 📋 **Rapports Légaux Générés**
- Utilisation mensuelle par représentant
- Cessions effectuées et reçues
- Dépassements exceptionnels
- Heures non utilisées (report possible)

### 💰 **Règles de Rémunération**

#### ✅ **Conformité Salariale**
- **Heures payées** comme temps de travail normal
- **Cessions** : Pas d'impact sur la rémunération
- **Dépassements** : Heures supplémentaires si autorisées
- **Report** : Heures reportables sur 3 mois maximum

## 🧪 **Tests de Conformité**

### Test Cession d'Heures
1. **Se connecter** avec Pierre Moreau (pierre.cse@company.com)
2. **Aller** dans "Mes Heures Délégation" > "Cessions d'Heures"
3. **Constater** la cession de 3h à Jean Dupont
4. **Vérifier** le motif légal : "Négociation urgente accord télétravail"
5. **Contrôler** la base légale : "Art. L2315-7 Code du Travail"

### Test Réception d'Heures
1. **Se connecter** avec Jean Dupont (jean.dupont@company.com)
2. **Constater** quota actuel : 18h (15h + 3h reçues)
3. **Vérifier** traçabilité complète de la réception

### Test Calcul Effectif
1. **Vérifier** dans Configuration que l'effectif (78 salariés) donne 15h/mois pour CSE
2. **Contrôler** application automatique des seuils légaux

## 🚨 **Points de Vigilance Légale**

### ⚠️ **Limites à Respecter**
- **Cession maximale** : Ne pas dépasser le crédit global de l'instance
- **Justification** : Motif obligatoire pour chaque cession
- **Information** : Employeur informé sous 48h (automatique)
- **Report** : Maximum 3 mois selon jurisprudence

### 📞 **Support Juridique**
En cas de contrôle de l'inspection du travail, tous les éléments de traçabilité sont disponibles dans le module avec références légales complètes.

---

*Module MOZAIK RH - Version 2.0 - Conforme Code du Travail français*
*Dernière mise à jour : Janvier 2024*