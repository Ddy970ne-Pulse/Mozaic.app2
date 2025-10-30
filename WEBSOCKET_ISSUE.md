# 🔌 Problème WebSocket - MOZAIK RH

## Statut: EN ATTENTE DE CONFIGURATION INFRASTRUCTURE

### Description du Problème

Les connexions WebSocket échouent avec une erreur 404 lors du handshake:
```
WebSocket connection to 'wss://hr-multi-saas.preview.emergentagent.com/api/ws/{user_id}' failed: 
Error during WebSocket handshake: Unexpected response code: 404
```

### Analyse

1. **Backend**: ✅ Correctement implémenté
   - Endpoint FastAPI: `@app.websocket("/api/ws/{user_id}")`
   - ConnectionManager fonctionnel
   - Broadcasts implémentés

2. **Frontend**: ✅ Correctement implémenté
   - Hook `useWebSocket.js` créé
   - URL correcte: `wss://domain.com/api/ws/{user_id}`
   - Reconnexion automatique implémentée

3. **Infrastructure**: ❌ PROBLÈME IDENTIFIÉ
   - Kubernetes Ingress ne route pas correctement les WebSockets
   - Les WebSockets nécessitent une configuration spéciale dans Ingress:
     - Annotation `nginx.ingress.kubernetes.io/websocket-services`
     - Ou upgrade de connexion HTTP → WebSocket

### Root Cause

Les règles Ingress Kubernetes actuelles routent correctement les requêtes HTTP vers `/api/*` → backend:8001, mais **ne gèrent pas l'upgrade WebSocket**.

### Solutions Possibles

#### Solution 1: Configuration Ingress (Recommandé)
Ajouter dans l'Ingress Kubernetes:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/websocket-services: "backend"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
spec:
  rules:
  - host: hr-multi-saas.preview.emergentagent.com
    http:
      paths:
      - path: /api/ws
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 8001
```

#### Solution 2: Polling Alternative (Temporaire)
Remplacer WebSocket par du polling HTTP:
- GET `/api/notifications/recent` toutes les 5 secondes
- Moins efficace mais fonctionne avec infrastructure actuelle

#### Solution 3: Server-Sent Events (SSE)
Alternative à WebSocket, compatible HTTP:
- Unidirectionnel (serveur → client)
- Fonctionne mieux avec proxies/load balancers

### Action Temporaire Implémentée

Pour éviter les erreurs console et améliorer l'UX, le WebSocket reste actif mais en mode "graceful degradation":
- Tentatives de connexion avec retry automatique
- Pas de blocage des fonctionnalités si WebSocket échoue
- Notifications et synchronisation fonctionnent via reload API

### Action Requise

**Contacter l'équipe DevOps/Infrastructure** pour:
1. Vérifier la configuration Ingress Kubernetes
2. Ajouter support WebSocket dans l'Ingress
3. Tester la connexion WebSocket après modification

### Workaround Actuel

L'application fonctionne correctement **SANS WebSocket temps réel**:
- ✅ Notifications in-app fonctionnelles (rechargement périodique)
- ✅ Validation absences fonctionnelle
- ✅ Planning synchronisé (rechargement manuel)
- ⚠️ Pas de mise à jour temps réel automatique entre utilisateurs

### Tests à Effectuer Après Fix Infrastructure

```bash
# Test 1: Connexion WebSocket manuelle
wscat -c wss://hr-multi-saas.preview.emergentagent.com/api/ws/test-user-id

# Test 2: Vérifier dans browser console
# Doit voir: "✅ WebSocket connected"

# Test 3: Test multi-utilisateurs
# User 1 crée absence → User 2 doit voir mise à jour automatique
```

### Références

- [FastAPI WebSockets](https://fastapi.tiangolo.com/advanced/websockets/)
- [Kubernetes Ingress WebSocket](https://kubernetes.github.io/ingress-nginx/user-guide/miscellaneous/#websockets)
- [Nginx WebSocket Proxy](https://nginx.org/en/docs/http/websocket.html)

---

**Date**: 30 Janvier 2025  
**Assigné à**: Équipe Infrastructure / DevOps  
**Priorité**: Moyenne (workaround fonctionnel en place)
