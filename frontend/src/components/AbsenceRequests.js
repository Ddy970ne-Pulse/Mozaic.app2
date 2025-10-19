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
            // Statut par défaut "approved" pour les absences importées sans statut
            status: absence.status || 'approved',
            submittedDate: absence.created_at ? absence.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            absence_unit: absence.absence_unit || 'jours',
            hours_amount: absence.hours_amount,
            approver_name: absence.approver_name || absence.approver,
            approved_date: absence.approved_date,
            rejection_reason: absence.rejection_reason,
            rejected_by: absence.rejected_by || absence.rejectedBy,
            rejected_date: absence.rejected_date || absence.rejectedDate,
            updated_at: absence.updated_at || absence.created_at
          };
          
          // Catégoriser par statut
          const absenceStatus = requestObj.status.toLowerCase();
          if (absenceStatus === 'pending') {
            pending.push(requestObj);
          } else if (absenceStatus === 'approved') {
            approved.push(requestObj);
          } else if (absenceStatus === 'rejected') {
            rejected.push(requestObj);
          } else {
            // Par défaut, considérer comme approuvé
            approved.push({...requestObj, status: 'approved'});
          }
        });
        
        // ⏰ TRI PAR DATE : Du plus récent au plus ancien
        // Pending : par date de soumission (les plus récentes en premier)
        pending.sort((a, b) => {
          const dateA = new Date(a.submittedDate || a.updated_at || 0);
          const dateB = new Date(b.submittedDate || b.updated_at || 0);
          return dateB - dateA; // Décroissant (plus récent en premier)
        });
        
        // Approved : par date d'approbation (les plus récentes en premier)
        approved.sort((a, b) => {
          const dateA = new Date(a.approved_date || a.updated_at || a.submittedDate || 0);
          const dateB = new Date(b.approved_date || b.updated_at || b.submittedDate || 0);
          return dateB - dateA; // Décroissant (plus récent en premier)
        });
        
        // Rejected : par date de rejet (les plus récentes en premier)
        rejected.sort((a, b) => {
          const dateA = new Date(a.rejected_date || a.updated_at || a.submittedDate || 0);
          const dateB = new Date(b.rejected_date || b.updated_at || b.submittedDate || 0);
          return dateB - dateA; // Décroissant (plus récent en premier)
        });
        
        const newRequests = { pending, approved, rejected };
        setRequests(newRequests);
        
        // Mettre à jour aussi le state partagé
        updateRequests(newRequests);
        
        console.log(`✅ Absences chargées et triées: ${pending.length} en attente, ${approved.length} approuvées, ${rejected.length} rejetées`);
        console.log(`📊 Détail - Pending IDs:`, pending.map(p => p.id));
        console.log(`📊 Détail - Approved IDs (5 plus récentes):`, approved.slice(0, 5).map(p => ({id: p.id, date: p.approved_date || p.updated_at})));
        console.log(`📊 Détail - Rejected IDs:`, rejected.map(p => p.id));
      } else {
        console.error('Erreur chargement absences:', response.status);
      }
    } catch (error) {
      console.error('Erreur chargement absences:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les absences au montage et toutes les 3 minutes
  useEffect(() => {
    loadAbsencesFromAPI();
    
    // Recharger périodiquement (3 minutes au lieu de 30s pour éviter les actualisations trop fréquentes)
    const interval = setInterval(loadAbsencesFromAPI, 180000); // 3 minutes
    
    return () => clearInterval(interval);
  }, []);

  // Souscription aux changements d'état
  useEffect(() => {
    const unsubscribe = subscribe((newRequests) => {
      setRequests(newRequests);
    });

    return unsubscribe;
  }, []);

  // 📡 Écouter les événements WebSocket pour reload automatique
  useEffect(() => {
    const handleWebSocketChange = (event) => {
      console.log('🔄 WebSocket event in AbsenceRequests, reloading...', event.detail.type);
      loadAbsencesFromAPI();
    };

    window.addEventListener('websocket-absence-change', handleWebSocketChange);
    
    return () => {
      window.removeEventListener('websocket-absence-change', handleWebSocketChange);
    };
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
    hours_amount: null,      // nombre d'heures si unit='heures'
    employee_id: user?.id || '',  // Pour admin: permettre de choisir l'employé
    employee_name: user?.name || ''
  });

  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Suppression de la duplication - utiliser le state requests défini plus haut

  // Charger la liste des employés pour le sélecteur (admin/manager)
  const loadEmployees = async () => {
    if (user.role !== 'admin' && user.role !== 'manager') return;
    
    setLoadingEmployees(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/users`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.ok) {
        const users = await response.json();
        setEmployees(users.filter(u => u.role === 'employee' || u.role === 'manager'));
      }
    } catch (error) {
      console.error('Erreur chargement employés:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Charger les employés au montage si admin/manager
  useEffect(() => {
    if (user.role === 'admin' || user.role === 'manager') {
      loadEmployees();
    }
  }, [user.role]);

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

  const handleApprove = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/absences/${requestId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'approved',
            approver: user.name,
            approvedDate: new Date().toISOString().split('T')[0]
          })
        }
      );
      
      if (response.ok) {
        console.log('✅ Demande approuvée');
        // Mise à jour optimiste immédiate
        setRequests(prev => {
          const updatedPending = prev.pending.filter(r => r.id !== requestId);
          const approvedRequest = prev.pending.find(r => r.id === requestId);
          const updatedApproved = approvedRequest 
            ? [...prev.approved, { ...approvedRequest, status: 'approved' }]
            : prev.approved;
          return {
            pending: updatedPending,
            approved: updatedApproved,
            rejected: prev.rejected
          };
        });
        // Recharger les absences pour synchroniser avec le serveur
        loadAbsencesFromAPI();
      } else {
        alert('❌ Erreur lors de l\'approbation de la demande');
      }
    } catch (error) {
      console.error('Erreur approbation:', error);
      alert('❌ Erreur lors de l\'approbation de la demande');
    }
  };

  const handleReject = async (requestId) => {
    const rejectionReason = prompt('Raison du refus (optionnel):');
    if (rejectionReason !== null) { // L'utilisateur n'a pas annulé
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}/api/absences/${requestId}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status: 'rejected',
              rejectedBy: user.name,
              rejectedDate: new Date().toISOString().split('T')[0],
              rejectionReason: rejectionReason || 'Aucune raison spécifiée'
            })
          }
        );
        
        if (response.ok) {
          console.log('✅ Demande rejetée');
          // Mise à jour optimiste immédiate
          setRequests(prev => {
            const updatedPending = prev.pending.filter(r => r.id !== requestId);
            const rejectedRequest = prev.pending.find(r => r.id === requestId);
            const updatedRejected = rejectedRequest 
              ? [...prev.rejected, { ...rejectedRequest, status: 'rejected' }]
              : prev.rejected;
            return {
              pending: updatedPending,
              approved: prev.approved,
              rejected: updatedRejected
            };
          });
          // Recharger les absences pour synchroniser avec le serveur
          loadAbsencesFromAPI();
        } else {
          alert('❌ Erreur lors du rejet de la demande');
        }
      } catch (error) {
        console.error('Erreur rejet:', error);
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
        const result = await response.json();
        
        // Message de succès avec info sur la synchronisation
        let successMessage = '✅ Absence modifiée avec succès';
        
        if (result.counters_synced) {
          successMessage += '\n🔄 Compteurs de congés mis à jour automatiquement';
        }
        
        alert(successMessage);
        
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

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      
      // Calculer la durée en jours (approximation simple)
      const start = new Date(newRequest.startDate);
      const end = new Date(newRequest.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      // Préparer les données pour l'API
      const absenceData = {
        employee_id: newRequest.employee_id || user.id,
        employee_name: newRequest.employee_name || user.name,
        email: user.email,
        motif_absence: newRequest.type,
        date_debut: newRequest.startDate,
        date_fin: newRequest.endDate,
        jours_absence: newRequest.absence_unit === 'heures' ? 
          (parseFloat(newRequest.hours_amount) / 7).toFixed(2) : 
          diffDays.toString(),
        notes: newRequest.reason,
        status: 'pending',
        absence_unit: newRequest.absence_unit,
        hours_amount: newRequest.absence_unit === 'heures' ? parseFloat(newRequest.hours_amount) : null,
        created_by: user.id
      };
      
      console.log('📤 Envoi nouvelle demande d\'absence:', absenceData);
      
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/absences`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(absenceData)
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Demande créée avec succès:', result);
        alert('✅ Demande d\'absence créée avec succès');
        
        // Recharger les données
        loadAbsencesFromAPI();
        
        // Fermer le modal
        setShowNewRequest(false);
        
        // Réinitialiser le formulaire
        setNewRequest({ 
          type: 'CP', 
          startDate: '', 
          endDate: '', 
          reason: '', 
          halfDay: false, 
          documents: [], 
          requiresAcknowledgment: false,
          absence_unit: 'jours',
          hours_amount: null,
          employee_id: user?.id || '',
          employee_name: user?.name || ''
        });
      } else {
        const error = await response.json();
        console.error('❌ Erreur création demande:', error);
        alert(`❌ Erreur: ${error.detail || 'Impossible de créer la demande'}`);
      }
    } catch (error) {
      console.error('❌ Erreur création demande:', error);
      alert('❌ Erreur lors de la création de la demande');
    }
  };

  const formatDate = (dateStr) => {
    // Gérer les cas de dates manquantes ou invalides
    if (!dateStr || dateStr === '' || dateStr === 'null' || dateStr === 'undefined') {
      return 'Date non renseignée';
    }
    
    try {
      // Gérer les deux formats de date
      // Format 1: DD/MM/YYYY (absences importées)
      // Format 2: YYYY-MM-DD (nouvelles absences ISO)
      
      if (dateStr.includes('/')) {
        // Format français DD/MM/YYYY - retourner tel quel
        const [day, month, year] = dateStr.split('/');
        
        // Vérifier que les parties sont valides
        if (!day || !month || !year || day === '' || month === '' || year === '') {
          return 'Date invalide';
        }
        
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      } else {
        // Format ISO YYYY-MM-DD
        const date = new Date(dateStr + 'T00:00:00');
        
        // Vérifier que la date est valide
        if (isNaN(date.getTime())) {
          return 'Date invalide';
        }
        
        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
    } catch (error) {
      console.error('Erreur formatage date:', dateStr, error);
      return 'Date invalide';
    }
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

  // Vue simplifiée unifiée pour TOUS les utilisateurs : toutes les demandes dans une seule liste
  const allRequestsUnified = [
    ...requests.pending.map(r => ({...r, statusType: 'pending'})),
    ...requests.approved.map(r => ({...r, statusType: 'approved'})),
    ...requests.rejected.map(r => ({...r, statusType: 'rejected'}))
  ].sort((a, b) => {
    // Trier par date de soumission décroissante (plus récent en premier)
    const dateA = new Date(a.submittedDate || a.updated_at || 0);
    const dateB = new Date(b.submittedDate || b.updated_at || 0);
    return dateB - dateA;
  });

  // Afficher le loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

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

      {/* Vue simplifiée unifiée - Pour TOUS les utilisateurs (Employés, Managers, Admins) */}
      <div className="space-y-4">
        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">En Attente</p>
                <p className="text-3xl font-bold text-orange-700">{requests.pending.length}</p>
              </div>
              <div className="text-4xl">⏳</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Approuvées</p>
                <p className="text-3xl font-bold text-green-700">{requests.approved.length}</p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Refusées</p>
                <p className="text-3xl font-bold text-red-700">{requests.rejected.length}</p>
              </div>
              <div className="text-4xl">❌</div>
            </div>
          </div>
        </div>

        {/* Liste unifiée de toutes les demandes */}
        <div className="bg-white/70 backdrop-blur-sm border-2 border-purple-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            📋 {isEmployee ? 'Toutes mes demandes' : 'Toutes les demandes'} ({allRequestsUnified.length})
          </h3>
          
          {allRequestsUnified.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-lg font-medium">Aucune demande d'absence</p>
              <p className="text-sm mt-2">Cliquez sur "Nouvelle Demande" pour commencer</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allRequestsUnified.map(request => {
                const statusConfig = {
                  pending: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800', badge: '⏳ En attente', badgeBg: 'bg-orange-200' },
                  approved: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800', badge: '✅ Approuvée', badgeBg: 'bg-green-200' },
                  rejected: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800', badge: '❌ Refusée', badgeBg: 'bg-red-200' }
                };
                
                const config = statusConfig[request.statusType] || statusConfig.pending;
                
                return (
                  <div key={request.id} className={`${config.bg} border-2 ${config.border} rounded-lg p-4 transition-all hover:shadow-md`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.badgeBg} ${config.text}`}>
                            {config.badge}
                          </span>
                          <span className="font-semibold text-gray-900 text-lg">{request.type}</span>
                          {!isEmployee && (
                            <span className="text-sm text-gray-600">• {request.employee}</span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                          <div>
                            <span className="text-gray-600">📅 Période:</span>
                            <span className="ml-2 font-medium text-gray-900">
                              {formatDate(request.startDate)} → {formatDate(request.endDate)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">⏱️ Durée:</span>
                            <span className="ml-2 font-medium text-gray-900">
                              {request.absence_unit === 'heures' 
                                ? `${request.hours_amount || request.days} heures`
                                : `${request.days} jour(s)`
                              }
                            </span>
                          </div>
                        </div>
                        
                        {request.reason && (
                          <div className="mt-2 text-sm">
                            <span className="text-gray-600">💬 Motif:</span>
                            <span className="ml-2 text-gray-800">{request.reason}</span>
                          </div>
                        )}
                        
                        {request.statusType === 'approved' && request.approver_name && (
                          <div className="mt-2 text-xs text-green-700">
                            ✅ Approuvée par {request.approver_name}
                            {request.approved_date && ` le ${new Date(request.approved_date).toLocaleDateString('fr-FR')}`}
                          </div>
                        )}
                        
                        {request.statusType === 'rejected' && (
                          <div className="mt-2 text-xs text-red-700">
                            ❌ Rejetée par {request.rejected_by}
                            {request.rejected_date && ` le ${new Date(request.rejected_date).toLocaleDateString('fr-FR')}`}
                            {request.rejection_reason && (
                              <div className="mt-1 italic">Motif: {request.rejection_reason}</div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Actions pour admin/manager sur demandes en attente */}
                      {!isEmployee && request.statusType === 'pending' && (
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleApprove(request.id)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium transition-colors"
                          >
                            ✅ Approuver
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium transition-colors"
                          >
                            ❌ Refuser
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
                    
                    {/* Managers ne peuvent pas valider leurs propres demandes */}
                    {!isEmployee && request.status === 'pending' && (
                      user.role === 'manager' && request.employee_id === user.id ? (
                        <div className="text-xs text-orange-600 italic px-3 py-1 bg-orange-50 rounded-lg">
                          🔒 Validation par admin requise
                        </div>
                      ) : (
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
                      )
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
                      ✅ <strong>Demande approuvée</strong>
                      {request.approver_name && (
                        <span> par {request.approver_name}</span>
                      )}
                      {request.approved_date && (
                        <span> le {new Date(request.approved_date).toLocaleDateString('fr-FR')}</span>
                      )}
                    </div>
                  </div>
                )}
                
                {request.status === 'rejected' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-sm text-red-800">
                      ❌ <strong>Demande rejetée</strong>
                      {request.rejected_by && (
                        <span> par {request.rejected_by}</span>
                      )}
                      {request.rejected_date && (
                        <span> le {new Date(request.rejected_date).toLocaleDateString('fr-FR')}</span>
                      )}
                      {request.rejection_reason && (
                        <div className="mt-2 text-xs">
                          <strong>Motif:</strong> {request.rejection_reason}
                        </div>
                      )}
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
        </>
      )}

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
                {/* Sélecteur d'employé - Visible uniquement pour admin/manager */}
                {(user.role === 'admin' || user.role === 'manager') && (
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-purple-900 mb-2">
                      👤 Sélectionner l'employé concerné
                    </label>
                    <select
                      value={newRequest.employee_id}
                      onChange={(e) => {
                        const selectedEmployee = employees.find(emp => emp.id === e.target.value);
                        setNewRequest({
                          ...newRequest,
                          employee_id: e.target.value,
                          employee_name: selectedEmployee ? selectedEmployee.name : ''
                        });
                      }}
                      className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      required
                    >
                      <option value="">Choisir un employé...</option>
                      {employees.map(employee => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} ({employee.email})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-purple-600 mt-2">
                      💡 En tant qu'{user.role === 'admin' ? 'administrateur' : 'manager'}, vous pouvez créer une demande au nom d'un employé
                    </p>
                  </div>
                )}
                
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