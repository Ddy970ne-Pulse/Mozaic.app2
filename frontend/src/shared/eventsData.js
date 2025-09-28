// Gestion des événements à venir dans le tableau de bord
// Système dynamique pour remplacer les données hardcodées

export const eventTypes = {
  'meeting': { icon: '👥', color: 'bg-blue-500', label: 'Réunion' },
  'training': { icon: '📚', color: 'bg-green-500', label: 'Formation' },
  'evaluation': { icon: '📊', color: 'bg-orange-500', label: 'Évaluation' },
  'committee': { icon: '🏛️', color: 'bg-purple-500', label: 'Comité' },
  'deadline': { icon: '⏰', color: 'bg-red-500', label: 'Échéance' },
  'holiday': { icon: '🏖️', color: 'bg-cyan-500', label: 'Congé' }
};

// Données d'événements par défaut (peuvent être remplacées par des données de backend)
let upcomingEvents = [
  { 
    id: 1,
    event: 'Réunion équipe RH', 
    date: '16 Jan', 
    time: '09:00', 
    type: 'meeting',
    location: 'Salle de conférence A',
    participants: 8
  },
  { 
    id: 2,
    event: 'Formation sécurité', 
    date: '18 Jan', 
    time: '14:00', 
    type: 'training',
    location: 'Salle de formation',
    participants: 25
  },
  { 
    id: 3,
    event: 'Évaluation annuelle', 
    date: '20 Jan', 
    time: '10:30', 
    type: 'evaluation',
    location: 'Bureau RH',
    participants: 1
  },
  { 
    id: 4,
    event: 'Comité d\'entreprise', 
    date: '22 Jan', 
    time: '16:00', 
    type: 'committee',
    location: 'Salle du conseil',
    participants: 12
  },
  {
    id: 5,
    event: 'Échéance paie mensuelle',
    date: '28 Jan',
    time: '17:00',
    type: 'deadline',
    location: 'Service comptabilité',
    participants: 3
  }
];

// Subscribers pour les changements d'événements
let subscribers = [];

// Fonctions de gestion des événements
export const getUpcomingEvents = () => {
  return [...upcomingEvents];
};

export const addEvent = (eventData) => {
  const newEvent = {
    id: Date.now(),
    ...eventData
  };
  upcomingEvents.push(newEvent);
  notifySubscribers();
  return newEvent;
};

export const updateEvent = (eventId, updates) => {
  const index = upcomingEvents.findIndex(event => event.id === eventId);
  if (index !== -1) {
    upcomingEvents[index] = { ...upcomingEvents[index], ...updates };
    notifySubscribers();
    return upcomingEvents[index];
  }
  return null;
};

export const deleteEvent = (eventId) => {
  const index = upcomingEvents.findIndex(event => event.id === eventId);
  if (index !== -1) {
    upcomingEvents.splice(index, 1);
    notifySubscribers();
    return true;
  }
  return false;
};

export const getEventsByType = (type) => {
  return upcomingEvents.filter(event => event.type === type);
};

export const getEventsInDateRange = (startDate, endDate) => {
  // Cette fonction pourrait être améliorée avec de vraies dates
  return upcomingEvents.filter(event => {
    // Pour l'instant, on retourne tous les événements
    // Dans une vraie implémentation, on comparerait les dates
    return true;
  });
};

// Système de souscription pour les mises à jour en temps réel
export const subscribe = (callback) => {
  subscribers.push(callback);
  return () => {
    subscribers = subscribers.filter(sub => sub !== callback);
  };
};

const notifySubscribers = () => {
  subscribers.forEach(callback => callback(getUpcomingEvents()));
};

// Utilitaires pour l'affichage
export const formatEventForDisplay = (event) => {
  const typeInfo = eventTypes[event.type] || eventTypes.meeting;
  return {
    ...event,
    typeInfo,
    displayText: `${typeInfo.icon} ${event.event}`,
    fullInfo: `${event.event} - ${event.date} à ${event.time}`
  };
};

export const getEventStats = () => {
  const stats = {};
  Object.keys(eventTypes).forEach(type => {
    stats[type] = upcomingEvents.filter(event => event.type === type).length;
  });
  return {
    total: upcomingEvents.length,
    byType: stats
  };
};