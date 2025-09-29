import React, { useState, useEffect } from 'react';
import { calculateLeaveDeduction, validateLeaveCalculation, generateLeaveReport, LeaveCalculatorUtils } from '../shared/congesCalculatorSafe';
import { ABSENCE_DEDUCTION_RULES, calculateAbsenceDeduction, validateAbsenceLimits, generateAbsenceReport } from '../shared/absenceRulesSafe';
import { getRequests, subscribe } from '../shared/requestsData';

const MonthlyPlanningImproved = ({ user }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showLegendDetails, setShowLegendDetails] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [requests, setRequests] = useState(getRequests() || []);
  const [employees, setEmployees] = useState([
    { 
      id: 1, name: 'Sophie Martin', department: 'Direction', site: 'Siège', 
      job: 'Directrice RH', 
      absences: { '3': 'CA', '4': 'CA', '15': 'REC', '22': 'TEL' }, 
      totalAbsenceDays: 4
    },
    { 
      id: 2, name: 'Jean Dupont', department: 'Administratif', site: 'Siège',
      job: 'Responsable IT', 
      absences: { '8': 'RTT', '12': 'CA', '13': 'CA', '26': 'AM' }, 
      totalAbsenceDays: 4
    },
    { 
      id: 3, name: 'Marie Leblanc', department: 'Commercial', site: 'Pôle Éducatif',
      job: 'Commerciale', 
      absences: { '5': 'AT', '6': 'AT', '19': 'CA', '20': 'CA', '21': 'CA' }, 
      totalAbsenceDays: 5
    },
    { 
      id: 4, name: 'Pierre Martin', department: 'Comptable', site: 'Siège',
      job: 'Comptable', 
      absences: { '11': 'REC', '17': 'FAM', '25': 'TEL', '29': 'CA' }, 
      totalAbsenceDays: 4
    },
    { 
      id: 5, name: 'Claire Dubois', department: 'Éducatif', site: 'Pôle Éducatif',
      job: 'Éducatrice', 
      absences: { '2': 'MAT', '3': 'MAT', '4': 'MAT', '7': 'MAT', '8': 'MAT', '9': 'MAT', '10': 'MAT' }, 
      totalAbsenceDays: 7
    },
    { 
      id: 6, name: 'Lucas Bernard', department: 'Production', site: 'Menuiserie 44',
      job: 'Menuisier', 
      absences: { '14': 'CT', '16': 'REC', '23': 'CA', '24': 'CA', '30': 'CSS' }, 
      totalAbsenceDays: 5
    }
  ]);

  // Codes d'absence avec couleurs selon l'image de référence
  const absenceColorMap = {
    'CT': { name: 'Congé Total', color: 'bg-green-500', textColor: 'text-white', type: 'Congés' },
    'AM': { name: 'Absence Matin', color: 'bg-pink-500', textColor: 'text-white', type: 'Absence Partielle' },
    'CA': { name: 'Congés Annuels', color: 'bg-blue-400', textColor: 'text-white', type: 'Congés' },
    'REC': { name: 'Récupération', color: 'bg-yellow-400', textColor: 'text-black', type: 'Récupération' },
    'TEL': { name: 'Télétravail', color: 'bg-yellow-300', textColor: 'text-black', type: 'Télétravail' },
    'AT': { name: 'Arrêt de Travail', color: 'bg-red-500', textColor: 'text-white', type: 'Arrêt Médical' },
    'RTT': { name: 'RTT', color: 'bg-purple-500', textColor: 'text-white', type: 'Repos' },
    'MAT': { name: 'Congé Maternité', color: 'bg-pink-600', textColor: 'text-white', type: 'Congé Familial' },
    'PAT': { name: 'Congé Paternité', color: 'bg-blue-600', textColor: 'text-white', type: 'Congé Familial' },
    'FAM': { name: 'Congé Familial', color: 'bg-purple-600', textColor: 'text-white', type: 'Congé Familial' },
    'CSS': { name: 'Congé Sans Solde', color: 'bg-gray-500', textColor: 'text-white', type: 'Congé Spécial' }
  };

  // Jours fériés 2025
  const holidays2025 = [
    '2025-01-01', '2025-04-21', '2025-05-01', '2025-05-08', '2025-05-29',
    '2025-06-09', '2025-07-14', '2025-08-15', '2025-11-01', '2025-11-11', '2025-12-25'
  ];

  const holidayNames = {
    '2025-01-01': 'Jour de l\'An',
    '2025-04-21': 'Lundi de Pâques',
    '2025-05-01': 'Fête du Travail',
    '2025-05-08': 'Victoire 1945',
    '2025-05-29': 'Ascension',
    '2025-06-09': 'Lundi de Pentecôte',
    '2025-07-14': 'Fête Nationale',
    '2025-08-15': 'Assomption',
    '2025-11-01': 'Toussaint',
    '2025-11-11': 'Armistice',
    '2025-12-25': 'Noël'
  };

  // Synchro avec les demandes d'absence approuvées
  useEffect(() => {
    const unsubscribe = subscribe((newRequests) => {
      setRequests(newRequests);
      updatePlanningFromRequests(newRequests);
    });
    
    // Mise à jour initiale
    updatePlanningFromRequests(requests);
    
    return unsubscribe;
  }, []);

  // Fonction pour mettre à jour le planning avec les demandes approuvées
  const updatePlanningFromRequests = (requestsList) => {
    if (!Array.isArray(requestsList)) {
      console.warn('requestsList is not an array:', requestsList);
      return;
    }
    
    setEmployees(prevEmployees => {
      return prevEmployees.map(employee => {
        const employeeRequests = requestsList.filter(req => 
          req.employee === employee.name && req.status === 'approved'
        );
        
        const newAbsences = {};
        let totalDays = 0;
        
        employeeRequests.forEach(request => {
          const startDate = new Date(request.startDate);
          const endDate = new Date(request.endDate);
          
          // Générer toutes les dates entre start et end
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const day = d.getDate();
            const month = d.getMonth();
            const year = d.getFullYear();
            
            // Vérifier si c'est le mois courant
            if (month === currentMonth.getMonth() && year === currentMonth.getFullYear()) {
              newAbsences[day.toString()] = mapAbsenceTypeToCode(request.type);
              totalDays++;
            }
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
      'RTT': 'RTT',
      'Récupération': 'REC',
      'Congé maladie': 'AM',
      'Congé maternité': 'MAT',
      'Congé paternité': 'PAT',
      'Congé familial': 'FAM',
      'Télétravail': 'TEL',
      'Arrêt de travail': 'AT'
    };
    return mapping[requestType] || 'CT';
  };

  // Utilitaires
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getDayOfWeek = (date, day) => {
    return new Date(date.getFullYear(), date.getMonth(), day).getDay();
  };

  const isWeekend = (date, day) => {
    const dayOfWeek = getDayOfWeek(date, day);
    return dayOfWeek === 0 || dayOfWeek === 6; // Dimanche ou samedi
  };

  const isHoliday = (day) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays2025.includes(dateStr);
  };

  const getHolidayName = (day) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidayNames[dateStr] || '';
  };

  const getDayName = (date, day) => {
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return dayNames[getDayOfWeek(date, day)];
  };

  // Fonction d'impression
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const monthName = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    
    const printContent = `
      <html>
        <head>
          <title>Planning Mensuel - ${monthName}</title>
          <style>
            @page { size: A3 landscape; margin: 1cm; }
            body { font-family: Arial, sans-serif; margin: 0; }
            h1 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th, td { border: 1px solid #ccc; padding: 4px; text-align: center; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .employee-name { text-align: left; width: 150px; font-weight: bold; }
            .absence-days { width: 50px; }
            .day-header { width: 25px; }
            .weekend { background-color: #f0f0f0; }
            .holiday { background-color: #ffe6e6; }
            .absence-CT { background-color: #10b981; color: white; font-weight: bold; }
            .absence-AM { background-color: #ec4899; color: white; font-weight: bold; }
            .absence-CA { background-color: #60a5fa; color: white; font-weight: bold; }
            .absence-REC { background-color: #fbbf24; color: black; font-weight: bold; }
            .absence-TEL { background-color: #fde047; color: black; font-weight: bold; }
            .absence-AT { background-color: #ef4444; color: white; font-weight: bold; }
            .absence-RTT { background-color: #8b5cf6; color: white; font-weight: bold; }
            .absence-MAT { background-color: #db2777; color: white; font-weight: bold; }
            .absence-PAT { background-color: #2563eb; color: white; font-weight: bold; }
            .absence-FAM { background-color: #7c3aed; color: white; font-weight: bold; }
            .absence-CSS { background-color: #6b7280; color: white; font-weight: bold; }
            .legend { margin-top: 20px; }
            .legend-item { display: inline-block; margin: 5px; padding: 5px; }
          </style>
        </head>
        <body>
          <h1>Planning Mensuel - ${monthName}</h1>
          ${generatePrintableTable()}
          ${generatePrintableLegend()}
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const generatePrintableTable = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    let tableHTML = '<table>';
    
    // Header avec jours de la semaine et dates
    tableHTML += '<tr>';
    tableHTML += '<th class="employee-name">Employé</th>';
    tableHTML += '<th class="absence-days">Jours<br>Absence</th>';
    
    days.forEach(day => {
      const dayName = getDayName(currentMonth, day);
      const isWknd = isWeekend(currentMonth, day);
      const isHol = isHoliday(day);
      const cellClass = isWknd || isHol ? 'day-header weekend' : 'day-header';
      
      tableHTML += `<th class="${cellClass}">
        <div>${dayName}</div>
        <div>${day}</div>
        ${isHol ? '<div style="color: red; font-size: 8px;">F</div>' : ''}
      </th>`;
    });
    tableHTML += '</tr>';

    // Rows pour chaque employé
    employees.forEach(employee => {
      tableHTML += '<tr>';
      tableHTML += `<td class="employee-name">
        <div><strong>${employee.name}</strong></div>
        <div style="font-size: 9px;">${employee.department}</div>
      </td>`;
      tableHTML += `<td class="absence-days">${employee.totalAbsenceDays}</td>`;
      
      days.forEach(day => {
        const absence = employee.absences[day.toString()];
        const isWknd = isWeekend(currentMonth, day);
        const isHol = isHoliday(day);
        
        let cellClass = '';
        let content = '';
        
        if (absence) {
          cellClass = `absence-${absence}`;
          content = absence;
        } else if (isWknd || isHol) {
          cellClass = 'weekend';
          content = '';
        }
        
        tableHTML += `<td class="${cellClass}">${content}</td>`;
      });
      tableHTML += '</tr>';
    });

    tableHTML += '</table>';
    return tableHTML;
  };

  const generatePrintableLegend = () => {
    let legendHTML = '<div class="legend"><h3>Légende des Codes d\'Absence</h3>';
    
    Object.entries(absenceColorMap).forEach(([code, info]) => {
      const bgColor = info.color.replace('bg-', '#').replace('-500', '').replace('-400', '').replace('-300', '').replace('-600', '');
      const colorMap = {
        'green': '#10b981', 'pink': '#ec4899', 'blue': '#60a5fa', 'yellow': '#fbbf24',
        'red': '#ef4444', 'purple': '#8b5cf6', 'gray': '#6b7280'
      };
      
      legendHTML += `<span class="legend-item" style="background-color: ${colorMap[bgColor] || '#ccc'}; color: ${info.textColor.includes('white') ? 'white' : 'black'};">
        <strong>${code}</strong> - ${info.name}
      </span>`;
    });
    
    legendHTML += '</div>';
    return legendHTML;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return (
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full border-collapse border border-gray-200">
          {/* Header */}
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 min-w-[180px]">
                Employé
              </th>
              <th className="border border-gray-200 px-2 py-2 text-center font-semibold text-gray-700 min-w-[60px]">
                <div className="text-xs">Jours</div>
                <div className="text-xs">Absence</div>
              </th>
              {days.map(day => {
                const dayName = getDayName(currentMonth, day);
                const isWknd = isWeekend(currentMonth, day);
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

          {/* Body */}
          <tbody>
            {employees.map((employee, index) => (
              <tr key={employee.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}>
                <td className="border border-gray-200 px-3 py-2 sticky left-0 bg-white z-10">
                  <div className="font-semibold text-sm text-gray-800">{employee.name}</div>
                  <div className="text-xs text-gray-600">{employee.department}</div>
                  <div className="text-xs text-gray-500">{employee.job}</div>
                </td>
                <td className="border border-gray-200 px-2 py-2 text-center font-bold text-lg">
                  {employee.totalAbsenceDays}
                </td>
                {days.map(day => {
                  const absence = employee.absences[day.toString()];
                  const isWknd = isWeekend(currentMonth, day);
                  const isHol = isHoliday(day);
                  const absenceInfo = absence ? absenceColorMap[absence] : null;
                  
                  return (
                    <td 
                      key={day} 
                      className={`border border-gray-200 px-1 py-1 text-center text-xs ${
                        isWknd && !absence ? 'bg-gray-50' : 
                        isHol && !absence ? 'bg-red-25' : ''
                      }`}
                    >
                      {absenceInfo && (
                        <span 
                          className={`${absenceInfo.color} ${absenceInfo.textColor} px-1 py-0.5 rounded text-xs font-bold cursor-help`}
                          title={`${absenceInfo.name} - ${employee.name}`}
                        >
                          {absence}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Planning Mensuel</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            ← Précédent
          </button>
          <span className="text-xl font-semibold text-gray-700 px-4">
            {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Suivant →
          </button>
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
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          🖨️ Imprimer Planning
        </button>
        <button
          onClick={() => updatePlanningFromRequests(requests)}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          🔄 Actualiser depuis Demandes
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
              lorsque des demandes d'absence sont approuvées dans le module "Demandes d'Absence".
            </p>
          </div>
        </div>
      </div>

      {/* Légende */}
      {showLegendDetails && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h3 className="font-semibold mb-4 text-gray-800">📋 Légende des Codes d'Absence</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(absenceColorMap).map(([code, info]) => (
              <div key={code} className="flex items-center space-x-3 p-2 border rounded">
                <span className={`${info.color} ${info.textColor} px-2 py-1 rounded text-sm font-bold min-w-[45px] text-center`}>
                  {code}
                </span>
                <div className="flex-1">
                  <div className="font-medium text-sm">{info.name}</div>
                  <div className="text-xs text-gray-600">{info.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Planning */}
      {renderCalendar()}

      {/* Statistiques */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold text-gray-800 mb-2">📊 Statistiques du mois</h4>
          <div className="text-sm text-gray-600">
            <div>Total employés: {employees.length}</div>
            <div>Total jours d'absence: {employees.reduce((sum, emp) => sum + emp.totalAbsenceDays, 0)}</div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold text-gray-800 mb-2">🔄 Synchronisation</h4>
          <div className="text-sm text-gray-600">
            <div>Demandes approuvées: {requests.filter(r => r.status === 'approved').length}</div>
            <div>Dernière MAJ: {new Date().toLocaleTimeString('fr-FR')}</div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold text-gray-800 mb-2">📅 Informations mois</h4>
          <div className="text-sm text-gray-600">
            <div>Jours ouvrés: {getDaysInMonth(currentMonth) - 8}</div>
            <div>Jours fériés: {holidays2025.filter(h => h.includes(`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`)).length}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyPlanningImproved;