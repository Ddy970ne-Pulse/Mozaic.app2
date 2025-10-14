import React, { useState, useEffect } from 'react';
import { calculateLeaveDeduction, validateLeaveCalculation, generateLeaveReport, LeaveCalculatorUtils } from '../shared/congesCalculatorSafe';
import { ABSENCE_DEDUCTION_RULES, calculateAbsenceDeduction, validateAbsenceLimits, generateAbsenceReport } from '../shared/absenceRulesSafe';
import { getRequests, subscribe } from '../shared/requestsData';
import { getOnCallDataForMonthlyPlanning, onCallBandColor } from '../shared/onCallData';
import { getHolidaysCached } from '../utils/holidays';
import { ModuleHeader, Button, Message } from './shared/UIComponents';

const MonthlyPlanningFinal = ({ user, onChangeView }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [isTestMode, setIsTestMode] = useState(false);
  const [showLegendDetails, setShowLegendDetails] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [printFormat, setPrintFormat] = useState('A4'); // A4 ou A3
  
  // Nouvelle fonctionnalité : Période personnalisée
  const [useCustomPeriod, setUseCustomPeriod] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [onCallData, setOnCallData] = useState({});

  // États pour la fonctionnalité d'ajout d'absence interactif
  const [addAbsenceMode, setAddAbsenceMode] = useState(false);
  const [selectedAbsenceType, setSelectedAbsenceType] = useState('CA');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [absenceNotes, setAbsenceNotes] = useState('');
  const [creatingAbsence, setCreatingAbsence] = useState(false);

  // États pour les nouvelles fonctionnalités avancées
  // 1. Multi-sélection d'employés
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  
  // 2. Modification/Suppression
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedAbsenceForEdit, setSelectedAbsenceForEdit] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // 3. Copier-Coller
  const [copiedAbsence, setCopiedAbsence] = useState(null);
  const [showPasteIndicator, setShowPasteIndicator] = useState(false);
  
  // 4. Templates
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Liste complète des 21 motifs d'absence selon l'image
  const absenceColorMap = {
    // Niveau 1 : PRIORITÉ ABSOLUE - Absences médicales (interrompent tout)
    'AT': { name: 'Accident du travail / Trajet', color: 'bg-red-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires', skipWeekends: false, skipHolidays: false, priority: 1 },
    'MPRO': { name: 'Maladie Professionnelle', color: 'bg-red-600', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires', skipWeekends: false, skipHolidays: false, priority: 2 },
    'AM': { name: 'Arrêt maladie', color: 'bg-red-400', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires', skipWeekends: false, skipHolidays: false, priority: 3 },
    'EMAL': { name: 'Enfants malades', color: 'bg-pink-400', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires', skipWeekends: false, skipHolidays: false, priority: 4 },
    
    // Niveau 2 : PRIORITÉ TRÈS HAUTE - Congés familiaux légaux
    'MAT': { name: 'Congé maternité', color: 'bg-pink-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Calendaires', skipWeekends: false, skipHolidays: false, priority: 5 },
    'PAT': { name: 'Congé paternité', color: 'bg-blue-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Calendaires', skipWeekends: false, skipHolidays: false, priority: 6 },
    'FAM': { name: 'Evènement familiale', color: 'bg-purple-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires', skipWeekends: false, skipHolidays: false, priority: 7 },
    
    // Niveau 3 : PRIORITÉ HAUTE - Absences planifiées
    'STG': { name: 'Stage', color: 'bg-teal-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Calendaires', skipWeekends: false, skipHolidays: false, priority: 8 },
    'FO': { name: 'Congé formation', color: 'bg-indigo-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables', skipWeekends: true, skipHolidays: true, priority: 9 },
    
    // Niveau 4 : PRIORITÉ MOYENNE-HAUTE - Congés payés
    'CA': { name: 'Congés annuels', color: 'bg-blue-400', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrables', skipWeekends: true, skipHolidays: true, priority: 10 },
    'CP': { name: 'Congés Payés', color: 'bg-blue-300', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrables', skipWeekends: true, skipHolidays: true, priority: 11 },
    'CT': { name: 'Congés Trimestriels', color: 'bg-green-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrés', skipWeekends: true, skipHolidays: true, priority: 12 },
    'CEX': { name: 'Congé exceptionnel', color: 'bg-violet-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables', skipWeekends: true, skipHolidays: true, priority: 13 },
    
    // Niveau 5 : PRIORITÉ MOYENNE - Récupérations et RTT
    'RTT': { name: 'RTT', color: 'bg-green-400', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrés', skipWeekends: true, skipHolidays: true, priority: 14 },
    'REC': { name: 'Récupération', color: 'bg-yellow-400', textColor: 'text-black', type: 'Absence Programmée', decompte: 'Jours Ouvrables', skipWeekends: true, skipHolidays: true, priority: 15 },
    
    // Niveau 6 : PRIORITÉ MOYENNE-BASSE - Télétravail et délégation
    'TEL': { name: 'Télétravail', color: 'bg-yellow-300', textColor: 'text-black', type: 'Absentéisme', decompte: 'Jours Ouvrables', skipWeekends: true, skipHolidays: true, priority: 16 },
    'DEL': { name: 'Délégation', color: 'bg-orange-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables', skipWeekends: true, skipHolidays: true, priority: 17 },
    
    // Niveau 7 : PRIORITÉ BASSE - Repos
    'RH': { name: 'Repos Hebdomadaire', color: 'bg-cyan-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrables', skipWeekends: false, skipHolidays: false, priority: 18 },
    'RHD': { name: 'Repos Dominical', color: 'bg-cyan-400', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Calendaires', skipWeekends: false, skipHolidays: false, priority: 19 },
    
    // Niveau 8 : PRIORITÉ MINIMALE - Absences non justifiées
    'NAUT': { name: 'Absence non autorisée', color: 'bg-gray-600', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires', skipWeekends: false, skipHolidays: false, priority: 20 },
    'AUT': { name: 'Absence autorisée', color: 'bg-gray-400', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires', skipWeekends: false, skipHolidays: false, priority: 21 },
    'CSS': { name: 'Congés Sans Solde', color: 'bg-gray-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables', skipWeekends: true, skipHolidays: true, priority: 22 },
    
    // Niveau 9 : CAS SPÉCIAUX
    'RMED': { name: 'Rendez-vous médical', color: 'bg-emerald-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrés', skipWeekends: true, skipHolidays: true, priority: 23 },
    'AST': { name: 'Astreinte', color: 'bg-orange-600', textColor: 'text-white', type: 'Astreinte cadres', decompte: 'Temps travaillé', skipWeekends: false, skipHolidays: false, priority: 24 },
    'NAUT': { name: 'Absence non autorisée', color: 'bg-gray-600', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires', skipWeekends: false, skipHolidays: false },
    'AUT': { name: 'Absence autorisée', color: 'bg-gray-400', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires', skipWeekends: false, skipHolidays: false },
    'FAM': { name: 'Evènement familiale', color: 'bg-purple-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires', skipWeekends: false, skipHolidays: false },
    'MAT': { name: 'Congé maternité', color: 'bg-pink-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Calendaires', skipWeekends: false, skipHolidays: false },
    'PAT': { name: 'Congé paternité', color: 'bg-blue-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Calendaires', skipWeekends: false, skipHolidays: false },
    'CA': { name: 'Congés annuels', color: 'bg-blue-400', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrables', skipWeekends: true, skipHolidays: true },
    'FO': { name: 'Congé formation', color: 'bg-indigo-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables', skipWeekends: true, skipHolidays: true },
    'CSS': { name: 'Congés Sans Solde', color: 'bg-gray-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables', skipWeekends: true, skipHolidays: true },
    'CT': { name: 'Congés Trimestriels', color: 'bg-green-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrés', skipWeekends: true, skipHolidays: true },
    'REC': { name: 'Récupération', color: 'bg-yellow-400', textColor: 'text-black', type: 'Absence Programmée', decompte: 'Jours Ouvrables', skipWeekends: true, skipHolidays: true },
    'RH': { name: 'Repos Hebdomadaire', color: 'bg-cyan-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrables', skipWeekends: false, skipHolidays: false },
    'RHD': { name: 'Repos Dominical', color: 'bg-cyan-400', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Calendaires', skipWeekends: false, skipHolidays: false },
    'TEL': { name: 'Télétravail', color: 'bg-yellow-300', textColor: 'text-black', type: 'Absentéisme', decompte: 'Jours Ouvrables', skipWeekends: true, skipHolidays: true },
    'DEL': { name: 'Délégation', color: 'bg-orange-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables', skipWeekends: true, skipHolidays: true },
    'STG': { name: 'Stage', color: 'bg-teal-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Calendaires', skipWeekends: false, skipHolidays: false },
    'CEX': { name: 'Congé exceptionnel', color: 'bg-violet-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables', skipWeekends: true, skipHolidays: true },
    'MPRO': { name: 'Maladie Professionnelle', color: 'bg-red-600', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires', skipWeekends: false, skipHolidays: false },
    'EMAL': { name: 'Enfants malades', color: 'bg-pink-400', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires', skipWeekends: false, skipHolidays: false },
    'RMED': { name: 'Rendez-vous médical', color: 'bg-emerald-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrés', skipWeekends: true, skipHolidays: true },
    'AST': { name: 'Astreinte', color: 'bg-orange-600', textColor: 'text-white', type: 'Astreinte cadres', decompte: 'Temps travaillé', skipWeekends: false, skipHolidays: false },
    'CP': { name: 'Congés Payés', color: 'bg-blue-300', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrables', skipWeekends: true, skipHolidays: true },
    'RTT': { name: 'RTT', color: 'bg-green-400', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrés', skipWeekends: true, skipHolidays: true }
  };

  // 🎉 SYSTÈME DYNAMIQUE: Jours fériés calculés automatiquement pour l'année sélectionnée
  // useMemo pour recalculer quand selectedYear change
  const currentHolidays = React.useMemo(() => {
    console.log(`🔄 Recalculating holidays for year ${selectedYear}...`);
    const result = getHolidaysCached(selectedYear);
    console.log(`📅 Jours fériés ${selectedYear}:`, result.dates.length, 'jours', result.dates);
    return result;
  }, [selectedYear]);
  
  const holidays = currentHolidays.dates;
  const holidayNames = currentHolidays.names;

  // Initialisation des employés par catégorie
  useEffect(() => {
    // Load real employees from database instead of hardcoded data
    const loadEmployees = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        console.log('👥 Loading employees from database...');
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const users = await response.json();
          console.log(`✅ Loaded ${users.length} employees`);
          
          // Sort users: Cadres first, then others alphabetically
          const sortedUsers = users.sort((a, b) => {
            const aIsCadre = (a.categorie_employe || '').toLowerCase().includes('cadre');
            const bIsCadre = (b.categorie_employe || '').toLowerCase().includes('cadre');
            
            // Cadres come first
            if (aIsCadre && !bIsCadre) return -1;
            if (!aIsCadre && bIsCadre) return 1;
            
            // Within same group, sort alphabetically by name
            return (a.name || '').localeCompare(b.name || '');
          });
          
          // Convert users to employee format for planning
          const employeesData = sortedUsers.map(user => ({
            id: user.id,
            name: user.name,
            category: user.department || 'Non spécifié',
            categorie_employe: user.categorie_employe || '',
            isCadre: (user.categorie_employe || '').toLowerCase().includes('cadre'),
            absences: {},
            totalAbsenceDays: 0
          }));
          
          setEmployees(employeesData);
          console.log('✅ Employees loaded and ready for absences');
        } else {
          console.error('Failed to load employees');
          setEmployees([]); // Empty array if no data
        }
      } catch (error) {
        console.error('Error loading employees:', error);
        setEmployees([]);
      }
    };

    loadEmployees();
  }, []);

  // Load imported absences when employees are ready AND month/year changes
  useEffect(() => {
    // Only load if employees are already loaded
    if (employees.length === 0) {
      console.log('⏳ Waiting for employees to load before loading absences');
      return;
    }
    
    const loadAndMergeAllAbsences = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('⚠️ No token found, skipping absence import');
          return;
        }

        const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/api/absences/by-period/${selectedYear}/${selectedMonth + 1}`;
        console.log(`📥 Loading imported absences for ${selectedYear}-${selectedMonth + 1}`);
        console.log(`📞 API URL: ${apiUrl}`);
        const response = await fetch(
          apiUrl,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        let importedAbsences = [];
        if (response.ok) {
          importedAbsences = await response.json();
          console.log(`✅ Loaded ${importedAbsences.length} imported absences for ${selectedMonth + 1}/${selectedYear}`);
          if (importedAbsences.length > 0) {
            console.log('📋 Sample absences:', importedAbsences.slice(0, 3).map(a => ({
              name: a.employee_name,
              date_debut: a.date_debut,
              motif: a.motif_absence
            })));
          }
        } else {
          console.error('❌ Failed to load imported absences:', response.status);
        }
        
        // Charger aussi les demandes d'absence approuvées
        const requestsData = getRequests();
        const approvedRequests = Array.isArray(requestsData) ? requestsData.filter(r => r.status === 'approved') : [];
        console.log(`✅ Loaded ${approvedRequests.length} approved requests`);
        if (approvedRequests.length > 0) {
          console.log('📋 Sample requests:', approvedRequests.slice(0, 3).map(r => ({
            employee: r.employee,
            startDate: r.startDate,
            endDate: r.endDate,
            type: r.type
          })));
        }
        
        // FUSION: Appliquer toutes les absences en une seule fois
        applyAllAbsencesToPlanning(importedAbsences, approvedRequests);
        
      } catch (error) {
        console.error('❌ Error loading absences:', error);
      }
    };

    loadAndMergeAllAbsences();
  }, [employees, selectedYear, selectedMonth]);

  // Charger les astreintes
  useEffect(() => {
    const loadOnCallData = () => {
      try {
        const onCallDataForMonth = getOnCallDataForMonthlyPlanning(selectedMonth, selectedYear);
        setOnCallData(onCallDataForMonth);
      } catch (error) {
        console.error('Erreur chargement astreintes:', error);
        setOnCallData({});
      }
    };

    loadOnCallData();
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

  // Test data function removed - using real data only
  const loadOctober2025TestData_REMOVED = () => {
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

  // 🏛️ FONCTION DE RÉINTÉGRATION: Appelle l'API pour réintégrer des jours
  const reintegrateLeave = async (employee, absenceType, days, reason, interruptingType) => {
    // Vérifier si ce type d'absence doit être réintégré
    const reintegrableTypes = ['CA', 'CP', 'CT', 'RTT', 'REC', 'CEX'];
    if (!reintegrableTypes.includes(absenceType)) {
      return; // Ce type ne nécessite pas de réintégration
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/leave-balance/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employee_id: employee.id,
          leave_type: absenceType,
          operation: 'reintegrate',
          amount: days,
          reason: reason,
          interrupting_absence_type: interruptingType
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ ${employee.name} : ${days} jour(s) de ${absenceType} réintégré(s) (solde: ${result.balance_before} → ${result.balance_after})`);
        
        // Optionnel : Afficher une notification toast
        // showToast(`${employee.name} : ${days}j de ${absenceType} réintégrés`, 'success');
      } else {
        console.error(`❌ Erreur réintégration pour ${employee.name}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la réintégration:`, error);
    }
  };

  // 🔄 FONCTION UNIFIÉE: Applique TOUTES les absences (importées + demandes)
  // avec réinitialisation complète pour éviter pollution entre périodes
  const applyAllAbsencesToPlanning = (importedAbsences = [], approvedRequests = []) => {
    console.log(`🔄 Applying ALL absences for ${selectedMonth + 1}/${selectedYear}:`, 
                `${importedAbsences.length} imported + ${approvedRequests.length} requests`);
    
    setEmployees(prevEmployees => {
      if (!prevEmployees || prevEmployees.length === 0) {
        console.warn('⚠️ No employees loaded yet');
        return prevEmployees;
      }
      
      return prevEmployees.map(employee => {
        // 🚨 RÉINITIALISATION COMPLÈTE pour ce mois/année
        const newAbsences = {};
        let totalDays = 0;
        
        // SOURCE 1: Absences importées depuis Excel
        const employeeImportedAbsences = importedAbsences.filter(abs => 
          abs.employee_id === employee.id || 
          abs.employee_name === employee.name ||
          `${abs.nom} ${abs.prenom}`.trim() === employee.name
        );
        
        employeeImportedAbsences.forEach(absence => {
          try {
            const dateDebut = absence.date_debut;
            const dateFin = absence.date_fin;
            const motifAbsence = absence.motif_absence || 'AUT';
            
            if (!dateDebut) return;
            
            // Parse dates
            let startDate, endDate;
            if (dateDebut.includes('/')) {
              const [day, month, year] = dateDebut.split('/');
              startDate = new Date(year, month - 1, day);
            } else {
              startDate = new Date(dateDebut);
            }
            
            if (dateFin) {
              if (dateFin.includes('/')) {
                const [day, month, year] = dateFin.split('/');
                endDate = new Date(year, month - 1, day);
              } else {
                endDate = new Date(dateFin);
              }
            } else {
              const joursAbsence = parseInt(absence.jours_absence) || 1;
              endDate = new Date(startDate);
              endDate.setDate(startDate.getDate() + joursAbsence - 1);
            }
            
            // Générer toutes les dates SEULEMENT pour le mois/année affichés
            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
              const day = currentDate.getDate();
              const month = currentDate.getMonth();
              const year = currentDate.getFullYear();
              
              // ✅ BARRIÈRE STRICTE: Seulement si dans la période affichée
              if (month === selectedMonth && year === selectedYear) {
                // Map motif to code
                const motifMapping = {
                  'Congés Trimestriels': 'CT',
                  'Congés annuels': 'CA',
                  'Congés Annuels': 'CA',
                  'Arrêt maladie': 'AM',
                  'Arrêt Maladie': 'AM',
                  'Accident du travail': 'AT',
                  'Récupération': 'REC',
                  'RTT': 'REC',
                  'Télétravail': 'TEL',
                  'Formation': 'FO',
                  'Congé maternité': 'MAT',
                  'Congé paternité': 'PAT',
                  'Evènement familiale': 'FAM',
                  'Congé exceptionnel': 'CEX',
                  'Absence autorisée': 'AUT',
                  'Absence non autorisée': 'NAUT',
                  'Délégation': 'DEL',
                };
                
                const absenceCode = motifMapping[motifAbsence] || motifAbsence.toUpperCase().substring(0, 4);
                const absenceInfo = absenceColorMap[absenceCode];
                
                // 🚨 NOUVELLE LOGIQUE: Vérifier si on doit skip week-ends/jours fériés
                const shouldSkipThisDay = absenceInfo && (
                  (absenceInfo.skipWeekends && isWeekend(day, month, year)) ||
                  (absenceInfo.skipHolidays && isHoliday(day, month, year))
                );
                
                if (!shouldSkipThisDay) {
                  const existingAbsence = newAbsences[day.toString()];
                  const existingInfo = existingAbsence ? absenceColorMap[existingAbsence] : null;
                  
                  // 🏛️ RÈGLE DE PRIORITÉ: Vérifier si la nouvelle absence peut remplacer l'existante
                  const canOverride = !existingAbsence || 
                                     (absenceInfo && existingInfo && absenceInfo.priority < existingInfo.priority);
                  
                  if (canOverride) {
                    if (existingAbsence && absenceInfo.priority < existingInfo.priority) {
                      console.log(`⚠️ ${employee.name} - ${day}/${month + 1}: ${absenceCode} (priorité ${absenceInfo.priority}) remplace ${existingAbsence} (priorité ${existingInfo.priority})`);
                    }
                    newAbsences[day.toString()] = absenceCode;
                    if (!existingAbsence) totalDays++;
                  }
                }
              }
              
              currentDate.setDate(currentDate.getDate() + 1);
            }
          } catch (error) {
            console.error('❌ Error processing imported absence:', error);
          }
        });
        
        // SOURCE 2: Demandes d'absence approuvées
        const employeeRequests = approvedRequests.filter(req => 
          req.employee === employee.name
        );
        
        employeeRequests.forEach(request => {
          try {
            const startDate = new Date(request.startDate);
            const endDate = new Date(request.endDate);
            
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
              const day = d.getDate();
              const month = d.getMonth();
              const year = d.getFullYear();
              
              // ✅ BARRIÈRE STRICTE: Seulement si dans la période affichée
              if (month === selectedMonth && year === selectedYear) {
                const absenceCode = mapAbsenceTypeToCode(request.type);
                const absenceInfo = absenceColorMap[absenceCode];
                
                // 🚨 NOUVELLE LOGIQUE: Vérifier si on doit skip week-ends/jours fériés
                const shouldSkipThisDay = absenceInfo && (
                  (absenceInfo.skipWeekends && isWeekend(day, month, year)) ||
                  (absenceInfo.skipHolidays && isHoliday(day, month, year))
                );
                
                if (!shouldSkipThisDay) {
                  const existingAbsence = newAbsences[day.toString()];
                  const existingInfo = existingAbsence ? absenceColorMap[existingAbsence] : null;
                  
                  // 🏛️ RÈGLE DE PRIORITÉ: Vérifier si la nouvelle absence peut remplacer l'existante
                  const canOverride = !existingAbsence || 
                                     (absenceInfo && existingInfo && absenceInfo.priority < existingInfo.priority);
                  
                  if (canOverride) {
                    if (existingAbsence && absenceInfo.priority < existingInfo.priority) {
                      console.log(`⚠️ ${employee.name} - ${day}/${month + 1}: ${absenceCode} (priorité ${absenceInfo.priority}) remplace ${existingAbsence} (priorité ${existingInfo.priority})`);
                    }
                    newAbsences[day.toString()] = absenceCode;
                    if (!existingAbsence) totalDays++;
                  }
                }
              }
            }
          } catch (error) {
            console.error('❌ Error processing request:', error);
          }
        });
        
        console.log(`   → ${employee.name}: ${totalDays} jours d'absence en ${selectedMonth + 1}/${selectedYear}`);
        
        // 💰 APPLIQUER LES RÉINTÉGRATIONS: Après avoir traité tous les jours
        if (employee.replacedAbsences && Object.keys(employee.replacedAbsences).length > 0) {
          Object.entries(employee.replacedAbsences).forEach(([absenceType, data]) => {
            const daysToReintegrate = data.count;
            const interruptedBy = data.interruptedBy;
            const reason = `Interrompu par ${interruptedBy} (${daysToReintegrate} jour(s)) en ${selectedMonth + 1}/${selectedYear}`;
            
            // Appeler l'API de réintégration (asynchrone mais on ne bloque pas l'UI)
            reintegrateLeave(employee, absenceType, daysToReintegrate, reason, interruptedBy);
          });
          
          // Nettoyer pour le prochain traitement
          delete employee.replacedAbsences;
        }
        
        return {
          ...employee,
          absences: newAbsences,
          totalAbsenceDays: totalDays
        };
      });
    });
  };

  // Update planning from imported absences (Excel imports)
  const updatePlanningFromImportedAbsences = (absencesList) => {
    if (!Array.isArray(absencesList) || absencesList.length === 0) {
      console.log('📭 Aucune absence importée à traiter');
      return;
    }
    
    console.log(`🔄 Processing ${absencesList.length} imported absences for month ${selectedMonth + 1}/${selectedYear}`);
    
    setEmployees(prevEmployees => {
      if (!prevEmployees || prevEmployees.length === 0) {
        console.warn('⚠️ No employees loaded yet, cannot apply absences');
        return prevEmployees;
      }
      
      console.log(`👥 Applying absences to ${prevEmployees.length} employees`);
      
      return prevEmployees.map(employee => {
        // Find absences for this employee by ID or name
        const employeeAbsences = absencesList.filter(abs => 
          abs.employee_id === employee.id || 
          abs.employee_name === employee.name ||
          `${abs.nom} ${abs.prenom}`.trim() === employee.name
        );
        
        if (employeeAbsences.length > 0) {
          console.log(`✅ Found ${employeeAbsences.length} absences for ${employee.name}`, employeeAbsences);
        }
        
        // ⚠️ RÉINITIALISER les absences pour éviter pollution entre périodes
        // Les absences sont spécifiques au mois/année affichés
        const newAbsences = {};
        let totalDays = 0;
        
        employeeAbsences.forEach(absence => {
          try {
            const dateDebut = absence.date_debut;
            const dateFin = absence.date_fin;
            const motifAbsence = absence.motif_absence || 'AUT';
            
            if (!dateDebut) {
              console.warn('⚠️ Absence sans date_debut:', absence);
              return;
            }
            
            // Parse start date (format DD/MM/YYYY or YYYY-MM-DD)
            let startDate;
            if (dateDebut.includes('/')) {
              const [day, month, year] = dateDebut.split('/');
              startDate = new Date(year, month - 1, day);
            } else {
              startDate = new Date(dateDebut);
            }
            
            // Parse end date if available (calculated by backend)
            let endDate;
            if (dateFin) {
              if (dateFin.includes('/')) {
                const [day, month, year] = dateFin.split('/');
                endDate = new Date(year, month - 1, day);
              } else {
                endDate = new Date(dateFin);
              }
            } else {
              // Fallback: use jours_absence
              const joursAbsence = parseInt(absence.jours_absence) || 1;
              endDate = new Date(startDate);
              endDate.setDate(startDate.getDate() + joursAbsence - 1);
            }
            
            console.log(`📅 Processing absence: ${employee.name} - ${motifAbsence} from ${dateDebut} to ${dateFin || 'calculated'}`);
            
            // Generate all dates for the absence period
            const currentDate = new Date(startDate);
            let daysAdded = 0;
            
            while (currentDate <= endDate) {
              const day = currentDate.getDate();
              const month = currentDate.getMonth();
              const year = currentDate.getFullYear();
              
              // Only add if it's in the selected month/year
              if (month === selectedMonth && year === selectedYear) {
                // Map motif text to absence code
                const motifMapping = {
                  'Congés Trimestriels': 'CT',
                  'Congés annuels': 'CA',
                  'Congés Annuels': 'CA',
                  'Arrêt maladie': 'AM',
                  'Arrêt Maladie': 'AM',
                  'Accident du travail': 'AT',
                  'Récupération': 'REC',
                  'RTT': 'REC',
                  'Télétravail': 'TEL',
                  'Formation': 'FO',
                  'Congé formation': 'FO',
                  'Congé maternité': 'MAT',
                  'Congé paternité': 'PAT',
                  'Evènement familiale': 'FAM',
                  'Congé exceptionnel': 'CEX',
                  'Absence autorisée': 'AUT',
                  'Absence non autorisée': 'NAUT',
                  'Délégation': 'DEL',
                  'Stage': 'STG',
                  'Maladie Professionnelle': 'MPRO',
                  'Enfants malades': 'EMAL',
                  'Rendez-vous médical': 'RMED',
                  'Repos Hebdomadaire': 'RH',
                  'Repos Dominical': 'RHD',
                  'Congés Sans Solde': 'CSS'
                };
                
                const absenceCode = motifMapping[motifAbsence] || motifAbsence.toUpperCase().substring(0, 4);
                const absenceInfo = absenceColorMap[absenceCode];
                
                // 🚨 NOUVELLE LOGIQUE: Vérifier si on doit skip week-ends/jours fériés
                const shouldSkipThisDay = absenceInfo && (
                  (absenceInfo.skipWeekends && isWeekend(day, month, year)) ||
                  (absenceInfo.skipHolidays && isHoliday(day, month, year))
                );
                
                if (!shouldSkipThisDay) {
                  const existingAbsence = newAbsences[day.toString()];
                  const existingInfo = existingAbsence ? absenceColorMap[existingAbsence] : null;
                  
                  // 🏛️ RÈGLE DE PRIORITÉ: Vérifier si la nouvelle absence peut remplacer l'existante
                  const canOverride = !existingAbsence || 
                                     (absenceInfo && existingInfo && absenceInfo.priority < existingInfo.priority);
                  
                  if (canOverride) {
                    if (existingAbsence && absenceInfo.priority < existingInfo.priority) {
                      console.log(`⚠️ ${employee.name} - ${day}/${month + 1}: ${absenceCode} (priorité ${absenceInfo.priority}) remplace ${existingAbsence} (priorité ${existingInfo.priority})`);
                      
                      // 💰 RÉINTÉGRATION: Comptabiliser les jours remplacés
                      if (!employee.replacedAbsences) employee.replacedAbsences = {};
                      if (!employee.replacedAbsences[existingAbsence]) {
                        employee.replacedAbsences[existingAbsence] = {
                          count: 0,
                          interruptedBy: absenceCode
                        };
                      }
                      employee.replacedAbsences[existingAbsence].count++;
                    }
                    newAbsences[day.toString()] = absenceCode;
                    if (!existingAbsence) totalDays++;
                    daysAdded++;
                  }
                }
              }
              
              // Move to next day
              currentDate.setDate(currentDate.getDate() + 1);
            }
            
            console.log(`   ✓ Added ${daysAdded} days to planning for ${employee.name}`);
            
          } catch (error) {
            console.error('❌ Erreur traitement absence importée:', error, absence);
          }
        });
        
        // 💰 APPLIQUER LES RÉINTÉGRATIONS: Après avoir traité toutes les absences importées
        if (employee.replacedAbsences && Object.keys(employee.replacedAbsences).length > 0) {
          Object.entries(employee.replacedAbsences).forEach(([absenceType, data]) => {
            const daysToReintegrate = data.count;
            const interruptedBy = data.interruptedBy;
            const reason = `Interrompu par ${interruptedBy} (${daysToReintegrate} jour(s)) en ${selectedMonth + 1}/${selectedYear}`;
            
            // Appeler l'API de réintégration (asynchrone)
            reintegrateLeave(employee, absenceType, daysToReintegrate, reason, interruptedBy);
          });
          
          // Nettoyer pour le prochain traitement
          delete employee.replacedAbsences;
        }
        
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
    if (useCustomPeriod && customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    }
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  };

  const getDateRange = () => {
    if (useCustomPeriod && customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      const dates = [];
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push({
          day: d.getDate(),
          month: d.getMonth(),
          year: d.getFullYear(),
          fullDate: new Date(d)
        });
      }
      return dates;
    }
    
    // Mode mensuel classique
    const days = [];
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month: selectedMonth,
        year: selectedYear,
        fullDate: new Date(selectedYear, selectedMonth, i)
      });
    }
    return days;
  };

  const getDayOfWeek = (day) => {
    return new Date(selectedYear, selectedMonth, day).getDay();
  };

  const isWeekend = (day, month = selectedMonth, year = selectedYear) => {
    const date = new Date(year, month, day);
    return date.getDay() === 0 || date.getDay() === 6;
  };

  const isHoliday = (day, month = selectedMonth, year = selectedYear) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.includes(dateStr);
  };

  const getHolidayName = (day) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidayNames[dateStr] || '';
  };

  const getDayName = (dateObj) => {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    if (typeof dateObj === 'object' && dateObj.fullDate) {
      return days[dateObj.fullDate.getDay()];
    }
    // Fallback pour compatibilité
    const date = new Date(selectedYear, selectedMonth, dateObj);
    return days[date.getDay()];
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

  // Fonctions pour l'ajout d'absence interactif
  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatDateISO = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const calculateDaysBetween = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 pour inclure le dernier jour
    return diffDays;
  };

  const handleEmployeeClick = (employee) => {
    if (!addAbsenceMode) return;
    
    setSelectedEmployee(employee);
    setSelectionStart(null);
    setSelectionEnd(null);
    setHoveredDate(null);
  };

  const handleDateCellClick = (day) => {
    if (!addAbsenceMode || !selectedEmployee) return;

    const clickedDate = formatDateISO(selectedYear, selectedMonth, day);

    if (!selectionStart) {
      // Premier clic : définir la date de début
      setSelectionStart(clickedDate);
    } else if (!selectionEnd) {
      // Deuxième clic : définir la date de fin et ouvrir le modal
      const start = new Date(selectionStart);
      const end = new Date(clickedDate);
      
      if (end < start) {
        // Si la date de fin est avant la date de début, inverser
        setSelectionStart(clickedDate);
        setSelectionEnd(selectionStart);
      } else {
        setSelectionEnd(clickedDate);
      }
      
      setShowConfirmModal(true);
    }
  };

  const handleDateCellHover = (day) => {
    if (!addAbsenceMode || !selectedEmployee || !selectionStart || selectionEnd) return;
    
    const hoveredDateStr = formatDateISO(selectedYear, selectedMonth, day);
    setHoveredDate(hoveredDateStr);
  };

  const shouldHighlightCell = (day) => {
    if (!addAbsenceMode || !selectedEmployee || !selectionStart) return false;

    const currentDate = formatDateISO(selectedYear, selectedMonth, day);
    const start = new Date(selectionStart);
    const end = hoveredDate ? new Date(hoveredDate) : null;
    const current = new Date(currentDate);

    if (!end) return currentDate === selectionStart;

    const minDate = start < end ? start : end;
    const maxDate = start < end ? end : start;

    return current >= minDate && current <= maxDate;
  };

  const handleConfirmAbsence = async () => {
    setCreatingAbsence(true);
    
    try {
      const token = localStorage.getItem('token');
      const startDate = selectionStart < selectionEnd ? selectionStart : selectionEnd;
      const endDate = selectionStart < selectionEnd ? selectionEnd : selectionStart;
      const days = calculateDaysBetween(startDate, endDate);

      const absenceData = {
        employee_id: selectedEmployee.id,
        employee_name: selectedEmployee.name,
        email: selectedEmployee.email,
        motif_absence: selectedAbsenceType,
        jours_absence: String(days),
        date_debut: startDate,
        date_fin: endDate,
        notes: absenceNotes || `Absence ajoutée via planning par ${user.name}`,
        status: 'approved',
        created_by: user.id
      };

      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/absences`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(absenceData)
        }
      );

      if (response.ok) {
        alert(`✅ Absence créée avec succès pour ${selectedEmployee.name}`);
        
        // Réinitialiser
        setShowConfirmModal(false);
        setSelectedEmployee(null);
        setSelectionStart(null);
        setSelectionEnd(null);
        setAbsenceNotes('');
        setAddAbsenceMode(false);
        
        // Recharger les données
        loadAbsences();
      } else {
        const errorData = await response.json();
        alert(`❌ Erreur lors de la création: ${errorData.detail || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('Erreur création absence:', error);
      alert(`❌ Erreur: ${error.message}`);
    } finally {
      setCreatingAbsence(false);
    }
  };

  const handleCancelSelection = () => {
    setShowConfirmModal(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    setAbsenceNotes('');
  };

  // Fonction pour forcer le rechargement des absences
  const loadAbsences = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/api/absences/by-period/${selectedYear}/${selectedMonth + 1}`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const importedAbsences = await response.json();
        const requestsData = getRequests();
        const approvedRequests = Array.isArray(requestsData) ? requestsData.filter(r => r.status === 'approved') : [];
        applyAllAbsencesToPlanning(importedAbsences, approvedRequests);
      }
    } catch (error) {
      console.error('Error reloading absences:', error);
    }
  };

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
            
            /* Cellules du tableau - ESPACEMENT OPTIMISÉ pour 30 employés */
            .planning-table td { 
              border: 1px solid #d1d5db;
              padding: ${printFormat === 'A4' ? '3px 2px' : '5px 3px'};
              text-align: center; 
              vertical-align: middle;
              background: white;
              line-height: 1.2;
            }
            
            /* Colonne employé - COMPACTE pour 30 salariés */
            .employee-name { 
              text-align: left !important;
              width: ${printFormat === 'A4' ? '85px' : '120px'}; 
              font-weight: 600;
              background: white !important;
              font-size: ${printFormat === 'A4' ? '8px' : '10px'};
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
            
            /* Légende COMPACTE - optimisée pour 30 salariés */
            .legend-section { 
              margin-top: ${printFormat === 'A4' ? '12px' : '15px'}; 
              page-break-inside: avoid;
              border-top: 1px solid #d1d5db;
              padding-top: ${printFormat === 'A4' ? '8px' : '10px'};
            }
            .legend-title {
              font-size: ${printFormat === 'A4' ? '9px' : '11px'};
              font-weight: 600;
              color: #374151;
              margin-bottom: ${printFormat === 'A4' ? '4px' : '6px'};
              text-align: center;
            }
            
            /* FORCE des couleurs à l'impression - SOLUTION RENFORCÉE */
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            /* MODE IMPRESSION : Couleurs renforcées pour visibility papier */
            @media print {
              /* Règles générales impression */
              .absence-badge, .legend-badge {
                border: 2px solid #000 !important;
                font-weight: 900 !important;
                font-size: ${printFormat === 'A4' ? '9px' : '11px'} !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              /* COULEURS SOMBRES SPÉCIFIQUES POUR IMPRESSION */
              .absence-CA, .legend-CA { 
                background-color: #1e3a8a !important; 
                color: white !important;
                border: 2px solid #1e3a8a !important;
              }
              .absence-AM, .legend-AM { 
                background-color: #b91c1c !important; 
                color: white !important;
                border: 2px solid #b91c1c !important;
              }
              .absence-REC, .legend-REC { 
                background-color: #166534 !important; 
                color: white !important;
                border: 2px solid #166534 !important;
              }
              .absence-AST, .legend-AST { 
                background-color: #9a3412 !important; 
                color: white !important;
                border: 2px solid #9a3412 !important;
              }
              .absence-DEL, .legend-DEL { 
                background-color: #581c87 !important; 
                color: white !important;
                border: 2px solid #581c87 !important;
              }
              .absence-TEL, .legend-TEL { 
                background-color: #0f766e !important; 
                color: white !important;
                border: 2px solid #0f766e !important;
              }
              .absence-CT, .legend-CT { 
                background-color: #c2410c !important; 
                color: white !important;
                border: 2px solid #c2410c !important;
              }
              .absence-AT, .legend-AT { 
                background-color: #7c2d12 !important; 
                color: white !important;
                border: 2px solid #7c2d12 !important;
              }
              .absence-MAT, .legend-MAT { 
                background-color: #be185d !important; 
                color: white !important;
                border: 2px solid #be185d !important;
              }
              .absence-FO, .legend-FO { 
                background-color: #365314 !important; 
                color: white !important;
                border: 2px solid #365314 !important;
              }
            }
            
            /* COULEURS ÉCRAN (normales) - plus claires pour interface */
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
                border: 1px solid rgba(0,0,0,0.2) !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }`;
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
    const dateRange = getDateRange();
    const totalEmployees = Object.values(groupedEmployees).reduce((acc, emps) => acc + emps.length, 0);
    
    // Titre adaptatif selon le mode
    let periodTitle;
    if (useCustomPeriod && customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      const startStr = startDate.toLocaleDateString('fr-FR');
      const endStr = endDate.toLocaleDateString('fr-FR');
      periodTitle = `Planning Personnalisé - ${startStr} au ${endStr}`;
    } else {
      periodTitle = `Planning Mensuel - ${monthNames[selectedMonth]} ${selectedYear}`;
    }
    
    let content = `
      <div class="page-header">
        <h1>${periodTitle}</h1>
        <div class="subtitle">MOZAIK RH • ${totalEmployees} employés • ${Object.keys(groupedEmployees).length} départements • ${dateRange.length} jours</div>
      </div>
    `;

    // Calculer combien d'employés par page (optimisé pour 30 salariés)
    const employeesPerPage = printFormat === 'A4' ? 18 : 30;
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
            <h1>${periodTitle} (suite)</h1>
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
            ${dateRange.map(dateObj => {
              const dayName = getDayName(dateObj);
              const isWknd = isWeekend(dateObj.day, dateObj.month, dateObj.year);
              const isHol = isHoliday(dateObj.day, dateObj.month, dateObj.year);
              let headerClass = 'day-header';
              if (isWknd) headerClass += ' weekend-header';
              if (isHol) headerClass += ' holiday-header';
              
              return `<th class="${headerClass}">
                <div style="font-weight: bold; margin-bottom: 1px;">${dayName}</div>
                <div style="font-size: ${printFormat === 'A4' ? '10px' : '12px'};">
                  ${useCustomPeriod ? `${dateObj.day}/${dateObj.month + 1}` : dateObj.day}
                </div>
                ${isHol ? '<div style="color: #dc2626; font-weight: bold; font-size: 8px;">F</div>' : ''}
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
              <td class="category-header" colspan="${dateRange.length + 2}">${item.name}</td>
            </tr>
          `;
        } else {
          // Ligne employé avec alternance
          content += '<tr>';
          content += `<td class="employee-name">${item.name}</td>`;
          content += `<td class="absence-days">${item.totalAbsenceDays}</td>`;
          
          dateRange.forEach(dateObj => {
            const dayKey = useCustomPeriod ? 
              `${dateObj.year}-${String(dateObj.month + 1).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}` :
              dateObj.day.toString();
            
            const absence = item.absences[dayKey] || item.absences[dateObj.day.toString()];
            const isWknd = isWeekend(dateObj.day, dateObj.month, dateObj.year);
            const isHol = isHoliday(dateObj.day, dateObj.month, dateObj.year);
            
            // Vérifier si ce jour fait partie d'une semaine d'astreinte
            const dateStr = `${dateObj.year}-${String(dateObj.month + 1).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`;
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
    // Légende COMPACTE avec codes couleur - optimisée pour 30 salariés
    const mainCodes = ['CA', 'AM', 'REC', 'AST', 'DEL', 'TEL', 'MAT', 'AT', 'FO', 'CT', 'RTT', 'CSS'];
    
    // Helper pour obtenir la couleur d'impression
    const getPrintColor = (code) => {
      const printColors = {
        'CA': '#1e3a8a', 'AM': '#b91c1c', 'REC': '#166534', 'AST': '#9a3412',
        'DEL': '#581c87', 'TEL': '#0f766e', 'CT': '#c2410c', 'AT': '#7c2d12',
        'MAT': '#be185d', 'FO': '#365314', 'RTT': '#1e40af', 'CSS': '#4b5563'
      };
      return printColors[code] || '#6b7280';
    };
    
    return `
      <div class="legend-section">
        <div class="legend-title">Codes d'Absence</div>
        <div style="display: flex; flex-wrap: wrap; gap: ${printFormat === 'A4' ? '8px' : '10px'}; justify-content: space-between; margin-top: 6px;">
          ${mainCodes.filter(code => absenceColorMap[code]).map(code => {
            const info = absenceColorMap[code];
            const printColor = getPrintColor(code);
            
            return `
              <div style="display: flex; align-items: center; min-width: ${printFormat === 'A4' ? '140px' : '160px'}; font-size: ${printFormat === 'A4' ? '7px' : '8px'};">
                <span style="
                  display: inline-block;
                  width: ${printFormat === 'A4' ? '14px' : '16px'};
                  height: ${printFormat === 'A4' ? '14px' : '16px'};
                  background-color: ${printColor};
                  border: 1px solid #000;
                  border-radius: 2px;
                  margin-right: 4px;
                  flex-shrink: 0;
                "></span>
                <span style="font-weight: bold; margin-right: 3px;">${code}</span>
                <span style="color: #374151; line-height: 1.1;">${info.name}</span>
              </div>
            `;
          }).join('')}
        </div>
        <div style="margin-top: 6px; font-size: ${printFormat === 'A4' ? '6px' : '7px'}; color: #6b7280; text-align: center;">
          Planning ${new Date().toLocaleDateString('fr-FR')} • MOZAIK RH • CCN66
        </div>
      </div>
    `;
  };

  const renderCalendar = () => {
    const dateRange = getDateRange();
    
    // Validation pour période personnalisée
    if (useCustomPeriod && (!customStartDate || !customEndDate)) {
      return (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-500">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-lg font-medium mb-2">Période personnalisée</h3>
            <p>Veuillez sélectionner une date de début et une date de fin pour afficher le planning.</p>
          </div>
        </div>
      );
    }

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
              {dateRange.map((dateObj, index) => {
                const dayName = getDayName(dateObj);
                const isWknd = isWeekend(dateObj.day, dateObj.month, dateObj.year);
                const isHol = isHoliday(dateObj.day, dateObj.month, dateObj.year);
                
                return (
                  <th 
                    key={`${dateObj.year}-${dateObj.month}-${dateObj.day}`} 
                    className={`border border-gray-200 px-1 py-2 text-center text-xs font-medium min-w-[32px] ${
                      isWknd ? 'bg-gray-100 text-gray-500' : 
                      isHol ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="font-bold">{dayName}</div>
                    <div className="text-sm">
                      {useCustomPeriod ? `${dateObj.day}/${dateObj.month + 1}` : dateObj.day}
                    </div>
                    {isHol && <div className="text-xs text-red-500 font-bold">F</div>}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {/* Cadres Section */}
            {(() => {
              const cadres = employees.filter(emp => emp.isCadre);
              if (cadres.length > 0) {
                return (
                  <React.Fragment>
                    <tr className="bg-gradient-to-r from-purple-100 to-purple-50 border-t-4 border-purple-500">
                      <td colSpan={dateRange.length + 2} className="border border-gray-200 px-3 py-3 font-bold text-purple-900 text-center text-sm">
                        👔 CADRES ({cadres.length})
                      </td>
                    </tr>
                    {cadres.map((employee, index) => (
                      <tr key={employee.id} className={index % 2 === 0 ? 'bg-purple-25' : 'bg-white'}>
                        <td 
                          className={`border border-gray-200 px-3 py-2 sticky left-0 z-10 transition-all duration-150 ${
                            addAbsenceMode && selectedEmployee?.id === employee.id
                              ? 'bg-purple-100 ring-2 ring-purple-400'
                              : 'bg-white'
                          } ${
                            addAbsenceMode ? 'cursor-pointer hover:bg-purple-50' : ''
                          }`}
                          onClick={() => handleEmployeeClick(employee)}
                        >
                          <div className="font-semibold text-sm text-gray-800 flex items-center">
                            <span className={`mr-2 ${
                              addAbsenceMode && selectedEmployee?.id === employee.id
                                ? 'text-purple-600 text-lg'
                                : 'text-purple-600'
                            }`}>
                              {addAbsenceMode && selectedEmployee?.id === employee.id ? '✓' : '●'}
                            </span>
                            {employee.name}
                          </div>
                        </td>
                        <td className="border border-gray-200 px-2 py-2 text-center font-bold text-lg">
                          {employee.totalAbsenceDays}
                        </td>
                        {dateRange.map((dateObj, index) => {
                          const dayKey = useCustomPeriod ? 
                            `${dateObj.year}-${String(dateObj.month + 1).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}` :
                            dateObj.day.toString();
                          
                          const absence = employee.absences[dayKey] || employee.absences[dateObj.day.toString()];
                          const isWknd = isWeekend(dateObj.day, dateObj.month, dateObj.year);
                          const isHol = isHoliday(dateObj.day, dateObj.month, dateObj.year);
                          
                          const dateStr = `${dateObj.year}-${String(dateObj.month + 1).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`;
                          const hasOnCall = isInOnCallWeek(employee.id, dateStr);
                          
                          const displayCode = absence || (hasOnCall ? 'AST' : null);
                          const codeInfo = displayCode ? absenceColorMap[displayCode] : null;
                          const isHighlighted = shouldHighlightCell(dateObj.day);
                          const isClickable = addAbsenceMode && selectedEmployee && employee.id === selectedEmployee.id;
                          
                          return (
                            <td 
                              key={`${dateObj.year}-${dateObj.month}-${dateObj.day}`} 
                              className={`border border-gray-200 px-1 py-1 text-center text-xs transition-all duration-150 ${
                                isWknd && !displayCode ? 'bg-gray-50' : 
                                isHol && !displayCode ? 'bg-red-25' : ''
                              } ${
                                isHighlighted ? 'bg-green-200 ring-2 ring-green-400' : ''
                              } ${
                                isClickable ? 'cursor-pointer hover:bg-blue-100' : ''
                              }`}
                              onClick={() => isClickable && handleDateCellClick(dateObj.day)}
                              onMouseEnter={() => isClickable && handleDateCellHover(dateObj.day)}
                            >
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
                    {/* Separator row */}
                    <tr className="bg-gray-200">
                      <td colSpan={dateRange.length + 2} className="border-t-2 border-b-2 border-gray-400 py-1"></td>
                    </tr>
                  </React.Fragment>
                );
              }
              return null;
            })()}
            
            {/* Other Employees by Category */}
            {Object.entries(groupedEmployees).map(([category, categoryEmployees]) => {
              // Filter out cadres (already displayed above)
              const nonCadres = categoryEmployees.filter(emp => !emp.isCadre);
              if (nonCadres.length === 0) return null;
              
              return (
                <React.Fragment key={category}>
                  <tr className="bg-blue-50">
                    <td colSpan={dateRange.length + 2} className="border border-gray-200 px-3 py-2 font-bold text-blue-800 text-center">
                      {category}
                    </td>
                  </tr>
                  
                  {nonCadres.map((employee, index) => (
                    <tr key={employee.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}>
                      <td 
                        className={`border border-gray-200 px-3 py-2 sticky left-0 z-10 transition-all duration-150 ${
                          addAbsenceMode && selectedEmployee?.id === employee.id
                            ? 'bg-purple-100 ring-2 ring-purple-400'
                            : 'bg-white'
                        } ${
                          addAbsenceMode ? 'cursor-pointer hover:bg-purple-50' : ''
                        }`}
                        onClick={() => handleEmployeeClick(employee)}
                      >
                        <div className="font-semibold text-sm text-gray-800 flex items-center">
                          <span className={`mr-2 ${
                            addAbsenceMode && selectedEmployee?.id === employee.id
                              ? 'text-purple-600 text-lg'
                              : 'text-purple-600'
                          }`}>
                            {addAbsenceMode && selectedEmployee?.id === employee.id ? '✓' : '●'}
                          </span>
                          {employee.name}
                        </div>
                      </td>
                      <td className="border border-gray-200 px-2 py-2 text-center font-bold text-lg">
                        {employee.totalAbsenceDays}
                      </td>
                      {dateRange.map((dateObj, index) => {
                        const dayKey = useCustomPeriod ? 
                          `${dateObj.year}-${String(dateObj.month + 1).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}` :
                          dateObj.day.toString();
                        
                        const absence = employee.absences[dayKey] || employee.absences[dateObj.day.toString()];
                        const isWknd = isWeekend(dateObj.day, dateObj.month, dateObj.year);
                        const isHol = isHoliday(dateObj.day, dateObj.month, dateObj.year);
                        
                        const dateStr = `${dateObj.year}-${String(dateObj.month + 1).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`;
                        const hasOnCall = isInOnCallWeek(employee.id, dateStr);
                        
                        const displayCode = absence || (hasOnCall ? 'AST' : null);
                        const codeInfo = displayCode ? absenceColorMap[displayCode] : null;
                        const isHighlighted = shouldHighlightCell(dateObj.day);
                        const isClickable = addAbsenceMode && selectedEmployee && employee.id === selectedEmployee.id;
                        
                        return (
                          <td 
                            key={`${dateObj.year}-${dateObj.month}-${dateObj.day}`} 
                            className={`border border-gray-200 px-1 py-1 text-center text-xs transition-all duration-150 ${
                              isWknd && !displayCode ? 'bg-gray-50' : 
                              isHol && !displayCode ? 'bg-red-25' : ''
                            } ${
                              isHighlighted ? 'bg-green-200 ring-2 ring-green-400' : ''
                            } ${
                              isClickable ? 'cursor-pointer hover:bg-blue-100' : ''
                            }`}
                            onClick={() => isClickable && handleDateCellClick(dateObj.day)}
                            onMouseEnter={() => isClickable && handleDateCellHover(dateObj.day)}
                          >
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
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header avec sélecteurs - Style Harmonisé */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg mb-6">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-3">
          <span>📅</span>
          <span>Planning Mensuel</span>
        </h1>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          {/* Toggle période personnalisée */}
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useCustomPeriod}
                onChange={(e) => {
                  setUseCustomPeriod(e.target.checked);
                  if (!e.target.checked) {
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }
                }}
                className="w-4 h-4 text-white bg-white/20 border-white/30 rounded focus:ring-white/50"
              />
              <span className="text-sm font-medium text-white">Période personnalisée</span>
            </label>
          </div>
          
          {/* Sélecteurs de période */}
          {useCustomPeriod ? (
            <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20">
              <span className="text-sm font-medium text-white">Du :</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 border border-white/30 bg-white/10 text-white rounded text-sm focus:ring-2 focus:ring-white/50 placeholder-white/60"
              />
              <span className="text-sm font-medium text-white">au :</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 border border-white/30 bg-white/10 text-white rounded text-sm focus:ring-2 focus:ring-white/50 placeholder-white/60"
              />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              {/* Sélecteur d'année */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-white">Année :</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 bg-white text-gray-800 border border-white/30 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white shadow-sm"
                >
                  {generateYearOptions().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              {/* Sélecteur de mois */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-white">Mois :</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-3 py-2 bg-white text-gray-800 border border-white/30 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white shadow-sm"
                >
                  {monthNames.map((month, index) => (
                    <option key={index} value={index}>{month}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Barre d'outils d'ajout d'absence (Admin uniquement) */}
      {user?.role === 'admin' && (
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6 border-2 border-purple-200">
          <div className="flex flex-wrap items-center gap-4">
            {/* Bouton Mode Ajout */}
            <button
              onClick={() => {
                setAddAbsenceMode(!addAbsenceMode);
                if (!addAbsenceMode) {
                  setSelectedEmployee(null);
                  setSelectionStart(null);
                  setSelectionEnd(null);
                  setHoveredDate(null);
                }
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                addAbsenceMode
                  ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {addAbsenceMode ? '✓ Mode Ajout Activé' : '➕ Activer Mode Ajout'}
            </button>

            {/* Sélecteur de type d'absence */}
            {addAbsenceMode && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Type d'absence :</label>
                  <select
                    value={selectedAbsenceType}
                    onChange={(e) => setSelectedAbsenceType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="CA">Congés Annuels</option>
                    <option value="CT">Congés Trimestriels</option>
                    <option value="RTT">RTT</option>
                    <option value="REC">Récupération</option>
                    <option value="AM">Arrêt Maladie</option>
                    <option value="AT">Accident du travail</option>
                    <option value="MAT">Congé Maternité</option>
                    <option value="PAT">Congé Paternité</option>
                    <option value="FAM">Événement Familial</option>
                    <option value="FO">Formation</option>
                    <option value="STG">Stage</option>
                    <option value="TEL">Télétravail</option>
                    <option value="CSS">Congés Sans Solde</option>
                    <option value="CEX">Congé Exceptionnel</option>
                  </select>
                </div>

                {/* Indicateur d'état */}
                <div className="flex items-center gap-2 text-sm">
                  {!selectedEmployee && (
                    <span className="text-gray-600">
                      👉 Étape 1 : Cliquez sur un employé
                    </span>
                  )}
                  {selectedEmployee && !selectionStart && (
                    <span className="text-purple-600 font-medium">
                      👤 {selectedEmployee.name} sélectionné → Cliquez sur la date de début
                    </span>
                  )}
                  {selectedEmployee && selectionStart && !selectionEnd && (
                    <span className="text-green-600 font-medium">
                      📅 {formatDateForDisplay(selectionStart)} → Cliquez sur la date de fin
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Barre d'actions harmonisées */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => setShowLegendDetails(!showLegendDetails)}
          className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 shadow-lg transition-all duration-200"
          title={showLegendDetails ? 'Masquer Légende' : 'Afficher Légende'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
        
        <div className="relative">
          <button
            onClick={() => setShowPrintOptions(!showPrintOptions)}
            className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 shadow-lg transition-all duration-200"
            title="Options d'impression"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
            </svg>
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
              
              <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded">
                <div className="text-sm font-medium text-orange-800 mb-2">🎨 COULEURS RENFORCÉES POUR IMPRESSION</div>
                <div className="text-xs text-orange-700 mb-2">
                  Les couleurs sont automatiquement assombries à l'impression pour un meilleur contraste sur papier.
                </div>
                <div className="text-xs text-orange-600">
                  <strong>Activez les arrière-plans dans votre navigateur :</strong><br/>
                  • Chrome/Edge : ☑️ Graphiques d'arrière-plan<br/>
                  • Firefox : ☑️ Imprimer les arrière-plans<br/>
                  • Safari : ☑️ Imprimer les arrière-plans
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
          className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 shadow-lg transition-all duration-200"
          title="Export Complet"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
        
        <button
          onClick={() => {
            console.log('Actualisation demandée, requests:', requests);
            updatePlanningFromRequests(requests);
          }}
          className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 shadow-lg transition-all duration-200"
          title="Actualiser depuis Demandes"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        
        <button
          onClick={() => {
            if (typeof onChangeView === 'function') {
              onChangeView('on-call-management');
            }
          }}
          className="p-3 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white hover:from-pink-600 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 shadow-lg transition-all duration-200"
          title="Gérer Astreintes"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM19 12V7a7 7 0 00-14 0v5l-2 3v1h18v-1l-2-3z" />
          </svg>
        </button>

        {/* Test October 2025 button removed - production mode only */}
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

      {/* Modal de confirmation d'ajout d'absence */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Confirmer l'ajout d'absence
            </h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">👤 Employé :</span>
                <span className="font-semibold">{selectedEmployee?.name}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-gray-600">📝 Type :</span>
                <span className="font-semibold">{absenceColorMap[selectedAbsenceType]?.name}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-gray-600">📅 Période :</span>
                <span className="font-semibold">
                  Du {formatDateForDisplay(selectionStart < selectionEnd ? selectionStart : selectionEnd)}
                  {' '}au {formatDateForDisplay(selectionStart < selectionEnd ? selectionEnd : selectionStart)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-gray-600">⏱️ Durée :</span>
                <span className="font-semibold">
                  {calculateDaysBetween(selectionStart, selectionEnd)} jour(s)
                </span>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optionnel) :
                </label>
                <textarea
                  value={absenceNotes}
                  onChange={(e) => setAbsenceNotes(e.target.value)}
                  placeholder="Ajoutez des notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  rows="3"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleCancelSelection}
                disabled={creatingAbsence}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmAbsence}
                disabled={creatingAbsence}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {creatingAbsence ? '⏳ Création...' : '✓ Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyPlanningFinal;