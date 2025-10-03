import React, { useState, useEffect } from 'react';
import { getRequests, getPendingRequests, getRecentActivities, approveRequest, rejectRequest, subscribe } from '../shared/requestsData';
import { getUpcomingEvents, subscribe as subscribeToEvents, formatEventForDisplay, eventTypes } from '../shared/eventsData';
// Navigation helper retiré pour éviter les conflits mémoire

const Dashboard = ({ user, onChangeView }) => {
  const [requests, setRequests] = useState(getRequests());
  const [recentActivities, setRecentActivities] = useState(getRecentActivities());
  const [upcomingEvents, setUpcomingEvents] = useState(getUpcomingEvents());

  const stats = [
    { title: 'Employés Actifs', value: '156', icon: '👥', color: 'bg-blue-500', change: '+12' },
    { title: 'Demandes en Attente', value: requests.pending.length.toString(), icon: '📋', color: 'bg-orange-500', change: '+5' },
    { title: 'Congés ce Mois', value: '45', icon: '🏖️', color: 'bg-green-500', change: '-3' },
    { title: 'Heures Sup. Total', value: '234h', icon: '⏰', color: 'bg-purple-500', change: '+18h' }
  ];

  // Souscription aux changements d'état et initialisation de la navigation
  useEffect(() => {
    const unsubscribeRequests = subscribe((newRequests) => {
      setRequests(newRequests);
      setRecentActivities(getRecentActivities());
    });

    const unsubscribeEvents = subscribeToEvents((newEvents) => {
      setUpcomingEvents(newEvents);
    });

    return () => {
      unsubscribeRequests();
      unsubscribeEvents();
    };
  }, []);

  // Les événements à venir sont maintenant gérés par le state et le système dynamique

  const departments = [
    { name: 'IT', employees: 45, absences: 5, percentage: 89 },
    { name: 'Commercial', employees: 32, absences: 8, percentage: 75 },
    { name: 'RH', employees: 12, absences: 1, percentage: 92 },
    { name: 'Finance', employees: 18, absences: 3, percentage: 83 },
    { name: 'Marketing', employees: 25, absences: 4, percentage: 84 },
    { name: 'Opérations', employees: 24, absences: 6, percentage: 75 }
  ];

  // Fonctions pour les actions rapides - Version simple et stable
  const handleGenerateReport = () => {
    if (onChangeView) {
      onChangeView('analytics');
    }
  };

  const handleNewEmployee = () => {
    if (onChangeView) {
      onChangeView('user-management');
    }
  };

  const handleScheduleMeeting = () => {
    if (onChangeView) {
      onChangeView('monthly-planning');
    }
  };

  const handleExportPayroll = () => {
    if (onChangeView) {
      onChangeView('hr-toolbox');
    }
  };

  // Fonction pour approuver une demande
  const handleApproveRequest = (activityIndex) => {
    const activity = recentActivities[activityIndex];
    if (activity.originalStatus === 'pending') {
      const success = approveRequest(activity.originalId, user.name);
      if (success) {
        alert(`✅ Demande de ${activity.name} approuvée !`);
      } else {
        alert('❌ Erreur lors de l\'approbation');
      }
    }
  };

  // Fonction pour rejeter une demande  
  const handleRejectRequest = (activityIndex) => {
    const activity = recentActivities[activityIndex];
    if (activity.originalStatus === 'pending') {
      const reason = prompt('Motif du rejet:');
      if (reason !== null) { // L'utilisateur n'a pas annulé
        const success = rejectRequest(activity.originalId, user.name, reason);
        if (success) {
          alert(`❌ Demande de ${activity.name} rejetée.`);
        } else {
          alert('❌ Erreur lors du rejet');
        }
      }
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Layout 3-colonnes BambooHR */}
      <div className="flex">
        {/* Sidebar Gauche - Style BambooHR */}
        <div className="w-80 bg-white shadow-sm border-r border-gray-200 min-h-screen p-6">
          {/* Section Home */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Accueil</h3>
            </div>
          </div>

          {/* Time Clock - Style BambooHR */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-6 h-6 text-green-600">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                  <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
                </svg>
              </div>
              <h4 className="font-bold text-gray-900">Pointeuse</h4>
            </div>
            
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-gray-900 mb-1">8h 05m</div>
              <div className="text-sm text-gray-600">Aujourd'hui</div>
            </div>
            
            <button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-full transition-colors duration-200 mb-4">
              Pointer
            </button>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Cette semaine</span>
                <span className="font-semibold">32h 15m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ce mois</span>
                <span className="font-semibold">142h 30m</span>
              </div>
            </div>
          </div>

          {/* Congés - Style BambooHR */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-6 h-6 text-green-600">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2-7h-3V2h-2v2H8V2H6v2H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H3V9h14v11z"/>
                </svg>
              </div>
              <h4 className="font-bold text-gray-900">Congés</h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Vacances</span>
                <span className="font-semibold text-sm">15 jours</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Jours maladie</span>
                <span className="font-semibold text-sm">3 jours</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu Principal - Centre */}
        <div className="flex-1 p-8">
          {/* Section principale - Style BambooHR */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">MOZAIK RH SE</h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>1er avril 2025 - 30 avril 2025</span>
                <span>•</span>
                <span>Période de paie actuelle</span>
              </div>
            </div>
            
            {/* Graphique de tendance - Style BambooHR */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Salaire Brut Total</div>
                  <div className="text-3xl font-bold text-gray-900">5 085,04 €</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">Prochaine paie</div>
                  <div className="text-lg font-semibold text-gray-900">1 avril 2025</div>
                </div>
              </div>
              
              {/* Simulation graphique linéaire */}
              <div className="bg-gray-50 rounded-lg p-6 h-32 flex items-end space-x-2">
                {[40, 60, 45, 75, 50, 80, 65, 90, 70, 85, 75, 100].map((height, index) => (
                  <div key={index} className="flex-1 bg-green-500 rounded-t" style={{height: `${height}%`}}></div>
                ))}
              </div>
            </div>
            
            {/* Détails financiers */}
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">Salaire brut</div>
                <div className="text-xl font-bold text-gray-900">4 550,00 €</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Taxes</div>
                <div className="text-xl font-bold text-pink-600">618,85 €</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Déductions</div>
                <div className="text-xl font-bold text-orange-600">50,00 €</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Droite - Cards BambooHR */}
        <div className="w-80 p-6 space-y-6">
          {/* Card Vitals */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Vitals</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">📞 portable</span>
                <span className="font-medium">06.12.34.56.78</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">✉️ Email</span>
                <span className="font-medium">sophie@company.fr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">📍 Statut</span>
                <span className="font-medium text-green-600">Actif</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">🏢 Département</span>
                <span className="font-medium">Direction</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">📍 Lieu</span>
                <span className="font-medium">Paris</span>
              </div>
            </div>
          </div>

          {/* Card Benefits */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Avantages</h3>
            <div className="space-y-4">
              <div>
                <div className="font-medium text-gray-900 mb-1">Mutuelle Santé</div>
                <div className="text-sm text-gray-600 mb-1">Effective: 1er janvier 2025</div>
                <div className="text-sm text-gray-600 mb-3">Fréquence: Mensuelle</div>
                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200">
                  S'inscrire
                </button>
              </div>
            </div>
          </div>

          {/* Card Graphique Circulaire */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Cumul Année</h3>
            <div className="relative flex justify-center mb-4">
              {/* Simulation graphique circulaire */}
              <div className="w-32 h-32 rounded-full border-8 border-gray-200 relative">
                <div className="absolute inset-0 rounded-full border-8 border-green-500" style={{clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 50% 100%)'}}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">67 600 €</div>
                    <div className="text-xs text-gray-600">Total Brut</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">En poche</span>
                </div>
                <span className="font-semibold">2 379 €</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                  <span className="text-gray-600">Taxes</span>
                </div>
                <span className="font-semibold">1 198,46 €</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-gray-600">Déductions</span>
                </div>
                <span className="font-semibold">150 €</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Activités Récentes</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {activity.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{activity.name}</p>
                      <p className="text-sm text-gray-600">{activity.action}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {activity.originalStatus === 'pending' && (user.role === 'admin' || user.role === 'manager') && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveRequest(index)}
                          className="px-3 py-1 bg-green-500 text-white text-xs rounded-full hover:bg-green-600 transition-colors duration-200"
                        >
                          ✅ Approuver
                        </button>
                        <button
                          onClick={() => handleRejectRequest(index)}
                          className="px-3 py-1 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 transition-colors duration-200"
                        >
                          ❌ Rejeter
                        </button>
                      </div>
                    )}
                    
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{activity.date}</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        activity.status === 'Approuvé' ? 'bg-green-100 text-green-800' :
                        activity.status === 'En attente' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Événements à Venir</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {upcomingEvents.map((event, index) => {
                const formattedEvent = formatEventForDisplay(event);
                return (
                  <div key={event.id || index} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200 cursor-pointer">
                    <div className={`w-3 h-3 rounded-full ${formattedEvent.typeInfo.color}`}></div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-sm">{event.event}</p>
                      <p className="text-xs text-gray-500">{event.date} à {event.time}</p>
                      {event.location && (
                        <p className="text-xs text-gray-400">📍 {event.location}</p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formattedEvent.typeInfo.icon}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Departments Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Vue d'Ensemble des Départements</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {departments.map((dept, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">{dept.name}</h3>
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                    dept.percentage >= 90 ? 'bg-green-100 text-green-800' :
                    dept.percentage >= 80 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {dept.percentage}%
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Employés:</span>
                    <span className="font-medium">{dept.employees}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Absences:</span>
                    <span className="font-medium text-red-600">{dept.absences}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        dept.percentage >= 90 ? 'bg-green-500' :
                        dept.percentage >= 80 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${dept.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions - Version fonctionnelle finale */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <h2 className="text-lg font-semibold mb-4">Actions Rapides</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={handleGenerateReport}
            className="p-4 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all duration-200 text-center hover:scale-105 active:scale-95"
          >
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium">Générer Rapport</div>
          </button>
          <button 
            onClick={handleNewEmployee}
            className="p-4 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all duration-200 text-center hover:scale-105 active:scale-95"
          >
            <div className="text-2xl mb-2">👤</div>
            <div className="text-sm font-medium">Nouvel Employé</div>
          </button>
          <button 
            onClick={handleScheduleMeeting}
            className="p-4 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all duration-200 text-center hover:scale-105 active:scale-95"
          >
            <div className="text-2xl mb-2">📅</div>
            <div className="text-sm font-medium">Planifier Réunion</div>
          </button>
          <button 
            onClick={handleExportPayroll}
            className="p-4 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all duration-200 text-center hover:scale-105 active:scale-95"
          >
            <div className="text-2xl mb-2">💼</div>
            <div className="text-sm font-medium">Export Paie</div>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Dashboard;