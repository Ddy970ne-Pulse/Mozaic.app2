import React, { useState, useEffect } from 'react';
import { getRequests, approveRequest, rejectRequest, subscribe, updateRequests } from '../shared/requestsData';
import { DOCUMENT_TYPES, SecurityUtils } from '../shared/securityConfig';
import { ModuleHeader, TabBar, Button } from './shared/UIComponents';

const AbsenceRequests = ({ user }) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [requests, setRequests] = useState({ pending: [], approved: [], rejected: [] });
  const [loading, setLoading] = useState(true);

  // Charger les absences depuis l'API
  const loadAbsencesFromAPI = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/absences`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.ok) {
        const absences = await response.json();
        
        // Transformer les absences de l'API en format requests
        const pending = [];
        const approved = [];
        const rejected = [];
        
        absences.forEach(absence => {
          const requestObj = {
            id: absence.id,
            employee: absence.employee_name,
            employeeId: absence.employee_id,
            email: absence.email,
            type: absence.motif_absence,
            startDate: absence.date_debut,
            endDate: absence.date_fin,
            days: parseFloat(absence.jours_absence || 0),
            reason: absence.notes || '',
            status: absence.status || 'approved',
            submittedDate: absence.created_at ? absence.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            absence_unit: absence.absence_unit || 'jours',
            hours_amount: absence.hours_amount
          };
          
          if (requestObj.status === 'pending') {
            pending.push(requestObj);
          } else if (requestObj.status === 'approved') {
            approved.push(requestObj);
          } else if (requestObj.status === 'rejected') {
            rejected.push(requestObj);
          }
        });
        
        const newRequests = { pending, approved, rejected };
        setRequests(newRequests);
        
        // Mettre à jour aussi le state partagé
        updateRequests(newRequests);
        
        console.log(`✅ Absences chargées: ${pending.length} en attente, ${approved.length} approuvées, ${rejected.length} rejetées`);
      } else {
        console.error('Erreur chargement absences:', response.status);
      }
    } catch (error) {
      console.error('Erreur chargement absences:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les absences au montage et toutes les 30 secondes
  useEffect(() => {
    loadAbsencesFromAPI();
    
    // Recharger périodiquement
    const interval = setInterval(loadAbsencesFromAPI, 30000); // 30 secondes
    
    return () => clearInterval(interval);
  }, []);

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
    requiresAcknowledgment: false,
    absence_unit: 'jours',  // 'jours' ou 'heures'
    hours_amount: null      // nombre d'heures si unit='heures'
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

  // Types d'absence autorisés en heures (selon spécifications)
  const canBeInHours = (type) => {
    const hourlyTypes = ['DEL', 'REC', 'TEL', 'HS'];
    return hourlyTypes.includes(type);
  };

  // Gérer le changement de type d'absence
  const handleTypeChange = (newType) => {
    const canUseHours = canBeInHours(newType);
    setNewRequest({
      ...newRequest,
      type: newType,
      absence_unit: canUseHours ? newRequest.absence_unit : 'jours',
      hours_amount: canUseHours ? newRequest.hours_amount : null
    });
  };

  const handleApprove = (requestId) => {
    const success = approveRequest(requestId, user.name);
    if (!success) {
      alert('❌ Erreur lors de l\'approbation de la demande');
    }
  };

  const handleReject = (requestId) => {
    const rejectionReason = prompt('Raison du refus (optionnel):');
    if (rejectionReason !== null) { // L'utilisateur n'a pas annulé
      const success = rejectRequest(requestId, user.name, rejectionReason);
      if (!success) {
        alert('❌ Erreur lors du rejet de la demande');
      }
    }
  };

  // Fonction pour ouvrir le modal d'édition
  const handleEditRequest = (request) => {
    setEditingRequest({
      id: request.id,
      date_debut: request.startDate,
      date_fin: request.endDate,
      jours_absence: parseInt(request.duration) || 0,
      motif_absence: request.type,
      notes: request.reason || '',
      status: request.status
    });
    setShowEditModal(true);
  };

  // Fonction pour sauvegarder les modifications
  const handleSaveEdit = async () => {
    if (!editingRequest) return;

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${backendUrl}/api/absences/${editingRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingRequest)
      });

      if (response.ok) {
        alert('✅ Absence modifiée avec succès');
        setShowEditModal(false);
        setEditingRequest(null);
        // Recharger les données
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`❌ Erreur: ${error.detail || 'Impossible de modifier l\'absence'}`);
      }
    } catch (error) {
      console.error('Error updating absence:', error);
      alert('❌ Erreur de connexion au serveur');
    }
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
      requiresAcknowledgment: false,
      absence_unit: 'jours',
      hours_amount: null
    });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    
    // Validation sécurisée des fichiers
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024;
      const isValidName = !/[<>:"/\\|?*]/.test(file.name); // Caractères dangereux
      
      return isValidType && isValidSize && isValidName;
    });

    if (validFiles.length !== files.length) {
      alert('⚠️ Certains fichiers ont été ignorés (format non supporté, taille > 5MB ou nom invalide)');
    }

    // Traitement sécurisé des documents médicaux
    const processedFiles = validFiles.map(file => {
      const isMedicalDocument = newRequest.type === 'Arrêt maladie' || 
                               newRequest.reason?.toLowerCase().includes('médical') ||
                               file.name.toLowerCase().includes('médical') ||
                               file.name.toLowerCase().includes('certificat');
      
      const documentType = isMedicalDocument ? 'SICK_LEAVE' : 'GENERAL_DOCUMENT';
      const docConfig = DOCUMENT_TYPES[documentType];
      
      // Générer un hash du fichier (simulation)
      const documentHash = SecurityUtils.generateDocumentHash(file.name + file.size);
      
      // Logger l'upload pour audit
      const auditId = SecurityUtils.logAccess(
        user.name,
        documentHash,
        'upload',
        documentType
      );
      
      // Métadonnées sécurisées
      const secureMetadata = {
        originalName: file.name,
        securityLevel: docConfig.securityLevel,
        documentType: docConfig.type,
        uploadedBy: user.name,
        uploadDate: new Date().toISOString(),
        auditId,
        hash: documentHash,
        gdprCategory: docConfig.gdprCategory,
        encryptionRequired: docConfig.requiredEncryption
      };

      return {
        name: file.name,
        size: file.size,
        type: file.type.split('/')[1].toUpperCase(),
        uploadDate: new Date().toISOString(),
        securityMetadata: SecurityUtils.encryptMetadata(secureMetadata),
        isMedical: isMedicalDocument,
        auditId
      };
    });

    setNewRequest(prev => ({
      ...prev,
      documents: [...prev.documents, ...processedFiles]
    }));

    // Afficher un avertissement pour les documents médicaux
    const medicalDocs = processedFiles.filter(doc => doc.isMedical);
    if (medicalDocs.length > 0) {
      alert(`🔒 ${medicalDocs.length} document(s) médical(aux) téléversé(s) avec chiffrement sécurisé.\nConformité RGPD: Données de santé protégées selon l'Article 9(2)(b).`);
    }
  };

  const isEmployee = user.role === 'employee';

  return (
    <div className="p-6 space-y-6">
      {/* Header - Style Harmonisé */}
      <ModuleHeader
        title={isEmployee ? 'Mes Demandes d\'Absence' : 'Demandes d\'Absence'}
        subtitle={isEmployee 
          ? 'Gestion de vos demandes d\'absence et suivi des validations'
          : 'Validation et suivi des demandes d\'absence des employés'
        }
        icon="📝"
        action={
          <Button
            onClick={() => setShowNewRequest(true)}
            variant="primary"
            icon="➕"
          >
            Nouvelle Demande
          </Button>
        }
      />

      {/* Tabs - Style Harmonisé */}
      <TabBar
        tabs={[
          { id: 'pending', label: `⏳ En Attente (${requests.pending.length})`, icon: '⏳' },
          { id: 'approved', label: `✅ Approuvées (${requests.approved.length})`, icon: '✅' },
          { id: 'rejected', label: `❌ Refusées (${requests.rejected.length})`, icon: '❌' }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Requests List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
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
                    
                    {/* Bouton Modifier pour les admins (disponible pour toutes les absences) */}
                    {!isEmployee && user.role === 'admin' && (
                      <button
                        onClick={() => handleEditRequest(request)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Modifier</span>
                      </button>
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
                      const canUseHours = canBeInHours(selectedType);
                      setNewRequest({
                        ...newRequest, 
                        type: selectedType,
                        requiresAcknowledgment: requiresAcknowledgment,
                        absence_unit: canUseHours && newRequest.absence_unit === 'heures' ? 'heures' : 'jours',
                        hours_amount: canUseHours ? newRequest.hours_amount : null
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
                    
                    <optgroup label="⏰ Heures (peut être en heures)">
                      <option value="HS">HS - Heures supplémentaires</option>
                      <option value="DEL">DEL - Heures de délégation</option>
                      <option value="REC">REC - Récupération (heures)</option>
                    </optgroup>
                    
                    <optgroup label="⚠️ Autres absences">
                      <option value="NAUT">NAUT - Absence non autorisée</option>
                      <option value="AUT">AUT - Absence autorisée</option>
                      <option value="CSS">CSS - Congés sans solde</option>
                      <option value="Autre">Autre motif</option>
                    </optgroup>
                  </select>
                </div>
                
                {/* Toggle Jours/Heures - Seulement pour types autorisés */}
                {canBeInHours(newRequest.type) && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-blue-900">Unité de mesure</label>
                      <div className="flex items-center space-x-2 bg-white rounded-lg p-1 shadow-sm">
                        <button
                          type="button"
                          onClick={() => setNewRequest({...newRequest, absence_unit: 'jours', hours_amount: null})}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            newRequest.absence_unit === 'jours'
                              ? 'bg-purple-600 text-white shadow-md'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          📅 Jours
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewRequest({...newRequest, absence_unit: 'heures'})}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            newRequest.absence_unit === 'heures'
                              ? 'bg-purple-600 text-white shadow-md'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          ⏰ Heures
                        </button>
                      </div>
                    </div>
                    
                    {newRequest.absence_unit === 'heures' && (
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-2">Nombre d'heures</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="24"
                          value={newRequest.hours_amount || ''}
                          onChange={(e) => setNewRequest({...newRequest, hours_amount: parseFloat(e.target.value)})}
                          className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Ex: 8 ou 4.5"
                          required
                        />
                        <p className="text-xs text-blue-700 mt-1">
                          💡 8 heures = 1 jour | Format décimal accepté (ex: 4.5 pour 4h30)
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
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
                          onChange={handleFileUpload}
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
                        <div className="mt-3 space-y-2">
                          <p className="text-sm font-medium text-gray-700">Documents sélectionnés :</p>
                          {newRequest.documents.map((file, index) => (
                            <div key={index} className={`p-2 rounded border ${file.isMedical ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">{file.isMedical ? '🏥' : '📄'}</span>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-800">{file.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {Math.round(file.size / 1024)} KB • {file.type}
                                    {file.auditId && <span className="ml-2">• ID: {file.auditId.slice(-8)}</span>}
                                  </div>
                                </div>
                                {file.isMedical && (
                                  <div className="flex items-center space-x-1">
                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-semibold">🔒 MÉDICAL</span>
                                    <div className="text-xs text-red-600" title="Document chiffré selon RGPD">
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {/* Avertissement RGPD pour documents médicaux */}
                          {newRequest.documents.some(doc => doc.isMedical) && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="flex items-start space-x-2">
                                <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <div>
                                  <h4 className="text-sm font-semibold text-blue-800">Protection des données médicales</h4>
                                  <p className="text-xs text-blue-700 mt-1">
                                    Les documents médicaux sont automatiquement chiffrés et protégés conformément au RGPD (Art. 9).
                                    Accès limité au personnel habilité. Conservation sécurisée selon la législation en vigueur.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
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
                          onChange={handleFileUpload}
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
                        <div className="mt-3 space-y-2">
                          <p className="text-sm font-medium text-gray-700">Documents sélectionnés :</p>
                          {newRequest.documents.map((file, index) => (
                            <div key={index} className={`p-2 rounded border ${file.isMedical ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">{file.isMedical ? '🏥' : '📄'}</span>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-800">{file.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {Math.round(file.size / 1024)} KB • {file.type}
                                    {file.auditId && <span className="ml-2">• ID: {file.auditId.slice(-8)}</span>}
                                  </div>
                                </div>
                                {file.isMedical && (
                                  <div className="flex items-center space-x-1">
                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-semibold">🔒 MÉDICAL</span>
                                    <div className="text-xs text-red-600" title="Document chiffré selon RGPD">
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {/* Avertissement RGPD pour documents médicaux */}
                          {newRequest.documents.some(doc => doc.isMedical) && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="flex items-start space-x-2">
                                <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <div>
                                  <h4 className="text-sm font-semibold text-blue-800">Protection des données médicales</h4>
                                  <p className="text-xs text-blue-700 mt-1">
                                    Les documents médicaux sont automatiquement chiffrés et protégés conformément au RGPD (Art. 9).
                                    Accès limité au personnel habilité. Conservation sécurisée selon la législation en vigueur.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
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

      {/* Modal d'édition d'absence (Admin uniquement) */}
      {showEditModal && editingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center space-x-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Modifier l'absence</span>
                  </h2>
                  <p className="text-blue-100 mt-1">Modification réservée aux administrateurs</p>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingRequest(null);
                  }}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Date de début */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={editingRequest.date_debut || ''}
                  onChange={(e) => setEditingRequest({...editingRequest, date_debut: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Date de fin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={editingRequest.date_fin || ''}
                  onChange={(e) => setEditingRequest({...editingRequest, date_fin: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Nombre de jours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de jours
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingRequest.jours_absence || 0}
                  onChange={(e) => setEditingRequest({...editingRequest, jours_absence: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Type d'absence */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type d'absence <span className="text-red-500">*</span>
                </label>
                <select
                  value={editingRequest.motif_absence || ''}
                  onChange={(e) => setEditingRequest({...editingRequest, motif_absence: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.entries(absenceTypes).map(([code, type]) => (
                    <option key={code} value={code}>{type.name}</option>
                  ))}
                </select>
              </div>

              {/* Notes/Motif */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes / Motif
                </label>
                <textarea
                  value={editingRequest.notes || ''}
                  onChange={(e) => setEditingRequest({...editingRequest, notes: e.target.value})}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Informations complémentaires..."
                />
              </div>

              {/* Statut (Admin only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  value={editingRequest.status || 'pending'}
                  onChange={(e) => setEditingRequest({...editingRequest, status: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending">En attente</option>
                  <option value="approved">Approuvé</option>
                  <option value="rejected">Refusé</option>
                </select>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Information importante</p>
                    <p className="mt-1">Les modifications seront enregistrées dans l'historique et l'employé sera notifié automatiquement.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingRequest(null);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 font-medium transition-all shadow-lg"
              >
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AbsenceRequests;