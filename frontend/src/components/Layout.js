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
            {/* Logo + Menu Hamburger */}
            <div className="flex items-center">
              {/* Logo MOZAIK intégré */}
              <div className="flex items-center space-x-3 mr-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 rounded-xl flex items-center justify-center transform rotate-12 shadow-lg">
                  <span className="text-white font-bold text-lg transform -rotate-12">M</span>
                </div>
                <h1 className="text-2xl font-bold text-blue-600">MOZAIK RH</h1>
              </div>
              
              {/* Menu Hamburger */}
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <span className="sr-only">Ouvrir le menu principal</span>
                <div className="w-6 h-6 flex flex-col justify-center items-center">
                  <span className={`bg-gray-600 block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm ${showMenu ? 'rotate-45 translate-y-1' : '-translate-y-0.5'}`}></span>
                  <span className={`bg-gray-600 block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm my-0.5 ${showMenu ? 'opacity-0' : 'opacity-100'}`}></span>
                  <span className={`bg-gray-600 block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm ${showMenu ? '-rotate-45 -translate-y-1' : 'translate-y-0.5'}`}></span>
                </div>
              </button>
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

      {/* Menu Flottant - Style Page de Connexion MOZAIK RH */}
      {showMenu && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 relative overflow-hidden">
          {/* Nuages animés de la page de connexion */}
          <div className="absolute inset-0 pointer-events-none">
            <div 
              className="absolute w-96 h-96 bg-white/5 rounded-full -top-48 -left-48 animate-pulse"
              style={{
                animation: 'float 20s ease-in-out infinite',
                animationDelay: '0s'
              }}
            ></div>
            <div 
              className="absolute w-64 h-64 bg-white/3 rounded-full top-1/4 right-0 animate-pulse"
              style={{
                animation: 'float 25s ease-in-out infinite reverse',
                animationDelay: '5s'
              }}
            ></div>
            <div 
              className="absolute w-80 h-80 bg-white/4 rounded-full bottom-0 left-1/3 animate-pulse"
              style={{
                animation: 'float 30s ease-in-out infinite',
                animationDelay: '10s'
              }}
            ></div>
          </div>

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
              
              {/* Grille d'icônes - Style glassmorphisme */}
              <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
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
                      className={`group relative backdrop-blur-sm rounded-2xl p-8 text-center transition-all duration-300 hover:scale-105 border ${
                        currentView === item.id
                          ? 'bg-white/20 border-white/40 shadow-lg'
                          : 'bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30 shadow-sm'
                      }`}
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animation: 'fadeIn 0.5s ease-out forwards'
                      }}
                    >
                      {/* Icône principale - Style glassmorphisme */}
                      <div className={`mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm transition-all duration-300 ${
                        currentView === item.id
                          ? 'bg-white/30 border border-white/40 shadow-lg transform scale-110'
                          : 'bg-white/20 border border-white/30 group-hover:bg-white/25 group-hover:scale-110'
                      }`}>
                        {item.icon}
                      </div>
                      
                      {/* Titre */}
                      <h3 className={`font-bold text-lg mb-2 transition-colors duration-200 ${
                        currentView === item.id
                          ? 'text-white'
                          : 'text-white/90 group-hover:text-white'
                      }`}>
                        {item.name}
                      </h3>
                      
                      {/* Description courte */}
                      <p className="text-sm text-white/60 leading-relaxed">
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
                      
                      {/* Badge actif - Style glassmorphisme */}
                      {currentView === item.id && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-orange-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                        </div>
                      )}

                      {/* Badge de notification - Style glassmorphisme */}
                      {(item.id === 'absence-requests' || item.id === 'delegation-hours') && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                          {item.id === 'absence-requests' ? '3' : '2'}
                        </div>
                      )}
                    </button>
                  ))}
                  
                  {/* Raccourcis supplémentaires - Style glassmorphisme */}
                  <button
                    onClick={() => {
                      setCurrentView('settings');
                      setShowMenu(false);
                    }}
                    className="group relative bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 hover:border-white/30 rounded-2xl p-8 text-center transition-all duration-300 hover:scale-105 shadow-sm"
                  >
                    <div className="mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl bg-white/20 border border-white/30 group-hover:bg-white/25 group-hover:scale-110 backdrop-blur-sm transition-all duration-300">
                      ⚙️
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-white/90 group-hover:text-white transition-colors duration-200">
                      Paramètres
                    </h3>
                    <p className="text-sm text-white/60">Configuration</p>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView('help');
                      setShowMenu(false);
                    }}
                    className="group relative bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 hover:border-white/30 rounded-2xl p-8 text-center transition-all duration-300 hover:scale-105 shadow-sm"
                  >
                    <div className="mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl bg-white/20 border border-white/30 group-hover:bg-white/25 group-hover:scale-110 backdrop-blur-sm transition-all duration-300">
                      ❓
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-white/90 group-hover:text-white transition-colors duration-200">
                      Aide
                    </h3>
                    <p className="text-sm text-white/60">Support</p>
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