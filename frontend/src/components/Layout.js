import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import EmployeeDashboard from './EmployeeDashboard';
import MonthlyPlanningFinal from './MonthlyPlanningFinal';
import HRToolbox from './HRToolbox';
import AbsenceRequests from './AbsenceRequests';
import EmployeeSpace from './EmployeeSpaceNew';
import SettingsPage from './SettingsPage';
import Analytics from './AnalyticsNew';
import AbsenceAnalytics from './AbsenceAnalytics';
import StandardReports from './StandardReports';
import AnalyticsHub from './AnalyticsHub';
import OvertimeModule from './OvertimeModule';
import UserManagement from './UserManagement';
import OnCallManagement from './OnCallManagement';
import ExcelImport from './ExcelImport';
import CSEManagementNew from './CSEManagementNew';
import HelpPage from './HelpPage';

const Layout = ({ user, currentView, setCurrentView, onLogout }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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

    // Fermer les notifications quand on clique en dehors
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notifications-panel')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('navigate-to-view', handleCustomNavigation);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const menuItems = user.role === 'employee' ? [
    { id: 'employee-dashboard', name: 'Mon Tableau de Bord', icon: '🏠', color: 'from-blue-500 to-blue-600' },
    { id: 'my-space', name: 'Mon Espace', icon: '👤', color: 'from-green-500 to-green-600' },
    { id: 'my-requests', name: 'Mes Demandes', icon: '📝', color: 'from-orange-500 to-orange-600' }
  ] : [
    { id: 'dashboard', name: 'Tableau de Bord', icon: '🏠', color: 'from-blue-500 to-blue-600' },
    { id: 'my-space', name: 'Mon Espace', icon: '👤', color: 'from-green-500 to-green-600' },
    { id: 'absence-requests', name: 'Demandes d\'Absence', icon: '📝', color: 'from-orange-500 to-orange-600' },
    { id: 'monthly-planning', name: 'Planning Mensuel', icon: '📅', color: 'from-purple-500 to-purple-600' },
    { id: 'analytics-hub', name: 'Analytics & Rapports', icon: '📊', color: 'from-indigo-500 via-purple-500 to-pink-500' },
    { id: 'overtime', name: 'Heures Supplémentaires', icon: '⏰', color: 'from-red-500 to-red-600' },
    { id: 'on-call-management', name: 'Gestion Astreintes', icon: '🔔', color: 'from-orange-600 to-red-600' },
    { id: 'hr-toolbox', name: 'Boîte à outils RH', icon: '🛠️', color: 'from-teal-500 to-teal-600' },
    { id: 'excel-import', name: 'Import Excel', icon: '📥', color: 'from-emerald-500 to-green-600' },
    { id: 'cse-management', name: 'CSE & Délégation', icon: '🏛️', color: 'from-indigo-600 to-purple-600' },
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
        case 'settings':
          return <SettingsPage user={user} />;
        case 'help':
          return <HelpPage user={user} />;
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
        case 'absence-analytics':
          return <AbsenceAnalytics user={user} onChangeView={setCurrentView} />;
        case 'analytics':
          return <Analytics user={user} onChangeView={setCurrentView} />;
        case 'standard-reports':
          return <StandardReports user={user} onChangeView={setCurrentView} />;
        case 'overtime':
          return <OvertimeModule user={user} onChangeView={setCurrentView} />;
        case 'hr-toolbox':
          return <HRToolbox user={user} onChangeView={setCurrentView} />;
        case 'excel-import':
          return <ExcelImport user={user} onChangeView={setCurrentView} />;
        case 'cse-management':
          return <CSEManagementNew user={user} onChangeView={setCurrentView} />;
        case 'on-call-management':
          return <OnCallManagement user={user} onChangeView={setCurrentView} />;
        case 'user-management':
          return <UserManagement user={user} onChangeView={setCurrentView} />;
        case 'settings':
          return <SettingsPage user={user} />;
        case 'help':
          return <HelpPage user={user} onChangeView={setCurrentView} />;
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
              
              {/* Boutons d'action harmonisés avec le style établi */}
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 shadow-lg transition-all duration-200" 
                    title="Notifications"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM19 12V7a7 7 0 00-14 0v5l-2 3v1h18v-1l-2-3z" />
                    </svg>
                    {/* Badge de compteur de notifications */}
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                      3
                    </span>
                  </button>
                  
                  {/* Panneau des notifications */}
                  {showNotifications && (
                    <div className="notifications-panel absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                      {/* Header du panneau */}
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-3">
                        <h3 className="text-white font-semibold text-lg">🔔 Notifications</h3>
                      </div>
                      
                      {/* Liste des notifications */}
                      <div className="max-h-96 overflow-y-auto">
                        {/* Notification 1 - Nouvelle demande d'absence */}
                        <div className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer transition-colors">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-lg">📝</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">Nouvelle demande d'absence</p>
                              <p className="text-xs text-gray-600 mt-1">Marie Leblanc a soumis une demande de congés annuels</p>
                              <p className="text-xs text-gray-400 mt-1">Il y a 5 minutes</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Notification 2 - Rappel planning */}
                        <div className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer transition-colors">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-lg">📅</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">Planning à valider</p>
                              <p className="text-xs text-gray-600 mt-1">Le planning du mois prochain attend votre validation</p>
                              <p className="text-xs text-gray-400 mt-1">Il y a 2 heures</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Notification 3 - Astreinte */}
                        <div className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer transition-colors">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <span className="text-lg">🔔</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">Astreinte assignée</p>
                              <p className="text-xs text-gray-600 mt-1">Vous êtes d'astreinte ce week-end</p>
                              <p className="text-xs text-gray-400 mt-1">Il y a 1 jour</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Footer du panneau */}
                      <div className="bg-gray-50 px-4 py-3 text-center border-t border-gray-200">
                        <button 
                          onClick={() => setShowNotifications(false)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Fermer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setCurrentView('settings')}
                  className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 shadow-lg transition-all duration-200" 
                  title="Paramètres"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                
                <button
                  onClick={onLogout}
                  className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 shadow-lg transition-all duration-200"
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
      {/* Menu Principal Glassmorphism - Responsive pour tous les écrans */}
      {showMenu && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 relative overflow-hidden">
          {/* Nuages animés - Mouvement horizontal réaliste */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Nuage principal - Mouvement lent horizontal */}
            <div 
              className="cloud cloud-1 absolute w-96 h-96 bg-white/5 rounded-full blur-3xl -top-48"
              style={{
                animation: 'cloudDrift 60s linear infinite',
                animationDelay: '0s',
                left: '-30%'
              }}
            ></div>
            
            {/* Nuage secondaire - Mouvement moyen */}
            <div 
              className="cloud cloud-2 absolute w-64 h-64 bg-white/3 rounded-full blur-2xl top-1/4"
              style={{
                animation: 'cloudDrift 45s linear infinite',
                animationDelay: '15s',
                left: '-20%'
              }}
            ></div>
            
            {/* Nuage tertiaire - Mouvement rapide */}
            <div 
              className="cloud cloud-3 absolute w-80 h-80 bg-white/4 rounded-full blur-3xl bottom-0"
              style={{
                animation: 'cloudDrift 50s linear infinite',
                animationDelay: '25s',
                left: '-25%'
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
            @keyframes cloudDrift {
              0% { 
                transform: translateX(0vw) translateY(0px);
                opacity: 0;
              }
              10% {
                opacity: 0.3;
              }
              90% {
                opacity: 0.3;
              }
              100% { 
                transform: translateX(130vw) translateY(-20px);
                opacity: 0;
              }
            }
            
            @keyframes cloudPulse {
              0%, 100% { opacity: 0.3; transform: scale(1); }
              50% { opacity: 0.5; transform: scale(1.05); }
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
                transform: scale(0.95) translateX(-30px);
                filter: blur(5px);
              }
              100% { 
                opacity: 1; 
                transform: scale(1) translateX(0);
                filter: blur(0px);
              }
            }
            
            @keyframes tileAppear {
              0% {
                opacity: 0;
                transform: translateX(-40px) scale(0.9);
                filter: blur(3px);
              }
              60% {
                transform: translateX(5px) scale(1.02);
              }
              100% {
                opacity: 1;
                transform: translateX(0) scale(1);
                filter: blur(0px);
              }
            }
            
            .menu-container {
              animation: menuSlideIn 0.3s ease-out forwards;
            }
            
            .menu-item {
              animation: tileAppear 0.4s ease-out forwards;
              animation-fill-mode: both;
            }
          `}</style>

          <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
            <div className="menu-container bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 max-w-6xl w-full transform-gpu">
              
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
                        'absence-analytics': 'from-purple-600 to-pink-600',
                        'analytics': 'from-yellow-500 to-orange-500',
                        'overtime': 'from-indigo-500 to-indigo-600',
                        'hr-toolbox': 'from-teal-500 to-teal-600',
                        'excel-import': 'from-emerald-500 to-green-600',
                        'cse-management': 'from-indigo-600 to-purple-600',
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
                        className={`menu-item group relative backdrop-blur-sm rounded-xl ${isMobile ? 'p-2' : 'p-4'} text-center transition-all duration-200 border ${
                          currentView === item.id
                            ? 'bg-white/25 border-white/50 shadow-xl'
                            : 'bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40 shadow-sm'
                        }`}
                        style={{
                          animationDelay: `${index * 20}ms`
                        }}
                      >
                        {/* Icône avec couleur spécifique - Plus petite sur mobile */}
                        <div className={`mx-auto ${isMobile ? 'mb-1 w-10 h-10 text-xl' : 'mb-3 w-12 h-12 text-2xl'} rounded-xl flex items-center justify-center backdrop-blur-sm transition-all duration-300 bg-gradient-to-br ${getItemColors(item.id)} shadow-lg ${
                          currentView === item.id
                            ? 'transform scale-110 shadow-xl'
                            : 'group-hover:scale-110 group-hover:shadow-xl'
                        }`}>
                          <span className="text-white">{item.icon}</span>
                        </div>
                        
                        {/* Titre plus compact - Plus petit sur mobile */}
                        <h3 className={`font-semibold ${isMobile ? 'text-xs' : 'text-sm'} transition-colors duration-200 ${
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

                        {/* Badge de notification - Removed hardcoded badges */}
                      </button>
                    );
                  })}
                  
                  {/* Raccourcis supplémentaires - Effet uniquement sur l'icône */}
                  <button
                    onClick={() => {
                      setCurrentView('settings');
                      setShowMenu(false);
                    }}
                    className={`group relative backdrop-blur-sm rounded-xl ${isMobile ? 'p-2' : 'p-4'} text-center transition-all duration-200 border ${
                      currentView === 'settings'
                        ? 'bg-white/25 border-white/50 shadow-xl'
                        : 'bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40 shadow-sm'
                    }`}
                  >
                    <div className={`mx-auto ${isMobile ? 'mb-1 w-10 h-10 text-xl' : 'mb-3 w-12 h-12 text-2xl'} rounded-xl flex items-center justify-center backdrop-blur-sm transition-all duration-300 bg-gradient-to-br from-gray-500 to-gray-600 shadow-lg ${
                      currentView === 'settings'
                        ? 'transform scale-110 shadow-xl'
                        : 'group-hover:scale-110 group-hover:shadow-xl'
                    }`}>
                      <span className="text-white">⚙️</span>
                    </div>
                    <h3 className={`font-semibold ${isMobile ? 'text-xs' : 'text-sm'} transition-colors duration-200 ${
                      currentView === 'settings'
                        ? 'text-white'
                        : 'text-white/90 group-hover:text-white'
                    }`}>
                      Paramètres
                    </h3>
                    {currentView === 'settings' && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView('help');
                      setShowMenu(false);
                    }}
                    className={`group relative backdrop-blur-sm rounded-xl ${isMobile ? 'p-2' : 'p-4'} text-center transition-all duration-200 border ${
                      currentView === 'help'
                        ? 'bg-white/25 border-white/50 shadow-xl'
                        : 'bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40 shadow-sm'
                    }`}
                  >
                    <div className={`mx-auto ${isMobile ? 'mb-1 w-10 h-10 text-xl' : 'mb-3 w-12 h-12 text-2xl'} rounded-xl flex items-center justify-center backdrop-blur-sm transition-all duration-300 bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg ${
                      currentView === 'help'
                        ? 'transform scale-110 shadow-xl'
                        : 'group-hover:scale-110 group-hover:shadow-xl'
                    }`}>
                      <span className="text-white">❓</span>
                    </div>
                    <h3 className={`font-semibold ${isMobile ? 'text-xs' : 'text-sm'} transition-colors duration-200 ${
                      currentView === 'help'
                        ? 'text-white'
                        : 'text-white/90 group-hover:text-white'
                    }`}>
                      Aide
                    </h3>
                    {currentView === 'help' && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
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

      {/* Menu mobile simple supprimé - Utilisation du menu glassmorphism unifié pour tous les écrans */}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {renderCurrentView()}
      </main>
    </div>
  );
};

export default Layout;