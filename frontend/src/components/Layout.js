import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import EmployeeDashboard from './EmployeeDashboard';
import MonthlyPlanningFinal from './MonthlyPlanningFinal';
import HRToolbox from './HRToolbox';
import AbsenceRequests from './AbsenceRequests';
import EmployeeSpace from './EmployeeSpace';
import SettingsPage from './SettingsPage';
import Analytics from './Analytics';
import OvertimeModule from './OvertimeModule';
import DelegationHours from './DelegationHours';
import UserManagement from './UserManagement';
import OnCallManagement from './OnCallManagement';

const Layout = ({ user, currentView, setCurrentView, onLogout }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Listener pour la navigation fallback depuis les boutons d'actions rapides
    const handleCustomNavigation = (event) => {
      console.log('🔄 Custom navigation event received:', event.detail.view);
      setCurrentView(event.detail.view);
    };
    window.addEventListener('navigate-to-view', handleCustomNavigation);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('navigate-to-view', handleCustomNavigation);
    };
  }, []);

  const menuItems = user.role === 'employee' ? [
    { id: 'employee-dashboard', name: 'Mon Tableau de Bord', icon: '🏠', color: 'from-blue-500 to-blue-600' },
    { id: 'my-space', name: 'Mon Espace', icon: '👤', color: 'from-green-500 to-green-600' },
    { id: 'my-requests', name: 'Mes Demandes', icon: '📝', color: 'from-orange-500 to-orange-600' },
    { id: 'delegation-hours', name: 'Mes Heures Délégation', icon: '⚖️', color: 'from-cyan-500 to-cyan-600' }
  ] : [
    { id: 'dashboard', name: 'Tableau de Bord', icon: '🏠', color: 'from-blue-500 to-blue-600' },
    { id: 'my-space', name: 'Mon Espace', icon: '👤', color: 'from-green-500 to-green-600' },
    { id: 'absence-requests', name: 'Demandes d\'Absence', icon: '📝', color: 'from-orange-500 to-orange-600' },
    { id: 'monthly-planning', name: 'Planning Mensuel', icon: '📅', color: 'from-purple-500 to-purple-600' },
    { id: 'analytics', name: 'Analytics & KPI', icon: '📊', color: 'from-indigo-500 to-indigo-600' },
    { id: 'overtime', name: 'Heures Supplémentaires', icon: '⏰', color: 'from-red-500 to-red-600' },
    { id: 'delegation-hours', name: 'Heures de Délégation', icon: '⚖️', color: 'from-cyan-500 to-cyan-600' },
    { id: 'on-call-management', name: 'Gestion Astreintes', icon: '🔔', color: 'from-orange-600 to-red-600' },
    { id: 'hr-toolbox', name: 'Boîte à outils RH', icon: '🛠️', color: 'from-teal-500 to-teal-600' },
    { id: 'user-management', name: 'Gestion Utilisateurs', icon: '👥', color: 'from-pink-500 to-pink-600' }
  ];

  const getCurrentPageTitle = () => {
    const item = menuItems.find(item => item.id === currentView);
    return item ? item.name : 'MOZAIK RH';
  };

  const renderCurrentView = () => {
    if (user.role === 'employee') {
      switch (currentView) {
        case 'employee-dashboard':
          return <EmployeeDashboard user={user} />;
        case 'my-space':
          return <EmployeeSpace user={user} />;
        case 'my-requests':
          return <AbsenceRequests user={user} />;
        case 'delegation-hours':
          return <DelegationHours user={user} />;
        case 'settings':
          return <SettingsPage user={user} />;
        default:
          return <EmployeeDashboard user={user} />;
      }
    } else {
      switch (currentView) {
        case 'dashboard':
          return <Dashboard user={user} onChangeView={setCurrentView} />;
        case 'my-space':
          return <EmployeeSpace user={user} />;
        case 'absence-requests':
          return <AbsenceRequests user={user} onChangeView={setCurrentView} />;
        case 'monthly-planning':
          return <MonthlyPlanningFinal user={user} onChangeView={setCurrentView} />;
        case 'analytics':
          return <Analytics user={user} onChangeView={setCurrentView} />;
        case 'overtime':
          return <OvertimeModule user={user} onChangeView={setCurrentView} />;
        case 'delegation-hours':
          return <DelegationHours user={user} onChangeView={setCurrentView} />;
        case 'hr-toolbox':
          return <HRToolbox user={user} onChangeView={setCurrentView} />;
        case 'on-call-management':
          return <OnCallManagement user={user} onChangeView={setCurrentView} />;
        case 'user-management':
          return <UserManagement user={user} onChangeView={setCurrentView} />;
        case 'settings':
          return <SettingsPage user={user} />;
        default:
          return <Dashboard user={user} onChangeView={setCurrentView} />;
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header avec Menu Hamburger - Style Original MOZAIK RH */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Menu Hamburger + Logo */}
            <div className="flex items-center space-x-4">
              {/* Menu Hamburger */}
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg transition-all duration-200"
              >
                <span className="sr-only">Ouvrir le menu principal</span>
                <div className="w-6 h-6 flex flex-col justify-center items-center">
                  <span className={`bg-white block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm ${showMenu ? 'rotate-45 translate-y-1' : '-translate-y-0.5'}`}></span>
                  <span className={`bg-white block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm my-0.5 ${showMenu ? 'opacity-0' : 'opacity-100'}`}></span>
                  <span className={`bg-white block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm ${showMenu ? '-rotate-45 -translate-y-1' : 'translate-y-0.5'}`}></span>
                </div>
              </button>
              
              {/* Logo MOZAIK seul */}
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 rounded-xl flex items-center justify-center transform rotate-12 shadow-lg hover:scale-110 transition-transform duration-200">
                <span className="text-white font-bold text-xl transform -rotate-12">M</span>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Bonjour, <span className="font-medium">{user.name}</span>
              </span>
              
              {/* Boutons d'action avec icônes */}
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Notifications">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM19 12V7a7 7 0 00-14 0v5l-2 3v1h18v-1l-2-3z" />
                  </svg>
                </button>
                
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Paramètres">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                
                <button
                  onClick={onLogout}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Déconnexion"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3 3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Menu Flottant - Effets Dynamiques Page de Connexion */}
      {showMenu && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 relative overflow-hidden">
          {/* Nuages animés améliorés avec effets de la page de connexion */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Nuage principal avec rotation et mouvement */}
            <div 
              className="cloud cloud-1 absolute w-96 h-96 bg-white/5 rounded-full -top-48 -left-48"
              style={{
                animation: 'cloudFloat 20s ease-in-out infinite, cloudRotate 30s linear infinite',
                animationDelay: '0s'
              }}
            ></div>
            
            {/* Nuage secondaire avec effet pulsant */}
            <div 
              className="cloud cloud-2 absolute w-64 h-64 bg-white/3 rounded-full top-1/4 right-0"
              style={{
                animation: 'cloudFloat 25s ease-in-out infinite reverse, cloudPulse 8s ease-in-out infinite',
                animationDelay: '5s'
              }}
            ></div>
            
            {/* Nuage tertiaire avec oscillation */}
            <div 
              className="cloud cloud-3 absolute w-80 h-80 bg-white/4 rounded-full bottom-0 left-1/3"
              style={{
                animation: 'cloudFloat 30s ease-in-out infinite, cloudSway 15s ease-in-out infinite',
                animationDelay: '10s'
              }}
            ></div>
            
            {/* Particules flottantes additionnelles */}
            <div 
              className="absolute w-32 h-32 bg-white/2 rounded-full top-1/2 left-1/4"
              style={{
                animation: 'particleFloat 12s ease-in-out infinite, particleFade 6s ease-in-out infinite alternate',
                animationDelay: '2s'
              }}
            ></div>
            
            <div 
              className="absolute w-24 h-24 bg-white/2 rounded-full top-3/4 right-1/4"
              style={{
                animation: 'particleFloat 18s ease-in-out infinite reverse, particleFade 4s ease-in-out infinite alternate',
                animationDelay: '8s'
              }}
            ></div>
            
            {/* Effet de lueur diffuse */}
            <div 
              className="absolute w-full h-full bg-gradient-to-t from-blue-800/20 via-transparent to-indigo-900/20"
              style={{
                animation: 'glowPulse 10s ease-in-out infinite alternate'
              }}
            ></div>
          </div>

          {/* Styles CSS pour les animations */}
          <style jsx>{`
            @keyframes cloudFloat {
              0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
              25% { transform: translateY(-20px) translateX(10px) rotate(90deg); }
              50% { transform: translateY(-10px) translateX(-15px) rotate(180deg); }
              75% { transform: translateY(-30px) translateX(5px) rotate(270deg); }
            }
            
            @keyframes cloudRotate {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            
            @keyframes cloudPulse {
              0%, 100% { opacity: 0.3; transform: scale(1); }
              50% { opacity: 0.6; transform: scale(1.2); }
            }
            
            @keyframes cloudSway {
              0%, 100% { transform: translateX(0px); }
              50% { transform: translateX(20px); }
            }
            
            @keyframes particleFloat {
              0%, 100% { transform: translateY(0px); }
              33% { transform: translateY(-15px); }
              66% { transform: translateY(-5px); }
            }
            
            @keyframes particleFade {
              0% { opacity: 0.1; }
              100% { opacity: 0.4; }
            }
            
            @keyframes glowPulse {
              0% { opacity: 0.5; }
              100% { opacity: 0.8; }
            }
            
            @keyframes menuSlideIn {
              0% { 
                opacity: 0; 
                transform: scale(0.9) translateY(20px);
                filter: blur(10px);
              }
              100% { 
                opacity: 1; 
                transform: scale(1) translateY(0);
                filter: blur(0px);
              }
            }
            
            @keyframes tileAppear {
              0% {
                opacity: 0;
                transform: translateY(30px) scale(0.8) rotateY(45deg);
                filter: blur(5px);
              }
              60% {
                transform: translateY(-5px) scale(1.05) rotateY(0deg);
              }
              100% {
                opacity: 1;
                transform: translateY(0) scale(1) rotateY(0deg);
                filter: blur(0px);
              }
            }
            
            .menu-container {
              animation: menuSlideIn 0.6s ease-out forwards;
            }
            
            .menu-item {
              animation: tileAppear 0.8s ease-out forwards;
              animation-fill-mode: both;
            }
          `}</style>

          <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 max-w-6xl w-full">
              
              {/* Header du menu - Style page de connexion */}
              <div className="text-center mb-8 pb-6 border-b border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    {/* Logo MOZAIK identique à la page de connexion */}
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 rounded-2xl flex items-center justify-center transform rotate-12 shadow-lg">
                      <span className="text-white font-bold text-2xl transform -rotate-12">M</span>
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-white">MOZAIK RH</h2>
                      <p className="text-white/70 text-lg">Menu Principal</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="p-3 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Grille d'icônes - Tuiles plus petites avec couleurs */}
              <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-3' : 'grid-cols-4 lg:grid-cols-6'}`}>
                  {menuItems.map((item, index) => {
                    // Couleurs spécifiques par module
                    const getItemColors = (id) => {
                      const colors = {
                        'dashboard': 'from-blue-500 to-blue-600',
                        'my-space': 'from-green-500 to-green-600', 
                        'absence-requests': 'from-red-500 to-red-600',
                        'monthly-planning': 'from-purple-500 to-purple-600',
                        'analytics': 'from-yellow-500 to-orange-500',
                        'overtime': 'from-indigo-500 to-indigo-600',
                        'delegation-hours': 'from-pink-500 to-pink-600',
                        'hr-toolbox': 'from-teal-500 to-teal-600',
                        'on-call-management': 'from-cyan-500 to-cyan-600',
                        'user-management': 'from-violet-500 to-violet-600'
                      };
                      return colors[id] || 'from-gray-500 to-gray-600';
                    };

                    return (
                      <button
                        key={item.id}
                        data-testid={`menu-${item.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCurrentView(item.id);
                          setShowMenu(false);
                        }}
                        className={`group relative backdrop-blur-sm rounded-xl p-4 text-center transition-all duration-300 hover:scale-110 border ${
                          currentView === item.id
                            ? 'bg-white/25 border-white/50 shadow-xl'
                            : 'bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40 shadow-sm'
                        }`}
                        style={{
                          animationDelay: `${index * 30}ms`,
                          animation: 'fadeIn 0.4s ease-out forwards'
                        }}
                      >
                        {/* Icône avec couleur spécifique */}
                        <div className={`mx-auto mb-3 w-12 h-12 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm transition-all duration-300 bg-gradient-to-br ${getItemColors(item.id)} shadow-lg ${
                          currentView === item.id
                            ? 'transform scale-110 shadow-xl'
                            : 'group-hover:scale-110 group-hover:shadow-xl'
                        }`}>
                          <span className="text-white">{item.icon}</span>
                        </div>
                        
                        {/* Titre plus compact */}
                        <h3 className={`font-semibold text-sm transition-colors duration-200 ${
                          currentView === item.id
                            ? 'text-white'
                            : 'text-white/90 group-hover:text-white'
                        }`}>
                          {item.name}
                        </h3>
                        
                        {/* Badge actif */}
                        {currentView === item.id && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}

                        {/* Badge de notification */}
                        {(item.id === 'absence-requests' || item.id === 'delegation-hours') && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                            {item.id === 'absence-requests' ? '3' : '2'}
                          </div>
                        )}
                      </button>
                    );
                  })}
                  
                  {/* Raccourcis supplémentaires - Plus petits avec couleurs */}
                  <button
                    onClick={() => {
                      setCurrentView('settings');
                      setShowMenu(false);
                    }}
                    className="group relative bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:border-white/40 rounded-xl p-4 text-center transition-all duration-300 hover:scale-110 shadow-sm"
                  >
                    <div className="mx-auto mb-3 w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br from-gray-500 to-gray-600 shadow-lg group-hover:scale-110 group-hover:shadow-xl backdrop-blur-sm transition-all duration-300">
                      <span className="text-white">⚙️</span>
                    </div>
                    <h3 className="font-semibold text-sm text-white/90 group-hover:text-white transition-colors duration-200">
                      Paramètres
                    </h3>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView('help');
                      setShowMenu(false);
                    }}
                    className="group relative bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:border-white/40 rounded-xl p-4 text-center transition-all duration-300 hover:scale-110 shadow-sm"
                  >
                    <div className="mx-auto mb-3 w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg group-hover:scale-110 group-hover:shadow-xl backdrop-blur-sm transition-all duration-300">
                      <span className="text-white">❓</span>
                    </div>
                    <h3 className="font-semibold text-sm text-white/90 group-hover:text-white transition-colors duration-200">
                      Aide
                    </h3>
                  </button>
                </div>
              </div>
              
              {/* Footer du menu - Style glassmorphisme */}
              <div className="border-t border-white/20 pt-6 mt-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">👤</span>
                    </div>
                    <div>
                      <p className="font-semibold text-white">{user.name}</p>
                      <p className="text-sm text-white/70">{user.role} • Connecté(e)</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onLogout();
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-pink-700 transition-all duration-300 shadow-lg"
                    >
                      🚪 Déconnexion
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <style jsx>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-20px) rotate(180deg); }
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}

      {/* Mobile Menu Overlay - Style Original Simple */}
      {showMenu && isMobile && (
        <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="absolute top-16 left-0 right-0 bg-white shadow-lg">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setShowMenu(false);
                  }}
                  className={`flex items-center w-full px-3 py-2 rounded-md text-base font-medium ${
                    currentView === item.id
                      ? 'text-blue-700 bg-blue-100'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {renderCurrentView()}
      </main>
    </div>
  );
};

export default Layout;