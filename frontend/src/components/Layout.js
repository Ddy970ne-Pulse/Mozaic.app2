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
    <div className="min-h-screen bg-gray-50">
      {/* Header BambooHR Style - Bannière Verte Dominante */}
      <header className="bg-green-800 text-white sticky top-0 z-40 shadow-lg">
        <div className="px-6 py-4">
          {/* Bannière Utilisateur Principale - Style BambooHR */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              {/* Avatar utilisateur circulaire */}
              <div className="w-16 h-16 bg-white rounded-full p-1 shadow-lg">
                <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">🐼</span>
                </div>
              </div>
              
              <div className="flex flex-col">
                <h1 className="text-3xl font-bold text-white">{user.name}</h1>
                <p className="text-green-100 text-lg font-medium">{user.role}</p>
              </div>
            </div>
            
            {/* Actions Utilisateur */}
            <div className="flex items-center space-x-3">
              <button className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full font-medium transition-all duration-200 backdrop-blur-sm">
                Demander une modification
              </button>
              
              <button
                onClick={() => setShowMenu(true)}
                className="p-2 text-white hover:bg-white/20 rounded-lg transition-all duration-200"
                aria-label="Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Navigation Principale Horizontale - Style BambooHR */}
          <div className="flex items-center space-x-1 bg-white/10 backdrop-blur-sm rounded-xl p-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentView === item.id
                    ? 'bg-white text-green-800 shadow-md'
                    : 'text-white hover:bg-white/20'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </button>
            ))}
          </div>
        </div>
      </header>

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
  );
};

export default Layout;