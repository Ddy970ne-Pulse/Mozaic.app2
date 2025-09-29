import React, { useState } from 'react';

const MonthlyPlanningSafe = ({ user }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Version sécurisée sans les imports problématiques
  const absenceColorMap = {
    'CA': { name: 'Congés Annuels', color: 'bg-blue-500', textColor: 'text-white', type: 'Congés', decompte: 'Jours Ouvrables' },
    'RTT': { name: 'RTT', color: 'bg-green-500', textColor: 'text-white', type: 'Repos', decompte: 'Jours Calendaires' },
    'AT': { name: 'Absence Travail', color: 'bg-red-500', textColor: 'text-white', type: 'Absence', decompte: 'Jours Ouvrables' }
  };

  const employees = [
    {
      id: 1,
      name: 'Sophie Martin',
      department: 'RH',
      role: 'Responsable RH',
      absences: {
        '15': 'CA',
        '16': 'CA', 
        '22': 'RTT'
      }
    },
    {
      id: 2,
      name: 'Jean Dupont',
      department: 'IT',
      role: 'Développeur',
      absences: {
        '10': 'AT',
        '25': 'CA'
      }
    }
  ];

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
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
              <th className="border px-4 py-2 text-left font-medium text-gray-700">Employé</th>
              {days.map(day => (
                <th key={day} className="border px-2 py-2 text-center text-xs font-medium text-gray-700 min-w-[30px]">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map(employee => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="border px-4 py-2 font-medium text-gray-800 sticky left-0 bg-white">
                  <div>
                    <div className="font-semibold">{employee.name}</div>
                    <div className="text-sm text-gray-600">{employee.department}</div>
                  </div>
                </td>
                {days.map(day => {
                  const absence = employee.absences[day.toString()];
                  const absenceInfo = absence ? absenceColorMap[absence] : null;
                  
                  return (
                    <td key={day} className="border px-1 py-2 text-center text-xs relative">
                      {absenceInfo && (
                        <span 
                          className={`${absenceInfo.color} ${absenceInfo.textColor} px-1 py-0.5 rounded text-xs font-bold`}
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Planning Mensuel - Version Sécurisée</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            ← Précédent
          </button>
          <span className="text-lg font-semibold">
            {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Suivant →
          </button>
        </div>
      </div>

      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
        <strong>Version sécurisée chargée avec succès !</strong> 
        <p className="mt-2">Cette version évite les modules de calcul qui causaient le freeze. Le planning de base fonctionne normalement.</p>
      </div>

      {/* Légende */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-3">Légende des Codes d'Absence</h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(absenceColorMap).map(([code, info]) => (
            <div key={code} className="flex items-center space-x-2">
              <span className={`${info.color} ${info.textColor} px-2 py-1 rounded text-xs font-bold`}>
                {code}
              </span>
              <span className="text-sm">{info.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendrier */}
      {renderCalendar()}
    </div>
  );
};

export default MonthlyPlanningSafe;