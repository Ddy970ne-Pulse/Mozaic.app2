import React, { useState } from 'react';

const AbsenceRequests = ({ user }) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [newRequest, setNewRequest] = useState({
    type: 'CP',
    startDate: '',
    endDate: '',
    reason: '',
    halfDay: false
  });

  const requests = {
    pending: [
      {
        id: 1,
        employee: 'Marie Leblanc',
        department: 'Commercial',
        type: 'RTT',
        startDate: '2024-02-15',
        endDate: '2024-02-15',
        duration: '1 jour',
        reason: 'Rendez-vous médical',
        submittedDate: '2024-01-10',
        status: 'pending',
        avatar: 'ML'
      },
      {
        id: 2,
        employee: 'Pierre Martin',
        department: 'Finance',
        type: 'CP',
        startDate: '2024-02-20',
        endDate: '2024-02-23',
        duration: '4 jours',
        reason: 'Vacances familiales',
        submittedDate: '2024-01-08',
        status: 'pending',
        avatar: 'PM'
      },
      {
        id: 3,
        employee: 'Lucas Bernard',
        department: 'IT',
        type: 'Formation',
        startDate: '2024-02-12',
        endDate: '2024-02-13',
        duration: '2 jours',
        reason: 'Formation React Advanced',
        submittedDate: '2024-01-05',
        status: 'pending',
        avatar: 'LB'
      }
    ],
    approved: [
      {
        id: 4,
        employee: 'Jean Dupont',
        department: 'IT',
        type: 'CP',
        startDate: '2024-01-25',
        endDate: '2024-01-29',
        duration: '5 jours',
        reason: 'Congés payés',
        submittedDate: '2024-01-02',
        status: 'approved',
        approver: 'Sophie Martin',
        approvedDate: '2024-01-03',
        avatar: 'JD'
      },
      {
        id: 5,
        employee: 'Claire Dubois',
        department: 'Marketing',
        type: 'RTT',
        startDate: '2024-01-18',
        endDate: '2024-01-18',
        duration: '1 jour',
        reason: 'Récupération',
        submittedDate: '2024-01-10',
        status: 'approved',
        approver: 'Sophie Martin',
        approvedDate: '2024-01-11',
        avatar: 'CD'
      }
    ],
    rejected: [
      {
        id: 6,
        employee: 'Thomas Leroy',
        department: 'Operations',
        type: 'CP',
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        duration: '5 jours',
        reason: 'Vacances',
        submittedDate: '2024-01-15',
        status: 'rejected',
        rejectedBy: 'Sophie Martin',
        rejectedDate: '2024-01-16',
        rejectionReason: 'Période déjà surchargée en absences',
        avatar: 'TL'
      }
    ]
  };

  const absenceTypes = {
    'CP': { name: 'Congés Payés', color: 'bg-blue-500' },
    'RTT': { name: 'RTT', color: 'bg-green-500' },
    'AM': { name: 'Arrêt Maladie', color: 'bg-red-500' },
    'Formation': { name: 'Formation', color: 'bg-purple-500' },
    'CT': { name: 'Congé Tech', color: 'bg-orange-500' },
    'Autre': { name: 'Autre', color: 'bg-gray-500' }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'approved': return '✅';
      case 'rejected': return '❌';
      default: return '❓';
    }
  };

  const handleApprove = (requestId) => {
    console.log('Approving request:', requestId);
    // Logique pour approuver la demande
  };

  const handleReject = (requestId) => {
    console.log('Rejecting request:', requestId);
    // Logique pour rejeter la demande
  };

  const handleSubmitRequest = (e) => {
    e.preventDefault();
    console.log('Submitting new request:', newRequest);
    setShowNewRequest(false);
    setNewRequest({ type: 'CP', startDate: '', endDate: '', reason: '', halfDay: false });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const isEmployee = user.role === 'employee';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {isEmployee ? 'Mes Demandes d\'Absence' : 'Demandes d\'Absence'}
            </h1>
            <p className="text-gray-600">
              {isEmployee 
                ? 'Gestion de vos demandes d\'absence et suivi des validations'
                : 'Validation et suivi des demandes d\'absence des employés'
              }
            </p>
          </div>
          
          <button
            onClick={() => setShowNewRequest(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
          >
            <span>➕</span>
            <span>Nouvelle Demande</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'pending', name: 'En Attente', count: requests.pending.length, icon: '⏳' },
              { id: 'approved', name: 'Approuvées', count: requests.approved.length, icon: '✅' },
              { id: 'rejected', name: 'Refusées', count: requests.rejected.length, icon: '❌' }
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
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Requests List */}
        <div className="p-6">
          <div className="space-y-4">
            {requests[activeTab].map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {request.avatar}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{request.employee}</h3>
                      <p className="text-sm text-gray-600">{request.department}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                      {getStatusIcon(request.status)} 
                      {request.status === 'pending' ? 'En attente' :
                       request.status === 'approved' ? 'Approuvé' : 'Refusé'}
                    </span>
                    
                    {!isEmployee && request.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200"
                        >
                          Approuver
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200"
                        >
                          Refuser
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Type d'absence</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className={`w-3 h-3 rounded ${absenceTypes[request.type]?.color || 'bg-gray-500'}`}></div>
                      <span className="text-gray-800 font-medium">{absenceTypes[request.type]?.name || request.type}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Période</label>
                    <div className="text-gray-800 font-medium mt-1">
                      {formatDate(request.startDate)}
                      {request.endDate !== request.startDate && ` - ${formatDate(request.endDate)}`}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Durée</label>
                    <div className="text-gray-800 font-medium mt-1">{request.duration}</div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Soumise le</label>
                    <div className="text-gray-800 font-medium mt-1">{formatDate(request.submittedDate)}</div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-500">Motif</label>
                  <p className="text-gray-800 mt-1">{request.reason}</p>
                </div>
                
                {request.status === 'approved' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-sm text-green-800">
                      <strong>Approuvé par:</strong> {request.approver} le {formatDate(request.approvedDate)}
                    </div>
                  </div>
                )}
                
                {request.status === 'rejected' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-sm text-red-800">
                      <strong>Refusé par:</strong> {request.rejectedBy} le {formatDate(request.rejectedDate)}<br />
                      <strong>Motif du refus:</strong> {request.rejectionReason}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {requests[activeTab].length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">
                {activeTab === 'pending' ? '⏳' : activeTab === 'approved' ? '✅' : '❌'}
              </div>
              <div className="text-lg font-medium text-gray-800 mb-2">
                Aucune demande {activeTab === 'pending' ? 'en attente' : activeTab === 'approved' ? 'approuvée' : 'refusée'}
              </div>
              <div className="text-gray-600">
                {activeTab === 'pending' && 'Les nouvelles demandes apparaîtront ici'}
                {activeTab === 'approved' && 'Les demandes approuvées apparaîtront ici'}
                {activeTab === 'rejected' && 'Les demandes refusées apparaîtront ici'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nouvelle Demande */}
      {showNewRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Nouvelle Demande d'Absence</h2>
                <button
                  onClick={() => setShowNewRequest(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmitRequest} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type d'absence</label>
                  <select
                    value={newRequest.type}
                    onChange={(e) => setNewRequest({...newRequest, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {Object.entries(absenceTypes).map(([key, type]) => (
                      <option key={key} value={key}>{type.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
                    <input
                      type="date"
                      value={newRequest.startDate}
                      onChange={(e) => setNewRequest({...newRequest, startDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
                    <input
                      type="date"
                      value={newRequest.endDate}
                      onChange={(e) => setNewRequest({...newRequest, endDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="halfDay"
                    checked={newRequest.halfDay}
                    onChange={(e) => setNewRequest({...newRequest, halfDay: e.target.checked})}
                    className="rounded"
                  />
                  <label htmlFor="halfDay" className="text-sm text-gray-700">Demi-journée</label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Motif / Commentaire</label>
                  <textarea
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Précisez le motif de votre demande..."
                    required
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewRequest(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                >
                  Soumettre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AbsenceRequests;