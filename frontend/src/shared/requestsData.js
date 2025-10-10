// Gestion centralisée des demandes d'absence
// Permet la synchronisation entre Dashboard et AbsenceRequests

let listeners = [];
// CLEANED: All mock absence requests removed - Now loads from database
let requestsState = {
  pending: [],
  approved: [],
  rejected: []
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