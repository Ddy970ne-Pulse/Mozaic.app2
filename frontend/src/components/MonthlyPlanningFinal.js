import React, { useState, useEffect } from 'react';
import { calculateLeaveDeduction, validateLeaveCalculation, generateLeaveReport, LeaveCalculatorUtils } from '../shared/congesCalculatorSafe';
import { ABSENCE_DEDUCTION_RULES, calculateAbsenceDeduction, validateAbsenceLimits, generateAbsenceReport } from '../shared/absenceRulesSafe';
import { getRequests, subscribe } from '../shared/requestsData';
import { getOnCallDataForMonthlyPlanning, onCallBandColor } from '../shared/onCallData';

const MonthlyPlanningFinal = ({ user, onChangeView }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
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
    'RMED': { name: 'Rendez-vous médical', color: 'bg-emerald-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrés' }
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
      // Cadres de direction
      { id: 1, name: 'Sophie Martin', category: 'Cadres de direction', absences: {}, totalAbsenceDays: 0 },
      { id: 2, name: 'Jean Dupont', category: 'Cadres de direction', absences: {}, totalAbsenceDays: 0 },
      
      // Administratifs
      { id: 3, name: 'Marie Leblanc', category: 'Administratifs', absences: {}, totalAbsenceDays: 0 },
      { id: 4, name: 'Pierre Moreau', category: 'Éducateurs techniques', absences: {}, totalAbsenceDays: 0 },
      { id: 5, name: 'Claire Dubois', category: 'Administratifs', absences: {}, totalAbsenceDays: 0 },
      
      // Éducateurs spécialisés
      { id: 6, name: 'Lucas Bernard', category: 'Éducateurs spécialisés', absences: {}, totalAbsenceDays: 0 },
      { id: 7, name: 'Emma Rousseau', category: 'Éducateurs spécialisés', absences: {}, totalAbsenceDays: 0 },
      { id: 8, name: 'Thomas Leroy', category: 'Éducateurs spécialisés', absences: {}, totalAbsenceDays: 0 },
      
      // Éducateurs techniques
      { id: 9, name: 'Julie Moreau', category: 'Éducateurs techniques', absences: {}, totalAbsenceDays: 0 },
      { id: 10, name: 'Antoine Petit', category: 'Éducateurs techniques', absences: {}, totalAbsenceDays: 0 }
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
              margin: 0.5cm; 
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              font-size: ${printFormat === 'A4' ? '8px' : '10px'}; 
            }
            .page-header {
              text-align: center; 
              margin-bottom: 15px;
              page-break-inside: avoid;
            }
            .page-header h1 { 
              margin: 0; 
              font-size: ${printFormat === 'A4' ? '14px' : '18px'}; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              page-break-inside: auto;
            }
            .table-header {
              page-break-inside: avoid;
              page-break-after: avoid;
            }
            th, td { 
              border: 1px solid #333; 
              padding: 2px; 
              text-align: center; 
              vertical-align: middle;
            }
            th { 
              background-color: #f0f0f0; 
              font-weight: bold; 
              font-size: ${printFormat === 'A4' ? '7px' : '9px'};
            }
            .employee-name { 
              text-align: left; 
              width: ${printFormat === 'A4' ? '80px' : '120px'}; 
              font-weight: bold; 
              background-color: #f9f9f9;
            }
            .category-header {
              background-color: #e0e0e0 !important;
              font-weight: bold;
              text-align: center;
              font-size: ${printFormat === 'A4' ? '8px' : '10px'};
            }
            .absence-days { 
              width: ${printFormat === 'A4' ? '25px' : '35px'}; 
              font-weight: bold;
            }
            .day-header { 
              width: ${printFormat === 'A4' ? '18px' : '25px'}; 
              font-size: ${printFormat === 'A4' ? '6px' : '8px'};
            }
            .weekend { background-color: #f5f5f5; }
            .holiday { background-color: #ffe6e6; }
            .absence-code { 
              font-weight: bold; 
              font-size: ${printFormat === 'A4' ? '6px' : '8px'};
              padding: 1px;
            }
            .legend { 
              margin-top: 15px; 
              page-break-inside: avoid;
              font-size: ${printFormat === 'A4' ? '7px' : '9px'};
            }
            .legend-grid {
              display: grid;
              grid-template-columns: repeat(${printFormat === 'A4' ? '3' : '4'}, 1fr);
              gap: 5px;
            }
            .legend-item { 
              border: 1px solid #ccc; 
              padding: 3px; 
              display: flex;
              align-items: center;
            }
            .legend-code {
              min-width: 30px;
              text-align: center;
              font-weight: bold;
              margin-right: 5px;
              padding: 2px;
            }
            .page-break { page-break-before: always; }
            
            /* Styles spécifiques pour les codes d'absence */
            ${Object.entries(absenceColorMap).map(([code, info]) => {
              const colorMap = {
                'bg-red-500': '#ef4444', 'bg-red-400': '#f87171', 'bg-red-600': '#dc2626',
                'bg-gray-600': '#4b5563', 'bg-gray-400': '#9ca3af', 'bg-gray-500': '#6b7280',
                'bg-purple-500': '#8b5cf6', 'bg-pink-500': '#ec4899', 'bg-pink-400': '#f472b6',
                'bg-blue-500': '#3b82f6', 'bg-blue-400': '#60a5fa', 'bg-indigo-500': '#6366f1',
                'bg-green-500': '#10b981', 'bg-yellow-400': '#fbbf24', 'bg-yellow-300': '#fde047',
                'bg-cyan-500': '#06b6d4', 'bg-cyan-400': '#22d3ee', 'bg-orange-500': '#f97316',
                'bg-teal-500': '#14b8a6', 'bg-violet-500': '#8b5cf6', 'bg-emerald-500': '#10b981'
              };
              const bgColor = colorMap[info.color] || '#6b7280';
              const textColor = info.textColor.includes('white') ? 'white' : 'black';
              
              return `.absence-${code} { background-color: ${bgColor}; color: ${textColor}; }`;
            }).join('\n')}
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
    
    let content = `
      <div class="page-header">
        <h1>Planning Mensuel - ${monthName}</h1>
      </div>
    `;

    // Calculer combien d'employés par page
    const employeesPerPage = printFormat === 'A4' ? 15 : 25;
    const allEmployees = Object.entries(groupedEmployees).flatMap(([category, emps]) => [
      { isCategory: true, name: category },
      ...emps
    ]);

    let currentPage = 0;
    let employeeCount = 0;

    // Générer les pages
    for (let startIdx = 0; startIdx < allEmployees.length; startIdx += employeesPerPage) {
      if (currentPage > 0) {
        content += '<div class="page-break"></div>';
        content += `
          <div class="page-header">
            <h1>Planning Mensuel - ${monthName} (suite)</h1>
          </div>
        `;
      }

      content += '<table>';
      
      // Header avec en-tête des colonnes
      content += `
        <thead class="table-header">
          <tr>
            <th class="employee-name">Employé</th>
            <th class="absence-days">Jours<br>Absence</th>
            ${days.map(day => {
              const dayName = getDayName(day);
              const isWknd = isWeekend(day);
              const isHol = isHoliday(day);
              const cellClass = isWknd || isHol ? 'day-header weekend' : 'day-header';
              
              return `<th class="${cellClass}">
                <div>${dayName}</div>
                <div>${day}</div>
                ${isHol ? '<div style="color: red;">F</div>' : ''}
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
          // Ligne de catégorie
          content += `
            <tr>
              <td class="category-header" colspan="${days.length + 2}">${item.name}</td>
            </tr>
          `;
        } else {
          // Ligne employé
          content += '<tr>';
          content += `<td class="employee-name">${item.name}</td>`;
          content += `<td class="absence-days">${item.totalAbsenceDays}</td>`;
          
          days.forEach(day => {
            const absence = item.absences[day.toString()];
            const isWknd = isWeekend(day);
            const isHol = isHoliday(day);
            
            let cellClass = '';
            let content_cell = '';
            
            if (absence) {
              cellClass = `absence-${absence}`;
              content_cell = absence;
            } else if (isWknd || isHol) {
              cellClass = 'weekend';
            }
            
            content += `<td class="absence-code ${cellClass}">${content_cell}</td>`;
          });
          content += '</tr>';
        }
      });

      content += '</tbody></table>';
      currentPage++;
    }

    // Légende sur la dernière page
    content += generatePrintableLegend();
    
    return content;
  };

  const generatePrintableLegend = () => {
    return `
      <div class="legend">
        <h3>Légende des Codes d'Absence</h3>
        <div class="legend-grid">
          ${Object.entries(absenceColorMap).map(([code, info]) => `
            <div class="legend-item">
              <span class="legend-code absence-${code}">${code}</span>
              <span>${info.name}</span>
            </div>
          `).join('')}
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
                      const absenceInfo = absence ? absenceColorMap[absence] : null;
                      
                      // Vérifier s'il y a une astreinte ce jour-là pour cet employé
                      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const employeeOnCallData = onCallData[employee.id] || [];
                      const hasOnCall = employeeOnCallData.some(onCall => onCall.date === dateStr);
                      
                      return (
                        <td 
                          key={day} 
                          className={`border border-gray-200 px-1 py-1 text-center text-xs relative ${
                            isWknd && !absence ? 'bg-gray-50' : 
                            isHol && !absence ? 'bg-red-25' : ''
                          }`}
                        >
                          <div className="relative">
                            {/* Code d'absence */}
                            {absenceInfo && (
                              <span 
                                className={`${absenceInfo.color} ${absenceInfo.textColor} px-1 py-0.5 rounded text-xs font-bold cursor-help block mb-1`}
                                title={`${absenceInfo.name} - ${employee.name} - ${absenceInfo.type} - ${absenceInfo.decompte}`}
                              >
                                {absence}
                              </span>
                            )}
                            
                            {/* Bande d'astreinte orange sanguine sous l'absence */}
                            {hasOnCall && (
                              <div 
                                className="absolute bottom-0 left-0 right-0 h-1 rounded-sm cursor-help"
                                style={{ backgroundColor: onCallBandColor }}
                                title={`🔔 Astreinte - ${employee.name}`}
                              ></div>
                            )}
                          </div>
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
                <div 
                  className="w-8 h-4 rounded"
                  style={{ backgroundColor: onCallBandColor }}
                ></div>
                <div className="flex-1">
                  <div className="font-medium text-sm">Bande d'astreinte</div>
                  <div className="text-xs text-gray-600">Affichée sous les codes d'absence • Couleur: Orange sanguine</div>
                </div>
              </div>
              <div className="text-xs text-orange-700 bg-orange-100 rounded p-2 mt-2">
                <strong>📋 Conformité CCN66:</strong> Les astreintes respectent les limites légales par catégorie d'employé.
                Accédez au module "Gérer Astreintes" pour plus de détails.
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