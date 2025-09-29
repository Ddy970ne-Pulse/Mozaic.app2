import React, { useState } from 'react';
import { calculateLeaveDeduction, validateLeaveCalculation, generateLeaveReport, LeaveCalculatorUtils } from '../shared/congesCalculatorSafe';
import { ABSENCE_DEDUCTION_RULES, calculateAbsenceDeduction, validateAbsenceLimits, generateAbsenceReport } from '../shared/absenceRulesSafe';

const MonthlyPlanningAdvanced = ({ user }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sortBy, setSortBy] = useState('name');
  const [showLegendDetails, setShowLegendDetails] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Carte complète des codes d'absence avec couleurs
  const absenceColorMap = {
    // Congés et repos
    'CA': { name: 'Congés Annuels', color: 'bg-blue-500', textColor: 'text-white', type: 'Congés', decompte: 'Jours Ouvrables' },
    'RTT': { name: 'RTT', color: 'bg-green-500', textColor: 'text-white', type: 'Repos', decompte: 'Jours Calendaires' },
    'REC': { name: 'Récupération', color: 'bg-cyan-500', textColor: 'text-white', type: 'Récup', decompte: 'Heures' },
    
    // Arrêts et absences médicales
    'AT': { name: 'Arrêt de Travail', color: 'bg-red-500', textColor: 'text-white', type: 'Absence Médicale', decompte: 'Jours Ouvrables' },
    'AM': { name: 'Arrêt Maladie', color: 'bg-red-600', textColor: 'text-white', type: 'Absence Médicale', decompte: 'Jours Ouvrables' },
    
    // Congés familiaux
    'MAT': { name: 'Congé Maternité', color: 'bg-pink-500', textColor: 'text-white', type: 'Congé Familial', decompte: 'Jours Calendaires' },
    'PAT': { name: 'Congé Paternité', color: 'bg-blue-600', textColor: 'text-white', type: 'Congé Familial', decompte: 'Jours Calendaires' },
    'FAM': { name: 'Congé Familial', color: 'bg-purple-500', textColor: 'text-white', type: 'Congé Familial', decompte: 'Jours Ouvrables' }
  };

  // Jours fériés 2025
  const holidays2025 = [
    '2025-01-01', // Jour de l'An
    '2025-04-21', // Lundi de Pâques
    '2025-05-01', // Fête du Travail
    '2025-05-08', // Victoire 1945
    '2025-05-29', // Ascension
    '2025-06-09', // Lundi de Pentecôte
    '2025-07-14', // Fête Nationale
    '2025-08-15', // Assomption
    '2025-11-01', // Toussaint
    '2025-11-11', // Armistice
    '2025-12-25'  // Noël
  ];

  // Données d'employés avec absences
  const employees = [
    {
      id: 1,
      name: 'Sophie Martin',
      department: 'RH',
      role: 'Responsable RH',
      absences: {
        '15': 'CA', '16': 'CA', '17': 'CA',
        '22': 'RTT',
        '28': 'REC'
      }
    },
    {
      id: 2,
      name: 'Jean Dupont',
      department: 'IT',
      role: 'Développeur',
      absences: {
        '10': 'AT', '11': 'AT',
        '25': 'CA', '26': 'CA'
      }
    },
    {
      id: 3,
      name: 'Marie Durand',
      department: 'Comptabilité',
      role: 'Comptable',
      absences: {
        '5': 'MAT', '6': 'MAT', '7': 'MAT', '8': 'MAT', '9': 'MAT',
        '12': 'MAT', '13': 'MAT', '14': 'MAT', '15': 'MAT'
      }
    },
    {
      id: 4,
      name: 'Pierre Moreau',
      department: 'Commercial',
      role: 'Responsable Ventes',
      absences: {
        '18': 'PAT', '19': 'PAT',
        '29': 'FAM'
      }
    }
  ];

  // Fonction de calcul sécurisé pour n'importe quel type d'absence
  const calculateAnyAbsenceDeduction = (employee, day, absenceCode) => {
    try {
      const dayNum = parseInt(day);
      const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Pour les congés annuels, utiliser le calculateur spécialisé
      if (absenceCode === 'CA') {
        const startDate = dateStr;
        const endDate = dateStr; // Calcul jour par jour
        const calculation = calculateLeaveDeduction(startDate, endDate, holidays2025, []);
        const validation = validateLeaveCalculation(calculation);
        
        return {
          absenceCode,
          rules: { name: 'Congés Annuels', legalBasis: 'Art. L3141-3' },
          calculation: {
            ...calculation,
            unit: 'jour(s)',
            legalBasis: 'Art. L3141-3'
          },
          validation,
          dayInfo: {
            isWeekend: isWeekend(currentMonth, dayNum),
            isHoliday: isHoliday(dayNum),
            holidayName: getHolidayName(dayNum)
          },
          displayInfo: {
            willBeDeducted: calculation.actuallyDeducted > 0,
            deductionType: 'working_days',
            payrollImpact: 'paid'
          }
        };
      }
      
      // Pour tous les autres types d'absence
      const absenceRules = ABSENCE_DEDUCTION_RULES[absenceCode];
      if (!absenceRules) {
        console.warn(`Règles d'absence non définies pour le code: ${absenceCode}`);
        return null;
      }
      
      const calculation = calculateAbsenceDeduction(absenceCode, dateStr, dateStr, holidays2025);
      if (!calculation || !calculation.isValid) {
        console.warn(`Calcul d'absence échoué pour: ${absenceCode}`);
        return null;
      }
      
      const validation = validateAbsenceLimits(absenceCode, calculation, employee.employeeData || {});
      
      return {
        absenceCode,
        rules: {
          name: absenceRules.name,
          legalBasis: absenceRules.legalBasis
        },
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
          payrollImpact: calculation.payrollImpact
        }
      };
      
    } catch (error) {
      console.error(`Erreur lors du calcul d'absence pour ${absenceCode}:`, error);
      return null;
    }
  };

  // Utilitaires pour les jours
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const isWeekend = (date, day) => {
    const dayDate = new Date(date.getFullYear(), date.getMonth(), day);
    const dayOfWeek = dayDate.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Dimanche ou samedi
  };

  const isHoliday = (day) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays2025.includes(dateStr);
  };

  const getHolidayName = (day) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
    return holidayNames[dateStr] || '';
  };

  const getPayrollImpactDescription = (impact) => {
    const descriptions = {
      'paid': 'Maintien du salaire',
      'deducted': 'Déduction du salaire',
      'partial_coverage': 'Prise en charge partielle',
      'social_coverage': 'Prise en charge Sécurité Sociale',
      'neutral': 'Neutre (récupération)'
    };
    return descriptions[impact] || impact;
  };

  // Génération du rapport d'analyse
  const generateAnalysisReport = () => {
    let report = `📊 ANALYSE PLANNING MENSUEL - ${currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}\n\n`;
    
    const absenceStats = {};
    let totalAbsences = 0;
    
    employees.forEach(employee => {
      Object.entries(employee.absences).forEach(([day, absenceCode]) => {
        if (!absenceStats[absenceCode]) {
          absenceStats[absenceCode] = { count: 0, employees: new Set() };
        }
        absenceStats[absenceCode].count++;
        absenceStats[absenceCode].employees.add(employee.name);
        totalAbsences++;
      });
    });

    report += `📈 STATISTIQUES GLOBALES:\n`;
    report += `• Total absences: ${totalAbsences}\n`;
    report += `• Employés concernés: ${employees.filter(emp => Object.keys(emp.absences).length > 0).length}/${employees.length}\n\n`;

    report += `🔥 RÉPARTITION PAR TYPE:\n`;
    Object.entries(absenceStats)
      .sort(([,a], [,b]) => b.count - a.count)
      .forEach(([code, stats]) => {
        const absenceInfo = absenceColorMap[code];
        const percentage = ((stats.count / totalAbsences) * 100).toFixed(1);
        report += `• ${code} (${absenceInfo?.name || 'Inconnu'}): ${stats.count} fois (${percentage}%)\n`;
      });

    return report;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const days = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left font-medium text-gray-700 sticky left-0 bg-gray-100 z-10">
                Employé
              </th>
              {days.map(day => {
                const isWknd = isWeekend(currentMonth, day);
                const isHol = isHoliday(day);
                
                return (
                  <th 
                    key={day} 
                    className={`border px-2 py-2 text-center text-xs font-medium min-w-[35px] ${
                      isWknd || isHol ? 'bg-red-50 text-red-600' : 'text-gray-700'
                    }`}
                  >
                    <div>{day}</div>
                    {isHol && <div className="text-xs text-red-500">F</div>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {employees.map(employee => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="border px-4 py-2 font-medium text-gray-800 sticky left-0 bg-white z-10">
                  <div>
                    <div className="font-semibold">{employee.name}</div>
                    <div className="text-sm text-gray-600">{employee.department}</div>
                    <div className="text-xs text-gray-500">{employee.role}</div>
                  </div>
                </td>
                {days.map(day => {
                  const absence = employee.absences[day.toString()];
                  const absenceInfo = absence ? absenceColorMap[absence] : null;
                  const isWknd = isWeekend(currentMonth, day);
                  const isHol = isHoliday(day);
                  
                  return (
                    <td 
                      key={day} 
                      className={`border px-1 py-2 text-center text-xs relative ${
                        isWknd || isHol ? 'bg-gray-50' : ''
                      }`}
                    >
                      {absenceInfo && (
                        <div className="relative">
                          <span 
                            className={`${absenceInfo.color} ${absenceInfo.textColor} px-1 py-0.5 rounded text-xs font-bold cursor-help`}
                            title={(() => {
                              const deductionInfo = calculateAnyAbsenceDeduction(employee, day.toString(), absence);
                              if (deductionInfo && deductionInfo.rules && deductionInfo.calculation) {
                                let tooltip = `${deductionInfo.rules.name.toUpperCase()} - ${employee.name}\n`;
                                tooltip += `📚 Base légale: ${deductionInfo.calculation.legalBasis || 'Non définie'}\n`;
                                tooltip += `📊 Décompte: ${deductionInfo.calculation.deductedAmount || 0} ${deductionInfo.calculation.unit || 'jour(s)'}\n`;
                                tooltip += `💰 Impact: ${getPayrollImpactDescription(deductionInfo.calculation.payrollImpact)}\n`;
                                
                                if (absence === 'CA' && deductionInfo.calculation.savings > 0) {
                                  tooltip += `✅ Économie: ${deductionInfo.calculation.savings}j préservés\n`;
                                }
                                
                                if (deductionInfo.dayInfo && deductionInfo.dayInfo.isHoliday) {
                                  tooltip += `🎉 Jour férié: ${deductionInfo.dayInfo.holidayName}\n`;
                                }
                                
                                if (deductionInfo.displayInfo && deductionInfo.displayInfo.willBeDeducted) {
                                  tooltip += `⚠️ Ce jour sera décompté selon les règles légales`;
                                } else {
                                  tooltip += `✅ Ce jour ne sera pas décompté`;
                                }
                                
                                return tooltip;
                              }
                              return `${absenceInfo.name} - ${employee.name}`;
                            })()}
                          >
                            {absence}
                          </span>
                          
                          {/* Indicateurs visuels */}
                          {(() => {
                            const deductionInfo = calculateAnyAbsenceDeduction(employee, day.toString(), absence);
                            if (deductionInfo && deductionInfo.calculation && deductionInfo.dayInfo) {
                              // Indicateur pour économie (CA)
                              if (absence === 'CA' && deductionInfo.calculation.savings > 0) {
                                return (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full text-xs text-white flex items-center justify-center" title={`${deductionInfo.calculation.savings}j préservés`}>
                                    ✓
                                  </div>
                                );
                              }
                              
                              // Indicateur pour jour férié
                              if (deductionInfo.dayInfo.isHoliday) {
                                return (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full text-xs text-white flex items-center justify-center" title={`Jour férié: ${deductionInfo.dayInfo.holidayName}`}>
                                    F
                                  </div>
                                );
                              }
                              
                              // Indicateur pour heures
                              if (deductionInfo.calculation.unit === 'heures') {
                                return (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full text-xs text-white flex items-center justify-center" title="Décompte en heures">
                                    H
                                  </div>
                                );
                              }
                            }
                            return null;
                          })()}
                        </div>
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
    <div className="p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Planning Mensuel - Version Avancée</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            ← Précédent
          </button>
          <span className="text-lg font-semibold">
            {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Suivant →
          </button>
        </div>
      </div>

      {/* Bandeau de succès */}
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
        <strong>✅ Version avancée chargée avec succès !</strong>
        <p className="mt-1">Calculs d'absence sécurisés avec conformité au droit français du travail.</p>
      </div>

      {/* Boutons d'action */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => setShowLegendDetails(!showLegendDetails)}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
        >
          📋 {showLegendDetails ? 'Masquer' : 'Afficher'} Légende Détaillée
        </button>
        <button
          onClick={() => setShowAnalysis(!showAnalysis)}
          className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
        >
          📊 {showAnalysis ? 'Masquer' : 'Afficher'} Analyse
        </button>
        <button
          onClick={() => {
            const report = generateAnalysisReport();
            navigator.clipboard.writeText(report);
            alert('Rapport copié dans le presse-papiers !');
          }}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
        >
          📋 Copier Rapport
        </button>
      </div>

      {/* Légende détaillée */}
      {showLegendDetails && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-3">📋 Légende Complète des Codes d'Absence</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(absenceColorMap).map(([code, info]) => (
              <div key={code} className="flex items-center space-x-3 p-2 bg-white rounded border">
                <span className={`${info.color} ${info.textColor} px-2 py-1 rounded text-xs font-bold min-w-[40px] text-center`}>
                  {code}
                </span>
                <div className="flex-1">
                  <div className="font-medium text-sm">{info.name}</div>
                  <div className="text-xs text-gray-600">{info.type} • {info.decompte}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analyse */}
      {showAnalysis && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-3">📊 Analyse du Planning</h3>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
            {generateAnalysisReport()}
          </pre>
        </div>
      )}

      {/* Calendrier */}
      {renderCalendar()}
    </div>
  );
};

export default MonthlyPlanningAdvanced;