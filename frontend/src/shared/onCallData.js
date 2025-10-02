// Données centralisées pour les astreintes - Compatible avec le système MOZAIK RH

// Règles CCN66 pour les limites d'astreintes selon les catégories d'employés
export const ccn66OnCallLimits = {
  management: {
    label: 'Encadrement',
    maxAnnualDays: 60, // Maximum 60 jours d'astreinte par an pour l'encadrement
    description: 'Personnel d\'encadrement et direction'
  },
  administrative: {
    label: 'Personnel Administratif',
    maxAnnualDays: 45, // Maximum 45 jours pour le personnel administratif
    description: 'Secrétariat, comptabilité, administration'
  },
  specialized_educators: {
    label: 'Éducateurs Spécialisés',
    maxAnnualDays: 50, // Maximum 50 jours pour les éducateurs spécialisés
    description: 'Éducateurs spécialisés et moniteurs-éducateurs'
  },
  technical_educators: {
    label: 'Éducateurs Techniques',
    maxAnnualDays: 50, // Maximum 50 jours pour les éducateurs techniques
    description: 'Éducateurs techniques et professionnels'
  }
};

// Types d'astreintes possibles
export const onCallTypes = {
  single: {
    label: 'Jour unique',
    color: 'orange',
    description: 'Astreinte sur un seul jour'
  },
  weekend: {
    label: 'Week-end',
    color: 'red',
    description: 'Astreinte de week-end (samedi-dimanche)'
  },
  holiday: {
    label: 'Jour férié',
    color: 'purple',
    description: 'Astreinte de jour férié'
  },
  night: {
    label: 'Nuit',
    color: 'blue',
    description: 'Astreinte de nuit (20h-8h)'
  }
};

// Données mockées des employés avec quotas d'astreinte actuels
export const employeesOnCallData = [
  {
    id: 1,
    name: 'Sophie Martin',
    email: 'sophie.martin@company.com',
    category: 'management',
    department: 'Direction',
    currentYearOnCallDays: 25,
    phone: '06.12.34.56.78',
    emergencyContact: '06.87.65.43.21',
    lastOnCallDate: '2024-12-15'
  },
  {
    id: 2,
    name: 'Jean Dupont',
    email: 'jean.dupont@company.com',
    category: 'administrative',
    department: 'Administration',
    currentYearOnCallDays: 18,
    phone: '06.23.45.67.89',
    emergencyContact: '06.98.76.54.32',
    lastOnCallDate: '2024-12-08'
  },
  {
    id: 3,
    name: 'Marie Leblanc',
    email: 'marie.leblanc@company.com',
    category: 'specialized_educators',
    department: 'Éducation',
    currentYearOnCallDays: 32,
    phone: '06.34.56.78.90',
    emergencyContact: '06.09.87.65.43',
    lastOnCallDate: '2024-12-22'
  },
  {
    id: 4,
    name: 'Pierre Moreau',
    email: 'pierre.moreau@company.com',
    category: 'technical_educators',
    department: 'Technique',
    currentYearOnCallDays: 15,
    phone: '06.45.67.89.01',
    emergencyContact: '06.10.98.76.54',
    lastOnCallDate: '2024-11-30'
  },
  {
    id: 5,
    name: 'Claire Dubois',
    email: 'claire.dubois@company.com',
    category: 'administrative',
    department: 'Comptabilité',
    currentYearOnCallDays: 28,
    phone: '06.56.78.90.12',
    emergencyContact: '06.21.09.87.65',
    lastOnCallDate: '2024-12-10'
  }
];

// Assignations d'astreintes existantes pour 2025
export const currentOnCallAssignments = [
  // Janvier 2025
  {
    id: 1,
    employeeId: 1,
    employeeName: 'Sophie Martin',
    startDate: '2025-01-05',
    endDate: '2025-01-06',
    type: 'weekend',
    status: 'confirmed',
    assignedBy: 'Direction',
    assignedAt: '2024-12-20T10:00:00Z',
    notes: 'Astreinte week-end standard'
  },
  {
    id: 2,
    employeeId: 2,
    employeeName: 'Jean Dupont',
    startDate: '2025-01-12',
    endDate: '2025-01-13',
    type: 'weekend',
    status: 'confirmed',
    assignedBy: 'RH',
    assignedAt: '2024-12-18T14:30:00Z',
    notes: ''
  },
  {
    id: 3,
    employeeId: 3,
    employeeName: 'Marie Leblanc',
    startDate: '2025-01-19',
    endDate: '2025-01-19',
    type: 'single',
    status: 'confirmed',
    assignedBy: 'Direction',
    assignedAt: '2024-12-15T09:15:00Z',
    notes: 'Astreinte exceptionnelle'
  },
  {
    id: 4,
    employeeId: 4,
    employeeName: 'Pierre Moreau',
    startDate: '2025-01-25',
    endDate: '2025-01-26',
    type: 'weekend',
    status: 'pending',
    assignedBy: 'RH',
    assignedAt: '2024-12-22T16:45:00Z',
    notes: 'En attente de confirmation'
  },
  // Février 2025
  {
    id: 5,
    employeeId: 1,
    employeeName: 'Sophie Martin',
    startDate: '2025-02-01',
    endDate: '2025-02-02',
    type: 'weekend',
    status: 'confirmed',
    assignedBy: 'Direction',
    assignedAt: '2024-12-19T11:20:00Z',
    notes: ''
  },
  // Septembre 2025 - Pour démonstration des bandes d'astreinte
  {
    id: 6,
    employeeId: 1,
    employeeName: 'Sophie Martin',
    startDate: '2025-09-03',
    endDate: '2025-09-03',
    type: 'single',
    status: 'confirmed',
    assignedBy: 'Direction',
    assignedAt: '2025-08-25T10:00:00Z',
    notes: 'Astreinte jour unique'
  },
  {
    id: 7,
    employeeId: 2,
    employeeName: 'Jean Dupont',
    startDate: '2025-09-08',
    endDate: '2025-09-08',
    type: 'single',
    status: 'confirmed',
    assignedBy: 'RH',
    assignedAt: '2025-08-20T14:30:00Z',
    notes: 'Astreinte lundi'
  },
  {
    id: 8,
    employeeId: 3,
    employeeName: 'Marie Leblanc',
    startDate: '2025-09-12',
    endDate: '2025-09-13',
    type: 'weekend',
    status: 'confirmed',
    assignedBy: 'Direction',
    assignedAt: '2025-08-15T09:15:00Z',
    notes: 'Astreinte week-end'
  },
  {
    id: 9,
    employeeId: 6,
    employeeName: 'Lucas Bernard',
    startDate: '2025-09-15',
    endDate: '2025-09-15',
    type: 'single',
    status: 'confirmed',
    assignedBy: 'Direction',
    assignedAt: '2025-08-10T11:00:00Z',
    notes: 'Astreinte éducateur spécialisé'
  },
  {
    id: 10,
    employeeId: 7,
    employeeName: 'Emma Rousseau',
    startDate: '2025-09-22',
    endDate: '2025-09-22',
    type: 'single',
    status: 'confirmed',
    assignedBy: 'RH',
    assignedAt: '2025-08-12T16:45:00Z',
    notes: 'Astreinte TEL'
  }
];

// Fonction pour calculer les statistiques d'astreinte
export const calculateOnCallStats = (employeeId, year = new Date().getFullYear()) => {
  const employee = employeesOnCallData.find(emp => emp.id === employeeId);
  if (!employee) return null;

  const categoryLimits = ccn66OnCallLimits[employee.category];
  const assignments = currentOnCallAssignments.filter(assignment => 
    assignment.employeeId === employeeId && 
    new Date(assignment.startDate).getFullYear() === year
  );

  const totalDaysAssigned = assignments.reduce((total, assignment) => {
    const start = new Date(assignment.startDate);
    const end = new Date(assignment.endDate);
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return total + daysDiff;
  }, 0);

  const remainingDays = categoryLimits.maxAnnualDays - employee.currentYearOnCallDays;
  const percentageUsed = (employee.currentYearOnCallDays / categoryLimits.maxAnnualDays) * 100;

  return {
    employee,
    categoryLimits,
    currentDays: employee.currentYearOnCallDays,
    assignedDays: totalDaysAssigned,
    remainingDays,
    percentageUsed,
    isNearLimit: percentageUsed > 80,
    isOverLimit: employee.currentYearOnCallDays > categoryLimits.maxAnnualDays,
    assignments
  };
};

// Fonction pour valider une nouvelle assignation d'astreinte
export const validateOnCallAssignment = (employeeId, startDate, endDate) => {
  const errors = [];
  const warnings = [];
  
  const employee = employeesOnCallData.find(emp => emp.id === employeeId);
  if (!employee) {
    errors.push("Employé non trouvé");
    return { isValid: false, errors, warnings };
  }

  const stats = calculateOnCallStats(employeeId);
  if (!stats) {
    errors.push("Impossible de calculer les statistiques pour cet employé");
    return { isValid: false, errors, warnings };
  }

  // Calcul du nombre de jours de la nouvelle assignation
  const start = new Date(startDate);
  const end = new Date(endDate);
  const newAssignmentDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  // Vérification de la limite annuelle CCN66
  const totalAfterAssignment = stats.currentDays + newAssignmentDays;
  if (totalAfterAssignment > stats.categoryLimits.maxAnnualDays) {
    errors.push(
      `⚠️ LIMITE CCN66 DÉPASSÉE: ${employee.name} dépasserait sa limite annuelle ` +
      `(${stats.categoryLimits.maxAnnualDays} jours max, actuellement ${stats.currentDays} + ${newAssignmentDays} = ${totalAfterAssignment})`
    );
  } else if (totalAfterAssignment > stats.categoryLimits.maxAnnualDays * 0.9) {
    warnings.push(
      `⚡ ATTENTION: ${employee.name} s'approche de sa limite annuelle ` +
      `(${Math.round((totalAfterAssignment / stats.categoryLimits.maxAnnualDays) * 100)}%)`
    );
  }

  // Vérification des conflits de dates
  const conflictingAssignments = currentOnCallAssignments.filter(assignment => {
    if (assignment.employeeId === employeeId) return false;
    
    const assignmentStart = new Date(assignment.startDate);
    const assignmentEnd = new Date(assignment.endDate);
    
    return (start <= assignmentEnd && end >= assignmentStart);
  });

  if (conflictingAssignments.length > 0) {
    errors.push(
      `📅 CONFLIT DE DATES: Période en conflit avec les astreintes de ${conflictingAssignments.map(a => a.employeeName).join(', ')}`
    );
  }

  // Note: Règle du repos de 48h retirée à la demande de l'utilisateur

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats: {
      ...stats,
      newAssignmentDays,
      totalAfterAssignment
    }
  };
};

// Fonction pour générer le planning d'export pour l'entreprise de sécurité
export const generateSecurityCompanyExport = (month, year) => {
  const assignments = currentOnCallAssignments.filter(assignment => {
    const assignmentDate = new Date(assignment.startDate);
    return assignmentDate.getMonth() === month && assignmentDate.getFullYear() === year;
  });

  return assignments.map(assignment => {
    const employee = employeesOnCallData.find(emp => emp.id === assignment.employeeId);
    return {
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      employeeName: assignment.employeeName,
      employeePhone: employee ? employee.phone : 'Non renseigné',
      emergencyContact: employee ? employee.emergencyContact : 'Service Direction',
      type: onCallTypes[assignment.type]?.label || 'Standard',
      notes: assignment.notes || ''
    };
  });
};

// Couleur pour les bandes d'astreinte dans le planning mensuel
export const onCallBandColor = '#dc2626'; // Rouge sang (orange sanguine)
export const onCallBandColorRGB = 'rgb(220, 38, 38)';

// Fonction pour intégrer les astreintes dans le planning mensuel
export const getOnCallDataForMonthlyPlanning = (month, year) => {
  const assignments = currentOnCallAssignments.filter(assignment => {
    const assignmentDate = new Date(assignment.startDate);
    return assignmentDate.getMonth() === month && assignmentDate.getFullYear() === year;
  });

  // Format pour intégration dans MonthlyPlanningFinal.js
  const onCallByEmployee = {};
  
  assignments.forEach(assignment => {
    if (!onCallByEmployee[assignment.employeeId]) {
      onCallByEmployee[assignment.employeeId] = [];
    }
    
    // Générer toutes les dates de l'assignation
    const startDate = new Date(assignment.startDate);
    const endDate = new Date(assignment.endDate);
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      onCallByEmployee[assignment.employeeId].push({
        date: new Date(currentDate).toISOString().split('T')[0],
        type: assignment.type,
        status: assignment.status,
        notes: assignment.notes
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
  });

  return onCallByEmployee;
};

export default {
  ccn66OnCallLimits,
  onCallTypes,
  employeesOnCallData,
  currentOnCallAssignments,
  calculateOnCallStats,
  validateOnCallAssignment,
  generateSecurityCompanyExport,
  getOnCallDataForMonthlyPlanning,
  onCallBandColor,
  onCallBandColorRGB
};