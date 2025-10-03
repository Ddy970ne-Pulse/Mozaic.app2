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

      {/* Menu Navigation Moderne - Style BambooHR */}
      {showMenu && (
        <div className="fixed inset-0 z-50 bg-gray-900/30 backdrop-blur-sm">
          <div className="absolute inset-4 bg-white rounded-2xl shadow-2xl border border-gray-200/20 overflow-hidden">
            {/* Header du menu */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                    <span className="text-white font-bold text-xl">M</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">MOZAIK RH</h2>
                    <p className="text-blue-100/80 text-sm">Plateforme de gestion moderne</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMenu(false)}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 backdrop-blur-sm"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Grid de navigation */}
            <div className="p-8 overflow-y-auto max-h-[calc(100vh-200px)]">
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-3 lg:grid-cols-4'}`}>
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
                    className={`group relative overflow-hidden rounded-xl p-6 text-left transition-all duration-300 hover:scale-102 hover:shadow-lg ${
                      currentView === item.id
                        ? 'bg-blue-50 border-2 border-blue-200 shadow-md'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200'
                    }`}
                    style={{
                      animationDelay: `${index * 30}ms`
                    }}
                  >
                    {/* Icône et contenu */}
                    <div className="relative z-10">
                      <div className={`mb-3 text-2xl transition-transform duration-300 ${
                        currentView === item.id ? 'transform scale-110' : 'group-hover:scale-105'
                      }`}>
                        {item.icon}
                      </div>
                      <h3 className={`font-semibold text-sm leading-tight ${
                        currentView === item.id ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {item.name}
                      </h3>
                    </div>
                    
                    {/* Gradient d'arrière-plan */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.color} ${
                      currentView === item.id ? 'opacity-10' : 'opacity-0 group-hover:opacity-5'
                    } transition-opacity duration-300`}></div>
                    
                    {/* Indicateur actif */}
                    {currentView === item.id && (
                      <div className="absolute top-3 right-3 w-3 h-3 bg-blue-500 rounded-full">
                        <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                      </div>
                    )}
                    
                    {/* Bordure animée */}
                    <div className={`absolute inset-0 border-2 rounded-xl transition-all duration-300 ${
                      currentView === item.id 
                        ? 'border-blue-300' 
                        : 'border-transparent group-hover:border-gray-300'
                    }`}></div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer moderne */}
            <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="font-medium">Système opérationnel</span>
                  <span className="text-gray-400">•</span>
                  <span>{user.name}</span>
                </div>
                <div className="text-sm text-gray-500">
                  © 2025 MOZAIK RH
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