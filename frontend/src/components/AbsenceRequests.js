import React, { useState, useEffect } from 'react';
import { getRequests, approveRequest, rejectRequest, subscribe, updateRequests } from '../shared/requestsData';

const AbsenceRequests = ({ user }) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [requests, setRequests] = useState(getRequests());

  // Souscription aux changements d'état
  useEffect(() => {
    const unsubscribe = subscribe((newRequests) => {
      setRequests(newRequests);
    });

    return unsubscribe;
  }, []);

  const [newRequest, setNewRequest] = useState({
    type: 'CP',
    startDate: '',
    endDate: '',
    reason: '',
    halfDay: false,
    documents: [],
    requiresAcknowledgment: false
  });

  // Suppression de la duplication - utiliser le state requests défini plus haut

  const absenceTypes = {
    // Absences médicales
    'AT': { name: 'Accident du travail/Trajet', color: 'bg-red-500', category: 'medical' },
    'AM': { name: 'Arrêt maladie', color: 'bg-red-400', category: 'medical', requiresAcknowledgment: true },
    'MPRO': { name: 'Maladie Professionnelle', color: 'bg-red-600', category: 'medical' },
    'EMAL': { name: 'Enfants malades', color: 'bg-pink-500', category: 'medical' },
    'RMED': { name: 'Rendez-vous médical', color: 'bg-pink-400', category: 'medical' },
    
    // Congés familiaux
    'MAT': { name: 'Congé maternité', color: 'bg-purple-500', category: 'family' },
    'PAT': { name: 'Congé paternité', color: 'bg-purple-400', category: 'family' },
    'FAM': { name: 'Évènement familial', color: 'bg-purple-300', category: 'family' },
    
    // Congés et repos
    'CP': { name: 'Congés Payés', color: 'bg-blue-500', category: 'vacation' },
    'CA': { name: 'Congés annuels', color: 'bg-blue-400', category: 'vacation' },
    'CT': { name: 'Congés Trimestriels', color: 'bg-blue-300', category: 'vacation' },
    'RTT': { name: 'RTT / Récupération', color: 'bg-green-500', category: 'vacation' },
    'REC': { name: 'Récupération', color: 'bg-green-400', category: 'vacation' },
    'RH': { name: 'Repos Hebdomadaire', color: 'bg-green-300', category: 'vacation' },
    'RHD': { name: 'Repos Dominical', color: 'bg-green-200', category: 'vacation' },
    'CEX': { name: 'Congé exceptionnel', color: 'bg-indigo-500', category: 'vacation' },
    
    // Travail et formation
    'TEL': { name: 'Télétravail', color: 'bg-cyan-500', category: 'work' },
    'FO': { name: 'Formation', color: 'bg-purple-500', category: 'work' },
    'STG': { name: 'Stage', color: 'bg-cyan-400', category: 'work' },
    
    // Autres absences
    'NAUT': { name: 'Absence non autorisée', color: 'bg-red-700', category: 'other' },
    'AUT': { name: 'Absence autorisée', color: 'bg-gray-500', category: 'other' },
    'CSS': { name: 'Congés Sans Solde', color: 'bg-gray-600', category: 'other' },
    'Autre': { name: 'Autre motif', color: 'bg-gray-400', category: 'other' }
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
    setRequests(prevRequests => {
      const pendingRequest = prevRequests.pending.find(req => req.id === requestId);
      if (!pendingRequest) return prevRequests;

      const approvedRequest = {
        ...pendingRequest,
        status: 'approved',
        approver: user.name,
        approvedDate: new Date().toISOString().split('T')[0]
      };

      return {
        pending: prevRequests.pending.filter(req => req.id !== requestId),
        approved: [...prevRequests.approved, approvedRequest],
        rejected: prevRequests.rejected
      };
    });
  };

  const handleReject = (requestId) => {
    const rejectionReason = prompt('Raison du refus (optionnel):');
    
    setRequests(prevRequests => {
      const pendingRequest = prevRequests.pending.find(req => req.id === requestId);
      if (!pendingRequest) return prevRequests;

      const rejectedRequest = {
        ...pendingRequest,
        status: 'rejected',
        rejectedBy: user.name,
        rejectedDate: new Date().toISOString().split('T')[0],
        rejectionReason: rejectionReason || 'Aucune raison spécifiée'
      };

      return {
        pending: prevRequests.pending.filter(req => req.id !== requestId),
        approved: prevRequests.approved,
        rejected: [...prevRequests.rejected, rejectedRequest]
      };
    });
  };

  const handleSubmitRequest = (e) => {
    e.preventDefault();
    
    // Create request data with proper handling
    const requestData = {
      ...newRequest,
      status: newRequest.requiresAcknowledgment ? 'acknowledged' : 'pending',
      acknowledgedBy: newRequest.requiresAcknowledgment ? user.name : null,
      acknowledgedDate: newRequest.requiresAcknowledgment ? new Date().toISOString() : null,
      submittedDate: new Date().toISOString(),
      employee: user.name,
      department: user.department || 'Non spécifié'
    };
    
    console.log('Submitting new absence request:', requestData);
    setShowNewRequest(false);
    setNewRequest({ 
      type: '', 
      startDate: '', 
      endDate: '', 
      reason: '', 
      halfDay: false, 
      documents: [], 
      requiresAcknowledgment: false 
    });
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
                    onChange={(e) => {
                      const selectedType = e.target.value;
                      const requiresAcknowledgment = absenceTypes[selectedType]?.requiresAcknowledgment || false;
                      setNewRequest({
                        ...newRequest, 
                        type: selectedType,
                        requiresAcknowledgment: requiresAcknowledgment
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Sélectionner un type d'absence</option>
                    
                    <optgroup label="🏥 Absences médicales">
                      <option value="AT">AT - Accident du travail/Trajet</option>
                      <option value="AM">AM - Arrêt maladie</option>
                      <option value="MPRO">MPRO - Maladie professionnelle</option>
                      <option value="EMAL">EMAL - Enfants malades</option>
                      <option value="RMED">RMED - Rendez-vous médical</option>
                    </optgroup>
                    
                    <optgroup label="👨‍👩‍👧‍👦 Congés familiaux">
                      <option value="MAT">MAT - Congé maternité</option>
                      <option value="PAT">PAT - Congé paternité</option>
                      <option value="FAM">FAM - Évènement familial</option>
                    </optgroup>
                    
                    <optgroup label="📅 Congés et repos">
                      <option value="CP">CP - Congés payés</option>
                      <option value="CA">CA - Congés annuels</option>
                      <option value="CT">CT - Congés trimestriels</option>
                      <option value="RTT">RTT - Récupération</option>
                      <option value="REC">REC - Récupération</option>
                      <option value="RH">RH - Repos hebdomadaire</option>
                      <option value="RHD">RHD - Repos dominical</option>
                      <option value="CEX">CEX - Congé exceptionnel</option>
                    </optgroup>
                    
                    <optgroup label="💼 Travail et formation">
                      <option value="TEL">TEL - Télétravail</option>
                      <option value="FO">FO - Formation</option>
                      <option value="STG">STG - Stage</option>
                    </optgroup>
                    
                    <optgroup label="⚠️ Autres absences">
                      <option value="NAUT">NAUT - Absence non autorisée</option>
                      <option value="AUT">AUT - Absence autorisée</option>
                      <option value="CSS">CSS - Congés sans solde</option>
                      <option value="Autre">Autre motif</option>
                    </optgroup>
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
                
                {/* Special handling for sickness leave */}
                {newRequest.requiresAcknowledgment && newRequest.type === 'AM' ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <div className="text-green-500 text-xl">🏥</div>
                        <div>
                          <h4 className="font-medium text-green-800 mb-2">Arrêt Maladie - Procédure Simplifiée</h4>
                          <p className="text-sm text-green-700 mb-2">
                            Votre demande d'arrêt maladie sera automatiquement prise en compte. Aucune validation médicale interne requise.
                          </p>
                          <p className="text-xs text-green-600">
                            <strong>Prise de connaissance automatique :</strong> Conformément au droit du travail.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Justificatifs médicaux <span className="text-gray-400">(optionnel)</span>
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const files = Array.from(e.target.files);
                            setNewRequest({...newRequest, documents: files});
                          }}
                          className="hidden"
                          id="absence-documents"
                        />
                        <label htmlFor="absence-documents" className="cursor-pointer">
                          <div className="text-gray-500 text-4xl mb-2">📎</div>
                          <p className="text-sm text-gray-600">
                            Cliquez pour joindre des documents (certificats médicaux, arrêts de travail, etc.)
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Formats acceptés: PDF, JPG, PNG • Taille max: 5MB par fichier
                          </p>
                        </label>
                      </div>
                      {newRequest.documents?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-700 mb-1">Documents sélectionnés :</p>
                          {newRequest.documents.map((file, index) => (
                            <div key={index} className="text-xs text-gray-600 flex items-center space-x-2">
                              <span>📄</span>
                              <span>{file.name}</span>
                              <span className="text-gray-400">({Math.round(file.size / 1024)} KB)</span>
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
                        value={newRequest.reason}
                        onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Notes complémentaires si nécessaire..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Motif / Commentaire <span className="text-gray-400">(facultatif)</span>
                      </label>
                      <textarea
                        value={newRequest.reason}
                        onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Précisez le motif de votre demande (optionnel pour la plupart des types d'absence)..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Justificatifs <span className="text-gray-400">(optionnel)</span>
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const files = Array.from(e.target.files);
                            setNewRequest({...newRequest, documents: files});
                          }}
                          className="hidden"
                          id="general-documents"
                        />
                        <label htmlFor="general-documents" className="cursor-pointer">
                          <div className="text-gray-500 text-4xl mb-2">📎</div>
                          <p className="text-sm text-gray-600">
                            Cliquez pour joindre des justificatifs (certificats, autorisations, etc.)
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Formats acceptés: PDF, JPG, PNG • Taille max: 5MB par fichier
                          </p>
                        </label>
                      </div>
                      {newRequest.documents?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-700 mb-1">Documents sélectionnés :</p>
                          {newRequest.documents.map((file, index) => (
                            <div key={index} className="text-xs text-gray-600 flex items-center space-x-2">
                              <span>📄</span>
                              <span>{file.name}</span>
                              <span className="text-gray-400">({Math.round(file.size / 1024)} KB)</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
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