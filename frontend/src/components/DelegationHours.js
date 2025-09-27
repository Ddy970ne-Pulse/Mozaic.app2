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
    description: '',
    documents: [],
    requiresAcknowledgment: false
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
      baseMonthlyHours: 15, // Heures de base selon effectif (78 salariés = 15h)
      reportedHours: 2, // Heures reportées du mois précédent (max 3 mois)
      receivedHours: 0, // Heures reçues d'autres représentants
      cededHours: 0, // Heures cédées à d'autres (depuis quel contingent)
      cededFromBase: 0, // Cédées depuis le crédit de base
      cededFromReported: 0, // Cédées depuis les heures reportées
      usedFromReceived: 0, // Utilisées depuis les heures reçues
      usedFromReported: 2, // Utilisées depuis les heures reportées
      usedFromBase: 5.5, // Utilisées depuis le crédit de base
      totalUsed: 7.5, // Total utilisé ce mois
      availableHours: 9.5, // Heures disponibles total (base + reportées + reçues - cédées - utilisées)
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
      baseMonthlyHours: 15, // DS selon effectif
      reportedHours: 0,
      receivedHours: 3, // Reçu 3h de Pierre Moreau (depuis son crédit de base)
      cededHours: 0,
      cededFromBase: 0,
      cededFromReported: 0,
      usedFromReceived: 3, // D'abord utiliser les heures reçues (priorité légale)
      usedFromReported: 0,
      usedFromBase: 9, // Puis utiliser le crédit de base
      totalUsed: 12,
      availableHours: 6, // 15 + 0 + 3 - 0 - 12 = 6
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
      baseMonthlyHours: 4, // RSS selon convention collective
      reportedHours: 1.5, // Report du mois précédent
      receivedHours: 0,
      cededHours: 0,
      cededFromBase: 0,
      cededFromReported: 0,
      usedFromReceived: 0,
      usedFromReported: 1.5, // Priorité aux heures reportées
      usedFromBase: 0.5,
      totalUsed: 2,
      availableHours: 3.5, // 4 + 1.5 + 0 - 0 - 2 = 3.5
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
      baseMonthlyHours: 15,
      reportedHours: 0,
      receivedHours: 0,
      cededHours: 3, // Cédé 3h à Jean Dupont
      cededFromBase: 3, // Cession depuis le crédit de base (priorité)
      cededFromReported: 0,
      usedFromReceived: 0,
      usedFromReported: 0,
      usedFromBase: 3.5,
      totalUsed: 3.5,
      availableHours: 8.5, // 15 + 0 + 0 - 3 - 3.5 = 8.5
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

  // Fonction pour calculer la déduction correcte selon les règles légales
  const calculateHoursDeduction = (delegate, hoursToUse) => {
    const deduction = {
      fromReceived: 0,
      fromReported: 0,
      fromBase: 0,
      total: hoursToUse
    };

    let remainingToUse = hoursToUse;

    // 1. D'abord utiliser les heures reçues (priorité légale - Art. L2315-7)
    const availableReceived = delegate.receivedHours - delegate.usedFromReceived;
    if (remainingToUse > 0 && availableReceived > 0) {
      const usedFromReceived = Math.min(remainingToUse, availableReceived);
      deduction.fromReceived = usedFromReceived;
      remainingToUse -= usedFromReceived;
    }

    // 2. Ensuite utiliser les heures reportées (dans les 3 mois - jurisprudence)
    const availableReported = delegate.reportedHours - delegate.usedFromReported;
    if (remainingToUse > 0 && availableReported > 0) {
      const usedFromReported = Math.min(remainingToUse, availableReported);
      deduction.fromReported = usedFromReported;
      remainingToUse -= usedFromReported;
    }

    // 3. Enfin utiliser le crédit de base du mois
    const availableBase = delegate.baseMonthlyHours - delegate.cededFromBase - delegate.usedFromBase;
    if (remainingToUse > 0 && availableBase > 0) {
      const usedFromBase = Math.min(remainingToUse, availableBase);
      deduction.fromBase = usedFromBase;
      remainingToUse -= usedFromBase;
    }

    return {
      deduction,
      remainingToUse, // Si > 0, dépassement exceptionnel requis
      isExceptional: remainingToUse > 0
    };
  };

  // Fonction pour calculer la cession selon les règles légales
  const calculateCessionSource = (delegate, hoursToCede) => {
    const cessionSource = {
      fromBase: 0,
      fromReported: 0,
      total: hoursToCede
    };

    let remainingToCede = hoursToCede;

    // 1. D'abord céder depuis le crédit de base (priorité)
    const availableBase = delegate.baseMonthlyHours - delegate.cededFromBase - delegate.usedFromBase;
    if (remainingToCede > 0 && availableBase > 0) {
      const cededFromBase = Math.min(remainingToCede, availableBase);
      cessionSource.fromBase = cededFromBase;
      remainingToCede -= cededFromBase;
    }

    // 2. Ensuite céder depuis les heures reportées (si autorisé)
    const availableReported = delegate.reportedHours - delegate.cededFromReported - delegate.usedFromReported;
    if (remainingToCede > 0 && availableReported > 0) {
      const cededFromReported = Math.min(remainingToCede, availableReported);
      cessionSource.fromReported = cededFromReported;
      remainingToCede -= cededFromReported;
    }

    return {
      cessionSource,
      remainingToCede, // Si > 0, cession impossible
      isPossible: remainingToCede === 0
    };
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
    
    // Create usage data with proper handling
    const usageData = {
      ...newUsage,
      status: newUsage.requiresAcknowledgment ? 'acknowledged' : 'pending',
      acknowledgedBy: newUsage.requiresAcknowledgment ? user.name : null,
      acknowledgedDate: newUsage.requiresAcknowledgment ? new Date().toISOString() : null
    };
    
    console.log('Adding usage:', usageData);
    setShowAddUsage(false);
    setNewUsage({
      delegateId: '',
      date: '',
      hours: '',
      activity: '',
      description: '',
      documents: [],
      requiresAcknowledgment: false
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
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Crédit de Base</label>
                    <div className="text-blue-600 font-medium mt-1">{delegate.baseMonthlyHours}h</div>
                    <div className="text-xs text-gray-500">Selon effectif</div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Heures Reportées</label>
                    <div className="text-purple-600 font-medium mt-1">+{delegate.reportedHours}h</div>
                    <div className="text-xs text-gray-500">Du mois précédent</div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Cédées/Reçues</label>
                    <div className="font-medium mt-1">
                      {delegate.cededHours > 0 && <span className="text-red-600">-{delegate.cededHours}h </span>}
                      {delegate.receivedHours > 0 && <span className="text-green-600">+{delegate.receivedHours}h</span>}
                      {delegate.cededHours === 0 && delegate.receivedHours === 0 && <span className="text-gray-400">0h</span>}
                    </div>
                    <div className="text-xs text-gray-500">Cessions</div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Utilisées</label>
                    <div className="text-orange-600 font-medium mt-1">{delegate.totalUsed}h</div>
                    <div className="text-xs text-gray-500">
                      R:{delegate.usedFromReceived} | B:{delegate.usedFromReported} | C:{delegate.usedFromBase}h
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Disponibles</label>
                    <div className="text-green-600 font-medium mt-1">{delegate.availableHours}h</div>
                    <div className="text-xs text-gray-500">Utilisables</div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Utilisation du crédit total</span>
                    <span>{getUsagePercentage(delegate.totalUsed, delegate.baseMonthlyHours + delegate.reportedHours + delegate.receivedHours - delegate.cededHours)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    {/* Barre segmentée par source */}
                    <div className="h-3 rounded-full flex overflow-hidden">
                      {/* Heures reçues utilisées */}
                      {delegate.usedFromReceived > 0 && (
                        <div 
                          className="bg-green-500" 
                          style={{ width: `${(delegate.usedFromReceived / (delegate.baseMonthlyHours + delegate.reportedHours + delegate.receivedHours - delegate.cededHours)) * 100}%` }}
                          title={`${delegate.usedFromReceived}h depuis heures reçues`}
                        ></div>
                      )}
                      {/* Heures reportées utilisées */}
                      {delegate.usedFromReported > 0 && (
                        <div 
                          className="bg-purple-500" 
                          style={{ width: `${(delegate.usedFromReported / (delegate.baseMonthlyHours + delegate.reportedHours + delegate.receivedHours - delegate.cededHours)) * 100}%` }}
                          title={`${delegate.usedFromReported}h depuis heures reportées`}
                        ></div>
                      )}
                      {/* Heures de base utilisées */}
                      {delegate.usedFromBase > 0 && (
                        <div 
                          className="bg-blue-500" 
                          style={{ width: `${(delegate.usedFromBase / (delegate.baseMonthlyHours + delegate.reportedHours + delegate.receivedHours - delegate.cededHours)) * 100}%` }}
                          title={`${delegate.usedFromBase}h depuis crédit de base`}
                        ></div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>🟢 Reçues | 🟣 Reportées | 🔵 Base</span>
                    <span>Total: {delegate.baseMonthlyHours + delegate.reportedHours + delegate.receivedHours - delegate.cededHours}h</span>
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
                
                {/* Alerte dépassement exceptionnel */}
                {delegate.totalUsed > (delegate.baseMonthlyHours + delegate.reportedHours + delegate.receivedHours - delegate.cededHours) && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className="text-amber-500">⚠️</span>
                      <div>
                        <div className="text-sm font-medium text-amber-800">Dépassement Exceptionnel</div>
                        <div className="text-xs text-amber-700">
                          +{delegate.totalUsed - (delegate.baseMonthlyHours + delegate.reportedHours + delegate.receivedHours - delegate.cededHours)}h 
                          au-delà du crédit normal (Art. L2315-9 CT)
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">{userDelegation.baseMonthlyHours}h</div>
              <div className="text-blue-100">Quota de base</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">{userDelegation.monthlyHours}h</div>
              <div className="text-blue-100">Quota actuel</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">{userDelegation.usedHours}h</div>
              <div className="text-blue-100">Utilisées</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">{userDelegation.cededHours}h</div>
              <div className="text-blue-100">Cédées</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">+{userDelegation.receivedHours}h</div>
              <div className="text-blue-100">Reçues</div>
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

  const renderCessions = () => (
    <div className="space-y-6">
      {/* En-tête avec informations légales */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-blue-500 text-xl">⚖️</div>
          <div>
            <h3 className="font-semibold text-blue-800 mb-2">Cession d'Heures de Délégation</h3>
            <p className="text-sm text-blue-700 mb-2">
              <strong>Base légale :</strong> Article L2315-7 du Code du Travail
            </p>
            <div className="text-xs text-blue-600 space-y-1">
              <p>• Les représentants peuvent céder tout ou partie de leurs heures de délégation</p>
              <p>• La cession peut se faire entre membres de la même instance ou d'instances différentes</p>
              <p>• L'employeur doit être informé de la cession et de son motif</p>
              <p>• Les heures cédées restent payées normalement par l'employeur</p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques des cessions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Heures Cédées</span>
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">📤</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {delegates.reduce((sum, d) => sum + d.cededHours, 0)}h
          </div>
          <div className="text-sm text-red-600 mt-1">Total ce mois</div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Heures Reçues</span>
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">📥</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {delegates.reduce((sum, d) => sum + d.receivedHours, 0)}h
          </div>
          <div className="text-sm text-green-600 mt-1">Total ce mois</div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Cessions Actives</span>
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">🔄</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">{cessionHistory.length}</div>
          <div className="text-sm text-blue-600 mt-1">Ce mois</div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Gestion des Cessions</h2>
            <button
              onClick={() => setShowCessionModal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              <span>🔄</span>
              <span>Nouvelle Cession</span>
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {cessionHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Cédant</th>
                    <th className="pb-3">Bénéficiaire</th>
                    <th className="pb-3">Heures</th>
                    <th className="pb-3">Motif</th>
                    <th className="pb-3">Statut</th>
                    <th className="pb-3">Base Légale</th>
                  </tr>
                </thead>
                <tbody>
                  {cessionHistory.map((cession) => (
                    <tr key={cession.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 text-gray-600">{formatDate(cession.date)}</td>
                      <td className="py-4">
                        <div>
                          <div className="font-medium text-gray-800">{cession.fromDelegateName}</div>
                          <div className="text-sm text-gray-500">{delegationTypes[cession.fromType]?.name}</div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div>
                          <div className="font-medium text-gray-800">{cession.toDelegateName}</div>
                          <div className="text-sm text-gray-500">{delegationTypes[cession.toType]?.name}</div>
                        </div>
                      </td>
                      <td className="py-4 font-medium text-blue-600">{cession.hours}h</td>
                      <td className="py-4 text-gray-600 max-w-xs truncate">{cession.reason}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(cession.status)}`}>
                          {cession.status === 'approved' ? 'Approuvé' : 'En attente'}
                        </span>
                      </td>
                      <td className="py-4 text-xs text-gray-500">{cession.legalBasis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Aucune cession d'heures</h3>
              <p className="text-gray-600 mb-4">Les cessions d'heures entre représentants apparaîtront ici</p>
              <button
                onClick={() => setShowCessionModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Créer une cession
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Règles de cession */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Règles de Cession (Code du Travail)</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">✅ Cessions Autorisées</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>Entre membres du CSE</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>Entre délégués syndicaux</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>Entre représentants de proximité</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>Entre instances différentes (CSE ↔ DS)</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">⚠️ Conditions Requises</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Information préalable de l'employeur</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Motif de la cession justifié</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Accord du bénéficiaire</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Respect du crédit d'heures global</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      {/* Software Parameters Configuration */}
      {/* Codification System */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Système de Codification des Absences</h2>
        </div>
        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-blue-800 mb-2">📋 Codification DEL - Délégation CSE</h4>
            <p className="text-sm text-blue-700 mb-2">
              <strong>Code DEL :</strong> Identifie les absences justifiées pour missions CSE dans les plannings
            </p>
            <div className="text-xs text-blue-600 space-y-1">
              <p>• <strong>Plannings annuels/mensuels :</strong> Les absences CSE apparaissent avec la mention "DEL"</p>
              <p>• <strong>Avantages :</strong> Distinction claire entre absences personnelles et missions représentatives</p>
              <p>• <strong>Suivi KPI :</strong> Permet de mesurer l'activité représentative vs absentéisme classique</p>
              <p>• <strong>Conformité légale :</strong> Traçabilité conforme aux obligations du Code du Travail</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-800 mb-3">🎯 Codes d'absence disponibles</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span><strong>DEL</strong> - Délégation CSE</span>
                  <span className="text-green-600">✓ Justifiée</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span><strong>AM</strong> - Arrêt maladie</span>
                  <span className="text-orange-600">⚠️ Prise connaissance</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span><strong>CA</strong> - Congés annuels</span>
                  <span className="text-blue-600">📅 Programmée</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span><strong>CT</strong> - Congés Trimestriels</span>
                  <span className="text-blue-600">📅 Programmée</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 mb-3">📊 Impact sur les KPIs</h4>
              <div className="space-y-2 text-sm">
                <div className="p-2 bg-green-50 rounded border border-green-200">
                  <div className="font-medium text-green-800">DEL - Mission CSE</div>
                  <div className="text-green-700">Non comptabilisée dans l'absentéisme</div>
                </div>
                <div className="p-2 bg-orange-50 rounded border border-orange-200">
                  <div className="font-medium text-orange-800">AM - Arrêt maladie</div>
                  <div className="text-orange-700">Comptabilisée avec suivi spécial</div>
                </div>
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="font-medium text-blue-800">Autres codes</div>
                  <div className="text-blue-700">Comptabilisées selon type</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Paramètres du Logiciel</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-800 mb-3">🏢 Sites d'affectation</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Siège</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Pôle Éducatif</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Menuiserie 44</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Voiles 44</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Garage 44</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Alpinia 44</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Ferme 44</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Restaurant 44</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 mb-3">🏬 Départements</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Direction</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Éducatif</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Administratif</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Comptable</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>ASI</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 mb-3">👥 Catégories Employés</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Cadre Supérieur</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Cadre</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Employé Qualifié</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Technicien</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Ouvrier qualifié</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Ouvrier non qualifié</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Agent administratif</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Personnel ASI</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 mb-3">💼 Types de Contrats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>CDI - Non Cadre</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>CDD - Non Cadre</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>CDI - Cadre</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>CDD - Cadre</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Stagiaire</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Apprenti(e)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
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
          <h2 className="text-lg font-semibold text-gray-800">Calcul des Heures selon l'Effectif (Code du Travail)</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-800">Membres CSE (Art. L2315-7)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>Moins de 50 salariés:</span>
                  <span className="font-medium">Pas de crédit</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>50 à 74 salariés:</span>
                  <span className="font-medium">10h/mois</span>
                </div>
                <div className="flex justify-between p-2 bg-blue-50 rounded border border-blue-200">
                  <span>75 à 99 salariés:</span>
                  <span className="font-medium text-blue-600">15h/mois ⭐</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>Plus de 100 salariés:</span>
                  <span className="font-medium">20h/mois</span>
                </div>
              </div>
              <p className="text-xs text-blue-600">⭐ Effectif actuel de l'entreprise: 78 salariés</p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-gray-800">Délégués Syndicaux (Art. L2143-13)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>50 à 150 salariés:</span>
                  <span className="font-medium">10h/mois</span>
                </div>
                <div className="flex justify-between p-2 bg-blue-50 rounded border border-blue-200">
                  <span>151 à 500 salariés:</span>
                  <span className="font-medium text-blue-600">15h/mois ⭐</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>Plus de 500 salariés:</span>
                  <span className="font-medium">20h/mois</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Règles de Gestion</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-800">Cession d'heures autorisée</div>
                <div className="text-sm text-gray-600">Permettre la cession entre représentants (Art. L2315-7)</div>
              </div>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-800">Report d'heures (3 mois max)</div>
                <div className="text-sm text-gray-600">Autoriser le report des heures non utilisées</div>
              </div>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-800">Validation obligatoire</div>
                <div className="text-sm text-gray-600">Toutes les utilisations doivent être validées</div>
              </div>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-800">Heures supplémentaires exceptionnelles</div>
                <div className="text-sm text-gray-600">Permettre dépassement en cas de circonstances exceptionnelles</div>
              </div>
              <input type="checkbox" className="rounded" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Spécificités Légales par Instance</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CSE */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-800 flex items-center space-x-2">
                <span className="w-4 h-4 bg-blue-500 rounded"></span>
                <span>CSE (Art. L2315-7 à L2315-9)</span>
              </h4>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="font-medium text-blue-800">✓ Liberté d'utilisation</div>
                  <div className="text-blue-700">Pas de justification préalable requise</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="font-medium text-blue-800">✓ Formation économique</div>
                  <div className="text-blue-700">5 jours par mandat (hors crédit d'heures)</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="font-medium text-blue-800">✓ Dépassement exceptionnel</div>
                  <div className="text-blue-700">Possible si circonstances exceptionnelles</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="font-medium text-blue-800">✓ Report possible</div>
                  <div className="text-blue-700">Maximum 3 mois selon jurisprudence</div>
                </div>
              </div>
            </div>

            {/* Délégués Syndicaux */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-800 flex items-center space-x-2">
                <span className="w-4 h-4 bg-green-500 rounded"></span>
                <span>Délégués Syndicaux (Art. L2143-13)</span>
              </h4>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="font-medium text-green-800">✓ Missions spécifiques</div>
                  <div className="text-green-700">Négociation, information, réclamations</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="font-medium text-green-800">✓ Cession autorisée</div>
                  <div className="text-green-700">Vers autres DS ou membres CSE</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="font-medium text-green-800">✓ Permanence syndicale</div>
                  <div className="text-green-700">Accueil et conseil des salariés</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Ordre de Déduction des Heures (Automatique)</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 mb-2">🔄 Logique de Déduction Appliquée</h4>
              <ol className="space-y-2 text-sm text-amber-700">
                <li><strong>1. Heures reçues</strong> → Utilisées en priorité (Art. L2315-7)</li>
                <li><strong>2. Heures reportées</strong> → Avant expiration (3 mois max)</li>
                <li><strong>3. Crédit de base</strong> → Heures du mois en cours</li>
                <li><strong>4. Dépassement exceptionnel</strong> → Si autorisé par l'employeur</li>
              </ol>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">📤 Logique de Cession Appliquée</h4>
              <ol className="space-y-2 text-sm text-blue-700">
                <li><strong>1. Crédit de base</strong> → En priorité (disponible immédiatement)</li>
                <li><strong>2. Heures reportées</strong> → Si autorisé par règlement intérieur</li>
                <li><strong>❌ Heures reçues</strong> → Non cessibles (principe juridique)</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Conformité Légale Vérifiée</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">✅ Obligations Respectées</h4>
              <div className="space-y-2 text-sm text-green-700">
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Calcul selon effectif (Art. L2315-7)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Pas de justification préalable (liberté CSE)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Cession avec motif à l'employeur</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Déduction dans le bon ordre</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Report 3 mois maximum</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Traçabilité pour inspection du travail</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">📚 Références Légales</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div>• <strong>L2315-7 CT:</strong> Crédit d'heures CSE et cession</div>
                <div>• <strong>L2315-8 CT:</strong> Utilisation libre des heures</div>
                <div>• <strong>L2315-9 CT:</strong> Dépassement exceptionnel</div>
                <div>• <strong>L2143-13 CT:</strong> Crédit d'heures DS</div>
                <div>• <strong>R2315-4 CT:</strong> Modalités de calcul</div>
                <div>• <strong>Jurisprudence:</strong> Report maximum 3 mois</div>
              </div>
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
              { id: 'cessions', name: 'Cessions d\'Heures', icon: '🔄' },
              { id: 'usage', name: 'Historique Global', icon: '📝' }
            ] : [
              { id: 'overview', name: 'Vue d\'ensemble', icon: '📊' },
              { id: 'cessions', name: 'Cessions d\'Heures', icon: '🔄' },
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
        {activeTab === 'cessions' && renderCessions()}
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
                {(user.role === 'admin' || user.role === 'manager') ? (
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
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Titulaire</label>
                    <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-700">
                      {(() => {
                        const userDelegate = delegates.find(d => d.name === user.name);
                        return userDelegate ? `${userDelegate.name} - ${delegationTypes[userDelegate.type]?.name}` : 'Aucune délégation assignée';
                      })()}
                    </div>
                    <input type="hidden" value={newUsage.delegateId} />
                  </div>
                )}
                
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type d'activité CSE <span className="text-blue-600">(Codification DEL)</span>
                  </label>
                  <select
                    value={newUsage.activity}
                    onChange={(e) => {
                      const activity = e.target.value;
                      const requiresAcknowledgment = activity === 'AM - Arrêt maladie';
                      setNewUsage({
                        ...newUsage, 
                        activity: activity,
                        requiresAcknowledgment: requiresAcknowledgment,
                        description: requiresAcknowledgment ? '' : newUsage.description
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Sélectionner une activité CSE</option>
                    <option value="" disabled style={{fontStyle: 'italic', color: '#666'}}>
                      ℹ️ Codification DEL = Absence justifiée pour mission CSE
                    </option>
                    
                    <optgroup label="🏥 Absences médicales - CSE">
                      <option value="AM - Arrêt maladie">AM - Arrêt maladie (avec prise de connaissance)</option>
                    </optgroup>
                    
                    <optgroup label="🏢 CSE - Missions générales">
                      <option value="DEL - Réunion CSE ordinaire">DEL - Réunion CSE ordinaire</option>
                      <option value="DEL - Réunion CSE extraordinaire">DEL - Réunion CSE extraordinaire</option>
                      <option value="DEL - Commission SSCT">DEL - Commission Santé, Sécurité et Conditions de Travail</option>
                      <option value="DEL - Enquête accident/maladie pro">DEL - Enquête accident du travail / maladie professionnelle</option>
                      <option value="DEL - Consultation reorganisation">DEL - Consultation sur réorganisation</option>
                      <option value="DEL - Consultation licenciement eco">DEL - Consultation licenciement économique</option>
                      <option value="DEL - Consultation projet important">DEL - Consultation projet important</option>
                    </optgroup>
                    
                    <optgroup label="🤝 CSE - Relations individuelles">
                      <option value="DEL - Entretien salarié">DEL - Entretien avec un salarié</option>
                      <option value="DEL - Accompagnement disciplinaire">DEL - Accompagnement entretien disciplinaire</option>
                      <option value="DEL - Réclamation collective">DEL - Traitement réclamation collective</option>
                      <option value="DEL - Médiation conflit">DEL - Médiation résolution de conflit</option>
                      <option value="DEL - Droit d'alerte">DEL - Exercice du droit d'alerte</option>
                    </optgroup>
                    
                    <optgroup label="📚 CSE - Formation et information">
                      <option value="DEL - Formation économique">DEL - Formation économique (5 jours/mandat)</option>
                      <option value="DEL - Formation SSCT">DEL - Formation Santé-Sécurité</option>
                      <option value="DEL - Veille juridique">DEL - Veille juridique et réglementaire</option>
                      <option value="DEL - Information syndics">DEL - Information organisations syndicales</option>
                      <option value="DEL - Formation CSE">DEL - Formation spécifique CSE</option>
                    </optgroup>
                    
                    <optgroup label="🔍 CSE - Expertises et analyses">
                      <option value="DEL - Expertise comptable">DEL - Suivi expertise comptable</option>
                      <option value="DEL - Expertise CHSCT">DEL - Suivi expertise SSCT</option>
                      <option value="DEL - Analyse documents">DEL - Analyse documents sociaux</option>
                      <option value="DEL - Expertise technique">DEL - Expertise technique spécialisée</option>
                      <option value="DEL - Audit interne">DEL - Participation audit interne</option>
                    </optgroup>
                    
                    <optgroup label="⚖️ CSE - Représentation syndicale">
                      <option value="DEL - Négociation collective">DEL - Négociation d'accord d'entreprise</option>
                      <option value="DEL - Permanence syndicale">DEL - Permanence syndicale</option>
                      <option value="DEL - Préparation négociation">DEL - Préparation négociation</option>
                      <option value="DEL - Représentation externe">DEL - Représentation instances externes</option>
                    </optgroup>
                    
                    <optgroup label="📋 CSE - Activités administratives">
                      <option value="DEL - Préparation réunion">DEL - Préparation de réunion CSE</option>
                      <option value="DEL - Compte-rendu">DEL - Rédaction compte-rendu</option>
                      <option value="DEL - Déplacement professionnel">DEL - Déplacement dans le cadre du mandat</option>
                      <option value="DEL - Communication interne">DEL - Communication vers les salariés</option>
                      <option value="DEL - Gestion budgétaire">DEL - Gestion budget CSE</option>
                      <option value="DEL - Autre activité CSE">DEL - Autre activité CSE légale</option>
                    </optgroup>
                  </select>
                </div>
                
                {/* Special handling for sickness leave */}
                {newUsage.requiresAcknowledgment ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <div className="text-green-500 text-xl">🏥</div>
                        <div>
                          <h4 className="font-medium text-green-800 mb-2">Arrêt Maladie - Traitement Spécial</h4>
                          <p className="text-sm text-green-700 mb-2">
                            Conformément au droit du travail, cet arrêt maladie ne nécessite pas de validation médicale de notre part.
                          </p>
                          <p className="text-xs text-green-600">
                            <strong>Prise de connaissance :</strong> Nous avons pris connaissance de votre absence pour maladie.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Documents justificatifs <span className="text-gray-400">(optionnel)</span>
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const files = Array.from(e.target.files);
                            setNewUsage({...newUsage, documents: files});
                          }}
                          className="hidden"
                          id="sickness-documents"
                        />
                        <label htmlFor="sickness-documents" className="cursor-pointer">
                          <div className="text-gray-500 text-4xl mb-2">📎</div>
                          <p className="text-sm text-gray-600">
                            Cliquez pour joindre des documents (certificats médicaux, etc.)
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Formats acceptés: PDF, JPG, PNG
                          </p>
                        </label>
                      </div>
                      {newUsage.documents?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-700 mb-1">Documents sélectionnés :</p>
                          {newUsage.documents.map((file, index) => (
                            <div key={index} className="text-xs text-gray-600 flex items-center space-x-2">
                              <span>📄</span>
                              <span>{file.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes complémentaires <span className="text-gray-400">(facultatif)</span>
                      </label>
                      <textarea
                        value={newUsage.description}
                        onChange={(e) => setNewUsage({...newUsage, description: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Notes complémentaires si nécessaire..."
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description <span className="text-gray-400">(facultatif)</span>
                    </label>
                    <textarea
                      value={newUsage.description}
                      onChange={(e) => setNewUsage({...newUsage, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Description facultative de l'activité CSE (Art. L2315-8 : pas de justification préalable requise pour les membres CSE)"
                    />
                    <p className="text-xs text-blue-600 mt-1">
                      ⚖️ Conformément au Code du Travail, aucune justification préalable n'est requise pour l'utilisation des heures de délégation CSE
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      🏷️ Ces heures seront marquées "DEL" dans les plannings pour distinction avec l'absentéisme classique
                    </p>
                  </div>
                )}
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

      {/* Modal Cession d'Heures */}
      {showCessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Cession d'Heures de Délégation</h2>
                <button
                  onClick={() => setShowCessionModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Conformément à l'article L2315-7 du Code du Travail
              </p>
            </div>
            
            <form onSubmit={handleAddCession} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cédant (qui donne les heures)</label>
                  <select
                    value={newCession.fromDelegateId}
                    onChange={(e) => setNewCession({...newCession, fromDelegateId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Sélectionner le cédant</option>
                    {delegates.filter(d => d.status === 'active' && d.remainingHours > 0).map(delegate => (
                      <option key={delegate.id} value={delegate.id}>
                        {delegate.name} - {delegationTypes[delegate.type]?.name} ({delegate.remainingHours}h disponibles)
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bénéficiaire (qui reçoit les heures)</label>
                  <select
                    value={newCession.toDelegateId}
                    onChange={(e) => setNewCession({...newCession, toDelegateId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Sélectionner le bénéficiaire</option>
                    {delegates.filter(d => d.status === 'active' && d.id !== parseInt(newCession.fromDelegateId)).map(delegate => (
                      <option key={delegate.id} value={delegate.id}>
                        {delegate.name} - {delegationTypes[delegate.type]?.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre d'heures</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newCession.hours}
                      onChange={(e) => setNewCession({...newCession, hours: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0.5"
                      max={delegates.find(d => d.id === parseInt(newCession.fromDelegateId))?.remainingHours || 0}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date de cession</label>
                    <input
                      type="date"
                      value={newCession.date}
                      onChange={(e) => setNewCession({...newCession, date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motif de la cession <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newCession.reason}
                    onChange={(e) => setNewCession({...newCession, reason: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Justification requise par le Code du Travail (ex: négociation urgente, expertise spécialisée, surcharge ponctuelle...)"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Le motif sera communiqué à l'employeur conformément à la réglementation
                  </p>
                </div>

                {/* Informations légales */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">📋 Rappel légal</h4>
                  <div className="text-xs text-blue-700 space-y-1">
                    <p>• La cession doit être justifiée par les besoins de la représentation</p>
                    <p>• L'employeur sera automatiquement informé de cette cession</p>
                    <p>• Les heures cédées restent payées normalement</p>
                    <p>• La cession prend effet dès validation par l'administration</p>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCessionModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                >
                  Effectuer la Cession
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