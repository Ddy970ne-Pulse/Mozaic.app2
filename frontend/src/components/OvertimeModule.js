import React, { useState, useEffect } from 'react';

const OvertimeModule = ({ user }) => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [viewMode, setViewMode] = useState('summary');
  const [filterPeriod, setFilterPeriod] = useState('current-month');
  const [overtimeData, setOvertimeData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);

  // Load overtime data from backend
  useEffect(() => {
    fetchOvertimeData();
  }, []);

  const fetchOvertimeData = async () => {
    try {
      setIsLoading(true);
      console.log('📊 Fetching overtime data...');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/overtime/all`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Loaded ${data.length} overtime records`, data);
        setOvertimeData(data);
      } else {
        console.error('❌ Failed to fetch overtime data:', response.status, response.statusText);
        setOvertimeData([]);
      }
    } catch (error) {
      console.error('❌ Error fetching overtime data:', error);
      setOvertimeData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const currentOvertimeData = overtimeData;
  const departments = ['Tous', ...new Set(currentOvertimeData.map(emp => emp.department))];
  const [filterDept, setFilterDept] = useState('Tous');

  const filteredData = filterDept === 'Tous' 
    ? currentOvertimeData 
    : currentOvertimeData.filter(emp => emp.department === filterDept);

  const totalStats = {
    totalAccumulated: filteredData.reduce((sum, emp) => sum + emp.accumulated, 0),
    totalRecovered: filteredData.reduce((sum, emp) => sum + emp.recovered, 0),
    totalBalance: filteredData.reduce((sum, emp) => sum + emp.balance, 0),
    averageBalance: filteredData.reduce((sum, emp) => sum + emp.balance, 0) / filteredData.length,
    thisMonth: filteredData.reduce((sum, emp) => sum + emp.thisMonth, 0)
  };

  const getBalanceColor = (balance) => {
    if (balance > 30) return 'text-red-600 bg-red-50';
    if (balance > 15) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const getBalanceStatus = (balance) => {
    if (balance > 30) return '⚠️ Élevé';
    if (balance > 15) return '🟡 Modéré';
    return '✅ Normal';
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Gestion des Heures Supplémentaires</h1>
            <p className="text-gray-600">Suivi des heures accumulées et récupérées par employé</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('summary')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'summary' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Résumé
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'detailed' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Détaillé
              </button>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4 mt-6">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Département:</label>
            <select 
              value={filterDept} 
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Période:</label>
            <select 
              value={filterPeriod} 
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="current-month">Mois actuel</option>
              <option value="last-month">Mois dernier</option>
              <option value="quarter">Trimestre</option>
              <option value="year">Année</option>
            </select>
          </div>
          
          {/* Test October 2025 button removed - production mode only */}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Total Accumulé</span>
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">⏰</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">{totalStats.totalAccumulated.toFixed(1)}h</div>
          <div className="text-sm text-gray-500 mt-1">Tous employés</div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Total Récupéré</span>
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">✅</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">{totalStats.totalRecovered.toFixed(1)}h</div>
          <div className="text-sm text-gray-500 mt-1">Récupérations</div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Solde Total</span>
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">📊</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">{totalStats.totalBalance.toFixed(1)}h</div>
          <div className="text-sm text-orange-600 mt-1">En attente</div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Moyenne/Employé</span>
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">👤</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">{totalStats.averageBalance.toFixed(1)}h</div>
          <div className="text-sm text-gray-500 mt-1">Solde moyen</div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Ce Mois</span>
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">📅</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">{totalStats.thisMonth.toFixed(1)}h</div>
          <div className="text-sm text-blue-600 mt-1">Nouvelles heures</div>
        </div>
      </div>

      {viewMode === 'summary' ? (
        /* Vue Résumé */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Tableau de Bord - Vue Résumé</h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                    <th className="pb-3">Employé</th>
                    <th className="pb-3">Département</th>
                    <th className="pb-3">Accumulées</th>
                    <th className="pb-3">Récupérées</th>
                    <th className="pb-3">Solde Actuel</th>
                    <th className="pb-3">Ce Mois</th>
                    <th className="pb-3">Statut</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredData.map((employee, index) => (
                    <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                            {employee.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="font-medium text-gray-800">{employee.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-gray-600">{employee.department}</td>
                      <td className="py-4 font-medium text-blue-600">{employee.accumulated}h</td>
                      <td className="py-4 font-medium text-green-600">{employee.recovered}h</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBalanceColor(employee.balance)}`}>
                          {employee.balance}h
                        </span>
                      </td>
                      <td className="py-4 font-medium text-gray-800">+{employee.thisMonth}h</td>
                      <td className="py-4">
                        <span className="text-xs">{getBalanceStatus(employee.balance)}</span>
                      </td>
                      <td className="py-4">
                        <button 
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setViewMode('detailed');
                          }}
                          className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors duration-200"
                        >
                          Détails
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Vue Détaillée */
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Liste des employés */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Employés</h2>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-4">Chargement des données...</p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📊</div>
                  <p className="text-gray-600 font-medium">Aucune donnée disponible</p>
                  <p className="text-sm text-gray-500 mt-2">Les heures supplémentaires apparaîtront ici une fois enregistrées.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredData.map((employee) => (
                    <button
                      key={employee.id}
                      onClick={() => {
                        console.log('🔍 Employé sélectionné:', employee);
                        setSelectedEmployee(employee);
                      }}
                      className={`w-full p-4 text-left rounded-lg border transition-all duration-200 ${
                        selectedEmployee?.id === employee.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">{employee.name}</div>
                          <div className="text-sm text-gray-500">{employee.department}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${getBalanceColor(employee.balance).split(' ')[0]}`}>
                            {employee.balance}h
                          </div>
                          <div className="text-xs text-gray-500">solde</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Détails de l'employé sélectionné */}
          <div className="xl:col-span-2">
            {selectedEmployee ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800">Détails - {selectedEmployee.name}</h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedEmployee.department}</p>
                </div>
                <div className="p-6">
                  {/* Statistiques individuelles */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{selectedEmployee.accumulated}h</div>
                      <div className="text-sm text-blue-700">Accumulées</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{selectedEmployee.recovered}h</div>
                      <div className="text-sm text-green-700">Récupérées</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{selectedEmployee.balance}h</div>
                      <div className="text-sm text-purple-700">Solde</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{selectedEmployee.thisMonth}h</div>
                      <div className="text-sm text-orange-700">Ce mois</div>
                    </div>
                  </div>

                  {/* Historique détaillé */}
                  <h3 className="text-md font-semibold text-gray-800 mb-4">Historique des Mouvements</h3>
                  <div className="space-y-3">
                    {selectedEmployee.details.map((detail, index) => (
                      <div key={index} className={`p-4 rounded-lg border-l-4 ${
                        detail.type === 'accumulated' 
                          ? 'bg-blue-50 border-blue-500' 
                          : 'bg-green-50 border-green-500'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className={`text-lg ${
                              detail.type === 'accumulated' ? 'text-blue-500' : 'text-green-500'
                            }`}>
                              {detail.type === 'accumulated' ? '➕' : '➖'}
                            </span>
                            <div>
                              <div className="font-medium text-gray-800">
                                {detail.hours > 0 ? '+' : ''}{detail.hours}h
                              </div>
                              <div className="text-sm text-gray-600">{formatDate(detail.date)}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${
                              detail.type === 'accumulated' ? 'text-blue-600' : 'text-green-600'
                            }`}>
                              {detail.type === 'accumulated' ? 'Accumulé' : 'Récupéré'}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">{detail.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center h-96">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-4">👥</div>
                  <div className="text-lg font-medium mb-2">Sélectionnez un employé</div>
                  <div className="text-sm">Cliquez sur un employé pour voir ses détails</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OvertimeModule;