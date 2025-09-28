// Helper pour la navigation globale dans l'application MOZAIK RH
// Solution alternative pour les boutons d'actions rapides

// Fonction globale de navigation qui fonctionne indépendamment des props
export const navigateToView = (viewId) => {
  console.log(`🔄 Attempting navigation to: ${viewId}`);
  
  // Méthode 1: Essayer de trouver et déclencher le bouton du menu correspondant
  const menuMappings = {
    'analytics': 'Analytics & KPI',
    'user-management': 'Gestion Utilisateurs',
    'monthly-planning': 'Planning Mensuel',
    'hr-toolbox': 'Boîte à outils RH'
  };
  
  const menuText = menuMappings[viewId];
  if (menuText) {
    // Ouvrir le menu hamburger si nécessaire
    const hamburgerMenu = document.querySelector('.bg-gradient-to-br.from-orange-400');
    if (hamburgerMenu) {
      hamburgerMenu.click();
      
      // Attendre un peu puis cliquer sur l'item du menu
      setTimeout(() => {
        const menuItem = Array.from(document.querySelectorAll('*')).find(
          element => element.textContent && element.textContent.includes(menuText)
        );
        
        if (menuItem) {
          console.log(`✅ Found menu item for ${menuText}, clicking...`);
          menuItem.click();
        } else {
          console.log(`❌ Menu item not found for ${menuText}`);
        }
      }, 500);
    }
  }
  
  // Méthode 2: Event custom pour fallback
  window.dispatchEvent(new CustomEvent('navigate-to-view', { 
    detail: { view: viewId } 
  }));
  
  // Méthode 3: Modifier l'URL directement (si routing par hash)
  if (window.location.hash !== `#${viewId}`) {
    window.location.hash = viewId;
  }
};

// Fonction pour attacher les event listeners aux boutons d'actions rapides
export const attachQuickActionListeners = () => {
  console.log('🔧 Attaching quick action listeners...');
  
  // Mappings des textes de boutons vers les vues
  const buttonMappings = {
    'Générer Rapport': 'analytics',
    'Nouvel Employé': 'user-management', 
    'Planifier Réunion': 'monthly-planning',
    'Export Paie': 'hr-toolbox'
  };
  
  // Attacher les listeners à tous les boutons d'actions rapides
  Object.entries(buttonMappings).forEach(([buttonText, viewId]) => {
    const buttons = Array.from(document.querySelectorAll('button')).filter(
      button => button.textContent && button.textContent.includes(buttonText)
    );
    
    buttons.forEach(button => {
      // Supprimer les anciens listeners pour éviter les doublons
      button.removeEventListener('click', button._quickActionHandler);
      
      // Créer le nouveau handler
      const handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`🔍 Quick action clicked: ${buttonText}`);
        navigateToView(viewId);
      };
      
      // Stocker la référence du handler et l'attacher
      button._quickActionHandler = handler;
      button.addEventListener('click', handler, true); // useCapture = true
      
      console.log(`✅ Listener attached to ${buttonText} button`);
    });
  });
};

// Initialisation simple sans setInterval pour éviter les fuites mémoire
if (typeof window !== 'undefined') {
  const initializeNavigation = () => {
    attachQuickActionListeners();
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNavigation);
  } else {
    initializeNavigation();
  }
}