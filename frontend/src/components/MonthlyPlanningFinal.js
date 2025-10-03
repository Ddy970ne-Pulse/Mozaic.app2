import React, { useState, useEffect } from 'react';
import { calculateLeaveDeduction, validateLeaveCalculation, generateLeaveReport, LeaveCalculatorUtils } from '../shared/congesCalculatorSafe';
import { ABSENCE_DEDUCTION_RULES, calculateAbsenceDeduction, validateAbsenceLimits, generateAbsenceReport } from '../shared/absenceRulesSafe';
import { getRequests, subscribe } from '../shared/requestsData';
import { getOnCallDataForMonthlyPlanning, onCallBandColor } from '../shared/onCallData';
import { october2025FullPlanning, generateMonthlyReport } from '../shared/october2025TestData';

const MonthlyPlanningFinal = ({ user, onChangeView }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [isTestMode, setIsTestMode] = useState(false);
  const [showLegendDetails, setShowLegendDetails] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [printFormat, setPrintFormat] = useState('A4'); // A4 ou A3
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [onCallData, setOnCallData] = useState({});

  // Liste complète des 21 motifs d'absence selon l'image
  const absenceColorMap = {
    'AT': { name: 'Accident du travail / Trajet', color: 'bg-red-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'AM': { name: 'Arrêt maladie', color: 'bg-red-400', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'NAUT': { name: 'Absence non autorisée', color: 'bg-gray-600', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'AUT': { name: 'Absence autorisée', color: 'bg-gray-400', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'FAM': { name: 'Evènement familiale', color: 'bg-purple-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'MAT': { name: 'Congé maternité', color: 'bg-pink-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Calendaires' },
    'PAT': { name: 'Congé paternité', color: 'bg-blue-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Calendaires' },
    'CA': { name: 'Congés annuels', color: 'bg-blue-400', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrables' },
    'FO': { name: 'Congé formation', color: 'bg-indigo-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables' },
    'CSS': { name: 'Congés Sans Solde', color: 'bg-gray-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables' },
    'CT': { name: 'Congés Trimestriels', color: 'bg-green-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrés' },
    'REC': { name: 'Récupération', color: 'bg-yellow-400', textColor: 'text-black', type: 'Absence Programmée', decompte: 'Jours Ouvrables' },
    'RH': { name: 'Repos Hebdomadaire', color: 'bg-cyan-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrables' },
    'RHD': { name: 'Repos Dominical', color: 'bg-cyan-400', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Calendaires' },
    'TEL': { name: 'Télétravail', color: 'bg-yellow-300', textColor: 'text-black', type: 'Absentéisme', decompte: 'Jours Ouvrables' },
    'DEL': { name: 'Délégation', color: 'bg-orange-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables' },
    'STG': { name: 'Stage', color: 'bg-teal-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Calendaires' },
    'CEX': { name: 'Congé exceptionnel', color: 'bg-violet-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables' },
    'MPRO': { name: 'Maladie Professionnelle', color: 'bg-red-600', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'EMAL': { name: 'Enfants malades', color: 'bg-pink-400', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'RMED': { name: 'Rendez-vous médical', color: 'bg-emerald-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrés' },
    'AST': { name: 'Astreinte', color: 'bg-orange-600', textColor: 'text-white', type: 'Astreinte cadres', decompte: 'Temps travaillé' }
  };

  // Jours fériés 2025
  const holidays2025 = [
    '2025-01-01', '2025-04-21', '2025-05-01', '2025-05-08', '2025-05-29',
    '2025-06-09', '2025-07-14', '2025-08-15', '2025-11-01', '2025-11-11', '2025-12-25'
  ];

  const holidayNames = {
    '2025-01-01': 'Jour de l\'An', '2025-04-21': 'Lundi de Pâques', '2025-05-01': 'Fête du Travail',
    '2025-05-08': 'Victoire 1945', '2025-05-29': 'Ascension', '2025-06-09': 'Lundi de Pentecôte',
    '2025-07-14': 'Fête Nationale', '2025-08-15': 'Assomption', '2025-11-01': 'Toussaint',
    '2025-11-11': 'Armistice', '2025-12-25': 'Noël'
  };

  // Initialisation des employés par catégorie
  useEffect(() => {
    const initialEmployees = [
      { id: 1, name: 'Sophie Martin', category: 'Cadres de direction', absences: {}, totalAbsenceDays: 0 },
      { id: 2, name: 'Jean Dupont', category: 'Personnels administratifs', absences: {}, totalAbsenceDays: 0 },
      { id: 3, name: 'Marie Leblanc', category: 'Éducateurs spécialisés', absences: {}, totalAbsenceDays: 0 },
      { id: 4, name: 'Pierre Moreau', category: 'Éducateurs techniques', absences: {}, totalAbsenceDays: 0 },
      { id: 5, name: 'Claire Dubois', category: 'Personnels administratifs', absences: {}, totalAbsenceDays: 0 },
      { id: 6, name: 'Lucas Bernard', category: 'Éducateurs spécialisés', absences: {}, totalAbsenceDays: 0 },
      { id: 7, name: 'Emma Rousseau', category: 'Éducateurs techniques', absences: {}, totalAbsenceDays: 0 },
      { id: 8, name: 'Thomas Petit', category: 'Cadres de direction', absences: {}, totalAbsenceDays: 0 }
    ];

    // Ajouter quelques données de test pour démonstration
    const testData = [
      { employeeId: 1, day: '3', code: 'CA' },
      { employeeId: 1, day: '4', code: 'CA' },
      { employeeId: 2, day: '8', code: 'REC' },
      { employeeId: 3, day: '12', code: 'AM' },
      { employeeId: 3, day: '13', code: 'AM' },
      { employeeId: 6, day: '15', code: 'CT' },
      { employeeId: 7, day: '22', code: 'TEL' },
      { employeeId: 9, day: '25', code: 'MPRO' }
    ];

    const employeesWithData = initialEmployees.map(emp => {
      const empAbsences = {};
      let totalDays = 0;
      
      testData.forEach(test => {
        if (test.employeeId === emp.id) {
          empAbsences[test.day] = test.code;
          totalDays++;
        }
      });

      return {
        ...emp,
        absences: empAbsences,
        totalAbsenceDays: totalDays
      };
    });

    setEmployees(employeesWithData);
  }, []);

  // Synchro avec les demandes d'absence approuvées et les astreintes
  useEffect(() => {
    const loadRequests = () => {
      try {
        const requestsData = getRequests();
        const safeRequests = Array.isArray(requestsData) ? requestsData : [];
        setRequests(safeRequests);
        updatePlanningFromRequests(safeRequests);
      } catch (error) {
        console.error('Erreur chargement demandes:', error);
        setRequests([]);
      }
    };

    // Charger les données d'astreinte
    const loadOnCallData = () => {
      try {
        const onCallDataForMonth = getOnCallDataForMonthlyPlanning(selectedMonth, selectedYear);
        setOnCallData(onCallDataForMonth);
      } catch (error) {
        console.error('Erreur chargement astreintes:', error);
        setOnCallData({});
      }
    };

    const unsubscribe = subscribe((newRequests) => {
      const safeRequests = Array.isArray(newRequests) ? newRequests : [];
      setRequests(safeRequests);
      updatePlanningFromRequests(safeRequests);
    });
    
    loadRequests();
    loadOnCallData();
    return unsubscribe;
  }, [selectedYear, selectedMonth]);

  // Recharger les données d'astreinte quand le mois/année change
  useEffect(() => {
    try {
      const onCallDataForMonth = getOnCallDataForMonthlyPlanning(selectedMonth, selectedYear);
      setOnCallData(onCallDataForMonth);
    } catch (error) {
      console.error('Erreur chargement astreintes pour nouvelle période:', error);
      setOnCallData({});
    }
  }, [selectedMonth, selectedYear]);

  // Fonction pour activer le mode test octobre 2025
  const loadOctober2025TestData = () => {
    setSelectedMonth(9); // Octobre
    setSelectedYear(2025);
    setIsTestMode(true);
    
    // Charger les employés avec leurs absences pré-remplies
    const testEmployees = october2025FullPlanning.employees.map(emp => {
      const employeeAbsences = {};
      let totalDays = 0;
      
      // Ajouter les absences pour cet employé
      october2025FullPlanning.absences
        .filter(abs => abs.employeeId === emp.id)
        .forEach(absence => {
          absence.dates.forEach(date => {
            const day = new Date(date).getDate();
            employeeAbsences[day] = absence.type;
            totalDays++;
          });
        });
      
      return {
        id: emp.id,
        name: emp.name,
        category: getCategoryLabel(emp.category),
        absences: employeeAbsences,
        totalAbsenceDays: totalDays
      };
    });
    
    setEmployees(testEmployees);
    
    // Charger les données d'astreinte pour octobre 2025
    const octoberOnCallData = {};
    october2025FullPlanning.onCallAssignments.forEach(assignment => {
      if (!octoberOnCallData[assignment.employeeId]) {
        octoberOnCallData[assignment.employeeId] = [];
      }
      
      // Générer toutes les dates de l'assignation
      const startDate = new Date(assignment.startDate);
      const endDate = new Date(assignment.endDate);
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        octoberOnCallData[assignment.employeeId].push({
          date: currentDate.toISOString().split('T')[0],
          type: assignment.type,
          status: assignment.status,
          notes: assignment.notes || ''
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    
    setOnCallData(octoberOnCallData);
    
    // Afficher les statistiques du test
    const stats = october2025FullPlanning.statistics;
    alert(`📊 DONNÉES TEST OCTOBRE 2025 CHARGÉES
    
✅ Employés: ${october2025FullPlanning.employees.length}
📅 Jours d'absence: ${stats.totalAbsenceDays}
⚖️ Heures délégation: ${stats.totalDelegationHours}h
⏰ Heures supplémentaires: ${stats.totalOvertimeHours}h  
🔔 Jours astreinte: ${stats.totalOnCallDays}
🔄 Heures récupération: ${stats.totalRecuperationHours}h

✨ ASTREINTES INTÉGRÉES dans le planning !
🟠 Bandes oranges visibles sous les absences

Vous pouvez maintenant tester toutes les fonctionnalités !`);
  };

  // Fonction utilitaire pour les catégories
  const getCategoryLabel = (category) => {
    const categoryMap = {
      'management': 'Cadres de direction',
      'administrative': 'Personnels administratifs', 
      'specialized_educators': 'Éducateurs spécialisés',
      'technical_educators': 'Éducateurs techniques'
    };
    return categoryMap[category] || category;
  };

  // Fonction pour vérifier si un jour fait partie d'une semaine d'astreinte
  const isInOnCallWeek = (employeeId, checkDate) => {
    const employeeOnCallData = onCallData[employeeId] || [];
    
    // Pour chaque assignation d'astreinte de l'employé
    return employeeOnCallData.some(onCall => {
      const assignmentDate = new Date(onCall.date);
      const checkingDate = new Date(checkDate);
      
      // Calculer le début et la fin de la semaine d'astreinte (dimanche à samedi)
      const assignmentDayOfWeek = assignmentDate.getDay(); // 0 = dimanche, 6 = samedi
      
      // Trouver le dimanche de cette semaine d'astreinte
      const weekStart = new Date(assignmentDate);
      weekStart.setDate(assignmentDate.getDate() - assignmentDayOfWeek);
      
      // Trouver le samedi de cette semaine d'astreinte  
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      // Vérifier si la date à tester est dans cette semaine d'astreinte
      return checkingDate >= weekStart && checkingDate <= weekEnd;
    });
  };

  // Fonction d'export complète des données du mois
  const exportMonthlyData = () => {
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                       'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    
    if (isTestMode) {
      // Export des données de test avec rapport complet
      const report = generateMonthlyReport();
      
      const exportData = {
        ...report,
        detailledData: {
          absences: october2025FullPlanning.absences,
          delegationHours: october2025FullPlanning.delegationHours,
          overtimeHours: october2025FullPlanning.overtimeHours,
          onCallAssignments: october2025FullPlanning.onCallAssignments,
          recuperations: october2025FullPlanning.recuperations
        }
      };
      
      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MOZAIK_RH_Export_Complet_Octobre_2025.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      alert('📊 Export complet généré ! Fichier JSON avec toutes les données de test téléchargé.');
      
    } else {
      // Export des données actuelles (planning normal)
      const currentData = {
        period: `${monthNames[selectedMonth]} ${selectedYear}`,
        generated: new Date().toISOString(),
        employees: employees.map(emp => ({
          name: emp.name,
          category: emp.category,
          totalAbsenceDays: emp.totalAbsenceDays,
          absences: emp.absences
        })),
        onCallData: onCallData,
        summary: {
          totalEmployees: employees.length,
          totalAbsenceDays: employees.reduce((sum, emp) => sum + emp.totalAbsenceDays, 0),
          employeesByCategory: employees.reduce((acc, emp) => {
            acc[emp.category] = (acc[emp.category] || 0) + 1;
            return acc;
          }, {})
        }
      };
      
      const jsonContent = JSON.stringify(currentData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MOZAIK_RH_Planning_${monthNames[selectedMonth]}_${selectedYear}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      alert(`📊 Planning ${monthNames[selectedMonth]} ${selectedYear} exporté !`);
    }
  };

  // Fonction pour mettre à jour le planning avec les demandes approuvées
  const updatePlanningFromRequests = (requestsList) => {
    if (!Array.isArray(requestsList) || requestsList.length === 0) {
      console.log('Aucune demande à traiter');
      return;
    }
    
    setEmployees(prevEmployees => {
      return prevEmployees.map(employee => {
        const employeeRequests = requestsList.filter(req => 
          req.employee === employee.name && req.status === 'approved'
        );
        
        const newAbsences = { ...employee.absences };
        let totalDays = employee.totalAbsenceDays;
        
        employeeRequests.forEach(request => {
          try {
            const startDate = new Date(request.startDate);
            const endDate = new Date(request.endDate);
            
            // Générer toutes les dates entre start et end
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
              const day = d.getDate();
              const month = d.getMonth();
              const year = d.getFullYear();
              
              // Vérifier si c'est le mois/année sélectionnés
              if (month === selectedMonth && year === selectedYear) {
                const absenceCode = mapAbsenceTypeToCode(request.type);
                if (!newAbsences[day.toString()]) {
                  newAbsences[day.toString()] = absenceCode;
                  totalDays++;
                }
              }
            }
          } catch (error) {
            console.error('Erreur traitement demande:', error);
          }
        });
        
        return {
          ...employee,
          absences: newAbsences,
          totalAbsenceDays: totalDays
        };
      });
    });
  };

  // Mapper les types de demandes vers les codes d'absence
  const mapAbsenceTypeToCode = (requestType) => {
    const mapping = {
      'Congés payés': 'CA',
      'RTT': 'REC',
      'Récupération': 'REC',
      'Congé maladie': 'AM',
      'Arrêt maladie': 'AM',
      'Congé maternité': 'MAT',
      'Congé paternité': 'PAT',
      'Congé familial': 'FAM',
      'Télétravail': 'TEL',
      'Accident du travail': 'AT',
      'Formation': 'FO',
      'Délégation': 'DEL'
    };
    return mapping[requestType] || 'AUT';
  };

  // Utilitaires pour les dates
  const getCurrentDate = () => new Date(selectedYear, selectedMonth, 1);
  
  const getDaysInMonth = () => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  };

  const getDayOfWeek = (day) => {
    return new Date(selectedYear, selectedMonth, day).getDay();
  };

  const isWeekend = (day) => {
    const dayOfWeek = getDayOfWeek(day);
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const isHoliday = (day) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays2025.includes(dateStr);
  };

  const getHolidayName = (day) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidayNames[dateStr] || '';
  };

  const getDayName = (day) => {
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return dayNames[getDayOfWeek(day)];
  };

  // Génération des options d'années et mois
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear - 2; year <= currentYear + 2; year++) {
      years.push(year);
    }
    return years;
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Regroupement des employés par catégorie
  const groupedEmployees = employees.reduce((groups, employee) => {
    const category = employee.category || 'Non classé';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(employee);
    return groups;
  }, {});

  // Fonction d'impression améliorée
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const monthName = `${monthNames[selectedMonth]} ${selectedYear}`;
    
    const printContent = `
      <html>
        <head>
          <title>Planning Mensuel - ${monthName}</title>
          <style>
            @page { 
              size: ${printFormat} landscape; 
              margin: 0.8cm; 
            }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0; 
              font-size: ${printFormat === 'A4' ? '10px' : '12px'}; 
              color: #374151;
              background: white;
            }
            
            /* En-tête moderne */
            .page-header {
              text-align: center; 
              margin-bottom: 20px;
              page-break-inside: avoid;
              border-bottom: 3px solid #1e40af;
              padding-bottom: 15px;
            }
            .page-header h1 { 
              margin: 0 0 5px 0; 
              font-size: ${printFormat === 'A4' ? '18px' : '22px'};
              color: #1e40af;
              font-weight: 700;
            }
            .page-header .subtitle {
              color: #6b7280;
              font-size: ${printFormat === 'A4' ? '11px' : '13px'};
              margin: 5px 0;
            }
            
            /* Table moderne - similaire à l'interface */
            .planning-table { 
              width: 100%; 
              border-collapse: collapse; 
              page-break-inside: auto;
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .table-header {
              page-break-inside: avoid;
              page-break-after: avoid;
            }
            
            /* En-têtes de colonne - style interface */
            .planning-table thead th { 
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              padding: ${printFormat === 'A4' ? '6px 3px' : '8px 4px'};
              text-align: center; 
              vertical-align: middle;
              font-weight: 600;
              font-size: ${printFormat === 'A4' ? '9px' : '11px'};
              color: #374151;
            }
            
            /* Cellules du tableau - PLUS D'ESPACEMENT */
            .planning-table td { 
              border: 1px solid #d1d5db;
              padding: ${printFormat === 'A4' ? '6px 3px' : '8px 4px'};
              text-align: center; 
              vertical-align: middle;
              background: white;
              line-height: 1.3;
            }
            
            /* Colonne employé */
            .employee-name { 
              text-align: left !important;
              width: ${printFormat === 'A4' ? '100px' : '140px'}; 
              font-weight: 600;
              background: white !important;
              font-size: ${printFormat === 'A4' ? '10px' : '12px'};
              color: #1f2937;
            }
            
            /* En-têtes de catégorie - style interface */
            .category-header {
              background: #eff6ff !important;
              color: #1e40af !important;
              font-weight: 700 !important;
              text-align: center !important;
              font-size: ${printFormat === 'A4' ? '10px' : '12px'} !important;
              padding: ${printFormat === 'A4' ? '8px' : '10px'} !important;
              border: 2px solid #bfdbfe !important;
            }
            
            /* Colonne jours d'absence */
            .absence-days { 
              width: ${printFormat === 'A4' ? '35px' : '45px'}; 
              font-weight: bold;
              font-size: ${printFormat === 'A4' ? '11px' : '13px'};
              background: #f9fafb !important;
              color: #1f2937;
            }
            
            /* En-têtes des jours - LISIBLES HORIZONTALEMENT */
            .day-header { 
              width: ${printFormat === 'A4' ? '32px' : '40px'}; 
              font-size: ${printFormat === 'A4' ? '9px' : '11px'};
              line-height: 1.1;
              padding: 4px 2px !important;
              writing-mode: initial !important;
              transform: none !important;
            }
            
            /* Week-end et jours fériés - style interface */
            .weekend-header { 
              background: #f3f4f6 !important; 
              color: #6b7280 !important;
            }
            .holiday-header { 
              background: #fef2f2 !important; 
              color: #dc2626 !important;
            }
            .weekend-cell { 
              background: #fafafa !important; 
            }
            .holiday-cell { 
              background: #fef7f7 !important; 
            }
            
            /* Codes d'absence - badges plus lisibles */
            .absence-badge { 
              display: inline-block;
              padding: ${printFormat === 'A4' ? '3px 5px' : '4px 6px'};
              border-radius: 3px;
              font-weight: 700;
              font-size: ${printFormat === 'A4' ? '8px' : '10px'};
              line-height: 1.2;
              min-width: ${printFormat === 'A4' ? '20px' : '24px'};
              text-align: center;
              border: 1px solid rgba(0,0,0,0.2) !important;
            }
            
            /* Alternance de lignes */
            .planning-table tbody tr:nth-child(even):not(.category-row) {
              background: #fafafa;
            }
            
            /* Saut de page */
            .page-break { page-break-before: always; }
            
            /* Légende tableau - CLAIRE ET PROFESSIONNELLE */
            .legend-section { 
              margin-top: 20px; 
              page-break-inside: avoid;
              border-top: 1px solid #d1d5db;
              padding-top: 15px;
            }
            .legend-title {
              font-size: ${printFormat === 'A4' ? '11px' : '13px'};
              font-weight: 600;
              color: #374151;
              margin-bottom: 8px;
              text-align: left;
            }
            
            /* FORCE des couleurs à l'impression - très important */
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            /* Styles spécifiques pour chaque code d'absence - AVEC bordures pour impression N&B */
            ${Object.entries(absenceColorMap).map(([code, info]) => {
              const colorMap = {
                'bg-red-500': '#ef4444', 'bg-red-400': '#f87171', 'bg-red-600': '#dc2626', 'bg-red-700': '#b91c1c',
                'bg-gray-600': '#4b5563', 'bg-gray-400': '#9ca3af', 'bg-gray-500': '#6b7280',
                'bg-purple-500': '#8b5cf6', 'bg-pink-500': '#ec4899', 'bg-pink-400': '#f472b6',
                'bg-blue-500': '#3b82f6', 'bg-blue-400': '#60a5fa', 'bg-indigo-500': '#6366f1',
                'bg-green-500': '#10b981', 'bg-yellow-400': '#fbbf24', 'bg-yellow-300': '#fde047',
                'bg-cyan-500': '#06b6d4', 'bg-cyan-400': '#22d3ee', 'bg-orange-500': '#f97316',
                'bg-teal-500': '#14b8a6', 'bg-violet-500': '#8b5cf6', 'bg-emerald-500': '#10b981',
                'bg-orange-600': '#ea580c'
              };
              const bgColor = colorMap[info.color] || '#6b7280';
              const textColor = info.textColor.includes('white') ? 'white' : 'black';
              
              return `.absence-${code}, .legend-${code} { 
                background-color: ${bgColor} !important; 
                color: ${textColor} !important;
                border: 2px solid ${bgColor} !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }`;
            }).join('\n')}
            
            /* Alternative pour impression N&B si couleurs ne passent pas */
            @media print {
              .absence-badge, .legend-badge {
                border: 2px solid #333 !important;
                font-weight: 900 !important;
                background: white !important;
                color: #000 !important;
                -webkit-print-color-adjust: exact !important;
              }
              
              /* Patterns distinctifs pour impression N&B */
              .absence-CA, .legend-CA { background: linear-gradient(45deg, #3b82f6 25%, transparent 25%) !important; }
              .absence-AM, .legend-AM { background: linear-gradient(90deg, #ef4444 50%, white 50%) !important; }
              .absence-REC, .legend-REC { background: repeating-linear-gradient(45deg, #10b981, #10b981 2px, white 2px, white 4px) !important; }
              .absence-AST, .legend-AST { background: radial-gradient(circle, #ea580c 30%, white 30%) !important; }
            }
          </style>
        </head>
        <body>
          ${generatePrintableContent()}
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const generatePrintableContent = () => {
    const daysInMonth = getDaysInMonth();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const monthName = `${monthNames[selectedMonth]} ${selectedYear}`;
    const totalEmployees = Object.values(groupedEmployees).reduce((acc, emps) => acc + emps.length, 0);
    
    let content = `
      <div class="page-header">
        <h1>Planning Mensuel - ${monthName}</h1>
        <div class="subtitle">MOZAIK RH • ${totalEmployees} employés • ${Object.keys(groupedEmployees).length} départements</div>
      </div>
    `;

    // Calculer combien d'employés par page (plus généreux pour lisibilité)
    const employeesPerPage = printFormat === 'A4' ? 12 : 20;
    const allEmployees = Object.entries(groupedEmployees).flatMap(([category, emps]) => [
      { isCategory: true, name: category },
      ...emps
    ]);

    let currentPage = 0;

    // Générer les pages
    for (let startIdx = 0; startIdx < allEmployees.length; startIdx += employeesPerPage) {
      if (currentPage > 0) {
        content += '<div class="page-break"></div>';
        content += `
          <div class="page-header">
            <h1>Planning Mensuel - ${monthName} (suite)</h1>
            <div class="subtitle">Page ${currentPage + 1}</div>
          </div>
        `;
      }

      content += '<table class="planning-table">';
      
      // Header avec en-tête des colonnes - style interface
      content += `
        <thead class="table-header">
          <tr>
            <th class="employee-name">Employé</th>
            <th class="absence-days">Jours<br>Absence</th>
            ${days.map(day => {
              const dayName = getDayName(day);
              const isWknd = isWeekend(day);
              const isHol = isHoliday(day);
              let headerClass = 'day-header';
              if (isWknd) headerClass += ' weekend-header';
              if (isHol) headerClass += ' holiday-header';
              
              return `<th class="${headerClass}">
                <div><strong>${dayName}</strong></div>
                <div>${day}</div>
                ${isHol ? '<div><strong>F</strong></div>' : ''}
              </th>`;
            }).join('')}
          </tr>
        </thead>
      `;

      content += '<tbody>';

      // Employés pour cette page
      const pageEmployees = allEmployees.slice(startIdx, startIdx + employeesPerPage);
      
      pageEmployees.forEach(item => {
        if (item.isCategory) {
          // Ligne de catégorie - style interface
          content += `
            <tr class="category-row">
              <td class="category-header" colspan="${days.length + 2}">${item.name}</td>
            </tr>
          `;
        } else {
          // Ligne employé avec alternance
          content += '<tr>';
          content += `<td class="employee-name">${item.name}</td>`;
          content += `<td class="absence-days">${item.totalAbsenceDays}</td>`;
          
          days.forEach(day => {
            const absence = item.absences[day.toString()];
            const isWknd = isWeekend(day);
            const isHol = isHoliday(day);
            
            // Vérifier si ce jour fait partie d'une semaine d'astreinte
            const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasOnCall = isInOnCallWeek(item.id, dateStr);
            
            // Priorité : Absence > Astreinte > Vide (même logique que l'affichage)
            const displayCode = absence || (hasOnCall ? 'AST' : '');
            let cellClass = '';
            
            // Style de la cellule selon le contexte
            if (!displayCode && isWknd) {
              cellClass = 'weekend-cell';
            } else if (!displayCode && isHol) {
              cellClass = 'holiday-cell';
            }
            
            // Contenu de la cellule
            let cellContent = '';
            if (displayCode) {
              cellContent = `<span class="absence-badge absence-${displayCode}">${displayCode}</span>`;
            }
            
            content += `<td class="${cellClass}">${cellContent}</td>`;
          });
          content += '</tr>';
        }
      });

      content += '</tbody></table>';
      currentPage++;
    }

    // Nouvelle légende compacte sur la dernière page
    content += generateModernLegend();
    
    return content;
  };

  const generateModernLegend = () => {
    // Légende simplifiée et claire - TABLE FORMAT
    const mainCodes = ['CA', 'AM', 'REC', 'AST', 'DEL', 'TEL', 'MAT', 'AT', 'FO', 'CT'];
    
    return `
      <div class="legend-section">
        <div class="legend-title">Codes d'Absence - Significations</div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr style="background: #f8f9fa; font-weight: 600;">
            <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">Code</td>
            <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">Signification</td>
            <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">Type</td>
            <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">Code</td>
            <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">Signification</td>
            <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">Type</td>
          </tr>
          ${Array.from({length: Math.ceil(mainCodes.length/2)}, (_, i) => {
            const leftCode = mainCodes[i*2];
            const rightCode = mainCodes[i*2 + 1];
            const leftInfo = absenceColorMap[leftCode];
            const rightInfo = rightCode ? absenceColorMap[rightCode] : null;
            
            return `
              <tr>
                <td style="border: 1px solid #dee2e6; padding: 6px; font-weight: bold; text-align: center; background: #f1f5f9;">${leftCode}</td>
                <td style="border: 1px solid #dee2e6; padding: 6px;">${leftInfo?.name || ''}</td>
                <td style="border: 1px solid #dee2e6; padding: 6px; font-size: ${printFormat === 'A4' ? '7px' : '8px'}; color: #6b7280;">${leftInfo?.type || ''}</td>
                <td style="border: 1px solid #dee2e6; padding: 6px; font-weight: bold; text-align: center; background: #f1f5f9;">${rightCode || ''}</td>
                <td style="border: 1px solid #dee2e6; padding: 6px;">${rightInfo?.name || ''}</td>
                <td style="border: 1px solid #dee2e6; padding: 6px; font-size: ${printFormat === 'A4' ? '7px' : '8px'}; color: #6b7280;">${rightInfo?.type || ''}</td>
              </tr>
            `;
          }).join('')}
        </table>
        <div style="margin-top: 8px; font-size: ${printFormat === 'A4' ? '7px' : '8px'}; color: #6b7280; text-align: center;">
          Planning généré le ${new Date().toLocaleDateString('fr-FR')} • MOZAIK RH • Conforme CCN66
        </div>
      </div>
    `;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 min-w-[150px]">
                Employé
              </th>
              <th className="border border-gray-200 px-2 py-2 text-center font-semibold text-gray-700 min-w-[60px]">
                <div className="text-xs">Jours</div>
                <div className="text-xs">Absence</div>
              </th>
              {days.map(day => {
                const dayName = getDayName(day);
                const isWknd = isWeekend(day);
                const isHol = isHoliday(day);
                
                return (
                  <th 
                    key={day} 
                    className={`border border-gray-200 px-1 py-2 text-center text-xs font-medium min-w-[32px] ${
                      isWknd ? 'bg-gray-100 text-gray-500' : 
                      isHol ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="font-bold">{dayName}</div>
                    <div className="text-sm">{day}</div>
                    {isHol && <div className="text-xs text-red-500 font-bold">F</div>}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {Object.entries(groupedEmployees).map(([category, categoryEmployees]) => (
              <React.Fragment key={category}>
                {/* En-tête de catégorie */}
                <tr className="bg-blue-50">
                  <td colSpan={days.length + 2} className="border border-gray-200 px-3 py-2 font-bold text-blue-800 text-center">
                    {category}
                  </td>
                </tr>
                
                {/* Employés de la catégorie */}
                {categoryEmployees.map((employee, index) => (
                  <tr key={employee.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}>
                    <td className="border border-gray-200 px-3 py-2 sticky left-0 bg-white z-10">
                      <div className="font-semibold text-sm text-gray-800">{employee.name}</div>
                    </td>
                    <td className="border border-gray-200 px-2 py-2 text-center font-bold text-lg">
                      {employee.totalAbsenceDays}
                    </td>
                    {days.map(day => {
                      const absence = employee.absences[day.toString()];
                      const isWknd = isWeekend(day);
                      const isHol = isHoliday(day);
                      
                      // Vérifier si ce jour fait partie d'une semaine d'astreinte pour cet employé
                      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const hasOnCall = isInOnCallWeek(employee.id, dateStr);
                      
                      // Priorité : Absence > Astreinte > Vide
                      const displayCode = absence || (hasOnCall ? 'AST' : null);
                      const codeInfo = displayCode ? absenceColorMap[displayCode] : null;
                      
                      return (
                        <td 
                          key={day} 
                          className={`border border-gray-200 px-1 py-1 text-center text-xs ${
                            isWknd && !displayCode ? 'bg-gray-50' : 
                            isHol && !displayCode ? 'bg-red-25' : ''
                          }`}
                        >
                          {/* Code uniforme : absence ou astreinte */}
                          {codeInfo && (
                            <span 
                              className={`${codeInfo.color} ${codeInfo.textColor} px-1 py-0.5 rounded text-xs font-bold cursor-help`}
                              title={`${codeInfo.name} - ${employee.name} - ${codeInfo.type} - ${codeInfo.decompte}${hasOnCall && absence ? ' + Astreinte semaine' : ''}`}
                            >
                              {displayCode}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header avec sélecteurs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 lg:mb-0">Planning Mensuel</h1>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          {/* Sélecteur d'année */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Année :</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {generateYearOptions().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          {/* Sélecteur de mois */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Mois :</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {monthNames.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Barre d'actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setShowLegendDetails(!showLegendDetails)}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          📋 {showLegendDetails ? 'Masquer' : 'Afficher'} Légende
        </button>
        
        <div className="relative">
          <button
            onClick={() => setShowPrintOptions(!showPrintOptions)}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
            </svg>
            <span>Imprimer</span>
          </button>
          
          {showPrintOptions && (
            <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-20 min-w-[200px]">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Format :</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="A4"
                      checked={printFormat === 'A4'}
                      onChange={(e) => setPrintFormat(e.target.value)}
                      className="mr-2"
                    />
                    A4 Paysage
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="A3"
                      checked={printFormat === 'A3'}
                      onChange={(e) => setPrintFormat(e.target.value)}
                      className="mr-2"
                    />
                    A3 Paysage
                  </label>
                </div>
              </div>
              
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="text-sm font-medium text-blue-800 mb-1">💡 Pour voir les couleurs à l'impression :</div>
                <div className="text-xs text-blue-700">
                  • Chrome/Edge : Clic droit → Imprimer → Plus de paramètres → ☑️ Graphiques d'arrière-plan<br/>
                  • Firefox : Fichier → Imprimer → ☑️ Imprimer les arrière-plans<br/>
                  • Safari : Fichier → Imprimer → ☑️ Imprimer les arrière-plans
                </div>
              </div>
              <button
                onClick={() => {
                  handlePrint();
                  setShowPrintOptions(false);
                }}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Lancer l'impression
              </button>
            </div>
          )}
        </div>
        
        <button
          onClick={exportMonthlyData}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <span>📊</span>
          <span>Export Complet</span>
        </button>
        
        <button
          onClick={() => {
            console.log('Actualisation demandée, requests:', requests);
            updatePlanningFromRequests(requests);
          }}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          🔄 Actualiser depuis Demandes
        </button>
        
        <button
          onClick={() => {
            if (typeof onChangeView === 'function') {
              onChangeView('on-call-management');
            }
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          🔔 Gérer Astreintes
        </button>

        {!isTestMode && (
          <button
            onClick={loadOctober2025TestData}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            🧪 Charger Test Octobre 2025
          </button>
        )}
        
        {isTestMode && (
          <div className="flex items-center space-x-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-sm">
            <span>🧪</span>
            <span>Mode Test Actif</span>
            <button
              onClick={() => {
                setIsTestMode(false);
                window.location.reload();
              }}
              className="ml-2 text-purple-600 hover:text-purple-800 underline"
            >
              Désactiver
            </button>
          </div>
        )}
      </div>

      {/* Info intégration */}
      <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <div className="w-5 h-5 text-blue-500">ℹ️</div>
          </div>
          <div className="ml-3">
            <p className="text-sm">
              <strong>Intégration automatique :</strong> Ce planning se met à jour automatiquement 
              lorsque des demandes d'absence sont approuvées. Les employés sont regroupés par catégorie.
            </p>
          </div>
        </div>
      </div>

      {/* Légende des 21 motifs et astreintes */}
      {showLegendDetails && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h3 className="font-semibold mb-4 text-gray-800">📋 Légende Complète des 21 Motifs d'Absence</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {Object.entries(absenceColorMap).map(([code, info]) => (
              <div key={code} className="flex items-center space-x-3 p-3 border rounded">
                <span className={`${info.color} ${info.textColor} px-2 py-1 rounded text-sm font-bold min-w-[50px] text-center`}>
                  {code}
                </span>
                <div className="flex-1">
                  <div className="font-medium text-sm">{info.name}</div>
                  <div className="text-xs text-gray-600">{info.type} • {info.decompte}</div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Section Astreintes */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-semibold mb-3 text-gray-800">🔔 Astreintes</h4>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <span className="bg-orange-600 text-white px-2 py-1 rounded text-sm font-bold min-w-[50px] text-center">
                  AST
                </span>
                <div className="flex-1">
                  <div className="font-medium text-sm">Astreinte</div>
                  <div className="text-xs text-gray-600">Astreinte cadres • Temps travaillé</div>
                </div>
              </div>
              <div className="text-xs text-orange-700 bg-orange-100 rounded p-2 mt-2">
                <strong>📋 Conformité CCN66:</strong> Les astreintes respectent les limites légales par catégorie d'employé.
                Accédez au module "Gérer Astreintes" pour plus de détails.
              </div>
              <div className="text-xs text-blue-700 bg-blue-100 rounded p-2 mt-2">
                <strong>ℹ️ Nouveau:</strong> Les astreintes s'affichent maintenant avec le code "AST" comme les autres absences, 
                uniformisant l'affichage du planning mensuel.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Planning */}
      {renderCalendar()}

      {/* Statistiques */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold text-gray-800 mb-2">📊 Statistiques</h4>
          <div className="text-sm text-gray-600">
            <div>Total employés: {employees.length}</div>
            <div>Total absences: {employees.reduce((sum, emp) => sum + emp.totalAbsenceDays, 0)}</div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold text-gray-800 mb-2">🔄 Synchronisation</h4>
          <div className="text-sm text-gray-600">
            <div>Demandes approuvées: {Array.isArray(requests) ? requests.filter(r => r.status === 'approved').length : 0}</div>
            <div>Dernière MAJ: {new Date().toLocaleTimeString('fr-FR')}</div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold text-gray-800 mb-2">📅 Période</h4>
          <div className="text-sm text-gray-600">
            <div>{monthNames[selectedMonth]} {selectedYear}</div>
            <div>Jours: {getDaysInMonth()}</div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold text-gray-800 mb-2">👥 Catégories</h4>
          <div className="text-sm text-gray-600">
            {Object.keys(groupedEmployees).map(category => (
              <div key={category}>{category}: {groupedEmployees[category].length}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyPlanningFinal;