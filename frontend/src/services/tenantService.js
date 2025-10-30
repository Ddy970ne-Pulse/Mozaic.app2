/**
 * Tenant Service - MOZAIK RH Multi-Tenant Frontend
 * Détection automatique du tenant et injection du header X-Tenant-Id
 */

/**
 * Détecter le tenant actuel depuis l'URL ou le localStorage
 * 
 * Ordre de priorité:
 * 1. Query parameter: ?tenant_id=xxx
 * 2. LocalStorage: tenant_id
 * 3. Subdomain: tenant.mozaikrh.com
 * 4. Défaut: "aaea-cava" (développement)
 */
export const detectCurrentTenant = () => {
  // 1. Vérifier le query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const urlTenant = urlParams.get('tenant_id');
  if (urlTenant) {
    // Sauvegarder dans localStorage pour persistance
    localStorage.setItem('tenant_id', urlTenant);
    return urlTenant;
  }
  
  // 2. Vérifier localStorage
  const storedTenant = localStorage.getItem('tenant_id');
  if (storedTenant) {
    return storedTenant;
  }
  
  // 3. Extraire depuis le subdomain
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // Si c'est un subdomain (ex: aaea-cava.mozaikrh.com)
  if (parts.length >= 3) {
    const subdomain = parts[0];
    // Ignorer les subdomains standards
    if (!['www', 'api', 'preview', 'staging', 'localhost'].includes(subdomain)) {
      localStorage.setItem('tenant_id', subdomain);
      return subdomain;
    }
  }
  
  // 4. Défaut pour développement
  const defaultTenant = 'aaea-cava';
  localStorage.setItem('tenant_id', defaultTenant);
  return defaultTenant;
};

/**
 * Changer le tenant actuel
 * @param {string} tenantId - Nouveau tenant ID
 */
export const setCurrentTenant = (tenantId) => {
  localStorage.setItem('tenant_id', tenantId);
  // Recharger la page pour appliquer le changement
  window.location.reload();
};

/**
 * Client API avec injection automatique du tenant header
 * 
 * Usage:
 * ```javascript
 * import { apiClient } from './services/tenantService';
 * 
 * const users = await apiClient.get('/api/users');
 * const absence = await apiClient.post('/api/absences', absenceData);
 * ```
 */
export const apiClient = {
  /**
   * GET request avec tenant header
   */
  get: async (url, options = {}) => {
    const tenantId = detectCurrentTenant();
    
    const response = await fetch(url, {
      ...options,
      method: 'GET',
      headers: {
        ...options.headers,
        'X-Tenant-Id': tenantId
      }
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
  
  /**
   * POST request avec tenant header
   */
  post: async (url, data, options = {}) => {
    const tenantId = detectCurrentTenant();
    
    const response = await fetch(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        'X-Tenant-Id': tenantId
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
  
  /**
   * PUT request avec tenant header
   */
  put: async (url, data, options = {}) => {
    const tenantId = detectCurrentTenant();
    
    const response = await fetch(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        'X-Tenant-Id': tenantId
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
  
  /**
   * DELETE request avec tenant header
   */
  delete: async (url, options = {}) => {
    const tenantId = detectCurrentTenant();
    
    const response = await fetch(url, {
      ...options,
      method: 'DELETE',
      headers: {
        ...options.headers,
        'X-Tenant-Id': tenantId
      }
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
};

/**
 * Hook React pour utiliser le tenant dans les composants
 * 
 * Usage:
 * ```javascript
 * import { useTenant } from './services/tenantService';
 * 
 * function MyComponent() {
 *   const { tenantId, setTenant } = useTenant();
 *   
 *   return (
 *     <div>
 *       <p>Current tenant: {tenantId}</p>
 *       <button onClick={() => setTenant('new-tenant')}>Change Tenant</button>
 *     </div>
 *   );
 * }
 * ```
 */
export const useTenant = () => {
  const [tenantId, setTenantId] = React.useState(() => detectCurrentTenant());
  
  const setTenant = (newTenantId) => {
    setCurrentTenant(newTenantId);
    setTenantId(newTenantId);
  };
  
  return {
    tenantId,
    setTenant
  };
};

/**
 * Composant pour afficher le tenant actuel (pour debug/admin)
 */
export const TenantIndicator = () => {
  const tenantId = detectCurrentTenant();
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: '#1e40af',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: 'bold',
      zIndex: 9999
    }}>
      🏢 Tenant: {tenantId}
    </div>
  );
};

export default {
  detectCurrentTenant,
  setCurrentTenant,
  apiClient,
  useTenant,
  TenantIndicator
};
