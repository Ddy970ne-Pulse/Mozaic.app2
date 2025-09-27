import React from 'react';

const EmployeeDashboard = ({ user }) => {
  const personalStats = [
    { title: 'Congés Annuels', value: '18 jours', available: '25 jours', icon: '🏖️', color: 'bg-blue-500', percentage: 72 },
    { title: 'RTT Disponibles', value: '8 jours', available: '12 jours', icon: '🎯', color: 'bg-green-500', percentage: 67 },
    { title: 'Heures Récup', value: '12h30', available: '40h max', icon: '⏰', color: 'bg-purple-500', percentage: 31 },
    { title: 'Absences ce Mois', value: '2 jours', available: '', icon: '📅', color: 'bg-orange-500', percentage: 0 }
  ];

  const upcomingAbsences = [
    { type: 'Congés Payés', dates: '25-29 Jan 2024', duration: '5 jours', status: 'Approuvé' },
    { type: 'RTT', dates: '15 Fév 2024', duration: '1 jour', status: 'En attente' },
    { type: 'Formation', dates: '20-21 Fév 2024', duration: '2 jours', status: 'Planifié' }
  ];

  const recentRequests = [
    { date: '10 Jan 2024', type: 'Congés Payés', period: '25-29 Jan', status: 'Approuvé', approver: 'Sophie Martin' },
    { date: '08 Jan 2024', type: 'Heures Sup', period: '2-6 Jan', status: 'Validé', approver: 'Jean Dupont' },
    { date: '05 Jan 2024', type: 'RTT', period: '15 Fév', status: 'En attente', approver: 'Sophie Martin' }
  ];

  const personalSchedule = [
    { day: 'Lun 15', status: 'Présent', hours: '9h-18h', type: 'work' },
    { day: 'Mar 16', status: 'Présent', hours: '9h-18h', type: 'work' },
    { day: 'Mer 17', status: 'Télétravail', hours: '9h-18h', type: 'remote' },
    { day: 'Jeu 18', status: 'Formation', hours: '14h-17h', type: 'training' },
    { day: 'Ven 19', status: 'Présent', hours: '9h-17h', type: 'work' }
  ];

  const notifications = [
    { type: 'info', message: 'Votre demande de congés du 25-29 Jan a été approuvée', time: '2h' },
    { type: 'warning', message: 'Pensez à valider vos heures de la semaine dernière', time: '1j' },
    { type: 'success', message: 'Vos heures supplémentaires ont été validées', time: '2j' },
    { type: 'info', message: 'Nouvelle politique de télétravail disponible', time: '3j' }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Bonjour {user.name.split(' ')[0]} ! 👋</h1>
        <p className="text-blue-100">Voici votre tableau de bord personnel • {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Personal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {personalStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center text-white text-xl`}>
                {stat.icon}
              </div>
              {stat.percentage > 0 && (
                <span className="text-xs font-medium text-gray-500">{stat.percentage}%</span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              {stat.available && (
                <p className="text-sm text-gray-500 mt-1">sur {stat.available}</p>
              )}
              {stat.percentage > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div 
                    className={`h-2 rounded-full ${stat.color.replace('bg-', 'bg-opacity-70 bg-')}`}
                    style={{ width: `${stat.percentage}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Upcoming Absences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Absences Prévues</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {upcomingAbsences.map((absence, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-800">{absence.type}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      absence.status === 'Approuvé' ? 'bg-green-100 text-green-800' :
                      absence.status === 'En attente' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {absence.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{absence.dates}</p>
                  <p className="text-xs text-gray-500 mt-1">{absence.duration}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Personal Schedule */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Mon Planning</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {personalSchedule.map((day, index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      day.type === 'work' ? 'bg-green-500' :
                      day.type === 'remote' ? 'bg-blue-500' :
                      day.type === 'training' ? 'bg-purple-500' :
                      'bg-gray-400'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{day.day}</p>
                      <p className="text-xs text-gray-500">{day.hours}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-600">{day.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Notifications</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {notifications.map((notif, index) => (
                <div key={index} className="p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                  <div className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      notif.type === 'info' ? 'bg-blue-500' :
                      notif.type === 'warning' ? 'bg-yellow-500' :
                      notif.type === 'success' ? 'bg-green-500' :
                      'bg-gray-400'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{notif.message}</p>
                      <p className="text-xs text-gray-500 mt-1">Il y a {notif.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Requests */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Mes Demandes Récentes</h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Période</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3">Valideur</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {recentRequests.map((request, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 text-gray-600">{request.date}</td>
                    <td className="py-4 font-medium text-gray-800">{request.type}</td>
                    <td className="py-4 text-gray-600">{request.period}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === 'Approuvé' || request.status === 'Validé' ? 'bg-green-100 text-green-800' :
                        request.status === 'En attente' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="py-4 text-gray-600">{request.approver}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Actions Rapides</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200 text-center group">
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">📝</div>
              <div className="text-sm font-medium text-blue-800">Nouvelle Demande</div>
            </button>
            <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-200 text-center group">
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">⏰</div>
              <div className="text-sm font-medium text-green-800">Pointer</div>
            </button>
            <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors duration-200 text-center group">
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">📊</div>
              <div className="text-sm font-medium text-purple-800">Mes Statistiques</div>
            </button>
            <button className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors duration-200 text-center group">
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">💼</div>
              <div className="text-sm font-medium text-orange-800">Fiche de Paie</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;