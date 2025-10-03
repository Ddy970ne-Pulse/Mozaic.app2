import React, { useState } from 'react';

const Analytics = ({ user }) => {
  const [viewMode, setViewMode] = useState('turnover'); // turnover, absences, monthly
  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  
  // États pour les graphiques dynamiques
  const [chartType, setChartType] = useState('evolution'); // evolution, comparison, distribution
  const [dataMetric, setDataMetric] = useState('turnover_rate'); // turnover_rate, departures_count, reasons, departments
  const [timeRange, setTimeRange] = useState('monthly'); // monthly, quarterly, yearly
  const [departmentFilter, setDepartmentFilter] = useState('all'); // all, specific department

  // Données de roulement du personnel (Personnel Turnover)
  const turnoverData = {
    totalTurnoverRate: 26.2,
    totalDepartures: 13,
    monthlyAverageRate: 2.0,
    monthlyAverageDepartures: 1,
    last30DaysRate: 2.4,
    last30DaysDepartures: 2,
    periodLabel: 'Oct 2024 - Oct 2025',
    comparisonLastYear: '+3.2%',
    trend: 'increasing'
  };

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

  // Données de roulement mensuel (avec raisons de départ)
  const turnoverMonthlyData = [
    { month: 'Oct 2024', volontaire: 4, regrettable: 1, nonRegrettable: 0, nonSpecifie: 0, involontaire: 0, termination: 0, total: 5, rate: 44.4 },
    { month: 'Nov', volontaire: 0, regrettable: 0, nonRegrettable: 0, nonSpecifie: 0, involontaire: 0, termination: 0, total: 0, rate: 0 },
    { month: 'Déc', volontaire: 1, regrettable: 0, nonRegrettable: 1, nonSpecifie: 0, involontaire: 0, termination: 0, total: 2, rate: 1.8 },
    { month: 'Jan 2025', volontaire: 0, regrettable: 0, nonRegrettable: 0, nonSpecifie: 0, involontaire: 0, termination: 0, total: 0, rate: 0 },
    { month: 'Fév', volontaire: 1, regrettable: 1, nonRegrettable: 0, nonSpecifie: 0, involontaire: 0, termination: 0, total: 2, rate: 1.8 },
    { month: 'Mar', volontaire: 1, regrettable: 0, nonRegrettable: 0, nonSpecifie: 0, involontaire: 0, termination: 1, total: 2, rate: 1.8 },
    { month: 'Avr', volontaire: 0, regrettable: 0, nonRegrettable: 0, nonSpecifie: 0, involontaire: 0, termination: 0, total: 0, rate: 0 },
    { month: 'Mai', volontaire: 0, regrettable: 1, nonRegrettable: 0, nonSpecifie: 0, involontaire: 0, termination: 0, total: 1, rate: 0.9 },
    { month: 'Sep', volontaire: 0, regrettable: 0, nonRegrettable: 0, nonSpecifie: 1, involontaire: 0, termination: 0, total: 1, rate: 0.9 },
    { month: 'Oct 2025', volontaire: 0, regrettable: 0, nonRegrettable: 0, nonSpecifie: 0, involontaire: 0, termination: 0, total: 0, rate: 0 }
  ];

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

  // Données de rotation par département
  const departmentTurnover = [
    { name: 'Ventes', employees: 32, departures: 5, turnoverRate: 38, trend: '+5.2%' },
    { name: 'Succès du client', employees: 18, departures: 3, turnoverRate: 23, trend: '+1.8%' },
    { name: 'Ressources humaines', employees: 12, departures: 2, turnoverRate: 15, trend: '-0.5%' },
    { name: 'Opérations', employees: 24, departures: 1, turnoverRate: 7, trend: '-2.1%' },
    { name: 'Produit', employees: 16, departures: 1, turnoverRate: 7, trend: '+0.9%' },
    { name: 'Marketing', employees: 20, departures: 1, turnoverRate: 10, trend: '+2.3%' }
  ];

  // Configuration des options de graphiques dynamiques
  const chartOptions = {
    types: [
      { value: 'evolution', label: 'Évolution dans le temps', icon: '📈' },
      { value: 'comparison', label: 'Comparaison départements', icon: '📊' },
      { value: 'distribution', label: 'Répartition par motif', icon: '🥧' },
      { value: 'correlation', label: 'Analyse de corrélation', icon: '🔗' }
    ],
    metrics: [
      { value: 'turnover_rate', label: 'Taux de rotation (%)', color: 'text-red-600' },
      { value: 'departures_count', label: 'Nombre de départs', color: 'text-blue-600' },
      { value: 'reasons', label: 'Motifs de départ', color: 'text-green-600' },
      { value: 'departments', label: 'Performance départements', color: 'text-purple-600' },
      { value: 'demographics', label: 'Données démographiques', color: 'text-orange-600' }
    ],
    timeRanges: [
      { value: 'monthly', label: 'Mensuel' },
      { value: 'quarterly', label: 'Trimestriel' },
      { value: 'yearly', label: 'Annuel' }
    ]
  };

  // Fonction pour générer les données dynamiques selon les sélections
  const getDynamicChartData = () => {
    switch (dataMetric) {
      case 'turnover_rate':
        return turnoverMonthlyData.map(m => ({ 
          period: m.month, 
          value: m.rate, 
          label: `${m.rate}%`,
          color: m.rate > 10 ? '#ef4444' : m.rate > 5 ? '#f97316' : '#10b981'
        }));
      case 'departures_count':
        return turnoverMonthlyData.map(m => ({ 
          period: m.month, 
          value: m.total, 
          label: `${m.total} départs`,
          color: m.total > 3 ? '#ef4444' : m.total > 1 ? '#f97316' : '#10b981'
        }));
      case 'departments':
        return departmentTurnover.map(d => ({ 
          period: d.name, 
          value: d.turnoverRate, 
          label: `${d.turnoverRate}%`,
          color: d.turnoverRate > 25 ? '#ef4444' : d.turnoverRate > 15 ? '#f97316' : '#10b981'
        }));
      default:
        return [];
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Rapports Standard</h1>
            <p className="text-gray-600">
              {viewMode === 'turnover' && `Roulement du personnel • Période: ${turnoverData.periodLabel}`}
              {viewMode === 'absences' && `Analyses des absences • Période de référence: Juin ${selectedYear - 1} - Mai ${selectedYear}`}
              {viewMode === 'monthly' && `Vue mensuelle détaillée • ${selectedYear}`}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('turnover')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'turnover' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Roulement Personnel
              </button>
              <button
                onClick={() => setViewMode('absences')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'absences' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Absences
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'monthly' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Vue Mensuelle
              </button>
            </div>
            
            <div className="flex space-x-3">
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={2024}>2024</option>
                <option value={2023}>2023</option>
                <option value={2022}>2022</option>
              </select>
              
              {viewMode === 'monthly' && (
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Janvier</option>
                  <option value={1}>Février</option>
                  <option value={2}>Mars</option>
                  <option value={3}>Avril</option>
                  <option value={4}>Mai</option>
                  <option value={5}>Juin</option>
                  <option value={6}>Juillet</option>
                  <option value={7}>Août</option>
                  <option value={8}>Septembre</option>
                  <option value={9}>Octobre</option>
                  <option value={10}>Novembre</option>
                  <option value={11}>Décembre</option>
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sélecteur de période pour roulement du personnel */}
      {viewMode === 'turnover' && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-4">
            <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="oct2024-oct2025">oct 2024 - oct 2025</option>
              <option value="jan2024-dec2024">jan 2024 - déc 2024</option>
              <option value="jul2023-jun2024">jul 2023 - jun 2024</option>
            </select>
            <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="all">Tous les employés</option>
              <option value="permanent">Employés permanents</option>
              <option value="temporary">Employés temporaires</option>
            </select>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="benchmark" className="rounded" />
              <label htmlFor="benchmark" className="text-sm text-gray-600">Show Benchmark</label>
            </div>
          </div>
        </div>
      )}

      {/* Rapport de Roulement du Personnel */}
      {viewMode === 'turnover' && (
        <>
          {/* KPI Cards pour Roulement */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Taux de Rotation Total</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-4xl font-bold text-gray-800">{turnoverData.totalTurnoverRate}%</p>
                    <div className="flex items-center text-red-600">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">+3.2%</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">{turnoverData.totalDepartures} • {turnoverData.periodLabel}</p>
                </div>
                <div className="text-4xl">🔄</div>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-200 to-red-600"></div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Roulement Moyen par Mois</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-4xl font-bold text-gray-800">{turnoverData.monthlyAverageRate}%</p>
                    <div className="flex items-center text-green-600">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">Stable</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">{turnoverData.monthlyAverageDepartures}</p>
                </div>
                <div className="text-4xl">📈</div>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-200 to-green-600"></div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Taux de Rotation - 30 Jours</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-4xl font-bold text-gray-800">{turnoverData.last30DaysRate}%</p>
                    <div className="flex items-center text-orange-600">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">+0.4%</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">{turnoverData.last30DaysDepartures}</p>
                </div>
                <div className="text-4xl">⏱️</div>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-orange-200 to-orange-600"></div>
            </div>
          </div>

          {/* Section Graphiques Dynamiques Interactifs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Analyse Dynamique Interactive</h2>
                  <p className="text-sm text-gray-600 mt-1">Personnalisez votre analyse avec les sélecteurs ci-dessous</p>
                </div>
                
                {/* Contrôles dynamiques */}
                <div className="flex flex-wrap gap-3">
                  {/* Type de graphique */}
                  <div className="flex flex-col">
                    <label className="text-xs font-medium text-gray-500 mb-1">Type de graphique</label>
                    <select 
                      value={chartType} 
                      onChange={(e) => setChartType(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {chartOptions.types.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Métrique à analyser */}
                  <div className="flex flex-col">
                    <label className="text-xs font-medium text-gray-500 mb-1">Métrique à analyser</label>
                    <select 
                      value={dataMetric} 
                      onChange={(e) => setDataMetric(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {chartOptions.metrics.map(metric => (
                        <option key={metric.value} value={metric.value}>
                          {metric.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Période d'analyse */}
                  <div className="flex flex-col">
                    <label className="text-xs font-medium text-gray-500 mb-1">Période</label>
                    <select 
                      value={timeRange} 
                      onChange={(e) => setTimeRange(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {chartOptions.timeRanges.map(range => (
                        <option key={range.value} value={range.value}>
                          {range.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Filtre département */}
                  <div className="flex flex-col">
                    <label className="text-xs font-medium text-gray-500 mb-1">Département</label>
                    <select 
                      value={departmentFilter} 
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="all">Tous les départements</option>
                      {departmentTurnover.map(dept => (
                        <option key={dept.name} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Graphique dynamique généré */}
            <div className="p-6">
              <div className="mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">
                    Analyse actuelle : 
                  </span>
                  <span className={`text-sm font-semibold ${chartOptions.metrics.find(m => m.value === dataMetric)?.color}`}>
                    {chartOptions.metrics.find(m => m.value === dataMetric)?.label}
                  </span>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-600">
                    {chartOptions.types.find(t => t.value === chartType)?.label}
                  </span>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-600">
                    {timeRange === 'monthly' ? 'Vue mensuelle' : timeRange === 'quarterly' ? 'Vue trimestrielle' : 'Vue annuelle'}
                  </span>
                </div>
              </div>

              {/* Rendu du graphique selon les sélections */}
              <div className="space-y-4">
                {getDynamicChartData().map((item, index) => {
                  const maxValue = Math.max(...getDynamicChartData().map(d => d.value));
                  const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                  
                  return (
                    <div key={index} className="group hover:bg-gray-50 p-3 rounded-lg transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 min-w-[120px]">
                          {item.period}
                        </span>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-500">
                            {item.label}
                          </span>
                          {dataMetric === 'turnover_rate' && item.value > 15 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              ⚠️ Attention
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: item.color,
                            boxShadow: percentage > 80 ? '0 0 8px rgba(239, 68, 68, 0.3)' : 'none'
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions et exports */}
              <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>📊 {getDynamicChartData().length} éléments analysés</span>
                  <span>•</span>
                  <span>🎯 Seuil d'alerte: {dataMetric === 'turnover_rate' ? '15%' : '3 départs'}</span>
                </div>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                    📊 Exporter CSV
                  </button>
                  <button className="px-3 py-1 text-xs border border-emerald-300 text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors">
                    📈 Rapport détaillé
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Graphique de tendance statique (ancien) */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Évolution Mensuelle du Roulement (Détaillée)</h2>
                    <p className="text-sm text-gray-600 mt-1">Répartition par motif de départ • {turnoverData.periodLabel}</p>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-600">Pic en Oct 2024</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {turnoverMonthlyData.map((month, index) => {
                    const maxRate = Math.max(...turnoverMonthlyData.map(m => m.rate));
                    return (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 w-20">{month.month}</span>
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-500">{month.total} départs</span>
                            <span className="text-sm font-bold text-gray-800">{month.rate}%</span>
                          </div>
                        </div>
                        <div className="flex h-6 bg-gray-100 rounded-lg overflow-hidden">
                          {month.volontaire > 0 && (
                            <div 
                              className="bg-green-500" 
                              style={{ width: `${(month.volontaire / (maxRate / 10)) * 100}%` }}
                              title={`Volontaire: ${month.volontaire}`}
                            ></div>
                          )}
                          {month.regrettable > 0 && (
                            <div 
                              className="bg-red-500" 
                              style={{ width: `${(month.regrettable / (maxRate / 10)) * 100}%` }}
                              title={`Regrettable: ${month.regrettable}`}
                            ></div>
                          )}
                          {month.nonRegrettable > 0 && (
                            <div 
                              className="bg-blue-500" 
                              style={{ width: `${(month.nonRegrettable / (maxRate / 10)) * 100}%` }}
                              title={`Non regrettable: ${month.nonRegrettable}`}
                            ></div>
                          )}
                          {month.nonSpecifie > 0 && (
                            <div 
                              className="bg-gray-400" 
                              style={{ width: `${(month.nonSpecifie / (maxRate / 10)) * 100}%` }}
                              title={`Non spécifié: ${month.nonSpecifie}`}
                            ></div>
                          )}
                          {month.termination > 0 && (
                            <div 
                              className="bg-red-700" 
                              style={{ width: `${(month.termination / (maxRate / 10)) * 100}%` }}
                              title={`Termination: ${month.termination}`}
                            ></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Légende améliorée */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-xs text-gray-600">Volontaire</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span className="text-xs text-gray-600">Regrettable</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-xs text-gray-600">Non regrettable</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-400 rounded"></div>
                    <span className="text-xs text-gray-600">Non spécifié</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-700 rounded"></div>
                    <span className="text-xs text-gray-600">Termination</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Données démographiques améliorées */}
            <div className="space-y-6">
              {/* Sexe */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-800">Sexe</h3>
                  <button className="text-emerald-600 text-sm hover:underline">Aperçu des détails</button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Homme</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 h-3 bg-gray-200 rounded-full">
                        <div className="w-11/20 h-full bg-blue-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium">53%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Femme</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 h-3 bg-gray-200 rounded-full">
                        <div className="w-9/20 h-full bg-pink-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium">46%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Âge */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-800">Âge</h3>
                  <button className="text-emerald-600 text-sm hover:underline">Aperçu des détails</button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">25-34 ans</span>
                    <span className="text-sm font-medium">46%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">35-44 ans</span>
                    <span className="text-sm font-medium">30%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">18-24 ans</span>
                    <span className="text-sm font-medium">23%</span>
                  </div>
                </div>
              </div>

              {/* Département */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-800">Département</h3>
                  <button className="text-emerald-600 text-sm hover:underline">Aperçu des détails</button>
                </div>
                <div className="space-y-3">
                  {departmentTurnover.slice(0, 5).map((dept, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{dept.name}</span>
                      <span className="text-sm font-medium">{dept.turnoverRate}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Section Absences (vue existante) */}
      {viewMode === 'absences' && (
        <>
      {/* KPI Distinction DEL vs Personnel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Absences</p>
              <p className="text-3xl font-bold text-gray-800">{annualData.totalAbsences}</p>
              <p className="text-sm text-gray-500">+{annualData.comparisonLastYear} vs N-1</p>
            </div>
            <div className="text-4xl text-blue-500">📊</div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Délégation CSE</p>
              <p className="text-3xl font-bold text-indigo-600">{annualData.delegationHours}</p>
              <p className="text-sm text-green-600">✅ Justifiées (DEL)</p>
            </div>
            <div className="text-4xl text-indigo-500">🏢</div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Absences Personnelles</p>
              <p className="text-3xl font-bold text-gray-700">{annualData.personalAbsences}</p>
              <p className="text-sm text-orange-600">📋 Absentéisme classique</p>
            </div>
            <div className="text-4xl text-gray-500">👤</div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Taux Délégation</p>
              <p className="text-3xl font-bold text-indigo-600">{annualData.delegationRate}%</p>
              <p className="text-sm text-indigo-500">DEL / Total</p>
            </div>
            <div className="text-4xl text-indigo-400">⚖️</div>
          </div>
        </div>
      </div>
      
      {/* Explication Codification */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-6">
        <div className="flex items-start space-x-4">
          <div className="text-indigo-500 text-3xl">📋</div>
          <div>
            <h3 className="text-lg font-semibold text-indigo-800 mb-2">Codification des Absences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                  <span className="font-medium text-indigo-800">DEL - Délégation CSE</span>
                </div>
                <p className="text-indigo-700 ml-5">Missions représentatives - Non comptabilisées dans l'absentéisme</p>
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <span className="font-medium text-gray-800">Autres codes (AM, CP, RTT...)</span>
                </div>
                <p className="text-gray-700 ml-5">Absences personnelles - Comptabilisées dans l'absentéisme</p>
              </div>
            </div>
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
            <h2 className="text-xl font-semibold text-gray-800">Répartition par Type d'Absence</h2>
            <p className="text-sm text-gray-600 mt-1">Distinction DEL (Délégation CSE) vs Absentéisme Personnel</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {absenceTypes.map((type, index) => (
                <div key={index} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${type.color}`}></div>
                      <span className="font-medium text-gray-800">{type.code}</span>
                      <span className="text-gray-700">{type.type}</span>
                      {type.justified ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          ✅ Justifiée
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                          ⚠️ Absentéisme
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-600">{type.count} absences</span>
                      <span className="font-semibold text-gray-800">{type.percentage}%</span>
                    </div>
                  </div>
                  {type.description && (
                    <p className="text-xs text-gray-500 ml-7">{type.description}</p>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-indigo-50 rounded-lg">
                  <div className="text-indigo-600 font-semibold">
                    {absenceTypes.filter(t => t.justified).reduce((sum, t) => sum + t.count, 0)}
                  </div>
                  <div className="text-indigo-700">Absences Justifiées</div>
                  <div className="text-xs text-indigo-600">DEL + Congés programmés</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-orange-600 font-semibold">
                    {absenceTypes.filter(t => !t.justified).reduce((sum, t) => sum + t.count, 0)}
                  </div>
                  <div className="text-orange-700">Absentéisme</div>
                  <div className="text-xs text-orange-600">Maladie + Non autorisées</div>
                </div>
              </div>
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
        </>
      )}
      
      {/* Vue Mensuelle */}
      {viewMode === 'monthly' && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-800">Vue Mensuelle Détaillée</h2>
              <p className="text-gray-600 mt-2">Sélectionnez un mois spécifique pour voir les détails complets</p>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'].map((month, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedMonth(index)}
                    className={`p-3 rounded-lg border transition-all duration-200 ${
                      selectedMonth === index 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                        : 'border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    {month} {selectedYear}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Données mensuelle détaillée */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Détails pour {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][selectedMonth]} {selectedYear}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{monthlyData[selectedMonth]?.cp || 0}</div>
                <div className="text-sm text-blue-600">Congés Payés</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{monthlyData[selectedMonth]?.rtt || 0}</div>
                <div className="text-sm text-green-600">RTT</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-700">{monthlyData[selectedMonth]?.am || 0}</div>
                <div className="text-sm text-red-600">Arrêts Maladie</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">{monthlyData[selectedMonth]?.formation || 0}</div>
                <div className="text-sm text-purple-600">Formation</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-700">{monthlyData[selectedMonth]?.autres || 0}</div>
                <div className="text-sm text-orange-600">Autres</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;