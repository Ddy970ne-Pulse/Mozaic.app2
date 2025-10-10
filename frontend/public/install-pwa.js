// Script pour l'installation PWA
let deferredPrompt;
let installButton;

window.addEventListener('DOMContentLoaded', () => {
  // Créer le bouton d'installation
  createInstallButton();
  
  // Détecter si l'app est déjà installée
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
    console.log('📱 App déjà installée');
    hideInstallButton();
  }
});

// Créer le bouton d'installation
function createInstallButton() {
  installButton = document.createElement('button');
  installButton.id = 'install-pwa-button';
  installButton.innerHTML = '📱 Installer l\'application';
  installButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    padding: 12px 24px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;
    border-radius: 50px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    display: none;
    transition: all 0.3s ease;
  `;
  
  installButton.addEventListener('mouseover', () => {
    installButton.style.transform = 'translateY(-2px)';
    installButton.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.5)';
  });
  
  installButton.addEventListener('mouseout', () => {
    installButton.style.transform = 'translateY(0)';
    installButton.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
  });
  
  installButton.addEventListener('click', installApp);
  document.body.appendChild(installButton);
}

// Écouter l'événement beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('📱 PWA peut être installée');
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});

// Afficher le bouton
function showInstallButton() {
  if (installButton) {
    installButton.style.display = 'block';
  }
}

// Cacher le bouton
function hideInstallButton() {
  if (installButton) {
    installButton.style.display = 'none';
  }
}

// Installer l'application
async function installApp() {
  if (!deferredPrompt) {
    console.log('❌ Installation non disponible');
    return;
  }
  
  // Afficher le prompt d'installation
  deferredPrompt.prompt();
  
  // Attendre la réponse de l'utilisateur
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`✅ Installation: ${outcome}`);
  
  if (outcome === 'accepted') {
    console.log('🎉 Application installée!');
  }
  
  // Réinitialiser
  deferredPrompt = null;
  hideInstallButton();
}

// Enregistrer le Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker enregistré:', registration.scope);
        
        // Vérifier les mises à jour
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 Nouvelle version disponible. Rechargez la page.');
              showUpdateNotification();
            }
          });
        });
      })
      .catch((error) => {
        console.log('❌ Erreur Service Worker:', error);
      });
  });
}

// Afficher une notification de mise à jour
function showUpdateNotification() {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    padding: 16px 24px;
    background: #10b981;
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  `;
  notification.innerHTML = '🔄 Nouvelle version disponible. Cliquez pour mettre à jour.';
  notification.addEventListener('click', () => {
    window.location.reload();
  });
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 10000);
}