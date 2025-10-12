import React, { useState, useEffect } from 'react';
import { ModuleHeader, StatCard, ContentCard, Button, LoadingSpinner } from './shared/UIComponents';

const AnalyticsNew = ({ user, onBackToHub, showBackButton }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [periodType, setPeriodType] = useState('monthly'); // monthly, quarterly, custom, ytd
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // États pour les données réelles
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalAbsences: 0,
    totalAbsenceDays: 0,
    overtimeHours: 0,
    delegationHours: 0
  });
  
  const [absencesByType, setAbsencesByType] = useState([]);
  const [absencesByMonth, setAbsencesByMonth] = useState([]);
  const [absencesByDepartment, setAbsencesByDepartment] = useState([]);
  const [topAbsentEmployees, setTopAbsentEmployees] = useState([]);

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Charger les données réelles - Recalcul automatique quand les filtres changent
  useEffect(() => {
    fetchAnalytics();
  }, [selectedYear, selectedMonth, periodType, customStartDate, customEndDate]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Charger les employés
      const empResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users`, { headers });
      const employees = await empResponse.json();

      // Charger les absences
      const absResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/absences`, { headers });
      const absences = await absResponse.json();

      // Charger les heures supplémentaires
      const overtimeResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/overtime/all`, { headers });
      const overtime = await overtimeResponse.json();

      // Calculer les statistiques
      calculateStats(employees, absences, overtime);

    } catch (error) {
      console.error('Erreur chargement analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (employees, absences, overtime) => {
    // Filtrer les absences selon le type de période sélectionné
    const filteredAbsences = absences.filter(abs => {
      const absDate = new Date(abs.date_debut || abs.date);
      
      // Filtre par période personnalisée
      if (periodType === 'custom') {
        if (customStartDate && absDate < new Date(customStartDate)) return false;
        if (customEndDate && absDate > new Date(customEndDate)) return false;
        return true;
      }
      
      // Filtre YTD (Year to Date)
      if (periodType === 'ytd') {
        const today = new Date();
        return absDate.getFullYear() === today.getFullYear() && absDate <= today;
      }
      
      // Filtre par trimestre
      if (periodType === 'quarterly') {
        const quarter = Math.floor(selectedMonth / 3);
        const absQuarter = Math.floor(absDate.getMonth() / 3);
        return absDate.getFullYear() === selectedYear && absQuarter === quarter;
      }
      
      // Filtre mensuel/annuel standard
      const absYear = absDate.getFullYear();
      const absMonth = absDate.getMonth() + 1;
      
      if (absYear !== selectedYear) return false;
      if (selectedMonth !== 'all' && absMonth !== parseInt(selectedMonth)) return false;
      
      return true;
    });

    // Total jours d'absence
    const totalDays = filteredAbsences.reduce((sum, abs) => {
      return sum + parseFloat(abs.jours_absence || abs.days || 0);
    }, 0);

    // Total heures supplémentaires
    const totalOvertime = overtime.reduce((sum, emp) => sum + emp.accumulated, 0);

    // Absences par type
    const byType = {};
    filteredAbsences.forEach(abs => {
      const type = abs.motif_absence || abs.motif || 'Non spécifié';
      byType[type] = (byType[type] || 0) + parseFloat(abs.jours_absence || abs.days || 0);
    });

    const absencesByTypeArray = Object.entries(byType)
      .map(([type, days]) => ({ type, days: days.toFixed(1), count: Math.round(days) }))
      .sort((a, b) => b.days - a.days);

    // Absences par mois (pour l'année sélectionnée)
    const byMonth = Array(12).fill(0);
    absences.forEach(abs => {
      const absDate = new Date(abs.date_debut || abs.date);
      if (absDate.getFullYear() === selectedYear) {
        const month = absDate.getMonth();
        byMonth[month] += parseFloat(abs.jours_absence || abs.days || 0);
      }
    });

    const monthlyData = byMonth.map((days, index) => ({
      month: months[index].substring(0, 3),
      days: days.toFixed(1)
    }));

    // Absences par département
    const byDept = {};
    filteredAbsences.forEach(abs => {
      const dept = abs.department || 'Non spécifié';
      byDept[dept] = (byDept[dept] || 0) + parseFloat(abs.jours_absence || abs.days || 0);
    });

    const deptData = Object.entries(byDept)
      .map(([dept, days]) => ({ department: dept, days: days.toFixed(1) }))
      .sort((a, b) => b.days - a.days)
      .slice(0, 5);

    // Top employés absents
    const empAbsences = {};
    filteredAbsences.forEach(abs => {
      const empName = abs.employee || abs.employee_name || 'Non spécifié';
      empAbsences[empName] = (empAbsences[empName] || 0) + parseFloat(abs.jours_absence || abs.days || 0);
    });

    const topEmployees = Object.entries(empAbsences)
      .map(([name, days]) => ({ name, days: days.toFixed(1) }))
      .sort((a, b) => b.days - a.days)
      .slice(0, 10);

    // Mettre à jour les états
    setStats({
      totalEmployees: employees.length,
      totalAbsences: filteredAbsences.length,
      totalAbsenceDays: totalDays.toFixed(1),
      overtimeHours: totalOvertime.toFixed(1),
      delegationHours: 0 // À calculer si données disponibles
    });

    setAbsencesByType(absencesByTypeArray);
    setAbsencesByMonth(monthlyData);
    setAbsencesByDepartment(deptData);
    setTopAbsentEmployees(topEmployees);
  };

  const StatCard = ({ title, value, subtitle, icon, color }) => (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-6 text-white shadow-lg`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium opacity-90">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      {subtitle && <p className="text-xs opacity-80">{subtitle}</p>}
    </div>
  );

  if (loading) {
    return <LoadingSpinner text="Chargement des analytics..." />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header - Style Harmonisé */}
      <ModuleHeader
        title="Analytics & KPI"
        subtitle="Vue d'ensemble des données RH avec périodes personnalisées"
        icon="📊"
      />

      {/* Filtres Dynamiques */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">🎯 Filtres & Périodes</h3>
        
        {/* Type de période */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Type de Période</label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'monthly', label: '📅 Mensuel' },
              { value: 'quarterly', label: '📊 Trimestriel' },
              { value: 'ytd', label: '📈 Année en cours (YTD)' },
              { value: 'custom', label: '🎯 Période personnalisée' }
            ].map(period => (
              <button
                key={period.value}
                onClick={() => setPeriodType(period.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  periodType === period.value
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtres selon le type de période */}
        <div className="flex flex-wrap gap-4 items-end">
          {periodType === 'monthly' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Année</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {[2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mois</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">Toute l'année</option>
                  {months.map((month, index) => (
                    <option key={index} value={index + 1}>{month}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {periodType === 'quarterly' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Année</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {[2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trimestre</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="0">Q1 (Jan-Mar)</option>
                  <option value="3">Q2 (Avr-Juin)</option>
                  <option value="6">Q3 (Juil-Sep)</option>
                  <option value="9">Q4 (Oct-Déc)</option>
                </select>
              </div>
            </>
          )}

          {periodType === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Début</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Fin</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {periodType === 'ytd' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <p className="text-sm text-blue-800">
                📈 Analyse depuis le 1er janvier {currentYear} jusqu'à aujourd'hui
              </p>
            </div>
          )}

          <button
            onClick={fetchAnalytics}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
          >
            🔄 Actualiser
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Employés Actifs"
          value={stats.totalEmployees}
          icon="👥"
          color="from-blue-500 to-blue-600"
        />
        <StatCard
          title="Total Absences"
          value={stats.totalAbsences}
          subtitle={`${stats.totalAbsenceDays} jours`}
          icon="📅"
          color="from-orange-500 to-orange-600"
        />
        <StatCard
          title="Heures Supplémentaires"
          value={`${stats.overtimeHours}h`}
          subtitle="Cumulées"
          icon="⏰"
          color="from-red-500 to-red-600"
        />
        <StatCard
          title="Moyenne Absence/Employé"
          value={(stats.totalAbsenceDays / stats.totalEmployees || 0).toFixed(1)}
          subtitle="jours"
          icon="📊"
          color="from-purple-500 to-purple-600"
        />
      </div>

      {/* Graphiques et Tableaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Absences par Type */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Absences par Type</h2>
          <div className="space-y-3">
            {absencesByType.slice(0, 8).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{item.type}</span>
                    <span className="text-sm font-semibold text-gray-900">{item.days}j</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full"
                      style={{ width: `${(item.days / stats.totalAbsenceDays) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Absences par Mois */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Absences Mensuelles {selectedYear}
          </h2>
          <div className="space-y-2">
            {absencesByMonth.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-600 w-8">{item.month}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${Math.min((item.days / Math.max(...absencesByMonth.map(m => m.days))) * 100, 100)}%` }}
                  >
                    {item.days > 0 && (
                      <span className="text-xs font-semibold text-white">{item.days}j</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Absences par Département */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Top 5 Départements</h2>
          <div className="space-y-3">
            {absencesByDepartment.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-orange-400' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-800">{item.department}</span>
                </div>
                <span className="text-lg font-bold text-purple-600">{item.days}j</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Employés Absents */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Top 10 Employés (Absences)</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {topAbsentEmployees.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 w-6">{index + 1}.</span>
                  <span className="text-sm text-gray-700">{item.name}</span>
                </div>
                <span className={`text-sm font-semibold ${
                  item.days > 20 ? 'text-red-600' :
                  item.days > 10 ? 'text-orange-600' : 'text-gray-600'
                }`}>
                  {item.days}j
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsNew;
