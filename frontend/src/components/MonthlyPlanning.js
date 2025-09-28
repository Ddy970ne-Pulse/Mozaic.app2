import React, { useState } from 'react';

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

  // Comprehensive absence legend based on the provided list
  const absenceColorMap = {
    'AT': { name: 'Accident du travail / Trajet', color: 'bg-red-600', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'AM': { name: 'Arrêt maladie', color: 'bg-red-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'NAUT': { name: 'Absence non autorisée', color: 'bg-gray-600', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'AUT': { name: 'Absence autorisée', color: 'bg-gray-400', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'FAM': { name: 'Évènement familiale', color: 'bg-pink-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'MAT': { name: 'Congé maternité', color: 'bg-pink-400', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Calendaires' },
    'PAT': { name: 'Congé paternité', color: 'bg-blue-400', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Calendaires' },
    'CA': { name: 'Congés annuels', color: 'bg-blue-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrables' },
    'FO': { name: 'Congé formation', color: 'bg-indigo-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables' },
    'CSS': { name: 'Congés Sans Solde', color: 'bg-gray-700', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables' },
    'CT': { name: 'Congés Trimestriels', color: 'bg-orange-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrés' },
    'REC': { name: 'Récupération', color: 'bg-green-400', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrables' },
    'RH': { name: 'Repos Hebdomadaire', color: 'bg-green-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrables' },
    'RHD': { name: 'Repos Dominical', color: 'bg-green-600', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Calendaires' },
    'TEL': { name: 'Télétravail', color: 'bg-cyan-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables' },
    'DEL': { name: 'Délégation', color: 'bg-purple-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrés' },
    'STG': { name: 'Stage', color: 'bg-yellow-500', textColor: 'text-black', type: 'Absence Programmée', decompte: 'Jours Calendaires' },
    'CEX': { name: 'Congé exceptionnel', color: 'bg-amber-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables' },
    'MPRO': { name: 'Maladie Professionnelle', color: 'bg-red-700', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'EMAL': { name: 'Enfants malades', color: 'bg-red-400', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'RMED': { name: 'Rendez-vous médical', color: 'bg-teal-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrés' },
    // Deprecated codes (keeping for backward compatibility)
    'CP': { name: 'Congés Payés', color: 'bg-blue-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrables' },
    'RTT': { name: 'RTT', color: 'bg-green-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrables' },
    'HS': { name: 'Heures Sup', color: 'bg-purple-600', textColor: 'text-white', type: 'Présence', decompte: 'Heures' },
    'FM': { name: 'Formation', color: 'bg-indigo-600', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables' }
  };

  const holidays = [1, 15, 25]; // Jours fériés exemple

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
    return holidays.includes(day);
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
                <th class="${isWeekend(currentMonth, day) || isHoliday(day) ? 'weekend' : ''} ${isToday(currentMonth, day) ? 'today' : ''}">
                  ${day}${isHoliday(day) ? '<br>F' : ''}
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
                  
                  return `
                    <td class="${isWknd || isHol ? 'weekend' : ''} ${isToday(currentMonth, day) ? 'today' : ''}">
                      ${absence ? `<span class="absence-code" style="background-color: ${getColorCode(absenceColorMap[absence]?.color)}; color: ${getTextColor(absenceColorMap[absence]?.textColor)}">${absence}</span>` : ''}
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

        {/* Filtres avancés basés sur l'image fournie */}
        <div className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-4">
            {/* Filtre Mois */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
              <select className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white">
                <option>janv</option><option>févr</option><option>mars</option><option>avr</option>
                <option>mai</option><option>juin</option><option>juil</option><option>août</option>
                <option>sept</option><option>oct</option><option>nov</option><option>déc</option>
              </select>
            </div>

            {/* Type Absence */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type Absence</label>
              <select 
                value={filterAbsenceType}
                onChange={(e) => setFilterAbsenceType(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="all">(tous)</option>
                {absenceCategories.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Motif Absence */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Motif Absence</label>
              <select 
                value={filterAbsenceReason}
                onChange={(e) => setFilterAbsenceReason(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="all">(tous)</option>
                {absenceReasons.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>

            {/* Catégorie Employé */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie Employé</label>
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="all">(tous)</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Métier */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Métier</label>
              <select className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white">
                <option>(tous)</option>
                {jobs.map(job => (
                  <option key={job} value={job}>{job}</option>
                ))}
              </select>
            </div>

            {/* Genre */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Genre</label>
              <select 
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="all">(tous)</option>
                <option value="Femme">Femme</option>
                <option value="Homme">Homme</option>
              </select>
            </div>

            {/* Temps de travail */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Temps de travail</label>
              <select 
                value={filterWorkTime}
                onChange={(e) => setFilterWorkTime(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="all">(tous)</option>
                <option value="Temps Partiel">Temps Partiel</option>
                <option value="Temps Plein">Temps Plein</option>
              </select>
            </div>

            {/* Département */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Département</label>
              <select 
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="all">(tous)</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Deuxième ligne de filtres */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Site */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Site</label>
              <select 
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="all">(tous)</option>
                {sites.map(site => (
                  <option key={site} value={site}>{site}</option>
                ))}
              </select>
            </div>

            {/* Type de contrat */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type Contrat</label>
              <select 
                value={filterContract}
                onChange={(e) => setFilterContract(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="all">(tous)</option>
                {contracts.map(contract => (
                  <option key={contract} value={contract}>{contract}</option>
                ))}
              </select>
            </div>

            {/* Tri */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Trier par</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="name">Nom</option>
                <option value="department">Département</option>
                <option value="absences">Nb absences</option>
              </select>
            </div>

            {/* Résultats */}
            <div className="flex items-end">
              <div className="text-xs text-gray-600">
                {filteredEmployees.length} employé(s) affiché(s)
              </div>
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
                    {isHoliday(day) && <div className="text-xs text-red-600">FÉRIÉ</div>}
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
                          } ${absenceColorMap[absence]?.textColor || 'text-white'}`}
                               title={`${absenceColorMap[absence]?.name || absence} - ${employee.name}`}>
                            {absence}
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
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      getAbsenceCount(employee) > 5 ? 'bg-red-100 text-red-800' :
                      getAbsenceCount(employee) > 2 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {getAbsenceCount(employee)} j
                    </span>
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
  );
};

export default MonthlyPlanning;