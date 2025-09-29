// Script pour forcer la navigation vers Planning Mensuel
// À injecter via JavaScript dans la page

export const forceNavigateToPlanning = () => {
  // Méthode 1: Trouver et déclencher directement le handler React
  const planningButton = document.querySelector('[data-testid="menu-monthly-planning"]') || 
                        Array.from(document.querySelectorAll('button')).find(btn => 
                          btn.textContent && btn.textContent.includes('Planning Mensuel')
                        );
  
  if (planningButton) {
    console.log('Found Planning Mensuel button, forcing click...');
    
    // Déclencher tous les types d'événements possibles
    planningButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    planningButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    planningButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    
    // Si React handlers sont attachés via event delegation
    const clickEvent = new Event('click', { bubbles: true, cancelable: true });
    planningButton.dispatchEvent(clickEvent);
    
    return true;
  }
  
  // Méthode 2: Manipulation directe du state React (si accessible)
  const reactFiber = planningButton?._reactInternalFiber || planningButton?.__reactInternalInstance;
  if (reactFiber) {
    console.log('Trying React fiber manipulation...');
    // Tentative d'accès au state parent
  }
  
  return false;
};

export const debugMenuStructure = () => {
  console.log('=== MENU DEBUG ===');
  
  const hamburger = document.querySelector('.bg-gradient-to-br.from-orange-400');
  console.log('Hamburger button:', hamburger);
  
  const menuContainer = document.querySelector('.fixed.inset-0.z-50');
  console.log('Menu container:', menuContainer);
  
  const planningButtons = Array.from(document.querySelectorAll('*')).filter(el => 
    el.textContent && el.textContent.includes('Planning Mensuel')
  );
  console.log('Planning buttons found:', planningButtons.length);
  
  planningButtons.forEach((btn, index) => {
    console.log(`Button ${index}:`, {
      tagName: btn.tagName,
      classes: btn.className,
      textContent: btn.textContent,
      onClick: btn.onclick,
      eventListeners: getEventListeners ? getEventListeners(btn) : 'Not available'
    });
  });
};