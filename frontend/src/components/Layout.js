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
            <div className="flex items-center">
              {/* Menu Hamburger */}
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 mr-4"
              >
                <span className="sr-only">Ouvrir le menu principal</span>
                <div className="w-6 h-6 flex flex-col justify-center items-center">
                  <span className={`bg-gray-600 block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm ${showMenu ? 'rotate-45 translate-y-1' : '-translate-y-0.5'}`}></span>
                  <span className={`bg-gray-600 block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm my-0.5 ${showMenu ? 'opacity-0' : 'opacity-100'}`}></span>
                  <span className={`bg-gray-600 block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm ${showMenu ? '-rotate-45 -translate-y-1' : 'translate-y-0.5'}`}></span>
                </div>
              </button>
              
              {/* Logo et Titre */}
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-blue-600">MOZAIK RH</h1>
              </div>
              
              {/* Titre de la page courante */}
              <div className="hidden md:block ml-8">
                <h2 className="text-lg text-gray-800 font-medium">{getCurrentPageTitle()}</h2>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Bonjour, <span className="font-medium">{user.name}</span>
              </span>
              <button
                onClick={onLogout}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Menu Flottant Style iOS/iCloud - Original MOZAIK RH */}
      {showMenu && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm">
          <div className="absolute inset-6 bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Header du menu - Style iOS */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-8 py-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white rounded-full p-1 shadow-lg">
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-2xl">M</span>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">MOZAIK RH</h2>
                    <p className="text-blue-100 text-lg">Plateforme de gestion moderne</p>
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
            
            {/* Grille d'icônes - Style iCloud */}
            <div className="p-8 overflow-y-auto max-h-[calc(100vh-280px)]">
              <div className={`grid gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-3 lg:grid-cols-4'}`}>
                {menuItems.map((item, index) => (
                  <button
                    key={item.id}
                    data-testid={`menu-${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentView(item.id);
                      setShowMenu(false);
                    }}
                    className={`group relative bg-white rounded-2xl p-8 text-center transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 ${
                      currentView === item.id
                        ? 'border-blue-300 shadow-lg bg-blue-50'
                        : 'border-gray-200 hover:border-blue-200 shadow-sm'
                    }`}
                    style={{
                      animationDelay: `${index * 50}ms`
                    }}
                  >
                    {/* Icône principale - Style iOS */}
                    <div className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-all duration-300 ${
                      currentView === item.id
                        ? 'bg-blue-100 shadow-lg transform scale-110'
                        : 'bg-gray-100 group-hover:bg-blue-50 group-hover:scale-110'
                    }`}>
                      {item.icon}
                    </div>
                    
                    {/* Titre */}
                    <h3 className={`font-bold text-lg mb-2 transition-colors duration-200 ${
                      currentView === item.id
                        ? 'text-blue-700'
                        : 'text-gray-900 group-hover:text-blue-600'
                    }`}>
                      {item.name}
                    </h3>
                    
                    {/* Description courte */}
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {item.id === 'dashboard' && 'Vue d\'ensemble'}
                      {item.id === 'my-space' && 'Espace personnel'}
                      {item.id === 'absence-requests' && 'Gestion absences'}
                      {item.id === 'monthly-planning' && 'Planning mensuel'}
                      {item.id === 'analytics' && 'Rapports KPI'}
                      {item.id === 'overtime' && 'Heures sup.'}
                      {item.id === 'delegation-hours' && 'Délégation CSE'}
                      {item.id === 'hr-toolbox' && 'Outils RH'}
                      {item.id === 'on-call-management' && 'Astreintes'}
                      {item.id === 'user-management' && 'Utilisateurs'}
                    </p>
                    
                    {/* Badge actif - Style iOS */}
                    {currentView === item.id && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                    )}

                    {/* Badge de notification (optionnel) */}
                    {(item.id === 'absence-requests' || item.id === 'delegation-hours') && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {item.id === 'absence-requests' ? '3' : '2'}
                      </div>
                    )}
                  </button>
                ))}
                
                {/* Raccourcis supplémentaires - Style iCloud */}
                <button
                  onClick={() => {
                    setCurrentView('settings');
                    setShowMenu(false);
                  }}
                  className="group relative bg-white rounded-2xl p-8 text-center transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 border-gray-200 hover:border-gray-300 shadow-sm"
                >
                  <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center text-3xl bg-gray-100 group-hover:bg-gray-200 group-hover:scale-110 transition-all duration-300">
                    ⚙️
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-gray-900 group-hover:text-gray-700 transition-colors duration-200">
                    Paramètres
                  </h3>
                  <p className="text-sm text-gray-500">Configuration</p>
                </button>

                <button
                  onClick={() => {
                    setCurrentView('help');
                    setShowMenu(false);
                  }}
                  className="group relative bg-white rounded-2xl p-8 text-center transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 border-gray-200 hover:border-gray-300 shadow-sm"
                >
                  <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center text-3xl bg-gray-100 group-hover:bg-gray-200 group-hover:scale-110 transition-all duration-300">
                    ❓
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-gray-900 group-hover:text-gray-700 transition-colors duration-200">
                    Aide
                  </h3>
                  <p className="text-sm text-gray-500">Support</p>
                </button>
              </div>
            </div>
            
            {/* Footer du menu - Style iOS */}
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold">👤</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.role} • Connecté(e)</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onLogout();
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100 rounded-lg font-medium text-sm transition-colors border border-gray-300"
                  >
                    🚪 Déconnexion
                  </button>
                </div>
              </div>
            </div>
          </div>
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