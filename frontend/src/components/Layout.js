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
      {/* Header Navigation - Style Original MOZAIK RH */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo et Titre */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-blue-600">MOZAIK RH</h1>
              </div>
              <div className="hidden md:block ml-8">
                <h2 className="text-lg text-gray-800 font-medium">{getCurrentPageTitle()}</h2>
              </div>
            </div>

            {/* Menu Navigation Horizontal */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {menuItems.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentView === item.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-1">{item.icon}</span>
                    {item.name}
                  </button>
                ))}
                
                {/* Menu dropdown pour les autres éléments */}
                {menuItems.length > 6 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    >
                      Plus...
                    </button>
                    
                    {showMenu && (
                      <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                        <div className="py-1">
                          {menuItems.slice(6).map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                setCurrentView(item.id);
                                setShowMenu(false);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <span className="mr-2">{item.icon}</span>
                              {item.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="bg-gray-200 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-300"
              >
                <span className="sr-only">Open main menu</span>
                {showMenu ? '✕' : '☰'}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobile && showMenu && (
          <div className="md:hidden border-t border-gray-200 bg-white">
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
        )}
      </header>

      {/* Menu BambooHR Style - Overlay complet */}

      {/* Menu BambooHR Style - Overlay complet */}
      {showMenu && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm">
          <div className="absolute inset-6 bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Header vert du menu - Identique à BambooHR */}
            <div className="bg-green-800 px-8 py-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white rounded-full p-1 shadow-lg">
                    <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-2xl">🐼</span>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">MOZAIK RH</h2>
                    <p className="text-green-100 text-lg">Plateforme de gestion moderne</p>
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
            
            {/* Contenu du menu - Style BambooHR */}
            <div className="p-8 overflow-y-auto max-h-[calc(100vh-280px)]">
              <div className={`grid gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-3 lg:grid-cols-4'}`}>
                {menuItems.map((item, index) => (
                  <button
                    key={item.id}
                    data-testid={`menu-${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log(`Navigating to ${item.id}`);
                      setCurrentView(item.id);
                      setShowMenu(false);
                    }}
                    className={`group relative bg-white rounded-2xl p-8 text-center transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 ${
                      currentView === item.id
                        ? 'border-green-300 shadow-lg bg-green-50'
                        : 'border-gray-200 hover:border-green-200 shadow-sm'
                    }`}
                    style={{
                      animationDelay: `${index * 50}ms`
                    }}
                  >
                    {/* Icône principale */}
                    <div className={`mb-4 text-4xl transition-transform duration-300 ${
                      currentView === item.id ? 'transform scale-110' : 'group-hover:scale-105'
                    }`}>
                      {item.icon}
                    </div>
                    
                    {/* Titre du module */}
                    <h3 className={`font-bold text-lg leading-tight mb-2 ${
                      currentView === item.id ? 'text-green-800' : 'text-gray-900'
                    }`}>
                      {item.name}
                    </h3>
                    
                    {/* Description (optionnelle) */}
                    <p className="text-sm text-gray-500">
                      {item.id === 'dashboard' && 'Vue d\'ensemble'}
                      {item.id === 'monthly-planning' && 'Planning et absences'}
                      {item.id === 'on-call-management' && 'Gestion astreintes'}
                      {item.id === 'my-space' && 'Espace personnel'}
                      {item.id === 'delegation-hours' && 'Délégation RH'}
                      {item.id === 'analytics' && 'Rapports KPI'}
                      {item.id === 'user-management' && 'Utilisateurs'}
                      {item.id === 'overtime' && 'Heures sup.'}
                      {item.id === 'absence-requests' && 'Demandes'}
                      {item.id === 'hr-toolbox' && 'Outils RH'}
                    </p>
                    
                    {/* Indicateur actif - Style BambooHR */}
                    {currentView === item.id && (
                      <div className="absolute top-4 right-4 w-4 h-4 bg-green-500 rounded-full">
                        <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
                      </div>
                    )}
                    
                    {/* Effet de survol */}
                    <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
                      currentView === item.id 
                        ? 'bg-green-500/5' 
                        : 'group-hover:bg-green-500/5'
                    }`}></div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer style BambooHR */}
            <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{user.name}</span>
                    <span className="text-sm text-gray-500 ml-2">• {user.role}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <button 
                    onClick={onLogout}
                    className="hover:text-gray-900 transition-colors duration-200"
                  >
                    Déconnexion
                  </button>
                  <span>© 2025 MOZAIK RH</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Main Content */}
        <main className="min-h-[calc(100vh-73px)]">
          {renderCurrentView()}
        </main>

        {/* Mobile page indicator */}
        {isMobile && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm z-30">
            {getCurrentPageTitle()}
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout;