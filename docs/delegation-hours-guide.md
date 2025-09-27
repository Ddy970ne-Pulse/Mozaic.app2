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

## Conformité Légale

Le module respecte :
- **Code du Travail** : Articles L2315-1 et suivants (CSE)
- **Heures de délégation** : Calcul selon l'effectif de l'entreprise
- **Droits syndicaux** : Articles L2142-1 et suivants
- **Traçabilité** : Audit trail complet des activités

---

*Module développé pour MOZAIK RH - Version 1.0*