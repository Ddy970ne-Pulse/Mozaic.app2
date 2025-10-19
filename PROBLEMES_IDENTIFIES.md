# Problèmes Identifiés - MOZAIK RH

## 1. WebSocket - Statut "Hors ligne"

**Problème**: L'indicateur affiche "Hors ligne" même quand l'utilisateur est connecté

**Cause**: Les connexions WebSocket ne peuvent pas s'établir à travers l'ingress Kubernetes
- Backend logs: "Broadcasting to 0 connections"
- Pas de connexions WebSocket établies
- Problème de configuration Ingress/CORS pour WebSocket

**Solution temporaire**: Désactiver l'indicateur WebSocket pour éviter la confusion
**Solution permanente**: Configuration Ingress pour supporter les WebSockets (annotations spéciales)

## 2. Journal des Demandes - Non mis à jour

**Problème**: Les demandes approuvées/rejetées n'apparaissent pas dans le journal

**Cause**: Le composant AbsenceRequests.js recharge les données mais il y a peut-être:
- Un délai entre l'API call et le reload
- Les anciennes absences importées n'ont pas le bon format "status"
- Le filtrage par status ne fonctionne pas correctement

**Solution**: 
- Optimistic UI update (déjà implémenté)
- Vérifier que toutes les absences ont un champ "status"
- Ajouter plus de logging pour debugging

## 3. Synchronisation des Compteurs

**Problème**: Vérifier si les compteurs des salariés sont synchronisés lors de l'approbation

**Backend**: ✅ La synchronisation est implémentée
- Ligne 3624 de server.py: `sync_service.sync_absence_to_counters()`
- La synchronisation se fait automatiquement lors de l'approbation

**À vérifier**: 
- Les compteurs leave_balances sont-ils créés pour tous les employés?
- La déduction fonctionne-t-elle correctement?
- Les transactions sont-elles enregistrées?

## Actions Immédiates

1. Désactiver WebSocket temporairement (éviter confusion)
2. Ajouter logging détaillé dans AbsenceRequests
3. Vérifier les compteurs dans MongoDB
4. Corriger le rechargement du journal
