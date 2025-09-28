import React, { useState, useEffect } from 'react';
import { calculateLeaveDeduction, validateLeaveCalculation, generateLeaveReport, LeaveCalculatorUtils } from '../shared/congesCalculator';
import { ABSENCE_DEDUCTION_RULES, calculateAbsenceDeduction, validateAbsenceLimits, generateAbsenceReport } from '../shared/absenceRules';

const MonthlyPlanning = ({ user }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sortBy, setSortBy] = useState('name');
  const [filterDept, setFilterDept] = useState('all');
  const [filterSite, setFilterSite] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterContract, setFilterContract] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [filterWorkTime, setFilterWorkTime] = useState('all');
  const [filterAbsenceType, setFilterAbsenceType] = useState('all');
  const [filterAbsenceReason, setFilterAbsenceReason] = useState('all');
  const [showLegendDetails, setShowLegendDetails] = useState(false);
  const [legendView, setLegendView] = useState('compact'); // 'compact' or 'detailed'
  const [showPrintOptions, setShowPrintOptions] = useState(false);

  const employees = [
    { 
      id: 1, name: 'Sophie Martin', department: 'Direction', site: 'Siège', category: 'Cadre Supérieur', 
      contract: 'CDI - Cadre', gender: 'Femme', workTime: 'Temps Plein', job: 'Directrice RH',
      absences: { '3': 'CA', '4': 'CA', '17': 'REC', '24': 'AM' } 
    },
    { 
      id: 2, name: 'Jean Dupont', department: 'Administratif', site: 'Siège', category: 'Cadre', 
      contract: 'CDI - Cadre', gender: 'Homme', workTime: 'Temps Plein', job: 'Responsable IT',
      absences: { '10': 'CA', '11': 'CA', '12': 'CA', '25': 'DEL' } 
    },
    { 
      id: 3, name: 'Marie Leblanc', department: 'Commercial', site: 'Pôle Éducatif', category: 'Employé Qualifié', 
      contract: 'CDI - Non Cadre', gender: 'Femme', workTime: 'Temps Plein', job: 'Commerciale',
      absences: { '8': 'REC', '22': 'CA', '23': 'CA', '14': 'RMED' } 
    },
    { 
      id: 4, name: 'Pierre Martin', department: 'Comptable', site: 'Siège', category: 'Technicien', 
      contract: 'CDI - Non Cadre', gender: 'Homme', workTime: 'Temps Partiel', job: 'Comptable',
      absences: { '5': 'AM', '15': 'CA', '16': 'CA', '29': 'REC' } 
    },
    { 
      id: 5, name: 'Claire Dubois', department: 'Éducatif', site: 'Pôle Éducatif', category: 'Employé Qualifié', 
      contract: 'CDD - Non Cadre', gender: 'Femme', workTime: 'Temps Plein', job: 'Éducatrice',
      absences: { '7': 'CA', '20': 'AM', '21': 'AM', '13': 'TEL' } 
    },
    { 
      id: 6, name: 'Lucas Bernard', department: 'Production', site: 'Menuiserie 44', category: 'Ouvrier qualifié', 
      contract: 'CDI - Non Cadre', gender: 'Homme', workTime: 'Temps Plein', job: 'Menuisier',
      absences: { '12': 'REC', '26': 'CA', '27': 'CA', '30': 'AT' } 
    },
    { 
      id: 7, name: 'Emma Rousseau', department: 'ASI', site: 'Alpinia 44', category: 'Agent administratif', 
      contract: 'CDI - Non Cadre', gender: 'Femme', workTime: 'Temps Partiel', job: 'Agent ASI',
      absences: { '2': 'CA', '18': 'REC', '31': 'AM', '6': 'FO' } 
    },
    { 
      id: 8, name: 'Thomas Leroy', department: 'Production', site: 'Garage 44', category: 'Ouvrier qualifié', 
      contract: 'CDI - Non Cadre', gender: 'Homme', workTime: 'Temps Plein', job: 'Mécanicien',
      absences: { '9': 'CA', '19': 'CA', '28': 'REC', '4': 'CT' } 
    },
    { 
      id: 9, name: 'Isabelle Moreau', department: 'Éducatif', site: 'Pôle Éducatif', category: 'Employé Qualifié', 
      contract: 'CDI - Non Cadre', gender: 'Femme', workTime: 'Temps Plein', job: 'Éducatrice',
      absences: { '1': 'MAT', '2': 'MAT', '3': 'MAT', '4': 'MAT', '5': 'MAT' } 
    },
    { 
      id: 10, name: 'Marc Dubois', department: 'Production', site: 'Menuiserie 44', category: 'Ouvrier qualifié', 
      contract: 'CDD - Non Cadre', gender: 'Homme', workTime: 'Temps Plein', job: 'Apprenti Menuisier',
      absences: { '11': 'STG', '12': 'STG', '13': 'STG', '26': 'EMAL' } 
    }
  ];

  // Listes de filtres basées sur l'image fournie
  const departmentsList = ['Direction', 'Éducatif', 'Administratif', 'Comptable', 'ASI', 'Production', 'Commercial', 'Technique', 'Maintenance', 'Qualité'];
  const sites = ['Siège', 'Pôle Éducatif', 'Menuiserie 44', 'Voiles 44', 'Garage 44', 'Alpinia 44', 'Ferme 44', 'Restaurant 44'];
  const categories = ['Cadre Supérieur', 'Cadre', 'Employé Qualifié', 'Technicien', 'Ouvrier qualifié', 'Ouvrier non qualifié', 'Agent administratif', 'Personnel ASI'];
  const contracts = ['CDI - Non Cadre', 'CDD - Non Cadre', 'CDI - Cadre', 'CDD - Cadre', 'Stagiaire', 'Apprenti(e)'];
  const jobs = ['Directrice RH', 'Responsable IT', 'Commerciale', 'Comptable', 'Éducatrice', 'Menuisier', 'Agent ASI', 'Mécanicien', 'Chef de Service'];
  const absenceCategories = ['Absence Programmée', 'Absentéisme'];
  const absenceReasons = [
    'Accident du travail / Trajet', 'Arrêt maladie', 'Absence non autorisée', 'Absence autorisée',
    'Évènement familiale', 'Congé maternité', 'Congé paternité', 'Congés annuels', 'Congé formation',
    'Congés Sans Solde', 'Congés Trimestriels', 'Récupération', 'Repos Hebdomadaire', 'Repos Dominical',
    'Télétravail', 'Délégation', 'Stage', 'Congé exceptionnel', 'Maladie Professionnelle', 
    'Enfants malades', 'Rendez-vous médical'
  ];

  // Comprehensive absence legend with CORRECTED legal deduction rules
  const absenceColorMap = {
    // ACCIDENTS ET MALADIES - Jours calendaires selon Sécurité Sociale
    'AT': { name: 'Accident du travail / Trajet', color: 'bg-red-600', textColor: 'text-white', type: 'Accident/Maladie', decompte: 'Jours Calendaires', legalBasis: 'Art. L411-1 SS' },
    'AM': { name: 'Arrêt maladie', color: 'bg-red-500', textColor: 'text-white', type: 'Accident/Maladie', decompte: 'Jours Calendaires', legalBasis: 'Art. L1226-1' },
    'MPRO': { name: 'Maladie Professionnelle', color: 'bg-red-700', textColor: 'text-white', type: 'Accident/Maladie', decompte: 'Jours Calendaires', legalBasis: 'Art. L461-1 SS' },
    'EMAL': { name: 'Enfants malades', color: 'bg-red-400', textColor: 'text-white', type: 'Congés Familiaux', decompte: 'Jours Ouvrables', legalBasis: 'Art. L1225-61' },
    
    // CONGÉS LÉGAUX - Jours ouvrables (Lu-Sa)
    'CA': { name: 'Congés annuels', color: 'bg-blue-500', textColor: 'text-white', type: 'Congés Payés', decompte: 'Jours Ouvrables', legalBasis: 'Art. L3141-3' },
    'RTT': { name: 'RTT', color: 'bg-green-500', textColor: 'text-white', type: 'Congés Payés', decompte: 'Jours Ouvrables', legalBasis: 'Acc. 35h' },
    'CT': { name: 'Congés Trimestriels', color: 'bg-orange-500', textColor: 'text-white', type: 'Congés Payés', decompte: 'Jours Ouvrables', legalBasis: 'CCN' },
    
    // CONGÉS FAMILIAUX - Règles spécifiques
    'MAT': { name: 'Congé maternité', color: 'bg-pink-400', textColor: 'text-white', type: 'Congés Familiaux', decompte: 'Jours Calendaires', legalBasis: 'Art. L1225-17' },
    'PAT': { name: 'Congé paternité', color: 'bg-blue-400', textColor: 'text-white', type: 'Congés Familiaux', decompte: 'Jours Calendaires', legalBasis: 'Art. L1225-35' },
    'FAM': { name: 'Évènement familiale', color: 'bg-pink-500', textColor: 'text-white', type: 'Congés Familiaux', decompte: 'Jours Ouvrables', legalBasis: 'Art. L3142-1' },
    
    // TEMPS DE TRAVAIL - Heures ou pas de décompte
    'REC': { name: 'Récupération', color: 'bg-green-400', textColor: 'text-white', type: 'Temps de Travail', decompte: 'Heures', legalBasis: 'Art. L3121-16' },
    'RH': { name: 'Repos Hebdomadaire', color: 'bg-green-500', textColor: 'text-white', type: 'Temps de Travail', decompte: 'Non décompté', legalBasis: 'Art. L3132-1' },
    'RHD': { name: 'Repos Dominical', color: 'bg-green-600', textColor: 'text-white', type: 'Temps de Travail', decompte: 'Non décompté', legalBasis: 'Art. L3132-3' },
    'TEL': { name: 'Télétravail', color: 'bg-cyan-500', textColor: 'text-white', type: 'Temps de Travail', decompte: 'Non décompté', legalBasis: 'Art. L1222-9' },
    
    // ACTIVITÉS PROFESSIONNELLES - Heures
    'DEL': { name: 'Délégation', color: 'bg-purple-500', textColor: 'text-white', type: 'Activité Pro', decompte: 'Heures', legalBasis: 'Code électoral' },
    'FO': { name: 'Congé formation', color: 'bg-indigo-500', textColor: 'text-white', type: 'Formation', decompte: 'Jours Ouvrables', legalBasis: 'Art. L6313-1' },
    'STG': { name: 'Stage', color: 'bg-yellow-500', textColor: 'text-black', type: 'Formation', decompte: 'Jours Calendaires', legalBasis: 'Art. L124-1' },
    'RMED': { name: 'Rendez-vous médical', color: 'bg-teal-500', textColor: 'text-white', type: 'Temps de Travail', decompte: 'Heures', legalBasis: 'Art. R4624-10' },
    
    // ABSENCES EXCEPTIONNELLES - Jours ouvrables
    'CEX': { name: 'Congé exceptionnel', color: 'bg-amber-500', textColor: 'text-white', type: 'Congé Spécial', decompte: 'Jours Ouvrables', legalBasis: 'Accord entreprise' },
    'AUT': { name: 'Absence autorisée', color: 'bg-gray-400', textColor: 'text-white', type: 'Congé Spécial', decompte: 'Jours Ouvrables', legalBasis: 'Accord employeur' },
    'CSS': { name: 'Congés Sans Solde', color: 'bg-gray-700', textColor: 'text-white', type: 'Congé Spécial', decompte: 'Jours Calendaires', legalBasis: 'Accord employeur' },
    
    // ABSENCES DISCIPLINAIRES - Jours ouvrables
    'NAUT': { name: 'Absence non autorisée', color: 'bg-gray-600', textColor: 'text-white', type: 'Disciplinaire', decompte: 'Jours Ouvrables', legalBasis: 'Discipline' },
    
    // Deprecated codes (keeping for backward compatibility)
    'CP': { name: 'Congés Payés', color: 'bg-blue-500', textColor: 'text-white', type: 'Congés Payés', decompte: 'Jours Ouvrables' },
    'HS': { name: 'Heures Sup', color: 'bg-purple-600', textColor: 'text-white', type: 'Présence', decompte: 'Heures' },
    'FM': { name: 'Formation', color: 'bg-indigo-600', textColor: 'text-white', type: 'Formation', decompte: 'Jours Ouvrables' }
  };

  // Jours fériés 2025 - Liste officielle
  const holidays2025 = [
    { date: '2025-01-01', name: 'Nouvel An' },
    { date: '2025-03-03', name: 'Lundi gras' },
    { date: '2025-03-04', name: 'Mardi gras' },
    { date: '2025-03-05', name: 'Mercredi des cendres' },
    { date: '2025-03-27', name: 'Mi-carême' },
    { date: '2025-04-18', name: 'Vendredi Saint' },
    { date: '2025-04-21', name: 'Lundi de Pâques' },
    { date: '2025-05-01', name: 'Fête du Travail' },
    { date: '2025-05-08', name: 'Victoire 1945' },
    { date: '2025-05-09', name: 'Lundi de Pentecôte' },
    { date: '2025-05-27', name: 'Abolition de l\'esclavage' },
    { date: '2025-05-29', name: 'Ascension' },
    { date: '2025-07-14', name: 'Fête nationale' },
    { date: '2025-08-15', name: 'Assomption' },
    { date: '2025-11-01', name: 'Toussaint' },
    { date: '2025-11-02', name: 'Jour saint' },
    { date: '2025-11-11', name: 'Armistice 1918' },
    { date: '2025-12-25', name: 'Noël' }
  ];

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getWeekday = (date, day) => {
    const dayDate = new Date(date.getFullYear(), date.getMonth(), day);
    return dayDate.getDay();
  };

  const isWeekend = (date, day) => {
    const weekday = getWeekday(date, day);
    return weekday === 0 || weekday === 6;
  };

  const isHoliday = (day) => {
    const currentDateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays2025.some(holiday => holiday.date === currentDateStr);
  };

  const getHolidayName = (day) => {
    const currentDateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const holiday = holidays2025.find(holiday => holiday.date === currentDateStr);
    return holiday ? holiday.name : null;
  };

  // Calcule le décompte correct des congés annuels (CA)
  const calculateEmployeeLeaveDeduction = (employee) => {
    const leaveCalculations = {};
    
    // Identifier les périodes de CA consécutives
    const leavePeriods = [];
    const sickLeaveDays = [];
    let currentPeriod = null;
    
    // Collecter les jours d'arrêt maladie
    Object.entries(employee.absences).forEach(([day, code]) => {
      if (code === 'AM') {
        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        sickLeaveDays.push(dateStr);
      }
    });
    
    // Identifier les périodes de congés
    Object.entries(employee.absences)
      .filter(([day, code]) => code === 'CA')
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([day, code]) => {
        const dayNum = parseInt(day);
        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (!currentPeriod || dayNum !== currentPeriod.lastDay + 1) {
          // Nouvelle période de congés
          if (currentPeriod) {
            leavePeriods.push(currentPeriod);
          }
          currentPeriod = {
            startDay: dayNum,
            endDay: dayNum,
            lastDay: dayNum,
            startDate: dateStr,
            endDate: dateStr,
            days: [day]
          };
        } else {
          // Continuer la période existante
          currentPeriod.endDay = dayNum;
          currentPeriod.lastDay = dayNum;
          currentPeriod.endDate = dateStr;
          currentPeriod.days.push(day);
        }
      });
    
    if (currentPeriod) {
      leavePeriods.push(currentPeriod);
    }
    
    // Calculer le décompte pour chaque période
    leavePeriods.forEach((period, index) => {
      const calculation = calculateLeaveDeduction(
        period.startDate, 
        period.endDate, 
        holidays2025, 
        sickLeaveDays
      );
      
      const validation = validateLeaveCalculation(calculation);
      
      leaveCalculations[`period_${index}`] = {
        period,
        calculation,
        validation,
        displayText: LeaveCalculatorUtils.formatLeavePeriod(calculation),
        cssClass: LeaveCalculatorUtils.getLeaveDisplayClass(calculation),
        tooltip: LeaveCalculatorUtils.getLeaveTooltip(calculation)
      };
    });
    
    return leaveCalculations;
  };

  // Calcule le décompte correct pour n'importe quel type d'absence
  const calculateAnyAbsenceDeduction = (employee, day, absenceCode) => {
    const dayNum = parseInt(day);
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Pour les congés annuels, utiliser l'ancien système
    if (absenceCode === 'CA') {
      return getLeaveDisplayInfo(employee, day, absenceCode);
    }
    
    // Pour tous les autres types d'absence
    const absenceRules = ABSENCE_DEDUCTION_RULES[absenceCode];
    if (!absenceRules) return null;
    
    // Calculer le décompte pour ce jour précis
    const calculation = calculateAbsenceDeduction(absenceCode, dateStr, dateStr, holidays2025);
    const validation = validateAbsenceLimits(absenceCode, calculation, employee.employeeData || {});
    
    return {
      absenceCode,
      rules: absenceRules,
      calculation,
      validation,
      dayInfo: {
        isWeekend: isWeekend(currentMonth, dayNum),
        isHoliday: isHoliday(dayNum),
        holidayName: getHolidayName(dayNum)
      },
      displayInfo: {
        willBeDeducted: calculation.deductedAmount > 0,
        deductionType: calculation.unit,
        payrollImpact: calculation.payrollImpact,
        legalBasis: calculation.legalBasis
      }
    };
  };

  // Génère l'affichage enrichi pour une cellule de congé (CA seulement)
  const getLeaveDisplayInfo = (employee, day, absenceCode) => {
    if (absenceCode !== 'CA') return null;
    
    const leaveCalcs = calculateEmployeeLeaveDeduction(employee);
    const dayNum = parseInt(day);
    
    // Trouver la période correspondante
    const relevantPeriod = Object.values(leaveCalcs).find(calc => 
      calc.period.days.includes(day)
    );
    
    if (!relevantPeriod) return null;
    
    // Vérifier si c'est le premier jour de la période (pour affichage du tooltip)
    const isFirstDay = relevantPeriod.period.days[0] === day;
    
    return {
      ...relevantPeriod,
      isFirstDay,
      dayInfo: {
        isWeekend: isWeekend(currentMonth, dayNum),
        isHoliday: isHoliday(dayNum),
        holidayName: getHolidayName(dayNum)
      }
    };
  };

  const isToday = (date, day) => {
    const today = new Date();
    return today.getDate() === day && 
           today.getMonth() === date.getMonth() && 
           today.getFullYear() === date.getFullYear();
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const sortedEmployees = [...employees].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'department') return a.department.localeCompare(b.department);
    if (sortBy === 'absences') {
      const aCount = Object.keys(a.absences).length;
      const bCount = Object.keys(b.absences).length;
      return bCount - aCount;
    }
    return 0;
  });

  const filteredEmployees = sortedEmployees.filter(emp => {
    return (filterDept === 'all' || emp.department === filterDept) &&
           (filterSite === 'all' || emp.site === filterSite) &&
           (filterCategory === 'all' || emp.category === filterCategory) &&
           (filterContract === 'all' || emp.contract === filterContract) &&
           (filterGender === 'all' || emp.gender === filterGender) &&
           (filterWorkTime === 'all' || emp.workTime === filterWorkTime);
  });

  const departments = [...new Set(employees.map(emp => emp.department))];
  const daysInMonth = getDaysInMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getAbsenceCount = (employee) => {
    return Object.keys(employee.absences).length;
  };

  // Calcule le décompte réel des jours de congés (CA seulement)
  const getRealLeaveDeduction = (employee) => {
    const leaveCalculations = calculateEmployeeLeaveDeduction(employee);
    let totalRequested = 0;
    let totalDeducted = 0;
    
    Object.values(leaveCalculations).forEach(calc => {
      totalRequested += calc.calculation.totalRequested;
      totalDeducted += calc.calculation.actuallyDeducted;
    });
    
    return { totalRequested, totalDeducted, savings: totalRequested - totalDeducted };
  };

  // Fonction d'impression
  const handlePrint = (format = 'A4') => {
    const printContent = generatePrintContent(format);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const generatePrintContent = (format) => {
    const orientation = 'landscape'; // Toujours paysage pour le planning
    const pageSize = format === 'A3' ? 'A3' : 'A4';
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Planning Mensuel - ${currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</title>
          <style>
            @page {
              size: ${pageSize} ${orientation};
              margin: 1cm;
            }
            
            body {
              font-family: Arial, sans-serif;
              font-size: ${format === 'A3' ? '10px' : '8px'};
              line-height: 1.2;
              margin: 0;
              padding: 0;
            }
            
            .print-header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            
            .print-title {
              font-size: ${format === 'A3' ? '18px' : '14px'};
              font-weight: bold;
              margin-bottom: 5px;
            }
            
            .print-subtitle {
              font-size: ${format === 'A3' ? '12px' : '10px'};
              color: #666;
            }
            
            .print-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
              page-break-inside: avoid;
            }
            
            .print-table th,
            .print-table td {
              border: 1px solid #ddd;
              padding: ${format === 'A3' ? '4px' : '2px'};
              text-align: center;
            }
            
            .print-table th {
              background-color: #f0f0f0;
              font-weight: bold;
              font-size: ${format === 'A3' ? '9px' : '7px'};
            }
            
            .print-table .employee-cell {
              text-align: left;
              font-weight: bold;
              min-width: ${format === 'A3' ? '120px' : '100px'};
            }
            
            .absence-code {
              font-weight: bold;
              padding: 1px 2px;
              border-radius: 2px;
              font-size: ${format === 'A3' ? '8px' : '6px'};
            }
            
            .print-legend {
              margin-top: 15px;
              page-break-inside: avoid;
            }
            
            .legend-title {
              font-weight: bold;
              margin-bottom: 8px;
              font-size: ${format === 'A3' ? '12px' : '10px'};
            }
            
            .legend-grid {
              display: grid;
              grid-template-columns: repeat(${format === 'A3' ? '6' : '4'}, 1fr);
              gap: 5px;
            }
            
            .legend-item {
              font-size: ${format === 'A3' ? '8px' : '6px'};
              display: flex;
              align-items: center;
              gap: 3px;
            }
            
            .legend-color {
              width: 12px;
              height: 12px;
              border-radius: 2px;
            }
            
            @media print {
              body { -webkit-print-color-adjust: exact; }
              .page-break { page-break-before: always; }
            }
            
            .weekend, .holiday {
              background-color: #f5f5f5 !important;
            }
            
            .today {
              background-color: #e3f2fd !important;
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <div class="print-title">MOZAIK RH - Planning Mensuel</div>
            <div class="print-subtitle">${currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} • ${filteredEmployees.length} employé(s)</div>
          </div>
          
          ${generatePrintTable(format)}
          
          <div class="print-legend">
            <div class="legend-title">Légende des Codes d'Absence</div>
            <div class="legend-grid">
              ${Object.entries(absenceColorMap)
                .filter(([code]) => !['CP', 'RTT', 'HS', 'FM'].includes(code))
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([code, info]) => `
                  <div class="legend-item">
                    <div class="legend-color" style="background-color: ${getColorCode(info.color)};"></div>
                    <span>${code} - ${info.name}</span>
                  </div>
                `).join('')}
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const generatePrintTable = (format) => {
    const itemsPerPage = format === 'A3' ? 20 : 15; // A4 paysage permet plus d'employés
    const pages = [];
    
    for (let i = 0; i < filteredEmployees.length; i += itemsPerPage) {
      const pageEmployees = filteredEmployees.slice(i, i + itemsPerPage);
      
      pages.push(`
        <table class="print-table">
          <thead>
            <tr>
              <th class="employee-cell">Employé / Département</th>
              ${days.map(day => `
                <th class="${isWeekend(currentMonth, day) || isHoliday(day) ? 'weekend' : ''} ${isToday(currentMonth, day) ? 'today' : ''}" style="position: relative;">
                  ${day}
                  ${isHoliday(day) ? `<div style="position: absolute; bottom: 2px; right: 2px; font-size: 9px; color: red; font-weight: bold;">F</div>` : ''}
                </th>
              `).join('')}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${pageEmployees.map(employee => `
              <tr>
                <td class="employee-cell">
                  <strong>${employee.name}</strong><br>
                  <small>${employee.department}</small>
                </td>
                ${days.map(day => {
                  const dayStr = day.toString();
                  const absence = employee.absences[dayStr];
                  const isWknd = isWeekend(currentMonth, day);
                  const isHol = isHoliday(day);
                  const holidayName = getHolidayName(day);
                  
                  return `
                    <td class="${isWknd || isHol ? 'weekend' : ''} ${isToday(currentMonth, day) ? 'today' : ''}" style="position: relative;">
                      ${absence ? `<span class="absence-code" style="background-color: ${getColorCode(absenceColorMap[absence]?.color)}; color: ${getTextColor(absenceColorMap[absence]?.textColor)}; padding: 2px 4px; border-radius: 3px; font-weight: bold;">${absence}</span>` : ''}
                      ${isHol ? `<div style="position: absolute; bottom: 2px; right: 2px; font-size: 8px; color: red; font-weight: bold;" title="${holidayName}">F</div>` : ''}
                    </td>
                  `;
                }).join('')}
                <td><strong>${getAbsenceCount(employee)}j</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${i + itemsPerPage < filteredEmployees.length ? '<div class="page-break"></div>' : ''}
      `);
    }
    
    return pages.join('');
  };

  const getColorCode = (tailwindClass) => {
    const colorMap = {
      'bg-red-600': '#dc2626', 'bg-red-500': '#ef4444', 'bg-red-400': '#f87171', 'bg-red-700': '#b91c1c',
      'bg-blue-500': '#3b82f6', 'bg-blue-400': '#60a5fa', 'bg-blue-600': '#2563eb', 'bg-blue-300': '#93c5fd',
      'bg-gray-600': '#4b5563', 'bg-gray-400': '#9ca3af', 'bg-gray-700': '#374151',
      'bg-pink-500': '#ec4899', 'bg-pink-400': '#f472b6', 'bg-purple-500': '#a855f7', 'bg-purple-600': '#9333ea',
      'bg-green-400': '#4ade80', 'bg-green-500': '#22c55e', 'bg-green-600': '#16a34a', 'bg-green-300': '#86efac', 'bg-green-200': '#bbf7d0',
      'bg-orange-500': '#f97316', 'bg-indigo-500': '#6366f1', 'bg-indigo-600': '#4f46e5',
      'bg-cyan-500': '#06b6d4', 'bg-cyan-400': '#22d3ee', 'bg-teal-500': '#14b8a6',
      'bg-yellow-500': '#eab308', 'bg-amber-500': '#f59e0b'
    };
    return colorMap[tailwindClass] || '#6b7280';
  };

  const getTextColor = (tailwindClass) => {
    return tailwindClass === 'text-black' ? '#000000' : '#ffffff';
  };

  // Fonction helper pour décrire l'impact paie
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

  // Fonction d'exportation du planning
  const handleExport = () => {
    const monthName = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    
    // Création du fichier CSV
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // En-têtes
    csvContent += `Planning Mensuel - ${monthName}\n\n`;
    csvContent += "Employé,Département,Site,Catégorie,Contrat,";
    
    // Ajout des jours du mois
    days.forEach(day => {
      csvContent += `${day},`;
    });
    csvContent += "Total Absences\n";
    
    // Données des employés
    filteredEmployees.forEach(employee => {
      csvContent += `"${employee.name}","${employee.department}","${employee.site}","${employee.category}","${employee.contract}",`;
      
      days.forEach(day => {
        const dayStr = day.toString();
        const absence = employee.absences[dayStr];
        const isWknd = isWeekend(currentMonth, day);
        const isHol = isHoliday(day);
        
        if (absence) {
          csvContent += `"${absence}",`;
        } else if (isHol) {
          csvContent += `"FÉRIÉ",`;
        } else if (isWknd) {
          csvContent += `"WE",`;
        } else {
          csvContent += `"",`;
        }
      });
      
      csvContent += `${getAbsenceCount(employee)}\n`;
    });
    
    // Ajout de la légende
    csvContent += "\n\nLégende des Codes d'Absence:\n";
    Object.entries(absenceColorMap)
      .filter(([code]) => !['CP', 'RTT', 'HS', 'FM'].includes(code))
      .forEach(([code, info]) => {
        csvContent += `"${code}","${info.name}","${info.type}","${info.decompte}"\n`;
      });
    
    // Téléchargement
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `planning_${monthName.replace(' ', '_')}_${filteredEmployees.length}employes.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Notification
    alert(`📊 Export réussi !\nFichier: planning_${monthName.replace(' ', '_')}_${filteredEmployees.length}employes.csv\n\nContenu: ${filteredEmployees.length} employé(s), légende des codes d'absence incluse.`);
  };

  // Fonction d'analyse du planning
  const handleAnalyze = () => {
    // Calculs d'analyse
    const totalEmployees = filteredEmployees.length;
    const totalAbsences = filteredEmployees.reduce((sum, emp) => sum + getAbsenceCount(emp), 0);
    const avgAbsencesPerEmployee = totalAbsences / totalEmployees || 0;
    
    // Analyse par type d'absence
    const absencesByType = {};
    filteredEmployees.forEach(employee => {
      Object.values(employee.absences).forEach(absenceCode => {
        const absenceInfo = absenceColorMap[absenceCode];
        if (absenceInfo) {
          const type = absenceInfo.type;
          absencesByType[type] = (absencesByType[type] || 0) + 1;
        }
      });
    });
    
    // Analyse par département
    const absencesByDept = {};
    filteredEmployees.forEach(employee => {
      const dept = employee.department;
      const absenceCount = getAbsenceCount(employee);
      if (!absencesByDept[dept]) {
        absencesByDept[dept] = { total: 0, employees: 0 };
      }
      absencesByDept[dept].total += absenceCount;
      absencesByDept[dept].employees += 1;
    });
    
    // Top codes d'absence les plus utilisés
    const absenceCodesUsage = {};
    filteredEmployees.forEach(employee => {
      Object.values(employee.absences).forEach(absenceCode => {
        absenceCodesUsage[absenceCode] = (absenceCodesUsage[absenceCode] || 0) + 1;
      });
    });
    
    const topCodes = Object.entries(absenceCodesUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    // Génération du rapport d'analyse
    const monthName = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    let analysisReport = `📈 ANALYSE DU PLANNING - ${monthName.toUpperCase()}\n\n`;
    
    analysisReport += `📊 STATISTIQUES GÉNÉRALES:\n`;
    analysisReport += `• Employés analysés: ${totalEmployees}\n`;
    analysisReport += `• Total absences: ${totalAbsences} jours\n`;
    analysisReport += `• Moyenne par employé: ${avgAbsencesPerEmployee.toFixed(1)} jours\n`;
    analysisReport += `• Taux d'absentéisme: ${((totalAbsences / (totalEmployees * days.length)) * 100).toFixed(1)}%\n\n`;
    
    analysisReport += `📋 RÉPARTITION PAR TYPE:\n`;
    Object.entries(absencesByType).forEach(([type, count]) => {
      const percentage = ((count / totalAbsences) * 100).toFixed(1);
      analysisReport += `• ${type}: ${count} jours (${percentage}%)\n`;
    });
    
    analysisReport += `\n🏢 ANALYSE PAR DÉPARTEMENT:\n`;
    Object.entries(absencesByDept).forEach(([dept, data]) => {
      const avgPerEmp = (data.total / data.employees).toFixed(1);
      analysisReport += `• ${dept}: ${data.total} jours, ${data.employees} emp., moy: ${avgPerEmp}j\n`;
    });
    
    analysisReport += `\n🔥 TOP 5 CODES LES PLUS UTILISÉS:\n`;
    topCodes.forEach(([code, count], index) => {
      const absenceInfo = absenceColorMap[code];
      const percentage = ((count / totalAbsences) * 100).toFixed(1);
      analysisReport += `${index + 1}. ${code} (${absenceInfo?.name || 'Inconnu'}): ${count} fois (${percentage}%)\n`;
    });
    
    // Affichage du rapport dans une modal
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 600px; max-height: 80vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
          <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 20px;">
            <h2 style="font-size: 20px; font-weight: bold; color: #1f2937; margin: 0;">📈 Analyse du Planning</h2>
            <button onclick="this.closest('div').parentElement.remove()" style="background: #ef4444; color: white; border: none; border-radius: 5px; padding: 5px 10px; cursor: pointer; margin-left: auto;">✕</button>
          </div>
          <pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px; line-height: 1.4; background: #f9fafb; padding: 15px; border-radius: 5px; border: 1px solid #e5e7eb; color: #374151;">${analysisReport}</pre>
          <div style="margin-top: 20px; display: flex; gap: 10px;">
            <button onclick="navigator.clipboard.writeText(\`${analysisReport.replace(/`/g, '\\`')}\`).then(() => alert('📋 Rapport copié dans le presse-papier!'))" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">📋 Copier</button>
            <button onclick="this.closest('div').parentElement.remove()" style="background: #6b7280; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">Fermer</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Planning Mensuel</h1>
            <p className="text-gray-600">Vue d'ensemble des absences par employé</p>
          </div>
          
          {/* Navigation mois et impression */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigateMonth(-1)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h2 className="text-xl font-semibold text-gray-800 min-w-[200px] text-center">
              {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </h2>
            
            <button 
              onClick={() => navigateMonth(1)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {/* Bouton d'impression */}
            <div className="relative">
              <button
                onClick={() => setShowPrintOptions(!showPrintOptions)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Imprimer</span>
              </button>
              
              {showPrintOptions && (
                <div className="absolute right-0 top-12 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10 min-w-[200px]">
                  <div className="px-4 py-2 text-sm font-semibold text-gray-700 border-b border-gray-100">
                    Options d'impression
                  </div>
                  <button
                    onClick={() => {
                      handlePrint('A4');
                      setShowPrintOptions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    📄 Format A4 Paysage
                    <div className="text-xs text-gray-500">Recommandé pour jusqu'à 15 employés</div>
                  </button>
                  <button
                    onClick={() => {
                      handlePrint('A3');
                      setShowPrintOptions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    📄 Format A3 Paysage  
                    <div className="text-xs text-gray-500">Recommandé pour plus de 15 employés</div>
                  </button>
                  <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
                    • Orientation paysage optimisée<br/>
                    • En-têtes répétés sur chaque page<br/>
                    • Légende incluse automatiquement
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ruban de filtres et tri amélioré */}
        <div className="mt-6 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-blue-600 px-6 py-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                </svg>
                Filtres & Tri du Planning
              </h3>
              <div className="flex items-center space-x-3 text-white text-sm">
                <span>{filteredEmployees.length} employé(s) affiché(s)</span>
                <button 
                  onClick={() => {
                    setFilterDept('all');
                    setFilterSite('all');
                    setFilterCategory('all');
                    setFilterContract('all');
                    setFilterGender('all');
                    setFilterWorkTime('all');
                    setFilterAbsenceType('all');
                    setFilterAbsenceReason('all');
                  }}
                  className="px-3 py-1 bg-white/20 rounded-md hover:bg-white/30 transition-colors text-xs font-medium"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Département */}
            <div className="filter-group">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Département
              </label>
              <select 
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white shadow-sm hover:shadow-md transition-shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Tous les départements</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Site */}
            <div className="filter-group">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Site
              </label>
              <select 
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white shadow-sm hover:shadow-md transition-shadow focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">Tous les sites</option>
                {sites.map(site => (
                  <option key={site} value={site}>{site}</option>
                ))}
              </select>
            </div>

            {/* Catégorie */}
            <div className="filter-group">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                Catégorie
              </label>
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white shadow-sm hover:shadow-md transition-shadow focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">Toutes catégories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Type de contrat */}
            <div className="filter-group">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                Contrat
              </label>
              <select 
                value={filterContract}
                onChange={(e) => setFilterContract(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white shadow-sm hover:shadow-md transition-shadow focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">Tous les contrats</option>
                {contracts.map(contract => (
                  <option key={contract} value={contract}>{contract}</option>
                ))}
              </select>
            </div>

            {/* Genre */}
            <div className="filter-group">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <span className="w-2 h-2 bg-pink-500 rounded-full mr-2"></span>
                Genre
              </label>
              <select 
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white shadow-sm hover:shadow-md transition-shadow focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="all">Tous genres</option>
                <option value="Femme">Femme</option>
                <option value="Homme">Homme</option>
              </select>
            </div>

            {/* Temps de travail */}
            <div className="filter-group">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <span className="w-2 h-2 bg-teal-500 rounded-full mr-2"></span>
                Temps travail
              </label>
              <select 
                value={filterWorkTime}
                onChange={(e) => setFilterWorkTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white shadow-sm hover:shadow-md transition-shadow focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="all">Tous temps</option>
                <option value="Temps Plein">Temps Plein</option>
                <option value="Temps Partiel">Temps Partiel</option>
              </select>
            </div>

            </div>
            
            {/* Tri et actions rapides */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Tri par :</label>
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="name">Nom</option>
                    <option value="department">Département</option>
                    <option value="site">Site</option>
                    <option value="absences">Nb absences</option>
                  </select>
                </div>
                
                <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {filteredEmployees.length} résultat(s) sur {employees.length}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleExport}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                  title="Exporter le planning au format CSV"
                >
                  📊 Exporter
                </button>
                <button 
                  onClick={handleAnalyze}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                  title="Analyser les statistiques du planning"
                >
                  📈 Analyser
                </button>
                <button 
                  onClick={() => {
                    // Générer un rapport global des congés payés
                    let globalReport = `📋 RAPPORT DÉCOMPTE CONGÉS PAYÉS - ${currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}\n\n`;
                    
                    filteredEmployees.forEach(employee => {
                      const leaveCalcs = calculateEmployeeLeaveDeduction(employee);
                      if (Object.keys(leaveCalcs).length > 0) {
                        globalReport += `👤 ${employee.name.toUpperCase()} (${employee.department})\n`;
                        
                        Object.values(leaveCalcs).forEach((calc, index) => {
                          const period = calc.period;
                          const calculation = calc.calculation;
                          const startDate = new Date(period.startDate).toLocaleDateString('fr-FR');
                          const endDate = new Date(period.endDate).toLocaleDateString('fr-FR');
                          
                          globalReport += `  📅 Période ${index + 1}: ${startDate} au ${endDate}\n`;
                          globalReport += `     • Demandés: ${calculation.totalRequested}j | Décomptés: ${calculation.actuallyDeducted}j`;
                          if (calculation.savings > 0) {
                            globalReport += ` | Préservés: ${calculation.savings}j ✅`;
                          }
                          globalReport += `\n`;
                        });
                        globalReport += `\n`;
                      }
                    });
                    
                    globalReport += `📚 RAPPEL LÉGAL: Décompte en jours ouvrables (L3141-3)\n`;
                    globalReport += `• Dimanches et jours fériés non décomptés du solde\n`;
                    globalReport += `• Arrêts maladie pendant congés = jours restitués\n`;
                    
                    // Afficher dans une modal
                    const modal = document.createElement('div');
                    modal.innerHTML = `
                      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
                        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 800px; max-height: 80vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2 style="font-size: 18px; font-weight: bold; color: #1f2937; margin: 0;">📋 Rapport Congés Payés</h2>
                            <button onclick="this.closest('div').parentElement.remove()" style="background: #ef4444; color: white; border: none; border-radius: 5px; padding: 5px 10px; cursor: pointer;">✕</button>
                          </div>
                          <pre style="white-space: pre-wrap; font-family: monospace; font-size: 11px; line-height: 1.4; background: #f9fafb; padding: 15px; border-radius: 5px; border: 1px solid #e5e7eb; color: #374151;">${globalReport.replace(/`/g, '\\`')}</pre>
                          <div style="margin-top: 20px; display: flex; gap: 10px;">
                            <button onclick="navigator.clipboard.writeText(\`${globalReport.replace(/`/g, '\\\\`')}\`).then(() => alert('📋 Rapport copié!'))" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">📋 Copier</button>
                            <button onclick="this.closest('div').parentElement.remove()" style="background: #6b7280; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">Fermer</button>
                          </div>
                        </div>
                      </div>
                    `;
                    document.body.appendChild(modal);
                  }}
                  className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
                  title="Rapport détaillé du décompte des congés payés"
                >
                  📋 Congés CA
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* Légende redondante supprimée - voir légende améliorée en bas de page */}

      {/* Planning */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r border-gray-200 min-w-[200px]">
                  Employé / Département
                </th>
                {days.map(day => (
                  <th key={day} className={`px-2 py-3 text-center text-xs font-medium min-w-[40px] ${
                    isToday(currentMonth, day) ? 'bg-blue-100 text-blue-800' :
                    isWeekend(currentMonth, day) || isHoliday(day) ? 'bg-gray-200 text-gray-500' :
                    'text-gray-700'
                  }`}>
                    <div>{day}</div>
                    {isHoliday(day) && (
                      <div className="text-xs text-red-600 font-semibold" title={getHolidayName(day)}>
                        FÉRIÉ
                      </div>
                    )}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 bg-gray-50 border-l border-gray-200 min-w-[80px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee, employeeIndex) => (
                <tr key={employee.id} className={`hover:bg-gray-50 ${
                  employeeIndex % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                }`}>
                  <td className="sticky left-0 bg-white px-4 py-4 border-r border-gray-200">
                    <div>
                      <div className="font-medium text-gray-800">{employee.name}</div>
                      <div className="text-xs text-gray-500">{employee.department}</div>
                    </div>
                  </td>
                  {days.map(day => {
                    const dayStr = day.toString();
                    const absence = employee.absences[dayStr];
                    const isWknd = isWeekend(currentMonth, day);
                    const isHol = isHoliday(day);
                    const isCurrentDay = isToday(currentMonth, day);
                    
                    return (
                      <td key={day} className={`px-1 py-4 text-center ${
                        isCurrentDay ? 'bg-blue-50' :
                        isWknd || isHol ? 'bg-gray-100' : ''
                      }`}>
                        {absence ? (
                          <div className={`w-8 h-8 mx-auto rounded text-xs font-bold flex items-center justify-center ${
                            absenceColorMap[absence]?.color || 'bg-gray-500'
                          } ${absenceColorMap[absence]?.textColor || 'text-white'} ${
                            absence === 'CA' ? 'relative' : ''
                          }`}
                               title={
                                 (() => {
                                   const absenceInfo = calculateAnyAbsenceDeduction(employee, day.toString(), absence);
                                   if (absenceInfo) {
                                     let tooltip = `${absenceInfo.rules.name.toUpperCase()} - ${employee.name}\n`;
                                     tooltip += `📚 Base légale: ${absenceInfo.calculation.legalBasis}\n`;
                                     tooltip += `📊 Décompte: ${absenceInfo.calculation.deductedAmount} ${absenceInfo.calculation.unit}\n`;
                                     tooltip += `💰 Impact: ${getPayrollImpactDescription(absenceInfo.calculation.payrollImpact)}\n`;
                                     
                                     if (absence === 'CA' && absenceInfo.calculation.savings > 0) {
                                       tooltip += `✅ Économie: ${absenceInfo.calculation.savings}j préservés\n`;
                                     }
                                     
                                     if (absenceInfo.dayInfo.isHoliday) {
                                       tooltip += `🎉 Jour férié: ${absenceInfo.dayInfo.holidayName}\n`;
                                     }
                                     
                                     if (absenceInfo.displayInfo.willBeDeducted) {
                                       tooltip += `⚠️ Ce jour sera décompté selon les règles légales`;
                                     } else {
                                       tooltip += `✅ Ce jour ne sera pas décompté`;
                                     }
                                     
                                     return tooltip;
                                   }
                                   return `${absenceColorMap[absence]?.name || absence} - ${employee.name}`;
                                 })()
                               }>
                            {absence}
                            {(() => {
                              const absenceInfo = calculateAnyAbsenceDeduction(employee, day.toString(), absence);
                              if (absenceInfo) {
                                // Indicateur pour économie (CA) ou non décompté
                                if (absence === 'CA' && absenceInfo.calculation.savings > 0) {
                                  return (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full text-xs text-white flex items-center justify-center" title={`${absenceInfo.calculation.savings}j préservés`}>
                                      ✓
                                    </div>
                                  );
                                }
                                
                                // Indicateur pour jour férié pendant absence
                                if (absenceInfo.dayInfo.isHoliday) {
                                  return (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full text-xs text-white flex items-center justify-center" title={`Jour férié: ${absenceInfo.dayInfo.holidayName}`}>
                                      F
                                    </div>
                                  );
                                }
                                
                                // Indicateur pour types spéciaux (heures, non décompté)
                                if (absenceInfo.calculation.unit === 'heures') {
                                  return (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full text-xs text-white flex items-center justify-center" title="Décompte en heures">
                                      H
                                    </div>
                                  );
                                }
                                
                                if (!absenceInfo.displayInfo.willBeDeducted && absence !== 'CA') {
                                  return (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full text-xs text-white flex items-center justify-center" title="Non décompté">
                                      ✓
                                    </div>
                                  );
                                }
                              }
                              return null;
                            })()}
                          </div>
                        ) : (
                          <div className="w-8 h-8 mx-auto">
                            {(isWknd || isHol) && (
                              <div className="w-full h-full bg-gray-300 rounded opacity-50"></div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-4 text-center font-semibold text-gray-800 bg-gray-50 border-l border-gray-200">
                    <div className="flex flex-col items-center space-y-1">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        getAbsenceCount(employee) > 5 ? 'bg-red-100 text-red-800' :
                        getAbsenceCount(employee) > 2 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {getAbsenceCount(employee)} j
                      </span>
                      {(() => {
                        const leaveDeduction = getRealLeaveDeduction(employee);
                        if (leaveDeduction.totalRequested > 0) {
                          return (
                            <span className={`text-xs px-1 py-0.5 rounded ${
                              leaveDeduction.savings > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                            }`}
                                  title={`Congés: ${leaveDeduction.totalRequested}j demandés → ${leaveDeduction.totalDeducted}j décomptés${leaveDeduction.savings > 0 ? ` (${leaveDeduction.savings}j préservés)` : ''}`}>
                              CA: {leaveDeduction.totalDeducted}j
                              {leaveDeduction.savings > 0 && <span className="text-green-600">↗</span>}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistiques du mois */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
          <div className="text-2xl font-bold text-blue-600">{filteredEmployees.length}</div>
          <div className="text-sm text-gray-600">Employés</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {filteredEmployees.reduce((sum, emp) => sum + getAbsenceCount(emp), 0)}
          </div>
          <div className="text-sm text-gray-600">Total absences</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
          <div className="text-2xl font-bold text-green-600">
            {Math.round((filteredEmployees.reduce((sum, emp) => sum + getAbsenceCount(emp), 0) / filteredEmployees.length) * 10) / 10}
          </div>
          <div className="text-sm text-gray-600">Moyenne/employé</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
          <div className="text-2xl font-bold text-purple-600">84%</div>
          <div className="text-sm text-gray-600">Taux présence</div>
        </div>
      </div>

      {/* Légende des absences - Version améliorée */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <span className="text-xl mr-2">📋</span>
              Légende des Codes d'Absence
            </h3>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full border">
                {Object.keys(absenceColorMap).filter(([code]) => !['CP', 'RTT', 'HS', 'FM'].includes(code)).length} codes
              </div>
              <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                <button
                  onClick={() => setLegendView('compact')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    legendView === 'compact' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Compact
                </button>
                <button
                  onClick={() => setLegendView('detailed')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    legendView === 'detailed' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Détaillé
                </button>
              </div>
              <button
                onClick={() => setShowLegendDetails(!showLegendDetails)}
                className="flex items-center space-x-2 px-3 py-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
              >
                <span>{showLegendDetails ? 'Masquer' : 'Afficher'}</span>
                <svg 
                  className={`w-4 h-4 transition-transform ${showLegendDetails ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Types d'absence summary - toujours visible avec distinction claire */}
          <div className="flex flex-wrap gap-6 text-sm mt-3">
            <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span className="text-blue-800 font-medium">Absence Programmée</span>
              <span className="text-blue-600 text-xs">(planifiée à l'avance)</span>
            </div>
            <div className="flex items-center space-x-2 bg-red-50 px-3 py-1 rounded-lg border border-red-200">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-red-800 font-medium">Absentéisme</span>
              <span className="text-red-600 text-xs">(non planifié/subit)</span>
            </div>
            <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-lg border border-green-200">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-green-800 font-medium">Présence</span>
              <span className="text-green-600 text-xs">(heures sup, etc.)</span>
            </div>
          </div>
        </div>
        
        {/* Contenu de la légende - masquable */}
        {showLegendDetails && (
          <div className="p-6">
            {legendView === 'compact' ? (
              /* Vue compacte - codes seulement avec noms au survol */
              <div className="flex flex-wrap gap-2">
                {Object.entries(absenceColorMap)
                  .filter(([code]) => !['CP', 'RTT', 'HS', 'FM'].includes(code))
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([code, info]) => (
                    <div
                      key={code}
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${info.color} ${info.textColor} cursor-help transition-transform hover:scale-105`}
                      title={`${code} - ${info.name} (${info.type})`}
                    >
                      {code}
                    </div>
                  ))}
              </div>
            ) : (
              /* Vue détaillée - informations complètes */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(absenceColorMap)
                  .filter(([code]) => !['CP', 'RTT', 'HS', 'FM'].includes(code))
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([code, info]) => (
                    <div
                      key={code}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:shadow-md transition-all duration-200 hover:bg-gray-100"
                    >
                      <div className={`w-10 h-8 rounded flex items-center justify-center text-xs font-bold ${info.color} ${info.textColor} flex-shrink-0`}>
                        {code}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate" title={info.name}>
                          {info.name}
                        </div>
                        <div className="text-xs text-gray-500 flex flex-col">
                          <span className="truncate">{info.type}</span>
                          <span className="text-xs text-gray-400">{info.decompte}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-500 text-center">
                Cliquez sur un code dans le planning pour voir les détails • Survolez les codes compacts pour plus d'informations
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default MonthlyPlanning;