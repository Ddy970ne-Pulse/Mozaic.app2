import React, { useState } from 'react';

const DelegationHours = ({ user }) => {
  // Vérifier si l'utilisateur actuel est titulaire d'une délégation
  const isUserDelegate = user.role === 'employee' && (user.isDelegateCSE || user.name === 'Marie Leblanc' || user.name === 'Pierre Moreau');
  const [activeTab, setActiveTab] = useState(isUserDelegate && user.role === 'employee' ? 'my-delegation' : 'overview');
  const [showAddDelegate, setShowAddDelegate] = useState(false);
  const [showAddUsage, setShowAddUsage] = useState(false);
  const [showCessionModal, setShowCessionModal] = useState(false);
  const [selectedDelegate, setSelectedDelegate] = useState(null);
  const [newDelegate, setNewDelegate] = useState({
    employeeId: '',
    name: '',
    type: 'CSE',
    monthlyHours: 10,
    startDate: '',
    endDate: ''
  });
  const [newUsage, setNewUsage] = useState({
    delegateId: '',
    date: '',
    hours: '',
    activity: '',
    description: ''
  });
  const [newCession, setNewCession] = useState({
    fromDelegateId: '',
    toDelegateId: '',
    hours: '',
    reason: '',
    date: new Date().toISOString().split('T')[0]
  });

  const delegationTypes = {
    'CSE': { name: 'Membre CSE', baseHours: 10, color: 'bg-blue-500' },
    'DS': { name: 'Délégué Syndical', baseHours: 15, color: 'bg-green-500' },
    'RSS': { name: 'Représentant Syndical', baseHours: 4, color: 'bg-purple-500' },
    'CHSCT': { name: 'Membre CHSCT', baseHours: 5, color: 'bg-orange-500' }
  };

  const employees = [
    { id: 1, name: 'Jean Dupont', department: 'IT', email: 'jean.dupont@company.com' },
    { id: 2, name: 'Marie Leblanc', department: 'Commercial', email: 'marie.leblanc@company.com' },
    { id: 3, name: 'Pierre Martin', department: 'Finance', email: 'pierre.martin@company.com' },
    { id: 4, name: 'Claire Dubois', department: 'Marketing', email: 'claire.dubois@company.com' },
    { id: 5, name: 'Lucas Bernard', department: 'IT', email: 'lucas.bernard@company.com' },
    { id: 6, name: 'Emma Rousseau', department: 'Commercial', email: 'emma.rousseau@company.com' },
    { id: 7, name: 'Thomas Leroy', department: 'Operations', email: 'thomas.leroy@company.com' },
    { id: 8, name: 'Pierre Moreau', department: 'Production', email: 'pierre.cse@company.com' }
  ];

  const delegates = [
    {
      id: 1,
      employeeId: 2,
      name: 'Marie Leblanc',
      department: 'Commercial',
      type: 'CSE',
      baseMonthlyHours: 10, // Heures de base selon effectif
      monthlyHours: 10, // Heures actuelles après cessions
      usedHours: 7.5,
      remainingHours: 2.5,
      cededHours: 0, // Heures cédées à d'autres
      receivedHours: 0, // Heures reçues d'autres
      reportedHours: 0, // Heures reportées du mois précédent
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      status: 'active',
      lastActivity: '2024-01-15'
    },
    {
      id: 2,
      employeeId: 1,
      name: 'Jean Dupont',
      department: 'IT',
      type: 'DS',
      baseMonthlyHours: 15,
      monthlyHours: 18, // +3h reçues de Pierre
      usedHours: 12,
      remainingHours: 6,
      cededHours: 0,
      receivedHours: 3, // Reçu 3h de Pierre Moreau
      reportedHours: 0,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      status: 'active',
      lastActivity: '2024-01-12'
    },
    {
      id: 3,
      employeeId: 4,
      name: 'Claire Dubois',
      department: 'Marketing',
      type: 'RSS',
      baseMonthlyHours: 4,
      monthlyHours: 4,
      usedHours: 2,
      remainingHours: 2,
      cededHours: 0,
      receivedHours: 0,
      reportedHours: 0,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      status: 'active',
      lastActivity: '2024-01-08'
    },
    {
      id: 4,
      employeeId: 8,
      name: 'Pierre Moreau',
      department: 'Production',
      type: 'CSE',
      baseMonthlyHours: 10,
      monthlyHours: 7, // -3h cédées à Jean
      usedHours: 3.5,
      remainingHours: 3.5,
      cededHours: 3, // Cédé 3h à Jean Dupont
      receivedHours: 0,
      reportedHours: 0,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      status: 'active',
      lastActivity: '2024-01-18'
    }
  ];

  // Historique des cessions d'heures
  const cessionHistory = [
    {
      id: 1,
      fromDelegateId: 4,
      fromDelegateName: 'Pierre Moreau',
      fromType: 'CSE',
      toDelegateId: 2,
      toDelegateName: 'Jean Dupont',
      toType: 'DS',
      hours: 3,
      date: '2024-01-10',
      reason: 'Négociation urgente accord télétravail - expertise technique requise',
      status: 'approved',
      approvedBy: 'Sophie Martin',
      approvedDate: '2024-01-10',
      legalBasis: 'Art. L2315-7 Code du Travail - Cession entre représentants'
    }
  ];

  const usageHistory = [
    {
      id: 1,
      delegateId: 1,
      delegateName: 'Marie Leblanc',
      date: '2024-01-15',
      hours: 2.5,
      activity: 'Réunion CSE',
      description: 'Réunion mensuelle du comité social et économique',
      status: 'approved',
      approvedBy: 'Sophie Martin',
      approvedDate: '2024-01-16'
    },
    {
      id: 2,
      delegateId: 1,
      delegateName: 'Marie Leblanc',
      date: '2024-01-10',
      hours: 3,
      activity: 'Formation syndicale',
      description: 'Formation sur les droits des salariés',
      status: 'approved',
      approvedBy: 'Sophie Martin',
      approvedDate: '2024-01-11'
    },
    {
      id: 3,
      delegateId: 2,
      delegateName: 'Jean Dupont',
      date: '2024-01-12',
      hours: 4,
      activity: 'Négociation',
      description: 'Négociation accord télétravail',
      status: 'approved',
      approvedBy: 'Sophie Martin',
      approvedDate: '2024-01-13'
    },
    {
      id: 4,
      delegateId: 2,
      delegateName: 'Jean Dupont',
      date: '2024-01-08',
      hours: 2,
      activity: 'Permanence syndicale',
      description: 'Permanence pour les adhérents',
      status: 'pending',
      approvedBy: null,
      approvedDate: null
    },
    {
      id: 5,
      delegateId: 4,
      delegateName: 'Pierre Moreau',
      date: '2024-01-18',
      hours: 2.5,
      activity: 'Réunion CSE',
      description: 'Réunion extraordinaire CSE - Projet restructuration',
      status: 'approved',
      approvedBy: 'Sophie Martin',
      approvedDate: '2024-01-19'
    },
    {
      id: 6,
      delegateId: 4,
      delegateName: 'Pierre Moreau',
      date: '2024-01-16',
      hours: 1,
      activity: 'Permanence syndicale',
      description: 'Consultation individuelle employé en difficulté',
      status: 'pending',
      approvedBy: null,
      approvedDate: null
    }
  ];

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUsagePercentage = (used, total) => {
    return Math.round((used / total) * 100);
  };

  const handleAddDelegate = (e) => {
    e.preventDefault();
    console.log('Adding delegate:', newDelegate);
    setShowAddDelegate(false);
    setNewDelegate({
      employeeId: '',
      name: '',
      type: 'CSE',
      monthlyHours: 10,
      startDate: '',
      endDate: ''
    });
  };

  const handleAddUsage = (e) => {
    e.preventDefault();
    console.log('Adding usage:', newUsage);
    setShowAddUsage(false);
    setNewUsage({
      delegateId: '',
      date: '',
      hours: '',
      activity: '',
      description: ''
    });
  };

  const handleAddCession = (e) => {
    e.preventDefault();
    console.log('Adding cession:', newCession);
    setShowCessionModal(false);
    setNewCession({
      fromDelegateId: '',
      toDelegateId: '',
      hours: '',
      reason: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleEmployeeSelect = (employeeId) => {
    const employee = employees.find(emp => emp.id === parseInt(employeeId));
    if (employee) {
      setNewDelegate({
        ...newDelegate,
        employeeId: employeeId,
        name: employee.name
      });
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Titulaires Actifs</span>
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">👥</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">{delegates.filter(d => d.status === 'active').length}</div>
          <div className="text-sm text-gray-500 mt-1">Délégués désignés</div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Heures Mensuelles</span>
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">⏰</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {delegates.reduce((sum, d) => sum + d.monthlyHours, 0)}h
          </div>
          <div className="text-sm text-gray-500 mt-1">Quota total</div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Heures Utilisées</span>
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">📊</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {delegates.reduce((sum, d) => sum + d.usedHours, 0)}h
          </div>
          <div className="text-sm text-orange-600 mt-1">Ce mois</div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Taux d'Utilisation</span>
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">📈</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {Math.round((delegates.reduce((sum, d) => sum + d.usedHours, 0) / delegates.reduce((sum, d) => sum + d.monthlyHours, 0)) * 100)}%
          </div>
          <div className="text-sm text-gray-500 mt-1">Utilisation moyenne</div>
        </div>
      </div>

      {/* Active Delegates */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Titulaires Actifs</h2>
            {(user.role === 'admin' || user.role === 'manager') && (
              <button
                onClick={() => setShowAddDelegate(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
              >
                <span>➕</span>
                <span>Désigner Titulaire</span>
              </button>
            )}
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {delegates.filter(d => d.status === 'active').map((delegate) => (
              <div key={delegate.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {delegate.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{delegate.name}</h3>
                      <p className="text-sm text-gray-600">{delegate.department}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded ${delegationTypes[delegate.type]?.color || 'bg-gray-500'}`}></div>
                    <span className="font-medium text-gray-800">{delegationTypes[delegate.type]?.name}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(delegate.status)}`}>
                      Actif
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Quota Mensuel</label>
                    <div className="text-gray-800 font-medium mt-1">{delegate.monthlyHours}h</div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Utilisées</label>
                    <div className="text-orange-600 font-medium mt-1">{delegate.usedHours}h</div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Restantes</label>
                    <div className="text-green-600 font-medium mt-1">{delegate.remainingHours}h</div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Dernière Activité</label>
                    <div className="text-gray-800 font-medium mt-1">{formatDate(delegate.lastActivity)}</div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Utilisation</span>
                    <span>{getUsagePercentage(delegate.usedHours, delegate.monthlyHours)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        getUsagePercentage(delegate.usedHours, delegate.monthlyHours) >= 90 ? 'bg-red-500' :
                        getUsagePercentage(delegate.usedHours, delegate.monthlyHours) >= 70 ? 'bg-orange-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${getUsagePercentage(delegate.usedHours, delegate.monthlyHours)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setSelectedDelegate(delegate)}
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    Voir Détails
                  </button>
                  <button 
                    onClick={() => {
                      setNewUsage({...newUsage, delegateId: delegate.id});
                      setShowAddUsage(true);
                    }}
                    className="bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    Déclarer Heures
                  </button>
                  {(user.role === 'admin' || user.role === 'manager') && (
                    <button className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200">
                      Révoquer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsageHistory = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Historique d'Utilisation</h2>
          <button
            onClick={() => setShowAddUsage(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
          >
            <span>➕</span>
            <span>Déclarer Heures</span>
          </button>
        </div>
      </div>
      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                <th className="pb-3">Titulaire</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Heures</th>
                <th className="pb-3">Activité</th>
                <th className="pb-3">Description</th>
                <th className="pb-3">Statut</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {usageHistory.map((usage) => (
                <tr key={usage.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4">
                    <div className="font-medium text-gray-800">{usage.delegateName}</div>
                  </td>
                  <td className="py-4 text-gray-600">{formatDate(usage.date)}</td>
                  <td className="py-4 font-medium text-blue-600">{usage.hours}h</td>
                  <td className="py-4 text-gray-600">{usage.activity}</td>
                  <td className="py-4 text-gray-600 max-w-xs truncate">{usage.description}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(usage.status)}`}>
                      {usage.status === 'pending' ? 'En attente' : 'Approuvé'}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex space-x-2">
                      {usage.status === 'pending' && (user.role === 'admin' || user.role === 'manager') && (
                        <>
                          <button className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs transition-colors duration-200">
                            Approuver
                          </button>
                          <button className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition-colors duration-200">
                            Refuser
                          </button>
                        </>
                      )}
                      <button className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded text-xs transition-colors duration-200">
                        Détails
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderMyDelegation = () => {
    // Trouver la délégation de l'utilisateur actuel
    const userDelegation = delegates.find(d => d.name === user.name);
    const userUsageHistory = usageHistory.filter(u => u.delegateName === user.name);
    
    if (!userDelegation) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-8 text-center">
            <div className="text-4xl mb-4">⚖️</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Aucune délégation assignée</h2>
            <p className="text-gray-600">Vous n'êtes actuellement titulaire d'aucune fonction de représentation du personnel.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Carte de délégation personnelle */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Ma Délégation</h2>
              <p className="text-blue-100">{delegationTypes[userDelegation.type]?.name}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{userDelegation.remainingHours}h</div>
              <div className="text-blue-100">restantes ce mois</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">{userDelegation.monthlyHours}h</div>
              <div className="text-blue-100">Quota mensuel</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">{userDelegation.usedHours}h</div>
              <div className="text-blue-100">Utilisées</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">{getUsagePercentage(userDelegation.usedHours, userDelegation.monthlyHours)}%</div>
              <div className="text-blue-100">Taux d'utilisation</div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-white"
                style={{ width: `${getUsagePercentage(userDelegation.usedHours, userDelegation.monthlyHours)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Déclarer des heures</h3>
            <p className="text-gray-600 mb-4">Enregistrez vos heures de délégation effectuées</p>
            <button 
              onClick={() => {
                setNewUsage({...newUsage, delegateId: userDelegation.id});
                setShowAddUsage(true);
              }}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
            >
              Déclarer mes heures
            </button>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Mes informations</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Fonction:</span>
                <span className="font-medium">{delegationTypes[userDelegation.type]?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Département:</span>
                <span className="font-medium">{userDelegation.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mandat:</span>
                <span className="font-medium">{formatDate(userDelegation.startDate)} - {formatDate(userDelegation.endDate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Historique personnel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Mon Historique</h2>
          </div>
          <div className="p-6">
            {userUsageHistory.length > 0 ? (
              <div className="space-y-4">
                {userUsageHistory.map((usage) => (
                  <div key={usage.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="text-lg">📅</div>
                        <div>
                          <h4 className="font-medium text-gray-800">{usage.activity}</h4>
                          <p className="text-sm text-gray-600">{formatDate(usage.date)} • {usage.hours}h</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(usage.status)}`}>
                        {usage.status === 'pending' ? 'En attente' : 'Approuvé'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{usage.description}</p>
                    {usage.status === 'approved' && (
                      <p className="text-xs text-green-600 mt-2">
                        Approuvé par {usage.approvedBy} le {formatDate(usage.approvedDate)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-gray-600">Aucune activité enregistrée pour le moment</p>
                <button 
                  onClick={() => {
                    setNewUsage({...newUsage, delegateId: userDelegation.id});
                    setShowAddUsage(true);
                  }}
                  className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  Déclarer mes premières heures
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Configuration des Types de Délégation</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(delegationTypes).map(([key, type]) => (
              <div key={key} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded ${type.color}`}></div>
                    <h3 className="font-semibold text-gray-800">{type.name}</h3>
                  </div>
                  <span className="text-sm text-gray-500">{key}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Heures de base:</span>
                    <span className="font-medium">{type.baseHours}h/mois</span>
                  </div>
                  <div className="flex justify-between">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">Modifier</button>
                    <button className="text-red-600 hover:text-red-800 text-sm">Supprimer</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Règles de Calcul</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-800">Attribution automatique</div>
                <div className="text-sm text-gray-600">Attribuer automatiquement les heures selon les statuts</div>
              </div>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-800">Report d'heures</div>
                <div className="text-sm text-gray-600">Autoriser le report des heures non utilisées</div>
              </div>
              <input type="checkbox" className="rounded" />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-800">Validation obligatoire</div>
                <div className="text-sm text-gray-600">Toutes les utilisations doivent être validées</div>
              </div>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Gestion des Heures de Délégation</h1>
        <p className="text-gray-600">Suivi et gestion des heures allouées aux représentants du personnel</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {(isUserDelegate && user.role === 'employee' ? [
              { id: 'my-delegation', name: 'Ma Délégation', icon: '⚖️' },
              { id: 'usage', name: 'Historique Global', icon: '📝' }
            ] : [
              { id: 'overview', name: 'Vue d\'ensemble', icon: '📊' },
              { id: 'usage', name: 'Historique', icon: '📝' },
              { id: 'settings', name: 'Configuration', icon: '⚙️' }
            ]).map((tab) => (
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
      <div className="min-h-[500px]">
        {activeTab === 'my-delegation' && renderMyDelegation()}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'usage' && renderUsageHistory()}
        {activeTab === 'settings' && renderSettings()}
      </div>

      {/* Modal Ajouter Titulaire */}
      {showAddDelegate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Désigner un Titulaire</h2>
                <button
                  onClick={() => setShowAddDelegate(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleAddDelegate} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employé</label>
                  <select
                    value={newDelegate.employeeId}
                    onChange={(e) => handleEmployeeSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Sélectionner un employé</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} - {emp.department}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type de délégation</label>
                  <select
                    value={newDelegate.type}
                    onChange={(e) => setNewDelegate({
                      ...newDelegate, 
                      type: e.target.value,
                      monthlyHours: delegationTypes[e.target.value].baseHours
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {Object.entries(delegationTypes).map(([key, type]) => (
                      <option key={key} value={key}>{type.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Heures mensuelles</label>
                  <input
                    type="number"
                    value={newDelegate.monthlyHours}
                    onChange={(e) => setNewDelegate({...newDelegate, monthlyHours: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="50"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
                    <input
                      type="date"
                      value={newDelegate.startDate}
                      onChange={(e) => setNewDelegate({...newDelegate, startDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
                    <input
                      type="date"
                      value={newDelegate.endDate}
                      onChange={(e) => setNewDelegate({...newDelegate, endDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddDelegate(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                >
                  Désigner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Déclarer Heures */}
      {showAddUsage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Déclarer des Heures</h2>
                <button
                  onClick={() => setShowAddUsage(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleAddUsage} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Titulaire</label>
                  <select
                    value={newUsage.delegateId}
                    onChange={(e) => setNewUsage({...newUsage, delegateId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Sélectionner un titulaire</option>
                    {delegates.filter(d => d.status === 'active').map(delegate => (
                      <option key={delegate.id} value={delegate.id}>
                        {delegate.name} - {delegationTypes[delegate.type]?.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={newUsage.date}
                      onChange={(e) => setNewUsage({...newUsage, date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Heures</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newUsage.hours}
                      onChange={(e) => setNewUsage({...newUsage, hours: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0.5"
                      max="8"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type d'activité</label>
                  <select
                    value={newUsage.activity}
                    onChange={(e) => setNewUsage({...newUsage, activity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Sélectionner une activité</option>
                    <option value="Réunion CSE">Réunion CSE</option>
                    <option value="Formation syndicale">Formation syndicale</option>
                    <option value="Négociation">Négociation</option>
                    <option value="Permanence syndicale">Permanence syndicale</option>
                    <option value="Consultation">Consultation</option>
                    <option value="Enquête">Enquête</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newUsage.description}
                    onChange={(e) => setNewUsage({...newUsage, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Détaillez l'activité effectuée..."
                    required
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddUsage(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200"
                >
                  Déclarer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DelegationHours;