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

  const employees = [
    { id: 1, name: 'Sophie Martin', department: 'RH', absences: { '3': 'CP', '4': 'CP', '17': 'RTT', '24': 'AM' } },
    { id: 2, name: 'Jean Dupont', department: 'IT', absences: { '10': 'CP', '11': 'CP', '12': 'CP', '25': 'HS' } },
    { id: 3, name: 'Marie Leblanc', department: 'Commercial', absences: { '8': 'RTT', '22': 'CP', '23': 'CP' } },
    { id: 4, name: 'Pierre Martin', department: 'Finance', absences: { '5': 'AM', '15': 'CP', '16': 'CP', '29': 'RTT' } },
    { id: 5, name: 'Claire Dubois', department: 'Marketing', absences: { '7': 'CP', '20': 'AM', '21': 'AM' } },
    { id: 6, name: 'Lucas Bernard', department: 'IT', absences: { '12': 'RTT', '26': 'CP', '27': 'CP', '30': 'HS' } },
    { id: 7, name: 'Emma Rousseau', department: 'Commercial', absences: { '2': 'CP', '18': 'RTT', '31': 'AM' } },
    { id: 8, name: 'Thomas Leroy', department: 'Operations', absences: { '9': 'CP', '19': 'CP', '28': 'RTT' } }
  ];

  const absenceTypes = {
    'CP': { name: 'Congés Payés', color: 'bg-blue-500', textColor: 'text-white' },
    'RTT': { name: 'RTT', color: 'bg-green-500', textColor: 'text-white' },
    'AM': { name: 'Arrêt Maladie', color: 'bg-red-500', textColor: 'text-white' },
    'HS': { name: 'Heures Sup', color: 'bg-purple-500', textColor: 'text-white' },
    'CT': { name: 'Congé Tech', color: 'bg-orange-500', textColor: 'text-white' },
    'FM': { name: 'Formation', color: 'bg-indigo-500', textColor: 'text-white' }
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

  const filteredEmployees = filterDept === 'all' 
    ? sortedEmployees 
    : sortedEmployees.filter(emp => emp.department === filterDept);

  const departments = [...new Set(employees.map(emp => emp.department))];
  const daysInMonth = getDaysInMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getAbsenceCount = (employee) => {
    return Object.keys(employee.absences).length;
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
          
          {/* Navigation mois */}
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
          </div>
        </div>

        {/* Filtres et tri */}
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4 mt-6">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Trier par:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Nom</option>
              <option value="department">Département</option>
              <option value="absences">Nb absences</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Département:</label>
            <select 
              value={filterDept} 
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Légende des absences</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(absenceTypes).map(([code, type]) => (
            <div key={code} className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded ${type.color}`}></div>
              <span className="text-sm text-gray-700">{code} - {type.name}</span>
            </div>
          ))}
        </div>
      </div>

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
                            absenceTypes[absence]?.color || 'bg-gray-500'
                          } ${absenceTypes[absence]?.textColor || 'text-white'}`}
                               title={`${absenceTypes[absence]?.name || absence} - ${employee.name}`}>
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
    </div>
  );
};

export default MonthlyPlanning;