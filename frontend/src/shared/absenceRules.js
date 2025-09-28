// Règles de décompte des absences selon le droit français du travail
// Conforme au Code du travail et aux conventions collectives

export const ABSENCE_DEDUCTION_RULES = {
  // CONGÉS ET REPOS (Articles L3141 et suivants)
  'CA': {
    name: 'Congés annuels',
    legalBasis: 'Art. L3141-3',
    deductionMethod: 'working_days', // Jours ouvrables (Lu-Sa)
    excludeSundays: true,
    excludeHolidays: true,
    interruptedBy: ['AM', 'AT', 'MPRO'], // Arrêts maladie interrompent
    payrollImpact: 'maintain_salary',
    documentation: 'Décompte en jours ouvrables, dimanches et fériés non décomptés'
  },

  'RTT': {
    name: 'RTT',
    legalBasis: 'Acc. 35h - Art. L3121-44',
    deductionMethod: 'working_days',
    excludeSundays: true,
    excludeHolidays: true,
    payrollImpact: 'maintain_salary',
    documentation: 'Réduction du temps de travail - décompte jours ouvrables'
  },

  'REC': {
    name: 'Récupération',
    legalBasis: 'Art. L3121-16',
    deductionMethod: 'hours', // En heures, pas en jours
    excludeSundays: false,
    excludeHolidays: false,
    payrollImpact: 'maintain_salary',
    documentation: 'Récupération d\'heures - décompte horaire'
  },

  'RH': {
    name: 'Repos Hebdomadaire',
    legalBasis: 'Art. L3132-1',
    deductionMethod: 'none', // Repos légal obligatoire
    excludeSundays: true,
    excludeHolidays: true,
    payrollImpact: 'maintain_salary',
    documentation: 'Repos hebdomadaire obligatoire - non décompté'
  },

  'RHD': {
    name: 'Repos Dominical',
    legalBasis: 'Art. L3132-3',
    deductionMethod: 'none', // Repos légal
    excludeSundays: true,
    excludeHolidays: true,
    payrollImpact: 'maintain_salary',
    documentation: 'Repos dominical - non décompté du temps de travail'
  },

  // CONGÉS SPÉCIAUX (Articles L1225 et L3142)
  'MAT': {
    name: 'Congé maternité',
    legalBasis: 'Art. L1225-17',
    deductionMethod: 'calendar_days', // Jours calendaires
    excludeSundays: false,
    excludeHolidays: false,
    payrollImpact: 'social_security', // Pris en charge Sécurité Sociale
    documentation: 'Congé maternité - 16 semaines min, indemnisé par la Sécurité Sociale'
  },

  'PAT': {
    name: 'Congé paternité',
    legalBasis: 'Art. L1225-35',
    deductionMethod: 'calendar_days',
    excludeSundays: false,
    excludeHolidays: false,
    payrollImpact: 'social_security',
    documentation: 'Congé paternité - 25 jours calendaires (nouveau-né), indemnisé par la Sécurité Sociale'
  },

  'FAM': {
    name: 'Évènement familiale',
    legalBasis: 'Art. L3142-1',
    deductionMethod: 'working_days',
    excludeSundays: true,
    excludeHolidays: true,
    payrollImpact: 'maintain_salary',
    familyEvents: {
      mariage: { days: 4, description: 'Mariage du salarié' },
      naissance: { days: 3, description: 'Naissance ou adoption' },
      deces_conjoint: { days: 2, description: 'Décès conjoint/enfant' },
      deces_parent: { days: 1, description: 'Décès père/mère' }
    },
    documentation: 'Congés familiaux selon événement - jours ouvrables rémunérés'
  },

  // FORMATIONS
  'FO': {
    name: 'Congé formation',
    legalBasis: 'Art. L6313-1',
    deductionMethod: 'working_days',
    excludeSundays: true,
    excludeHolidays: true,
    payrollImpact: 'maintain_salary', // Selon accord entreprise
    documentation: 'Formation professionnelle - maintien de salaire selon accord'
  },

  'STG': {
    name: 'Stage',
    legalBasis: 'Art. L124-1 Éducation',
    deductionMethod: 'calendar_days',
    excludeSundays: false,
    excludeHolidays: false,
    payrollImpact: 'none', // Stage non rémunéré par l\'entreprise
    documentation: 'Stage étudiant - période de formation non rémunérée'
  },

  // ABSENCES MALADIE ET ACCIDENTS
  'AM': {
    name: 'Arrêt maladie',
    legalBasis: 'Art. L1226-1',
    deductionMethod: 'calendar_days',
    excludeSundays: false,
    excludeHolidays: false,
    interruptsLeave: true, // Interrompt les congés payés
    payrollImpact: 'social_security_complement', // IJSS + complément employeur
    documentation: 'Arrêt maladie - indemnités journalières + complément selon CCN'
  },

  'AT': {
    name: 'Accident du travail / Trajet',
    legalBasis: 'Art. L411-1 SS',
    deductionMethod: 'calendar_days',
    excludeSundays: false,
    excludeHolidays: false,
    payrollImpact: 'full_salary', // Maintien intégral du salaire
    documentation: 'Accident du travail - maintien intégral du salaire par l\'employeur'
  },

  'MPRO': {
    name: 'Maladie Professionnelle',
    legalBasis: 'Art. L461-1 SS',
    deductionMethod: 'calendar_days',
    excludeSundays: false,
    excludeHolidays: false,
    payrollImpact: 'full_salary',
    documentation: 'Maladie professionnelle - maintien intégral du salaire'
  },

  'EMAL': {
    name: 'Enfants malades',
    legalBasis: 'Art. L1225-61',
    deductionMethod: 'working_days',
    excludeSundays: true,
    excludeHolidays: true,
    annualLimit: { days: 3, perChild: true }, // 3 jours par enfant malade
    payrollImpact: 'partial_salary', // Selon CCN
    documentation: 'Congé enfant malade - 3j/an/enfant, rémunération selon CCN'
  },

  // ABSENCES ADMINISTRATIVES
  'CEX': {
    name: 'Congé exceptionnel',
    legalBasis: 'Accord entreprise',
    deductionMethod: 'working_days',
    excludeSundays: true,
    excludeHolidays: true,
    payrollImpact: 'maintain_salary', // Selon accord
    documentation: 'Congé exceptionnel - conditions selon accord d\'entreprise'
  },

  'RMED': {
    name: 'Rendez-vous médical',
    legalBasis: 'Art. R4624-10',
    deductionMethod: 'hours', // Généralement en heures
    excludeSundays: true,
    excludeHolidays: true,
    payrollImpact: 'maintain_salary',
    documentation: 'RDV médical obligatoire - temps rémunéré'
  },

  // ABSENCES SPÉCIALES
  'CSS': {
    name: 'Congés Sans Solde',
    legalBasis: 'Accord employeur',
    deductionMethod: 'calendar_days',
    excludeSundays: false,
    excludeHolidays: false,
    payrollImpact: 'no_salary', // Aucune rémunération
    documentation: 'Congé sans solde - suspension du contrat, pas de rémunération'
  },

  'NAUT': {
    name: 'Absence non autorisée',
    legalBasis: 'Discipline',
    deductionMethod: 'working_days',
    excludeSundays: true,
    excludeHolidays: true,
    payrollImpact: 'deduct_salary', // Retenue sur salaire
    disciplinaryAction: true,
    documentation: 'Absence injustifiée - retenue salaire + mesure disciplinaire'
  },

  'AUT': {
    name: 'Absence autorisée',
    legalBasis: 'Accord employeur',
    deductionMethod: 'working_days',
    excludeSundays: true,
    excludeHolidays: true,
    payrollImpact: 'partial_salary', // Selon accord
    documentation: 'Absence exceptionnelle autorisée - conditions selon accord'
  },

  // ACTIVITÉS PROFESSIONNELLES
  'DEL': {
    name: 'Délégation',
    legalBasis: 'Code électoral / CSE',
    deductionMethod: 'hours', // Crédit d\'heures
    excludeSundays: true,
    excludeHolidays: true,
    payrollImpact: 'maintain_salary',
    monthlyLimit: { hours: 20 }, // Crédit d\'heures mensuel
    documentation: 'Délégation syndicale/CSE - crédit d\'heures rémunéré'
  },

  'TEL': {
    name: 'Télétravail',
    legalBasis: 'Art. L1222-9',
    deductionMethod: 'none', // Temps de travail effectif
    excludeSundays: true,
    excludeHolidays: true,
    payrollImpact: 'maintain_salary',
    documentation: 'Télétravail - temps de travail effectif, pas d\'absence'
  },

  'CT': {
    name: 'Congés Trimestriels',
    legalBasis: 'CCN spécifique',
    deductionMethod: 'working_days',
    excludeSundays: true,
    excludeHolidays: true,
    payrollImpact: 'maintain_salary',
    quarterly: true,
    documentation: 'Congés trimestriels selon CCN - jours ouvrables'
  }
};

// Calcule le décompte selon les règles spécifiques de chaque type d'absence
export const calculateAbsenceDeduction = (absenceCode, startDate, endDate, holidays2025, contextData = {}) => {
  const rules = ABSENCE_DEDUCTION_RULES[absenceCode];
  if (!rules) {
    return {
      error: `Règles non définies pour le code d'absence: ${absenceCode}`,
      totalDays: 0,
      deductedAmount: 0
    };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  let currentDate = new Date(start);
  
  let totalDays = 0;
  let deductedAmount = 0;
  let breakdown = {
    workingDays: 0,
    weekends: 0,
    holidays: 0,
    sundays: 0
  };

  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay(); // 0=dimanche, 1=lundi, ..., 6=samedi
    
    totalDays++;
    
    const isHoliday = holidays2025.some(holiday => holiday.date === dateStr);
    const isSunday = dayOfWeek === 0;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Application des règles selon le type d'absence
    switch (rules.deductionMethod) {
      case 'working_days':
        // Jours ouvrables (Lu-Sa)
        if (!isSunday) {
          if (!isHoliday || !rules.excludeHolidays) {
            deductedAmount++;
            breakdown.workingDays++;
          } else {
            breakdown.holidays++;
          }
        } else {
          breakdown.sundays++;
        }
        break;
        
      case 'calendar_days':
        // Tous les jours calendaires
        deductedAmount++;
        if (isSunday) breakdown.sundays++;
        else if (isHoliday) breakdown.holidays++;
        else if (isWeekend) breakdown.weekends++;
        else breakdown.workingDays++;
        break;
        
      case 'hours':
        // Décompte horaire (pas de calcul journalier)
        deductedAmount += contextData.dailyHours || 7; // 7h par défaut
        breakdown.workingDays++;
        break;
        
      case 'none':
        // Pas de décompte (repos légaux, télétravail)
        deductedAmount = 0;
        break;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    absenceCode,
    rules,
    totalDays,
    deductedAmount,
    breakdown,
    payrollImpact: rules.payrollImpact,
    legalBasis: rules.legalBasis,
    documentation: rules.documentation,
    unit: rules.deductionMethod === 'hours' ? 'heures' : 'jours'
  };
};

// Valide les limites légales pour certains types d'absence
export const validateAbsenceLimits = (absenceCode, calculation, employeeData = {}) => {
  const rules = ABSENCE_DEDUCTION_RULES[absenceCode];
  const warnings = [];
  const errors = [];

  // Vérifications spécifiques selon le code
  switch (absenceCode) {
    case 'EMAL':
      const annualEmalDays = employeeData.emalDaysTaken || 0;
      const childrenCount = employeeData.childrenCount || 1;
      const allowedDays = childrenCount * 3; // 3 jours par enfant
      
      if (annualEmalDays + calculation.deductedAmount > allowedDays) {
        errors.push(`Dépassement limite enfant malade: ${allowedDays}j autorisés pour ${childrenCount} enfant(s)`);
      }
      break;
      
    case 'DEL':
      const monthlyDelHours = employeeData.delHoursUsed || 0;
      const totalHours = monthlyDelHours + calculation.deductedAmount;
      
      if (totalHours > 20) {
        errors.push('Dépassement crédit d\'heures délégation: 20h/mois maximum');
      }
      break;
      
    case 'FAM':
      if (!employeeData.familyEventType) {
        warnings.push('Type d\'événement familial à préciser pour validation');
      }
      break;
  }

  return { warnings, errors, isValid: errors.length === 0 };
};

// Génère un rapport détaillé pour un type d'absence
export const generateAbsenceReport = (calculation, validation) => {
  let report = `📋 CALCUL D'ABSENCE - ${calculation.rules.name.toUpperCase()}\n\n`;
  
  report += `⚖️ BASE LÉGALE: ${calculation.legalBasis}\n`;
  report += `📅 Période: ${calculation.totalDays} jour(s) calendaire(s)\n`;
  report += `📊 Décompte: ${calculation.deductedAmount} ${calculation.unit}\n`;
  report += `💰 Impact paie: ${getPayrollImpactDescription(calculation.payrollImpact)}\n\n`;
  
  if (calculation.breakdown) {
    report += `🔍 DÉTAIL DU CALCUL:\n`;
    if (calculation.breakdown.workingDays > 0) report += `• Jours ouvrables: ${calculation.breakdown.workingDays}\n`;
    if (calculation.breakdown.weekends > 0) report += `• Weekends: ${calculation.breakdown.weekends}\n`;
    if (calculation.breakdown.holidays > 0) report += `• Jours fériés: ${calculation.breakdown.holidays}\n`;
    if (calculation.breakdown.sundays > 0) report += `• Dimanches: ${calculation.breakdown.sundays}\n`;
  }
  
  report += `\n📚 RÈGLE: ${calculation.documentation}\n`;
  
  if (validation.warnings.length > 0) {
    report += `\n⚠️ AVERTISSEMENTS:\n`;
    validation.warnings.forEach(warning => {
      report += `• ${warning}\n`;
    });
  }
  
  if (validation.errors.length > 0) {
    report += `\n❌ ERREURS:\n`;
    validation.errors.forEach(error => {
      report += `• ${error}\n`;
    });
  }

  return report;
};

const getPayrollImpactDescription = (impact) => {
  const descriptions = {
    'maintain_salary': 'Maintien du salaire',
    'social_security': 'Indemnités Sécurité Sociale',
    'social_security_complement': 'IJSS + complément employeur',
    'full_salary': 'Maintien intégral du salaire',
    'partial_salary': 'Rémunération partielle selon CCN',
    'no_salary': 'Aucune rémunération',
    'deduct_salary': 'Retenue sur salaire',
    'none': 'Pas d\'impact (temps de travail effectif)'
  };
  
  return descriptions[impact] || impact;
};

export default {
  ABSENCE_DEDUCTION_RULES,
  calculateAbsenceDeduction,
  validateAbsenceLimits,
  generateAbsenceReport
};