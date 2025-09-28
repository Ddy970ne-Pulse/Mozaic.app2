// Calculateur de congés payés selon le droit français du travail
// Conforme au Code du travail français (Articles L3141-1 et suivants)

export const LEAVE_CALCULATION_RULES = {
  // Les congés se décomptent en jours ouvrables (L3141-3)
  WORKING_DAYS: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
  
  // Jours non décomptés du solde de congés
  NON_DEDUCTED_DAYS: ['sunday'],  // Dimanches jamais décomptés
  
  // Types de jours pendant les congés
  DEDUCTION_RULES: {
    WORKING_DAY: 'deduct',        // Jour ouvrable : décompte
    SATURDAY: 'deduct',           // Samedi : décompte (jour ouvrable)
    SUNDAY: 'no_deduct',          // Dimanche : pas de décompte
    HOLIDAY: 'no_deduct',         // Jour férié : pas de décompte
    SICK_LEAVE: 'restore'         // Arrêt maladie : restitue le jour de congé
  }
};

// Calcule le nombre de jours de congés décomptés pour une période donnée
export const calculateLeaveDeduction = (startDate, endDate, holidays2025, sickLeaveDays = []) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let currentDate = new Date(start);
  
  let totalRequested = 0;      // Jours de congés demandés initialement
  let actuallyDeducted = 0;    // Jours réellement décomptés du solde
  let nonDeductedDays = [];    // Détail des jours non décomptés
  let restoredDays = [];       // Jours restitués (arrêt maladie)
  
  while (currentDate <= end) {
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
      continue;
    }
    
    // Vérifier si c'est un jour férié
    const isHoliday = holidays2025.some(holiday => holiday.date === dateStr);
    if (isHoliday) {
      const holiday = holidays2025.find(h => h.date === dateStr);
      nonDeductedDays.push({
        date: dateStr,
        reason: `Jour férié: ${holiday.name}`,
        type: 'HOLIDAY'
      });
      continue;
    }
    
    // Vérifier si c'est un dimanche
    if (dayOfWeek === 0) {
      nonDeductedDays.push({
        date: dateStr,
        reason: 'Dimanche (jour non ouvrable)',
        type: 'SUNDAY'
      });
      continue;
    }
    
    // Jours ouvrables (lundi au samedi) : décompte normal
    if (dayOfWeek >= 1 && dayOfWeek <= 6) {
      actuallyDeducted++;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
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
    }
  };
};

// Valide si une période de congés est correctement calculée
export const validateLeaveCalculation = (leaveData) => {
  const errors = [];
  const warnings = [];
  
  // Vérification : congés posés le weekend
  if (leaveData.breakdown.sundays > 0) {
    warnings.push(`${leaveData.breakdown.sundays} dimanche(s) inclus(s) - non décomptés du solde`);
  }
  
  // Vérification : congés incluant des jours fériés
  if (leaveData.breakdown.holidays > 0) {
    warnings.push(`${leaveData.breakdown.holidays} jour(s) férié(s) inclus(s) - non décomptés du solde`);
  }
  
  // Vérification : arrêts maladie pendant congés
  if (leaveData.breakdown.sickLeaveDays > 0) {
    warnings.push(`${leaveData.breakdown.sickLeaveDays} jour(s) d'arrêt maladie - jours restitués au salarié`);
  }
  
  // Économies réalisées
  if (leaveData.savings > 0) {
    warnings.push(`Économie: ${leaveData.savings} jour(s) non décomptés du solde de congés`);
  }
  
  return { errors, warnings, isValid: errors.length === 0 };
};

// Génère un rapport détaillé de calcul de congés
export const generateLeaveReport = (employeeName, startDate, endDate, calculation, validation) => {
  const start = new Date(startDate).toLocaleDateString('fr-FR');
  const end = new Date(endDate).toLocaleDateString('fr-FR');
  
  let report = `📋 CALCUL CONGÉS PAYÉS - ${employeeName.toUpperCase()}\n\n`;
  report += `📅 Période demandée: ${start} au ${end}\n`;
  report += `📊 Durée totale: ${calculation.totalRequested} jour(s)\n\n`;
  
  report += `💰 DÉCOMPTE DU SOLDE:\n`;
  report += `• Jours réellement décomptés: ${calculation.actuallyDeducted}\n`;
  report += `• Jours ouvrables (Lu-Sa): ${calculation.breakdown.workingDays}\n`;
  
  if (calculation.breakdown.sundays > 0) {
    report += `• Dimanches non décomptés: ${calculation.breakdown.sundays}\n`;
  }
  
  if (calculation.breakdown.holidays > 0) {
    report += `• Jours fériés non décomptés: ${calculation.breakdown.holidays}\n`;
  }
  
  if (calculation.breakdown.sickLeaveDays > 0) {
    report += `• Jours restitués (arrêt maladie): ${calculation.breakdown.sickLeaveDays}\n`;
  }
  
  if (calculation.savings > 0) {
    report += `\n✅ ÉCONOMIE RÉALISÉE: ${calculation.savings} jour(s) préservés\n`;
  }
  
  // Détail des jours non décomptés
  if (calculation.nonDeductedDays.length > 0) {
    report += `\n📝 DÉTAIL DES JOURS NON DÉCOMPTÉS:\n`;
    calculation.nonDeductedDays.forEach(day => {
      const date = new Date(day.date).toLocaleDateString('fr-FR');
      report += `• ${date}: ${day.reason}\n`;
    });
  }
  
  // Jours restitués pour arrêt maladie
  if (calculation.restoredDays.length > 0) {
    report += `\n🏥 JOURS RESTITUÉS (ARRÊT MALADIE):\n`;
    calculation.restoredDays.forEach(day => {
      const date = new Date(day.date).toLocaleDateString('fr-FR');
      report += `• ${date}: ${day.reason}\n`;
    });
    report += `\n⚖️ RÈGLE LÉGALE: Les jours d'arrêt maladie pendant les congés sont restitués au salarié (Art. L3141-5)\n`;
  }
  
  // Avertissements
  if (validation.warnings.length > 0) {
    report += `\n⚠️ INFORMATIONS:\n`;
    validation.warnings.forEach(warning => {
      report += `• ${warning}\n`;
    });
  }
  
  report += `\n📚 BASE LÉGALE: Code du travail Art. L3141-3 (décompte en jours ouvrables)\n`;
  
  return report;
};

// Utilitaires pour l'interface utilisateur
export const LeaveCalculatorUtils = {
  // Formate l'affichage d'une période de congés
  formatLeavePeriod: (calculation) => {
    if (calculation.actuallyDeducted !== calculation.totalRequested) {
      return `${calculation.totalRequested}j demandés → ${calculation.actuallyDeducted}j décomptés`;
    }
    return `${calculation.actuallyDeducted}j décomptés`;
  },
  
  // Génère une classe CSS selon l'économie réalisée
  getLeaveDisplayClass: (calculation) => {
    if (calculation.savings > 0) {
      return 'text-green-600 font-semibold'; // Économie réalisée
    }
    return 'text-blue-600'; // Décompte normal
  },
  
  // Génère un tooltip explicatif
  getLeaveTooltip: (calculation) => {
    let tooltip = `${calculation.totalRequested} jour(s) demandés\n`;
    tooltip += `${calculation.actuallyDeducted} jour(s) décomptés du solde\n`;
    
    if (calculation.savings > 0) {
      tooltip += `${calculation.savings} jour(s) préservés (WE/fériés/arrêt)`;
    }
    
    return tooltip;
  }
};

export default {
  LEAVE_CALCULATION_RULES,
  calculateLeaveDeduction,
  validateLeaveCalculation,
  generateLeaveReport,
  LeaveCalculatorUtils
};