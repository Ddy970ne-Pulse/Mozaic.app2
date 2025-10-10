// Données de test complètes pour octobre 2025 - MOZAIK RH
// Scénarios réalistes pour tester toutes les fonctionnalités

import { format, addDays, startOfMonth, endOfMonth, isWeekend } from 'date-fns';

const OCTOBER_2025 = new Date(2025, 9, 1); // Octobre 2025

// REMOVED: Mock test employees - Now loaded from real user API  
export const testEmployees = [
  // Data will be loaded from /api/users endpoint
];

// Absences pour octobre 2025
export const october2025Absences = [
  // Semaine 1 (1-5 octobre)
  { employeeId: 2, employeeName: 'Jean Dupont', dates: ['2025-10-01', '2025-10-02'], type: 'CA', reason: 'Congés annuels pont octobre', status: 'approved', requestDate: '2025-09-15' },
  { employeeId: 5, employeeName: 'Claire Dubois', dates: ['2025-10-03'], type: 'REC', reason: 'Récupération heures sup septembre', status: 'approved', requestDate: '2025-09-25' },
  
  // Semaine 2 (6-12 octobre)
  { employeeId: 6, employeeName: 'Lucas Bernard', dates: ['2025-10-08', '2025-10-09', '2025-10-10'], type: 'AM', reason: 'Arrêt maladie grippe', status: 'approved', requestDate: '2025-10-08' },
  { employeeId: 7, employeeName: 'Emma Rousseau', dates: ['2025-10-07'], type: 'TEL', reason: 'Télétravail exceptionnel', status: 'approved', requestDate: '2025-10-01' },
  
  // Semaine 3 (13-19 octobre)
  { employeeId: 3, employeeName: 'Marie Leblanc', dates: ['2025-10-15', '2025-10-16'], type: 'FO', reason: 'Formation obligatoire CSE', status: 'approved', requestDate: '2025-09-20' },
  { employeeId: 4, employeeName: 'Pierre Moreau', dates: ['2025-10-13'], type: 'DEL', reason: 'Heures délégation CSE réunion', status: 'approved', requestDate: '2025-10-10' },
  { employeeId: 1, employeeName: 'Sophie Martin', dates: ['2025-10-17'], type: 'CT', reason: 'Congé trimestriel direction', status: 'approved', requestDate: '2025-10-10' },
  
  // Semaine 4 (20-26 octobre)
  { employeeId: 8, employeeName: 'Thomas Petit', dates: ['2025-10-20', '2025-10-21', '2025-10-22', '2025-10-23', '2025-10-24'], type: 'CA', reason: 'Congés annuels famille', status: 'approved', requestDate: '2025-08-15' },
  { employeeId: 2, employeeName: 'Jean Dupont', dates: ['2025-10-22'], type: 'RH', reason: 'Rendez-vous médical', status: 'approved', requestDate: '2025-10-18' },
  
  // Semaine 5 (27-31 octobre)
  { employeeId: 5, employeeName: 'Claire Dubois', dates: ['2025-10-29', '2025-10-30', '2025-10-31'], type: 'CA', reason: 'Congés annuels vacances Toussaint', status: 'approved', requestDate: '2025-09-10' },
  { employeeId: 6, employeeName: 'Lucas Bernard', dates: ['2025-10-28'], type: 'TEL', reason: 'Télétravail formation en ligne', status: 'approved', requestDate: '2025-10-25' },
  
  // Demandes en attente
  { employeeId: 7, employeeName: 'Emma Rousseau', dates: ['2025-10-31'], type: 'CA', reason: 'Congé demandé dernière minute', status: 'pending', requestDate: '2025-10-28' }
];

// Heures de délégation pour octobre 2025
export const october2025DelegationHours = [
  // Marie Leblanc (CSE) - 22h/mois
  { id: 1, employeeId: 3, employeeName: 'Marie Leblanc', date: '2025-10-02', hours: 3, activity: 'Réunion CSE mensuelle', description: 'Ordre du jour: budget formation, conditions travail', status: 'approved', requestDate: '2025-10-01' },
  { id: 2, employeeId: 3, employeeName: 'Marie Leblanc', date: '2025-10-07', hours: 2, activity: 'Préparation dossier CHSCT', description: 'Analyse accident travail septembre', status: 'approved', requestDate: '2025-10-05' },
  { id: 3, employeeId: 3, employeeName: 'Marie Leblanc', date: '2025-10-14', hours: 4, activity: 'Entretiens individuels', description: 'Accompagnement salariés en difficulté', status: 'approved', requestDate: '2025-10-12' },
  { id: 4, employeeId: 3, employeeName: 'Marie Leblanc', date: '2025-10-21', hours: 2.5, activity: 'Formation syndicale', description: 'Formation négociation collective', status: 'approved', requestDate: '2025-10-18' },
  { id: 5, employeeId: 3, employeeName: 'Marie Leblanc', date: '2025-10-28', hours: 3, activity: 'Réunion extraordinaire CSE', description: 'Projet réorganisation service technique', status: 'pending', requestDate: '2025-10-25' },
  
  // Pierre Moreau (CSE) - 22h/mois
  { id: 6, employeeId: 4, employeeName: 'Pierre Moreau', date: '2025-10-03', hours: 2, activity: 'Permanence syndicale', description: 'Consultation salariés matin', status: 'approved', requestDate: '2025-10-01' },
  { id: 7, employeeId: 4, employeeName: 'Pierre Moreau', date: '2025-10-09', hours: 3.5, activity: 'Négociation accord', description: 'Négociation accord télétravail avec direction', status: 'approved', requestDate: '2025-10-07' },
  { id: 8, employeeId: 4, employeeName: 'Pierre Moreau', date: '2025-10-16', hours: 2, activity: 'Enquête conditions travail', description: 'Visite ateliers techniques sécurité', status: 'approved', requestDate: '2025-10-14' },
  { id: 9, employeeId: 4, employeeName: 'Pierre Moreau', date: '2025-10-23', hours: 1.5, activity: 'Assistance juridique', description: 'Dossier contentieux salarial', status: 'pending', requestDate: '2025-10-20' },
  { id: 10, employeeId: 4, employeeName: 'Pierre Moreau', date: '2025-10-30', hours: 4, activity: 'Formation CSE', description: 'Formation économique annuelle obligatoire', status: 'pending', requestDate: '2025-10-26' }
];

// Heures supplémentaires pour octobre 2025
export const october2025OvertimeHours = [
  // Semaine 1
  { employeeId: 1, employeeName: 'Sophie Martin', date: '2025-10-02', hours: 2, reason: 'Préparation conseil administration', validated: true },
  { employeeId: 8, employeeName: 'Thomas Petit', date: '2025-10-03', hours: 1.5, reason: 'Réunion équipe prolongée', validated: true },
  
  // Semaine 2  
  { employeeId: 2, employeeName: 'Jean Dupont', date: '2025-10-10', hours: 3, reason: 'Urgence informatique serveur', validated: true },
  { employeeId: 5, employeeName: 'Claire Dubois', date: '2025-10-11', hours: 2.5, reason: 'Clôture comptable mensuelle', validated: true },
  
  // Semaine 3
  { employeeId: 6, employeeName: 'Lucas Bernard', date: '2025-10-16', hours: 1, reason: 'Accompagnement éducatif urgent', validated: true },
  { employeeId: 7, employeeName: 'Emma Rousseau', date: '2025-10-17', hours: 2, reason: 'Formation nouveaux équipements', validated: false },
  
  // Semaine 4
  { employeeId: 3, employeeName: 'Marie Leblanc', date: '2025-10-24', hours: 1.5, reason: 'Réunion parents élèves', validated: true },
  { employeeId: 1, employeeName: 'Sophie Martin', date: '2025-10-25', hours: 3, reason: 'Préparation budget 2026', validated: false },
  
  // Semaine 5
  { employeeId: 4, employeeName: 'Pierre Moreau', date: '2025-10-31', hours: 2, reason: 'Maintenance technique urgente', validated: false }
];

// Astreintes pour octobre 2025 (semaines dimanche->samedi)
export const october2025OnCallAssignments = [
  // Semaine 1: 28 sept - 4 oct 2025
  { id: 11, employeeId: 1, employeeName: 'Sophie Martin', startDate: '2025-10-01', endDate: '2025-10-01', type: 'single', status: 'confirmed' },
  
  // Semaine 2: 5-11 oct 2025  
  { id: 12, employeeId: 3, employeeName: 'Marie Leblanc', startDate: '2025-10-05', endDate: '2025-10-05', type: 'single', status: 'confirmed' },
  { id: 13, employeeId: 8, employeeName: 'Thomas Petit', startDate: '2025-10-11', endDate: '2025-10-12', type: 'weekend', status: 'confirmed' },
  
  // Semaine 3: 12-18 oct 2025
  { id: 14, employeeId: 4, employeeName: 'Pierre Moreau', startDate: '2025-10-15', endDate: '2025-10-15', type: 'single', status: 'confirmed' },
  
  // Semaine 4: 19-25 oct 2025
  { id: 15, employeeId: 1, employeeName: 'Sophie Martin', startDate: '2025-10-25', endDate: '2025-10-26', type: 'weekend', status: 'confirmed' },
  
  // Semaine 5: 26 oct - 1 nov 2025
  { id: 16, employeeId: 6, employeeName: 'Lucas Bernard', startDate: '2025-10-29', endDate: '2025-10-29', type: 'single', status: 'confirmed' }
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