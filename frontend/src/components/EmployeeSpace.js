import React, { useState } from 'react';

const EmployeeSpace = ({ user }) => {
  const [activeTab, setActiveTab] = useState('profile');

  const employeeData = {
    profile: {
      name: user.name,
      email: user.email || `${user.name.toLowerCase().replace(' ', '.')}@company.com`,
      department: user.department,
      position: user.role === 'admin' ? 'Responsable RH' : user.role === 'manager' ? 'Chef d\'Equipe' : 'Employé',
      startDate: '2020-03-15',
      employeeId: 'EMP001',
      manager: user.role === 'employee' ? 'Sophie Martin' : 'Direction Générale',
      phone: '+33 1 23 45 67 89',
      address: '123 Rue de la Paix, 75001 Paris'
    },
    entitlements: {
      annualLeave: { total: 25, used: 7, remaining: 18 },
      rtt: { total: 12, used: 4, remaining: 8 },
      sickLeave: { total: 'Illimité', used: 2, remaining: 'Illimité' },
      trainingDays: { total: 5, used: 2, remaining: 3 },
      overtimeHours: { accumulated: 24.5, recovered: 8, balance: 16.5 }
    },
    documents: [
      { name: 'Contrat de travail', type: 'PDF', date: '2020-03-15', size: '2.4 MB' },
      { name: 'Avenant salaire 2024', type: 'PDF', date: '2024-01-01', size: '1.2 MB' },
      { name: 'Certificat de travail', type: 'PDF', date: '2023-12-31', size: '890 KB' },
      { name: 'Attestation formation', type: 'PDF', date: '2023-11-15', size: '1.1 MB' }
    ],
    payslips: [
      { month: 'Décembre 2023', gross: 3500, net: 2730, date: '2023-12-31' },
      { month: 'Novembre 2023', gross: 3500, net: 2730, date: '2023-11-30' },
      { month: 'Octobre 2023', gross: 3650, net: 2845, date: '2023-10-31' },
      { month: 'Septembre 2023', gross: 3500, net: 2730, date: '2023-09-30' }
    ],
    goals: [
      { title: 'Améliorer les compétences React', progress: 75, deadline: '2024-03-31', status: 'in-progress' },
      { title: 'Certification Azure', progress: 40, deadline: '2024-06-30', status: 'in-progress' },
      { title: 'Management d\'Equipe', progress: 100, deadline: '2024-01-31', status: 'completed' },
      { title: 'Formation Sécurité IT', progress: 20, deadline: '2024-12-31', status: 'not-started' }
    ]
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'not-started': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Terminé';
      case 'in-progress': return 'En cours';
      case 'not-started': return 'Pas commencé';
      default: return 'Inconnu';
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Informations Personnelles</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">{employeeData.profile.name}</h2>
                      <p className="text-gray-600">{employeeData.profile.position}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium text-gray-800">{employeeData.profile.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Département:</span>
                      <span className="font-medium text-gray-800">{employeeData.profile.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ID Employé:</span>
                      <span className="font-medium text-gray-800">{employeeData.profile.employeeId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date d'embauche:</span>
                      <span className="font-medium text-gray-800">{formatDate(employeeData.profile.startDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Manager:</span>
                      <span className="font-medium text-gray-800">{employeeData.profile.manager}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Téléphone:</span>
                    <span className="font-medium text-gray-800">{employeeData.profile.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Adresse:</span>
                    <span className="font-medium text-gray-800 text-right">{employeeData.profile.address}</span>
                  </div>
                </div>
                
                <button className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors duration-200">
                  Modifier les Informations
                </button>
              </div>
            </div>
          </div>
        );

      case 'entitlements':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Congés Annuels</h3>
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">🏖️</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-semibold">{employeeData.entitlements.annualLeave.total} jours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Utilisés:</span>
                    <span className="font-semibold text-red-600">{employeeData.entitlements.annualLeave.used} jours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Restants:</span>
                    <span className="font-semibold text-green-600">{employeeData.entitlements.annualLeave.remaining} jours</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(employeeData.entitlements.annualLeave.used / employeeData.entitlements.annualLeave.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">RTT</h3>
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">🎯</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-semibold">{employeeData.entitlements.rtt.total} jours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Utilisés:</span>
                    <span className="font-semibold text-red-600">{employeeData.entitlements.rtt.used} jours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Restants:</span>
                    <span className="font-semibold text-green-600">{employeeData.entitlements.rtt.remaining} jours</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${(employeeData.entitlements.rtt.used / employeeData.entitlements.rtt.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Heures Supplémentaires</h3>
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">⏰</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Accumulées:</span>
                    <span className="font-semibold">{employeeData.entitlements.overtimeHours.accumulated}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Récupérées:</span>
                    <span className="font-semibold text-green-600">{employeeData.entitlements.overtimeHours.recovered}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Solde:</span>
                    <span className="font-semibold text-orange-600">{employeeData.entitlements.overtimeHours.balance}h</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Documents Personnels</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {employeeData.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-lg">📝</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">{doc.name}</h4>
                        <p className="text-sm text-gray-600">{doc.type} • {doc.size} • {formatDate(doc.date)}</p>
                      </div>
                    </div>
                    <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200">
                      Télécharger
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      // case 'payslips': // MODULE DÉSACTIVÉ
      //   return (
      //     <div className="space-y-6">
      //       <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      //         <div className="flex items-center space-x-3">
      //           <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      //             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833-.228 2.5 1.732 2.5z" />
      //           </svg>
      //           <div>
      //             <h3 className="text-lg font-semibold text-yellow-800">Module Fiches de Paie Temporairement Indisponible</h3>
      //             <p className="text-yellow-700 mt-1">
      //               Conformément au RGPD, les fiches de paie nécessitent un coffre-fort numérique sécurisé. 
      //               Ce module sera disponible prochainement avec les mesures de sécurité appropriées.
      //             </p>
      //             <p className="text-sm text-yellow-600 mt-2">
      //               Pour consulter vos fiches de paie, veuillez contacter le service RH.
      //             </p>
      //           </div>
      //         </div>
      //       </div>
      //     </div>
      //   );

      case 'goals':
        return (
          <div className="space-y-6">
            {employeeData.goals.map((goal, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{goal.title}</h3>
                    <p className="text-sm text-gray-600">Echéance: {formatDate(goal.deadline)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(goal.status)}`}>
                    {getStatusText(goal.status)}
                  </span>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progrès</span>
                    <span>{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getProgressColor(goal.progress)}`}
                      style={{ width: `${goal.progress}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200">
                    Voir Détails
                  </button>
                  <button className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200">
                    Mettre à Jour
                  </button>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return <div>Onglet non trouvé</div>;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{user.role === 'employee' ? 'Mon' : 'Votre'} Espace Personnel</h1>
        <p className="text-gray-600">Informations personnelles, droits et documents</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'profile', name: 'Profil', icon: '👤' },
              { id: 'entitlements', name: 'Mes Droits', icon: '🏖️' },
              { id: 'documents', name: 'Documents', icon: '📝' },
              // { id: 'payslips', name: 'Fiches de Paie', icon: '💼' }, // Désactivé - Coffre fort numérique RGPD requis
              { id: 'goals', name: 'Objectifs', icon: '🎯' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default EmployeeSpace;