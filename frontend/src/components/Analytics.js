import React, { useState } from 'react';

const Analytics = ({ user }) => {
  const [viewMode, setViewMode] = useState('annual'); // annual or monthly
  const [selectedYear, setSelectedYear] = useState(2024);

  const annualData = {
    totalAbsences: 1542,
    delegationHours: 87,  // DEL coded absences
    personalAbsences: 1455,  // Non-DEL absences  
    averagePerEmployee: 8.5,
    delegationRate: 5.6,  // % of absences that are DEL
    mostCommonType: 'Congés Payés',
    peakMonth: 'Août',
    comparisonLastYear: '+3.2%'
  };

  const monthlyData = [
    { month: 'Jan', cp: 45, rtt: 12, am: 8, formation: 5, autres: 3 },
    { month: 'Fév', cp: 38, rtt: 15, am: 12, formation: 7, autres: 2 },
    { month: 'Mar', cp: 52, rtt: 18, am: 6, formation: 9, autres: 4 },
    { month: 'Avr', cp: 48, rtt: 20, am: 10, formation: 6, autres: 3 },
    { month: 'Mai', cp: 65, rtt: 25, am: 7, formation: 12, autres: 5 },
    { month: 'Juin', cp: 78, rtt: 30, am: 9, formation: 8, autres: 6 },
    { month: 'Juil', cp: 95, rtt: 22, am: 5, formation: 3, autres: 4 },
    { month: 'Août', cp: 120, rtt: 35, am: 4, formation: 2, autres: 7 },
    { month: 'Sep', cp: 42, rtt: 28, am: 11, formation: 15, autres: 3 },
    { month: 'Oct', cp: 55, rtt: 24, am: 13, formation: 11, autres: 5 },
    { month: 'Nov', cp: 48, rtt: 19, am: 15, formation: 9, autres: 4 },
    { month: 'Déc', cp: 38, rtt: 16, am: 8, formation: 4, autres: 6 }
  ];

  const departmentStats = [
    { name: 'IT', employees: 45, absences: 278, rate: 6.2, trend: '+2.1%' },
    { name: 'Commercial', employees: 32, absences: 245, rate: 7.7, trend: '+1.8%' },
    { name: 'Marketing', employees: 25, absences: 198, rate: 7.9, trend: '+3.2%' },
    { name: 'Finance', employees: 18, absences: 156, rate: 8.7, trend: '+0.9%' },
    { name: 'RH', employees: 12, absences: 89, rate: 7.4, trend: '-1.2%' },
    { name: 'Opérations', employees: 24, absences: 279, rate: 11.6, trend: '+5.4%' }
  ];

  const absenceTypes = [
    { code: 'DEL', type: 'Délégation CSE', count: 87, percentage: 5.6, color: 'bg-indigo-600', justified: true, description: 'Missions représentatives - Non comptabilisées dans absentéisme' },
    { code: 'CP', type: 'Congés Payés', count: 654, percentage: 42.4, color: 'bg-blue-500', justified: true, description: 'Congés annuels programmés' },
    { code: 'AM', type: 'Arrêt Maladie', count: 245, percentage: 15.9, color: 'bg-red-500', justified: false, description: 'Arrêts pour raisons médicales' },
    { code: 'RTT', type: 'RTT/Récupération', count: 198, percentage: 12.8, color: 'bg-green-500', justified: true, description: 'Récupération et RTT' },
    { code: 'FO', type: 'Formation', count: 156, percentage: 10.1, color: 'bg-purple-500', justified: true, description: 'Formation professionnelle' },
    { code: 'AT', type: 'Accident Travail', count: 89, percentage: 5.8, color: 'bg-red-600', justified: false, description: 'Accidents du travail et de trajet' },
    { code: 'MAT', type: 'Congé Maternité', count: 45, percentage: 2.9, color: 'bg-pink-500', justified: true, description: 'Congés maternité/paternité' },
    { code: 'FAM', type: 'Événements Familiaux', count: 34, percentage: 2.2, color: 'bg-purple-300', justified: true, description: 'Événements familiaux divers' },
    { code: 'NAUT', type: 'Absence Non Autorisée', count: 23, percentage: 1.5, color: 'bg-red-700', justified: false, description: 'Absences injustifiées' },
    { code: 'Autres', type: 'Autres Motifs', count: 11, percentage: 0.7, color: 'bg-gray-500', justified: false, description: 'Divers motifs' }
  ];

  const getMaxValue = () => {
    return Math.max(...monthlyData.map(m => m.cp + m.rtt + m.am + m.formation + m.autres));
  };

  const getTotalForMonth = (monthData) => {
    return monthData.cp + monthData.rtt + monthData.am + monthData.formation + monthData.autres;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">KPI Absences & Analytics</h1>
            <p className="text-gray-600">Analyses et tendances des absences • Période de référence: Juin {selectedYear - 1} - Mai {selectedYear}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('annual')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'annual' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Vue Annuelle
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Vue Mensuelle
              </button>
            </div>
            
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={2024}>2024</option>
              <option value={2023}>2023</option>
              <option value={2022}>2022</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Total Absences</span>
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">📊</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">{annualData.totalAbsences}</div>
          <div className="text-sm text-green-600 mt-1">{annualData.comparisonLastYear} vs année précédente</div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Moyenne/Employé</span>
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">👤</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">{annualData.averagePerEmployee} j</div>
          <div className="text-sm text-gray-500 mt-1">par an</div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Type Principal</span>
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">🏖️</span>
            </div>
          </div>
          <div className="text-lg font-bold text-gray-800">{annualData.mostCommonType}</div>
          <div className="text-sm text-gray-500 mt-1">45.6% du total</div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Pic d'Activité</span>
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">📅</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">{annualData.peakMonth}</div>
          <div className="text-sm text-gray-500 mt-1">168 absences</div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Taux Présence</span>
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">✅</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">87.2%</div>
          <div className="text-sm text-green-600 mt-1">+1.8% vs objectif</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Histogramme des absences par mois */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Évolution Mensuelle des Absences</h2>
            <p className="text-sm text-gray-600 mt-1">Répartition par type d'absence</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {monthlyData.map((month, index) => {
                const total = getTotalForMonth(month);
                const maxValue = getMaxValue();
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 w-12">{month.month}</span>
                      <span className="text-sm text-gray-500">{total} absences</span>
                    </div>
                    <div className="flex h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <div 
                        className="bg-blue-500" 
                        style={{ width: `${(month.cp / maxValue) * 100}%` }}
                        title={`CP: ${month.cp}`}
                      ></div>
                      <div 
                        className="bg-green-500" 
                        style={{ width: `${(month.rtt / maxValue) * 100}%` }}
                        title={`RTT: ${month.rtt}`}
                      ></div>
                      <div 
                        className="bg-red-500" 
                        style={{ width: `${(month.am / maxValue) * 100}%` }}
                        title={`Arrêt Maladie: ${month.am}`}
                      ></div>
                      <div 
                        className="bg-purple-500" 
                        style={{ width: `${(month.formation / maxValue) * 100}%` }}
                        title={`Formation: ${month.formation}`}
                      ></div>
                      <div 
                        className="bg-orange-500" 
                        style={{ width: `${(month.autres / maxValue) * 100}%` }}
                        title={`Autres: ${month.autres}`}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Légende */}
            <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-xs text-gray-600">Congés Payés</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-xs text-gray-600">RTT</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-xs text-gray-600">Arrêt Maladie</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span className="text-xs text-gray-600">Formation</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span className="text-xs text-gray-600">Autres</span>
              </div>
            </div>
          </div>
        </div>

        {/* Répartition par type */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Répartition par Type</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {absenceTypes.map((type, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{type.type}</span>
                    <span className="text-sm text-gray-500">{type.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${type.color}`}
                      style={{ width: `${type.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500">{type.count} absences</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques par département */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Performance par Département</h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                  <th className="pb-3">Département</th>
                  <th className="pb-3">Employés</th>
                  <th className="pb-3">Total Absences</th>
                  <th className="pb-3">Moy./Employé</th>
                  <th className="pb-3">Évolution</th>
                  <th className="pb-3">Performance</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {departmentStats.map((dept, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 font-medium text-gray-800">{dept.name}</td>
                    <td className="py-4 text-gray-600">{dept.employees}</td>
                    <td className="py-4 text-gray-600">{dept.absences}</td>
                    <td className="py-4 text-gray-600">{dept.rate} j</td>
                    <td className="py-4">
                      <span className={`text-sm font-medium ${
                        dept.trend.startsWith('+') ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {dept.trend}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          dept.rate < 7 ? 'bg-green-500' :
                          dept.rate < 9 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}></div>
                        <span className={`text-xs font-medium ${
                          dept.rate < 7 ? 'text-green-800' :
                          dept.rate < 9 ? 'text-yellow-800' :
                          'text-red-800'
                        }`}>
                          {dept.rate < 7 ? 'Excellent' : dept.rate < 9 ? 'Correct' : 'À améliorer'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;