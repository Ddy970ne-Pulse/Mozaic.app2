import React, { useState, useEffect } from 'react';
import { getRequests, getPendingRequests, getRecentActivities, approveRequest, rejectRequest, subscribe } from '../shared/requestsData';
import { getUpcomingEvents, subscribe as subscribeToEvents, formatEventForDisplay, eventTypes } from '../shared/eventsData';

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

  // Souscription aux changements d'état
  useEffect(() => {
    const unsubscribe = subscribe((newRequests) => {
      setRequests(newRequests);
      setRecentActivities(getRecentActivities());
    });

    return unsubscribe;
  }, []);

  const upcomingEvents = [
    { event: 'Réunion équipe RH', date: '16 Jan', time: '09:00', type: 'meeting' },
    { event: 'Formation sécurité', date: '18 Jan', time: '14:00', type: 'training' },
    { event: 'Évaluation annuelle', date: '20 Jan', time: '10:30', type: 'evaluation' },
    { event: 'Comité d\'entreprise', date: '22 Jan', time: '16:00', type: 'committee' }
  ];

  const departments = [
    { name: 'IT', employees: 45, absences: 5, percentage: 89 },
    { name: 'Commercial', employees: 32, absences: 8, percentage: 75 },
    { name: 'RH', employees: 12, absences: 1, percentage: 92 },
    { name: 'Finance', employees: 18, absences: 3, percentage: 83 },
    { name: 'Marketing', employees: 25, absences: 4, percentage: 84 },
    { name: 'Opérations', employees: 24, absences: 6, percentage: 75 }
  ];

  // Fonctions pour les actions rapides
  const handleGenerateReport = () => {
    // Navigation vers Analytics pour générer des rapports
    if (onChangeView) {
      onChangeView('analytics');
    }
  };

  const handleNewEmployee = () => {
    // Navigation vers Gestion des Utilisateurs
    if (onChangeView) {
      onChangeView('user-management');
    }
  };

  const handleScheduleMeeting = () => {
    // Navigation vers Planning Mensuel
    if (onChangeView) {
      onChangeView('monthly-planning');
    }
  };

  const handleExportPayroll = () => {
    // Navigation vers Boîte à outils RH pour l'export paie
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Tableau de Bord RH</h1>
        <p className="text-gray-600">Vue d'ensemble de votre organisation • {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                <p className={`text-sm mt-1 ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change} ce mois
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center text-white text-xl`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
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
              {upcomingEvents.map((event, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                  <div className={`w-3 h-3 rounded-full ${
                    event.type === 'meeting' ? 'bg-blue-500' :
                    event.type === 'training' ? 'bg-green-500' :
                    event.type === 'evaluation' ? 'bg-orange-500' :
                    'bg-purple-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">{event.event}</p>
                    <p className="text-xs text-gray-500">{event.date} à {event.time}</p>
                  </div>
                </div>
              ))}
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

      {/* Quick Actions */}
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
  );
};

export default Dashboard;