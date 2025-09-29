// Version sécurisée des règles d'absence avec protection contre les boucles infinies

export const ABSENCE_DEDUCTION_RULES = {
  // Absences avec arrêt de travail - Jours ouvrables
  'AT': {
    name: 'Arrêt de Travail',
    deductionMethod: 'working_days',
    excludeSundays: true,
    excludeHolidays: true,
    payrollImpact: 'deducted',
    legalBasis: 'Art. L1226-1',
    maxDaysPerPeriod: 365
  },
  'AM': {
    name: 'Arrêt Maladie',
    deductionMethod: 'working_days',
    excludeSundays: true,
    excludeHolidays: true,
    payrollImpact: 'partial_coverage',
    legalBasis: 'Art. L313-1',
    maxDaysPerPeriod: 365
  },

  // Congés et repos - Différentes méthodes
  'CA': {
    name: 'Congés Annuels',
    deductionMethod: 'working_days',
    excludeSundays: true,
    excludeHolidays: true,
    payrollImpact: 'paid',
    legalBasis: 'Art. L3141-3',
    maxDaysPerPeriod: 50
  },
  'RTT': {
    name: 'Réduction Temps Travail',
    deductionMethod: 'calendar_days',
    excludeSundays: false,
    excludeHolidays: false,
    payrollImpact: 'paid',
    legalBasis: 'Art. L3121-44',
    maxDaysPerPeriod: 30
  },
  'REC': {
    name: 'Récupération',
    deductionMethod: 'hours',
    excludeSundays: true,
    excludeHolidays: true,
    payrollImpact: 'neutral',
    legalBasis: 'Art. L3121-28',
    maxDaysPerPeriod: 10
  },

  // Congés spéciaux - Jours calendaires
  'MAT': {
    name: 'Congé Maternité',
    deductionMethod: 'calendar_days',
    excludeSundays: false,
    excludeHolidays: false,
    payrollImpact: 'social_coverage',
    legalBasis: 'Art. L1225-17',
    maxDaysPerPeriod: 120
  },
  'PAT': {
    name: 'Congé Paternité',
    deductionMethod: 'calendar_days',
    excludeSundays: false,
    excludeHolidays: false,
    payrollImpact: 'social_coverage',
    legalBasis: 'Art. L1225-35',
    maxDaysPerPeriod: 30
  },
  'FAM': {
    name: 'Congé Familial',
    deductionMethod: 'working_days',
    excludeSundays: true,
    excludeHolidays: true,
    payrollImpact: 'deducted',
    legalBasis: 'Art. L3142-1',
    maxDaysPerPeriod: 10
  }
};

// Fonction sécurisée de calcul de déduction d'absence
export const calculateAbsenceDeduction = (absenceCode, startDate, endDate, holidays2025 = [], contextData = {}) => {
  try {
    const rules = ABSENCE_DEDUCTION_RULES[absenceCode];
    if (!rules) {
      console.warn(`Règles non définies pour le code d'absence: ${absenceCode}`);
      return createEmptyDeductionResult(`Code ${absenceCode} non reconnu`);
    }

    // Validation des dates
    if (!startDate || !endDate) {
      return createEmptyDeductionResult('Dates manquantes');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return createEmptyDeductionResult('Dates invalides');
    }

    if (start > end) {
      return createEmptyDeductionResult('Ordre des dates incorrect');
    }

    // Protection contre les périodes trop longues
    const daysDifference = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDifference > rules.maxDaysPerPeriod) {
      return createEmptyDeductionResult(`Période trop longue (max ${rules.maxDaysPerPeriod} jours)`);
    }

    // Calcul sécurisé
    let currentDate = new Date(start);
    let totalDays = 0;
    let deductedAmount = 0;
    let breakdown = {
      workingDays: 0,
      weekends: 0,
      holidays: 0,
      sundays: 0
    };
    
    let iterationCount = 0;
    const maxIterations = rules.maxDaysPerPeriod + 10;

    while (currentDate <= end && iterationCount < maxIterations) {
      iterationCount++;
      
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      
      totalDays++;
      
      // Classification du jour
      const isWeekend = dayOfWeek === 6; // Samedi
      const isSunday = dayOfWeek === 0;
      const isHoliday = holidays2025.includes(dateStr);
      const isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 5; // Lundi à vendredi
      
      // Mise à jour du breakdown
      if (isSunday) breakdown.sundays++;
      else if (isWeekend) breakdown.weekends++;
      else if (isHoliday) breakdown.holidays++;
      else if (isWorkingDay) breakdown.workingDays++;
      
      // Calcul de la déduction selon la méthode
      switch (rules.deductionMethod) {
        case 'working_days':
          if (isWorkingDay && !isHoliday) {
            deductedAmount++;
          }
          break;
          
        case 'calendar_days':
          deductedAmount++;
          break;
          
        case 'hours':
          if (isWorkingDay && !isHoliday) {
            deductedAmount += contextData.dailyHours || 8; // 8h par défaut
          }
          break;
          
        case 'none':
          // Pas de déduction
          break;
          
        default:
          console.warn(`Méthode de déduction inconnue: ${rules.deductionMethod}`);
      }
      
      // Incrémentation sécurisée
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      if (nextDate.getTime() <= currentDate.getTime()) {
        console.error('Erreur d\'incrémentation de date');
        break;
      }
      
      currentDate = nextDate;
    }

    // Vérification limite d'itérations
    if (iterationCount >= maxIterations) {
      return createEmptyDeductionResult('Calcul interrompu (trop d\'itérations)');
    }

    return {
      absenceCode,
      totalDays,
      deductedAmount,
      unit: rules.deductionMethod === 'hours' ? 'heures' : 'jours',
      breakdown,
      payrollImpact: rules.payrollImpact,
      legalBasis: rules.legalBasis,
      calculationDate: new Date().toISOString(),
      isValid: true,
      warnings: []
    };

  } catch (error) {
    console.error('Erreur calcul absence:', error);
    return createEmptyDeductionResult(`Erreur: ${error.message}`);
  }
};

// Fonction utilitaire pour créer un résultat vide
const createEmptyDeductionResult = (reason) => {
  return {
    absenceCode: 'UNKNOWN',
    totalDays: 0,
    deductedAmount: 0,
    unit: 'jours',
    breakdown: { workingDays: 0, weekends: 0, holidays: 0, sundays: 0 },
    payrollImpact: 'unknown',
    legalBasis: 'Non applicable',
    calculationDate: new Date().toISOString(),
    isValid: false,
    warnings: [reason]
  };
};

// Validation sécurisée des limites d'absence
export const validateAbsenceLimits = (absenceCode, calculation, employeeData = {}) => {
  const errors = [];
  const warnings = [];

  try {
    if (!calculation || !calculation.isValid) {
      errors.push('Calcul d\'absence invalide');
      return { isValid: false, errors, warnings };
    }

    const rules = ABSENCE_DEDUCTION_RULES[absenceCode];
    if (!rules) {
      errors.push(`Règles non trouvées pour ${absenceCode}`);
      return { isValid: false, errors, warnings };
    }

    // Validation des seuils
    if (calculation.totalDays > rules.maxDaysPerPeriod) {
      warnings.push(`Période longue: ${calculation.totalDays} jours (max recommandé: ${rules.maxDaysPerPeriod})`);
    }

    // Validation spécifique par type
    switch (absenceCode) {
      case 'CA':
        if (calculation.deductedAmount > 45) { // 9 semaines max en général
          warnings.push('Période de congés annuels exceptionnellement longue');
        }
        break;
        
      case 'AT':
      case 'AM':
        if (calculation.deductedAmount > 90) { // 3 mois
          warnings.push('Arrêt de travail de longue durée - vérifier les procédures');
        }
        break;
        
      case 'MAT':
        if (calculation.totalDays > 112) { // 16 semaines max
          warnings.push('Congé maternité dépassant la durée légale standard');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    console.error('Erreur validation limites:', error);
    return {
      isValid: false,
      errors: [`Erreur de validation: ${error.message}`],
      warnings
    };
  }
};

// Générateur de rapport d'absence
export const generateAbsenceReport = (calculation, validation) => {
  try {
    if (!calculation || !calculation.isValid) {
      return '❌ Rapport d\'absence - Calcul invalide';
    }

    let report = `📋 RAPPORT D'ABSENCE - ${calculation.absenceCode}\n`;
    report += `📅 Calculé le: ${new Date(calculation.calculationDate).toLocaleString('fr-FR')}\n\n`;

    report += `📊 RÉSUMÉ:\n`;
    report += `• Code: ${calculation.absenceCode}\n`;
    report += `• Durée totale: ${calculation.totalDays} jour(s)\n`;
    report += `• Décompte: ${calculation.deductedAmount} ${calculation.unit}\n`;
    report += `• Impact paie: ${getPayrollImpactDescription(calculation.payrollImpact)}\n\n`;

    if (calculation.breakdown) {
      report += `🔍 DÉTAIL:\n`;
      report += `• Jours ouvrés: ${calculation.breakdown.workingDays}\n`;
      report += `• Week-ends: ${calculation.breakdown.weekends}\n`;
      report += `• Dimanches: ${calculation.breakdown.sundays}\n`;
      report += `• Jours fériés: ${calculation.breakdown.holidays}\n\n`;
    }

    report += `⚖️ Base légale: ${calculation.legalBasis}`;

    if (validation && validation.warnings.length > 0) {
      report += `\n\n⚠️ INFORMATIONS:\n`;
      validation.warnings.forEach(warning => {
        report += `• ${warning}\n`;
      });
    }

    return report;

  } catch (error) {
    console.error('Erreur génération rapport absence:', error);
    return `❌ Erreur génération rapport: ${error.message}`;
  }
};

// Fonction utilitaire pour décrire l'impact sur la paie
const getPayrollImpactDescription = (impact) => {
  const descriptions = {
    'paid': 'Maintien du salaire',
    'deducted': 'Déduction du salaire',
    'partial_coverage': 'Prise en charge partielle',
    'social_coverage': 'Prise en charge Sécurité Sociale',
    'neutral': 'Neutre (récupération)',
    'unknown': 'Impact non défini'
  };
  
  return descriptions[impact] || impact;
};

export default {
  ABSENCE_DEDUCTION_RULES,
  calculateAbsenceDeduction,
  validateAbsenceLimits,
  generateAbsenceReport
};