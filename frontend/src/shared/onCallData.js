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

// REMOVED: Mock employee data - Now loaded from real user API
export const employeesOnCallData = [
  // Data will be loaded from /api/users endpoint
];

// Assignations d'astreintes existantes pour 2025 - Incluant octobre 2025
export const currentOnCallAssignments = [
  // Données de base (janvier-février)
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
    startDate: '2025-02-12',
    endDate: '2025-02-13',
    type: 'weekend',
    status: 'confirmed',
    assignedBy: 'RH',
    assignedAt: '2024-12-18T14:30:00Z',
    notes: ''
  },
  // Octobre 2025 - Données de test complètes
  {
    id: 11,
    employeeId: 1,
    employeeName: 'Sophie Martin',
    startDate: '2025-10-01',
    endDate: '2025-10-01',
    type: 'single',
    status: 'confirmed',
    assignedBy: 'Direction',
    assignedAt: '2025-09-25T10:00:00Z',
    notes: 'Astreinte 1er octobre'
  },
  {
    id: 12,
    employeeId: 3,
    employeeName: 'Marie Leblanc',
    startDate: '2025-10-05',
    endDate: '2025-10-05',
    type: 'single',
    status: 'confirmed',
    assignedBy: 'Direction',
    assignedAt: '2025-09-28T14:00:00Z',
    notes: 'Astreinte samedi'
  },
  {
    id: 13,
    employeeId: 8,
    employeeName: 'Thomas Petit',
    startDate: '2025-10-11',
    endDate: '2025-10-12',
    type: 'weekend',
    status: 'confirmed',
    assignedBy: 'Direction',
    assignedAt: '2025-10-05T16:00:00Z',
    notes: 'Astreinte week-end management'
  },
  {
    id: 14,
    employeeId: 4,
    employeeName: 'Pierre Moreau',
    startDate: '2025-10-15',
    endDate: '2025-10-15',
    type: 'single',
    status: 'confirmed',
    assignedBy: 'RH',
    assignedAt: '2025-10-10T09:00:00Z',
    notes: 'Astreinte mardi éducateur'
  },
  {
    id: 15,
    employeeId: 1,
    employeeName: 'Sophie Martin',
    startDate: '2025-10-25',
    endDate: '2025-10-26',
    type: 'weekend',
    status: 'confirmed',
    assignedBy: 'Direction',
    assignedAt: '2025-10-18T11:30:00Z',
    notes: 'Astreinte week-end fin octobre'
  },
  {
    id: 16,
    employeeId: 6,
    employeeName: 'Lucas Bernard',
    startDate: '2025-10-29',
    endDate: '2025-10-29',
    type: 'single',
    status: 'confirmed',
    assignedBy: 'RH',
    assignedAt: '2025-10-22T15:45:00Z',
    notes: 'Astreinte éducateur spécialisé'
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