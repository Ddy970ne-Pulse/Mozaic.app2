// Gestion centralisée des demandes d'absence
// Permet la synchronisation entre Dashboard et AbsenceRequests

let listeners = [];
let requestsState = {
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
      avatar: 'ML',
      action: 'Demande congés payés'
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
      avatar: 'PM',
      action: 'Demande RTT'
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
      avatar: 'LB',
      action: 'Demande formation'
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
      avatar: 'JD',
      action: 'Validation heures sup.'
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
      avatar: 'CD',
      action: 'Congé maladie'
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
      avatar: 'TL',
      action: 'Demande congés'
    }
  ]
};

// Fonctions utilitaires
export const getRequests = () => ({ ...requestsState });

export const getPendingRequests = () => requestsState.pending;

export const getRecentActivities = () => {
  // Retourner les 5 activités les plus récentes de toutes les catégories
  const allActivities = [
    ...requestsState.pending.map(req => ({ ...req, date: req.submittedDate })),
    ...requestsState.approved.map(req => ({ ...req, date: req.approvedDate || req.submittedDate })),
    ...requestsState.rejected.map(req => ({ ...req, date: req.rejectedDate || req.submittedDate }))
  ];
  
  return allActivities
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)
    .map(activity => ({
      name: activity.employee,
      action: activity.action,
      date: activity.date,
      status: activity.status === 'pending' ? 'En attente' : 
              activity.status === 'approved' ? 'Approuvé' : 'Rejeté',
      originalId: activity.id,
      originalStatus: activity.status
    }));
};

// Actions pour modifier l'état
export const approveRequest = (requestId, approverName) => {
  const pendingRequest = requestsState.pending.find(req => req.id === requestId);
  if (!pendingRequest) return false;

  const approvedRequest = {
    ...pendingRequest,
    status: 'approved',
    approver: approverName,
    approvedDate: new Date().toISOString().split('T')[0]
  };

  requestsState.pending = requestsState.pending.filter(req => req.id !== requestId);
  requestsState.approved.push(approvedRequest);
  
  // Notifier tous les listeners
  notifyListeners();
  return true;
};

export const rejectRequest = (requestId, rejectorName, reason = '') => {
  const pendingRequest = requestsState.pending.find(req => req.id === requestId);
  if (!pendingRequest) return false;

  const rejectedRequest = {
    ...pendingRequest,
    status: 'rejected',
    rejectedBy: rejectorName,
    rejectedDate: new Date().toISOString().split('T')[0],
    rejectionReason: reason || 'Aucune raison spécifiée'
  };

  requestsState.pending = requestsState.pending.filter(req => req.id !== requestId);
  requestsState.rejected.push(rejectedRequest);
  
  // Notifier tous les listeners
  notifyListeners();
  return true;
};

export const updateRequests = (newRequests) => {
  requestsState = { ...newRequests };
  notifyListeners();
};

// Système de souscription pour la synchronisation
export const subscribe = (listener) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

const notifyListeners = () => {
  listeners.forEach(listener => listener(requestsState));
};