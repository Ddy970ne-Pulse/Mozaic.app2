// Données de test complètes pour octobre 2025 - MOZAIK RH
// Scénarios réalistes pour tester toutes les fonctionnalités

import { format, addDays, startOfMonth, endOfMonth, isWeekend } from 'date-fns';

const OCTOBER_2025 = new Date(2025, 9, 1); // Octobre 2025

// REMOVED: Mock test employees - Now loaded from real user API  
export const testEmployees = [
  // Data will be loaded from /api/users endpoint
];

// REMOVED: Mock absence data - Now loaded from real absence API
export const october2025Absences = [
  // Data will be loaded from /api/absence-requests endpoint  
];

// REMOVED: Mock delegation hours data - Now loaded from real delegation API
export const october2025DelegationHours = [
  // Data will be loaded from /api/delegation/hours endpoint
];

// REMOVED: Mock overtime hours data - Now loaded from real overtime API
export const october2025OvertimeHours = [
  // Data will be loaded from /api/overtime/hours endpoint
];

// REMOVED: Mock on-call assignments - Now loaded from real on-call API
export const october2025OnCallAssignments = [
  // Data will be loaded from /api/on-call/assignments endpoint
];

// Récupérations pour octobre 2025
export const october2025Recuperations = [
  { employeeId: 2, employeeName: 'Jean Dupont', date: '2025-10-04', hours: 2, reason: 'Récup heures sup septembre', validated: true },
  { employeeId: 5, employeeName: 'Claire Dubois', date: '2025-10-11', hours: 1.5, reason: 'Récup samedi travaillé', validated: true },
  { employeeId: 7, employeeName: 'Emma Rousseau', date: '2025-10-18', hours: 2, reason: 'Récup formation weekend', validated: true },
  { employeeId: 6, employeeName: 'Lucas Bernard', date: '2025-10-25', hours: 3, reason: 'Récup heures sup validées', validated: false }
];

// Planning complet octobre 2025 intégré
export const october2025FullPlanning = {
  year: 2025,
  month: 9, // Octobre (index 9)
  employees: testEmployees,
  absences: october2025Absences,
  delegationHours: october2025DelegationHours, 
  overtimeHours: october2025OvertimeHours,
  onCallAssignments: october2025OnCallAssignments,
  recuperations: october2025Recuperations,
  
  // Statistiques du mois
  statistics: {
    totalAbsenceDays: october2025Absences.reduce((sum, abs) => sum + abs.dates.length, 0),
    totalDelegationHours: october2025DelegationHours.reduce((sum, del) => sum + del.hours, 0),
    totalOvertimeHours: october2025OvertimeHours.reduce((sum, ot) => sum + ot.hours, 0),
    totalOnCallDays: october2025OnCallAssignments.reduce((sum, oc) => {
      const start = new Date(oc.startDate);
      const end = new Date(oc.endDate);
      return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }, 0),
    totalRecuperationHours: october2025Recuperations.reduce((sum, rec) => sum + rec.hours, 0)
  }
};

// Fonctions utilitaires pour l'export
export const generateMonthlyReport = (data = october2025FullPlanning) => {
  return {
    period: `Octobre ${data.year}`,
    generated: new Date().toISOString(),
    employees: data.employees.length,
    summary: {
      absences: {
        total: data.statistics.totalAbsenceDays,
        byType: data.absences.reduce((acc, abs) => {
          acc[abs.type] = (acc[abs.type] || 0) + abs.dates.length;
          return acc;
        }, {})
      },
      delegation: {
        totalHours: data.statistics.totalDelegationHours,
        byEmployee: data.delegationHours.reduce((acc, del) => {
          acc[del.employeeName] = (acc[del.employeeName] || 0) + del.hours;
          return acc;
        }, {})
      },
      overtime: {
        totalHours: data.statistics.totalOvertimeHours,
        validated: data.overtimeHours.filter(ot => ot.validated).reduce((sum, ot) => sum + ot.hours, 0),
        pending: data.overtimeHours.filter(ot => !ot.validated).reduce((sum, ot) => sum + ot.hours, 0)
      },
      onCall: {
        totalDays: data.statistics.totalOnCallDays,
        byEmployee: data.onCallAssignments.reduce((acc, oc) => {
          const days = Math.ceil((new Date(oc.endDate) - new Date(oc.startDate)) / (1000 * 60 * 60 * 24)) + 1;
          acc[oc.employeeName] = (acc[oc.employeeName] || 0) + days;
          return acc;
        }, {})
      },
      recuperations: {
        totalHours: data.statistics.totalRecuperationHours,
        validated: data.recuperations.filter(rec => rec.validated).reduce((sum, rec) => sum + rec.hours, 0)
      }
    }
  };
};

export default {
  testEmployees,
  october2025Absences,
  october2025DelegationHours,
  october2025OvertimeHours,
  october2025OnCallAssignments,
  october2025Recuperations,
  october2025FullPlanning,
  generateMonthlyReport
};