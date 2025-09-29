// Version sécurisée du calculateur de congés avec protection contre les boucles infinies

export const LEAVE_CALCULATION_RULES = {
  maxDaysInPeriod: 365, // Protection : maximum 1 an de congés
  excludeSundays: true,
  excludeHolidays: true,
  interruptOnSickness: true,
  legalBasis: 'Art. L3141-3',
  deductionMethod: 'working_days'
};

// Version sécurisée de calculateLeaveDeduction
export const calculateLeaveDeduction = (startDate, endDate, holidays2025 = [], sickLeaveDays = []) => {
  try {
    // Validation des entrées
    if (!startDate || !endDate) {
      console.warn('Dates manquantes pour le calcul de congés');
      return createEmptyResult('Dates non fournies');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Vérification que les dates sont valides
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.warn('Dates invalides:', { startDate, endDate });
      return createEmptyResult('Dates invalides');
    }

    // Vérification de l'ordre des dates
    if (start > end) {
      console.warn('Date de début après date de fin:', { start, end });
      return createEmptyResult('Ordre des dates incorrect');
    }

    // Protection contre les périodes trop longues
    const daysDifference = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDifference > LEAVE_CALCULATION_RULES.maxDaysInPeriod) {
      console.warn('Période de congés trop longue:', daysDifference, 'jours');
      return createEmptyResult(`Période trop longue (${daysDifference} jours)`);
    }

    // Calcul sécurisé avec compteur de protection
    let currentDate = new Date(start);
    let totalRequested = 0;
    let actuallyDeducted = 0;
    let nonDeductedDays = [];
    let restoredDays = [];
    let iterationCount = 0;
    const maxIterations = LEAVE_CALCULATION_RULES.maxDaysInPeriod + 10; // Marge de sécurité

    while (currentDate <= end && iterationCount < maxIterations) {
      iterationCount++;
      
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay(); // 0=dimanche, 1=lundi, ..., 6=samedi
      
      totalRequested++;
      
      // Vérifier si c'est un arrêt maladie pendant les congés
      if (sickLeaveDays.includes(dateStr)) {
        restoredDays.push({
          date: dateStr,
          reason: 'Arrêt maladie pendant congés',
          type: 'SICK_LEAVE'
        });
        // L'arrêt maladie interrompt les congés, le jour est restitué
      }
      // Dimanche : non décompté du solde
      else if (dayOfWeek === 0) {
        nonDeductedDays.push({
          date: dateStr,
          reason: 'Dimanche non décompté',
          type: 'SUNDAY'
        });
      }
      // Jour férié : non décompté du solde
      else if (holidays2025.includes(dateStr)) {
        nonDeductedDays.push({
          date: dateStr,
          reason: 'Jour férié non décompté',
          type: 'HOLIDAY'
        });
      }
      // Jours ouvrables (lundi au samedi) : décompte normal
      else if (dayOfWeek >= 1 && dayOfWeek <= 6) {
        actuallyDeducted++;
      }
      
      // Incrément sécurisé de la date
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      // Vérification que la date progresse bien
      if (nextDate.getTime() <= currentDate.getTime()) {
        console.error('Erreur d\'incrémentation de date:', currentDate, nextDate);
        break;
      }
      
      currentDate = nextDate;
    }

    // Vérification si on a atteint la limite d'itérations
    if (iterationCount >= maxIterations) {
      console.warn('Limite d\'itérations atteinte, calcul interrompu');
      return createEmptyResult('Calcul interrompu (trop d\'itérations)');
    }

    return {
      totalRequested,
      actuallyDeducted,
      nonDeductedDays,
      restoredDays,
      savings: totalRequested - actuallyDeducted,
      breakdown: {
        workingDays: actuallyDeducted,
        sundays: nonDeductedDays.filter(d => d.type === 'SUNDAY').length,
        holidays: nonDeductedDays.filter(d => d.type === 'HOLIDAY').length,
        sickLeaveDays: restoredDays.length
      },
      legalBasis: LEAVE_CALCULATION_RULES.legalBasis,
      calculationDate: new Date().toISOString(),
      isValid: true,
      warnings: []
    };

  } catch (error) {
    console.error('Erreur lors du calcul de congés:', error);
    return createEmptyResult(`Erreur: ${error.message}`);
  }
};

// Fonction utilitaire pour créer un résultat vide en cas d'erreur
const createEmptyResult = (reason) => {
  return {
    totalRequested: 0,
    actuallyDeducted: 0,
    nonDeductedDays: [],
    restoredDays: [],
    savings: 0,
    breakdown: { workingDays: 0, sundays: 0, holidays: 0, sickLeaveDays: 0 },
    legalBasis: 'Calcul non effectué',
    calculationDate: new Date().toISOString(),
    isValid: false,
    warnings: [reason]
  };
};

// Version sécurisée de validateLeaveCalculation
export const validateLeaveCalculation = (leaveData) => {
  const errors = [];
  const warnings = [];

  try {
    if (!leaveData || typeof leaveData !== 'object') {
      errors.push('Données de congés invalides');
      return { isValid: false, errors, warnings };
    }

    // Validation des champs requis
    const requiredFields = ['totalRequested', 'actuallyDeducted'];
    requiredFields.forEach(field => {
      if (typeof leaveData[field] !== 'number') {
        errors.push(`Champ ${field} manquant ou invalide`);
      }
    });

    // Validations logiques
    if (leaveData.totalRequested < 0) {
      errors.push('Le nombre de jours demandés ne peut pas être négatif');
    }

    if (leaveData.actuallyDeducted < 0) {
      errors.push('Le nombre de jours décomptés ne peut pas être négatif');
    }

    if (leaveData.actuallyDeducted > leaveData.totalRequested) {
      warnings.push('Plus de jours décomptés que demandés (cas particulier)');
    }

    // Validation des économies
    const expectedSavings = leaveData.totalRequested - leaveData.actuallyDeducted;
    if (leaveData.savings !== expectedSavings) {
      warnings.push('Incohérence dans le calcul des économies');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    console.error('Erreur lors de la validation:', error);
    return {
      isValid: false,
      errors: [`Erreur de validation: ${error.message}`],
      warnings
    };
  }
};

// Générateur de rapport sécurisé
export const generateLeaveReport = (employeeName, startDate, endDate, calculation, validation) => {
  try {
    if (!calculation || !calculation.isValid) {
      return `❌ RAPPORT DE CONGÉS - ${employeeName}\nCalcul invalide ou échoué.`;
    }

    let report = `📋 RAPPORT DE CONGÉS - ${employeeName}\n`;
    report += `📅 Période: ${startDate} → ${endDate}\n`;
    report += `⏰ Généré le: ${new Date().toLocaleString('fr-FR')}\n\n`;

    report += `📊 RÉSUMÉ:\n`;
    report += `• Jours demandés: ${calculation.totalRequested}\n`;
    report += `• Jours décomptés: ${calculation.actuallyDeducted}\n`;
    report += `• Économie réalisée: ${calculation.savings} jour(s)\n\n`;

    if (calculation.breakdown) {
      report += `🔍 DÉTAIL:\n`;
      report += `• Jours ouvrables: ${calculation.breakdown.workingDays}\n`;
      report += `• Dimanches: ${calculation.breakdown.sundays}\n`;
      report += `• Jours fériés: ${calculation.breakdown.holidays}\n`;
      if (calculation.breakdown.sickLeaveDays > 0) {
        report += `• Arrêts maladie: ${calculation.breakdown.sickLeaveDays}\n`;
      }
    }

    report += `\n⚖️ Base légale: ${calculation.legalBasis}`;

    if (validation && validation.warnings.length > 0) {
      report += `\n\n⚠️ INFORMATIONS:\n`;
      validation.warnings.forEach(warning => {
        report += `• ${warning}\n`;
      });
    }

    return report;

  } catch (error) {
    console.error('Erreur génération rapport:', error);
    return `❌ Erreur lors de la génération du rapport: ${error.message}`;
  }
};

// Utilitaires
export const LeaveCalculatorUtils = {
  isWorkingDay: (date) => {
    const dayOfWeek = new Date(date).getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 6; // Lundi à samedi
  },
  
  isWeekend: (date) => {
    const dayOfWeek = new Date(date).getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Dimanche ou samedi
  },
  
  formatDate: (date) => {
    try {
      return new Date(date).toLocaleDateString('fr-FR');
    } catch {
      return 'Date invalide';
    }
  },

  validateDateRange: (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { isValid: false, error: 'Dates invalides' };
    }
    
    if (start > end) {
      return { isValid: false, error: 'Date de début après date de fin' };
    }
    
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDiff > LEAVE_CALCULATION_RULES.maxDaysInPeriod) {
      return { isValid: false, error: 'Période trop longue' };
    }
    
    return { isValid: true, daysDifference: daysDiff };
  }
};

export default {
  LEAVE_CALCULATION_RULES,
  calculateLeaveDeduction,
  validateLeaveCalculation,
  generateLeaveReport,
  LeaveCalculatorUtils
};