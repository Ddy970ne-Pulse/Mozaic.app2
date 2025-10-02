import React, { useState, useEffect } from 'react';
import { october2025OnCallAssignments, testEmployees } from '../shared/october2025TestData';

const OnCallManagement = ({ user, onChangeView }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDates, setSelectedDates] = useState([]);
  const [onCallData, setOnCallData] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [selectionMode, setSelectionMode] = useState('week'); // 'week' par défaut pour les cadres
  const [hoveredWeek, setHoveredWeek] = useState(null);

  // Données mockées des employés avec catégories pour la démonstration
  const employees = [
    { 
      id: 1, 
      name: 'Sophie Martin', 
      category: 'management',
      categoryLabel: 'Encadrement',
      department: 'Direction',
      maxOnCallDays: 60, // CCN66: Maximum 60 jours d'astreinte par an pour l'encadrement
      currentOnCallDays: 25
    },
    { 
      id: 2, 
      name: 'Jean Dupont', 
      category: 'administrative',
      categoryLabel: 'Personnel Administratif',
      department: 'Administration',
      maxOnCallDays: 45, // CCN66: Maximum 45 jours pour le personnel administratif
      currentOnCallDays: 18
    },
    { 
      id: 3, 
      name: 'Marie Leblanc', 
      category: 'specialized_educators',
      categoryLabel: 'Éducateurs Spécialisés',
      department: 'Éducation',
      maxOnCallDays: 50, // CCN66: Maximum 50 jours pour les éducateurs spécialisés
      currentOnCallDays: 32
    },
    { 
      id: 4, 
      name: 'Pierre Moreau', 
      category: 'technical_educators',
      categoryLabel: 'Éducateurs Techniques',
      department: 'Technique',
      maxOnCallDays: 50,
      currentOnCallDays: 15
    },
    { 
      id: 5, 
      name: 'Claire Dubois', 
      category: 'administrative',
      categoryLabel: 'Personnel Administratif',
      department: 'Comptabilité',
      maxOnCallDays: 45,
      currentOnCallDays: 28
    }
  ];

  // Assignations d'astreintes octobre 2025
  const existingOnCallAssignments = [
    ...october2025OnCallAssignments.filter(assignment => {
      const assignmentDate = new Date(assignment.startDate);
      return assignmentDate.getMonth() === currentMonth && assignmentDate.getFullYear() === currentYear;
    })
  ];

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const years = [2024, 2025, 2026];

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  // Vérification des règles CCN66 et du droit du travail
  const validateOnCallAssignment = (employeeId, dates) => {
    const employee = employees.find(emp => emp.id === employeeId);
    const errors = [];

    if (!employee) {
      errors.push("Employé non trouvé");
      return errors;
    }

    // Vérification de la limite annuelle CCN66
    const totalDaysAfterAssignment = employee.currentOnCallDays + dates.length;
    if (totalDaysAfterAssignment > employee.maxOnCallDays) {
      errors.push(`⚠️ LIMITE CCN66 DÉPASSÉE: ${employee.name} dépasserait sa limite annuelle (${employee.maxOnCallDays} jours max, actuellement ${employee.currentOnCallDays} + ${dates.length} = ${totalDaysAfterAssignment})`);
    }

    // Vérification des superpositions de dates
    dates.forEach(date => {
      const existingAssignment = existingOnCallAssignments.find(assignment => {
        const assignmentStart = new Date(assignment.startDate);
        const assignmentEnd = new Date(assignment.endDate);
        const checkDate = new Date(date);
        return checkDate >= assignmentStart && checkDate <= assignmentEnd;
      });

      if (existingAssignment && existingAssignment.employeeId !== employeeId) {
        errors.push(`📅 CONFLIT DE DATES: Le ${date} est déjà assigné à ${existingAssignment.employeeName}`);
      }
    });

    // Note: Règle du repos de 48h retirée à la demande de l'utilisateur

    return errors;
  };

  // Obtenir le numéro de semaine d'une date (dimanche = début de semaine)
  const getWeekNumber = (date) => {
    const dayOfWeek = date.getDay(); // 0 = dimanche, 6 = samedi
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - dayOfWeek); // Revenir au dimanche
    return `${startOfWeek.getFullYear()}-W${Math.ceil(startOfWeek.getDate() / 7)}-${startOfWeek.getMonth()}`;
  };

  // Obtenir toutes les dates d'une semaine (dimanche au samedi)
  const getWeekDates = (day) => {
    const date = new Date(currentYear, currentMonth, day);
    const dayOfWeek = date.getDay(); // 0 = dimanche, 6 = samedi
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - dayOfWeek); // Dimanche
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      
      // Vérifier si la date est dans le mois courant
      if (currentDate.getMonth() === currentMonth) {
        weekDates.push(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`);
      }
    }
    return weekDates;
  };

  const handleDateClick = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (selectionMode === 'single') {
      // Mode jour unique
      if (selectedDates.includes(dateStr)) {
        setSelectedDates(selectedDates.filter(date => date !== dateStr));
      } else {
        setSelectedDates([...selectedDates, dateStr]);
      }
    } else if (selectionMode === 'week') {
      // Mode semaine complète (dimanche au samedi)
      const weekDates = getWeekDates(day);
      const allSelected = weekDates.every(date => selectedDates.includes(date));
      
      if (allSelected) {
        // Désélectionner toute la semaine
        setSelectedDates(selectedDates.filter(date => !weekDates.includes(date)));
      } else {
        // Sélectionner toute la semaine
        const newSelection = [...new Set([...selectedDates, ...weekDates])];
        setSelectedDates(newSelection);
      }
    }
  };

  const handleDateHover = (day) => {
    if (selectionMode === 'week') {
      setHoveredWeek(getWeekNumber(new Date(currentYear, currentMonth, day)));
    }
  };

  const handleDateLeave = () => {
    setHoveredWeek(null);
  };

  const handleAssignOnCall = () => {
    if (!selectedEmployee || selectedDates.length === 0) {
      setValidationErrors(['Veuillez sélectionner un employé et au moins une date']);
      return;
    }

    const errors = validateOnCallAssignment(parseInt(selectedEmployee), selectedDates);
    setValidationErrors(errors);

    if (errors.length === 0) {
      // Ici, on ajouterait la logique pour sauvegarder l'assignation
      alert(`Astreinte assignée avec succès à ${employees.find(emp => emp.id === parseInt(selectedEmployee))?.name} pour ${selectedDates.length} jour(s)`);
      setSelectedEmployee('');
      setSelectedDates([]);
      setShowAssignModal(false);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Cases vides pour les jours précédents
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    // Cases des jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = selectedDates.includes(dateStr);
      const isWeekend = new Date(currentYear, currentMonth, day).getDay() === 0 || new Date(currentYear, currentMonth, day).getDay() === 6;
      
      // Vérifier s'il y a déjà une assignation ce jour
      const existingAssignment = existingOnCallAssignments.find(assignment => {
        const assignmentStart = new Date(assignment.startDate);
        const assignmentEnd = new Date(assignment.endDate);
        const dayDate = new Date(dateStr);
        return dayDate >= assignmentStart && dayDate <= assignmentEnd;
      });

      const currentDate = new Date(currentYear, currentMonth, day);
      const currentWeek = getWeekNumber(currentDate);
      const isHoveredWeek = hoveredWeek === currentWeek && selectionMode === 'week';
      const weekDates = getWeekDates(day);
      const isWeekFullySelected = weekDates.length > 0 && weekDates.every(date => selectedDates.includes(date));

      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(day)}
          onMouseEnter={() => handleDateHover(day)}
          onMouseLeave={handleDateLeave}
          className={`
            h-8 w-8 flex items-center justify-center text-sm cursor-pointer rounded-md transition-all select-none relative
            ${isSelected ? 'bg-orange-500 text-white font-bold' : ''}
            ${existingAssignment ? 'bg-red-200 text-red-800' : ''}
            ${isWeekend && !existingAssignment && !isSelected ? 'bg-blue-100 text-blue-800' : ''}
            ${isHoveredWeek && !existingAssignment && !isSelected ? 'bg-orange-200 border-2 border-orange-400' : ''}
            ${isWeekFullySelected && selectionMode === 'week' ? 'ring-2 ring-orange-300' : ''}
            ${!isSelected && !existingAssignment && !isWeekend && !isHoveredWeek ? 'hover:bg-gray-200' : ''}
          `}
          title={
            existingAssignment 
              ? `Assigné à ${existingAssignment.employeeName}` 
              : selectionMode === 'week' 
                ? `Semaine du ${getWeekDates(day)[0]?.split('-').reverse().join('/')} (dim-sam)`
                : `Sélection jour unique`
          }
        >
          {day}
          {/* Indicateur de sélection semaine */}
          {selectionMode === 'week' && isWeekFullySelected && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
          )}
        </div>
      );
    }

    return days;
  };

  const exportSecurityCompanyPlanning = () => {
    // Génération du planning au format du document de référence
    const monthName = months[currentMonth];
    const assignments = existingOnCallAssignments.filter(assignment => {
      const assignmentDate = new Date(assignment.startDate);
      return assignmentDate.getMonth() === currentMonth && assignmentDate.getFullYear() === currentYear;
    });

    // Création du contenu au format du PDF de référence
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>ASTREINTES CADRES ${monthName.toUpperCase()} ${currentYear}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .organization { font-size: 12px; margin-bottom: 10px; }
          .title { font-size: 18px; font-weight: bold; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid black; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .signature { margin-top: 50px; text-align: right; }
          .date-created { font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="organization">
            ASSOCIATION POUR L'AIDE À L'ENFANCE ET À L'ADOLESCENCE<br>
            CENTRE D'ADAPTATION À LA VIE ACTIVE (CAVA)<br>
            Adresse: 123 Rue de l'Innovation, 75001 Paris<br>
            Tél: 01.XX.XX.XX.XX - Email: contact@cava.fr
          </div>
          <div class="title">ASTREINTES CADRES</div>
          <div class="title">${monthName.toUpperCase()} ${currentYear}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 25%">Employé</th>
              <th style="width: 25%">${monthName.toUpperCase()}</th>
              <th style="width: 25%">Contact</th>
              <th style="width: 25%">Remarques</th>
            </tr>
          </thead>
          <tbody>`;

    // Ajouter tous les employés, même ceux sans astreintes
    employees.forEach(employee => {
      const employeeAssignments = assignments.filter(a => a.employeeId === employee.id);
      let periodsText = '';
      
      if (employeeAssignments.length > 0) {
        periodsText = employeeAssignments.map(assignment => {
          const startDate = new Date(assignment.startDate);
          const endDate = new Date(assignment.endDate);
          
          if (assignment.startDate === assignment.endDate) {
            // Jour unique
            return `${startDate.getDate().toString().padStart(2, '0')}/${(startDate.getMonth() + 1).toString().padStart(2, '0')}`;
          } else {
            // Période
            return `${startDate.getDate().toString().padStart(2, '0')}/${(startDate.getMonth() + 1).toString().padStart(2, '0')} au ${endDate.getDate().toString().padStart(2, '0')}/${(endDate.getMonth() + 1).toString().padStart(2, '0')}`;
          }
        }).join('<br>');
      }

      htmlContent += `
            <tr>
              <td><strong>${employee.name.toUpperCase()}</strong></td>
              <td>${periodsText}</td>
              <td>06.XX.XX.XX.XX</td>
              <td>${employee.categoryLabel}</td>
            </tr>`;
    });

    htmlContent += `
          </tbody>
        </table>
        
        <div class="signature">
          <p>Le Directeur</p>
          <br><br><br>
          <p>Signature et cachet</p>
          <div class="date-created">
            Document créé le ${new Date().toLocaleDateString('fr-FR')}
          </div>
        </div>
      </body>
      </html>`;

    // Créer et télécharger le fichier HTML
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ASTREINTES_CADRES_${monthName.toUpperCase()}_${currentYear}.html`;
    a.click();
    window.URL.revokeObjectURL(url);

    alert(`Planning d'astreintes exporté au format officiel pour ${monthName} ${currentYear}`);
    setShowExportModal(false);
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec titre et contrôles */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              🔔 Gestion des Astreintes
            </h1>
            <p className="text-gray-600">
              Planification et suivi des astreintes - Conforme CCN66 et droit du travail
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Sélection mois/année */}
            <select 
              value={currentMonth}
              onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
            >
              {months.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
            
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            {(currentMonth !== 9 || currentYear !== 2025) && (
              <button
                onClick={() => {
                  setCurrentMonth(9); // Octobre
                  setCurrentYear(2025);
                  alert('🧪 Basculé sur Octobre 2025 avec données de test complètes !');
                }}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm transition-colors"
              >
                🧪 Test Oct 2025
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{employees.length}</div>
          <div className="text-sm text-gray-600">Employés éligibles</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-orange-600">{existingOnCallAssignments.length}</div>
          <div className="text-sm text-gray-600">Astreintes planifiées</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {employees.reduce((sum, emp) => sum + emp.currentOnCallDays, 0)}
          </div>
          <div className="text-sm text-gray-600">Jours d'astreinte (année)</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-red-600">
            {employees.filter(emp => (emp.currentOnCallDays / emp.maxOnCallDays) > 0.8).length}
          </div>
          <div className="text-sm text-gray-600">Employés proche limite</div>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex flex-wrap gap-3">
        <button 
          onClick={() => setShowAssignModal(true)}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all"
        >
          ➕ Assigner Astreinte
        </button>
        <button 
          onClick={() => setShowExportModal(true)}
          className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition-all"
        >
          📤 Export Sécurité
        </button>
        <button 
          onClick={() => onChangeView('monthly-planning')}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg font-medium transition-all"
        >
          📅 Voir Planning Mensuel
        </button>
      </div>

      {/* Calendrier principal */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Calendrier d'astreintes - {months[currentMonth]} {currentYear}
          </h2>
          
          {/* Mode de sélection - Privilégier semaine pour cadres */}
          <div className="flex items-center space-x-2 mt-3 md:mt-0">
            <span className="text-sm text-gray-600">Astreintes Cadres :</span>
            <button
              onClick={() => {
                setSelectionMode('week');
                setSelectedDates([]);
                setHoveredWeek(null);
              }}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                selectionMode === 'week' 
                  ? 'bg-orange-500 text-white shadow-md' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📆 Semaine Complète (Dim→Sam)
            </button>
            <button
              onClick={() => {
                setSelectionMode('single');
                setSelectedDates([]);
                setHoveredWeek(null);
              }}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                selectionMode === 'single' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Mode jour unique pour astreintes exceptionnelles"
            >
              📅 Jour Unique
            </button>
          </div>
        </div>
        
        {/* Légende et instructions */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-4 mb-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span>Dates sélectionnées</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-200 rounded"></div>
              <span>Astreintes assignées</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 rounded"></div>
              <span>Week-ends</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Semaine complète</span>
            </div>
          </div>
          <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
            💡 <strong>Mode Astreintes Cadres:</strong> 
            {selectionMode === 'week' 
              ? ' Cliquez sur n\'importe quel jour d\'une semaine pour assigner l\'astreinte complète (Dimanche → Samedi). Mode recommandé pour les cadres.'
              : ' Mode jour unique activé - Cliquez sur les dates individuelles pour les astreintes exceptionnelles.'
            }
          </div>
        </div>

        {/* Sélection rapide des semaines courantes */}
        {selectionMode === 'week' && (
          <div className="mb-4 p-3 bg-orange-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">🚀 Sélection rapide semaines :</div>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const today = new Date();
                const currentDate = new Date(currentYear, currentMonth, 1);
                const weeks = [];
                
                // Générer les 4 premières semaines du mois
                for (let week = 0; week < 4; week++) {
                  const startOfWeek = new Date(currentDate);
                  startOfWeek.setDate(1 + (week * 7));
                  
                  // Trouver le dimanche de cette semaine
                  const dayOfWeek = startOfWeek.getDay();
                  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
                  
                  // Vérifier que le dimanche est dans le mois courant ou proche
                  if (startOfWeek.getMonth() === currentMonth || 
                      (startOfWeek.getMonth() === currentMonth - 1 && startOfWeek.getDate() > 25)) {
                    
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                    
                    weeks.push({
                      start: startOfWeek,
                      end: endOfWeek,
                      label: `Sem. ${week + 1}`,
                      dates: getWeekDates(startOfWeek.getDate() > 0 ? startOfWeek.getDate() : 1)
                    });
                  }
                }
                
                return weeks.map((week, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      const newSelection = [...new Set([...selectedDates, ...week.dates])];
                      setSelectedDates(newSelection);
                    }}
                    className="px-3 py-1 bg-white border border-orange-300 rounded-lg text-sm hover:bg-orange-100 transition-colors"
                  >
                    {week.label} ({week.start.getDate()}/{week.start.getMonth() + 1})
                  </button>
                ));
              })()}
              <button
                onClick={() => setSelectedDates([])}
                className="px-3 py-1 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
              >
                🗑️ Vider
              </button>
            </div>
          </div>
        )}

        {/* En-têtes des jours */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day, index) => (
            <div key={day} className={`h-8 flex items-center justify-center text-sm font-medium ${
              index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
            }`}>
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendrier */}
        <div className="grid grid-cols-7 gap-1">
          {renderCalendar()}
        </div>
      </div>

      {/* Liste des employés avec leur quota */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Suivi des quotas d'astreinte (CCN66)
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-700 font-medium">Employé</th>
                <th className="text-left py-2 px-3 text-gray-700 font-medium">Catégorie</th>
                <th className="text-center py-2 px-3 text-gray-700 font-medium">Jours utilisés</th>
                <th className="text-center py-2 px-3 text-gray-700 font-medium">Limite CCN66</th>
                <th className="text-center py-2 px-3 text-gray-700 font-medium">Disponible</th>
                <th className="text-center py-2 px-3 text-gray-700 font-medium">% Utilisé</th>
                <th className="text-center py-2 px-3 text-gray-700 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(employee => {
                const percentage = (employee.currentOnCallDays / employee.maxOnCallDays) * 100;
                const remaining = employee.maxOnCallDays - employee.currentOnCallDays;
                
                return (
                  <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium text-gray-900">{employee.name}</td>
                    <td className="py-3 px-3 text-gray-600">{employee.categoryLabel}</td>
                    <td className="py-3 px-3 text-center font-medium">{employee.currentOnCallDays}</td>
                    <td className="py-3 px-3 text-center">{employee.maxOnCallDays}</td>
                    <td className="py-3 px-3 text-center font-medium text-green-600">{remaining}</td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-12 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${percentage > 80 ? 'bg-red-500' : percentage > 60 ? 'bg-orange-500' : 'bg-green-500'}`}
                            style={{width: `${Math.min(percentage, 100)}%`}}
                          ></div>
                        </div>
                        <span className="text-xs">{percentage.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {percentage > 80 ? (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">⚠️ Limite proche</span>
                      ) : percentage > 60 ? (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">⚡ Attention</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">✅ Disponible</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal d'assignation */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Assigner une astreinte
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employé
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Sélectionner un employé</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.categoryLabel}) - {employee.maxOnCallDays - employee.currentOnCallDays} jours disponibles
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Période sélectionnée
                </label>
                <div className="text-sm text-gray-600">
                  {selectedDates.length > 0 ? (
                    <>
                      {selectionMode === 'week' ? (
                        <div>
                          {/* Grouper les dates par semaine */}
                          {(() => {
                            const weeks = {};
                            selectedDates.forEach(dateStr => {
                              const date = new Date(dateStr);
                              const weekKey = getWeekNumber(date);
                              if (!weeks[weekKey]) weeks[weekKey] = [];
                              weeks[weekKey].push(dateStr);
                            });
                            
                            return Object.entries(weeks).map(([weekKey, dates]) => {
                              const sortedDates = dates.sort();
                              const startDate = sortedDates[0];
                              const endDate = sortedDates[sortedDates.length - 1];
                              return (
                                <div key={weekKey} className="mb-1 p-2 bg-orange-50 rounded">
                                  <strong>📆 Semaine:</strong> {startDate} → {endDate}
                                  <span className="text-orange-600 ml-2">({dates.length} jour(s))</span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      ) : (
                        <div>
                          📅 <strong>Jours individuels:</strong> {selectedDates.sort().join(', ')}
                        </div>
                      )}
                      <div className="mt-2 text-blue-600 font-medium">
                        🕐 Total: {selectedDates.length} jour(s) d'astreinte
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-400 italic">
                      Aucune période sélectionnée
                      <br />
                      <span className="text-xs">
                        Retournez au calendrier pour sélectionner des {selectionMode === 'week' ? 'semaines' : 'jours'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h4 className="font-medium text-red-800 mb-2">Erreurs de validation:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedEmployee('');
                  setSelectedDates([]);
                  setValidationErrors([]);
                }}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAssignOnCall}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                Assigner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'export pour l'entreprise de sécurité */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📤 Export Planning Sécurité
            </h3>
            
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                Ce planning sera envoyé à l'entreprise de sécurité pour le suivi des astreintes.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-medium text-blue-800 mb-2">Contenu du fichier:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Dates et employés de garde</li>
                  <li>• Numéros de contact d'astreinte</li>
                  <li>• Contacts de secours</li>
                  <li>• Période: {months[currentMonth]} {currentYear}</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={exportSecurityCompanyPlanning}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                📥 Télécharger CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnCallManagement;