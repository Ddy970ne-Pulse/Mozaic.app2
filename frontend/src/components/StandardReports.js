import React, { useState, useEffect } from 'react';

const StandardReports = ({ user, onBackToHub, showBackButton }) => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('absences');
  const [periodType, setPeriodType] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [reportData, setReportData] = useState(null);

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const reportTypes = [
    { id: 'absences', name: 'Rapport des Absences', icon: '📅', color: 'from-blue-500 to-blue-600' },
    { id: 'overtime', name: 'Rapport Heures Supplémentaires', icon: '⏰', color: 'from-orange-500 to-orange-600' },
    { id: 'delegation', name: 'Rapport Heures Délégation', icon: '⚖️', color: 'from-purple-500 to-purple-600' },
    { id: 'turnover', name: 'Roulement du Personnel', icon: '🔄', color: 'from-red-500 to-red-600' }
  ];

  useEffect(() => {
    if (reportType) {
      generateReport();
    }
  }, [reportType, periodType, selectedYear, selectedMonth, customStartDate, customEndDate]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Déterminer la période
      const period = getPeriod();

      let data = {};
      
      switch (reportType) {
        case 'absences':
          data = await generateAbsenceReport(headers, period);
          break;
        case 'overtime':
          data = await generateOvertimeReport(headers, period);
          break;
        case 'delegation':
          data = await generateDelegationReport(headers, period);
          break;
        case 'turnover':
          data = await generateTurnoverReport(headers, period);
          break;
      }

      setReportData(data);
    } catch (error) {
      console.error('Erreur génération rapport:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriod = () => {
    if (periodType === 'custom') {
      return {
        type: 'custom',
        start: customStartDate,
        end: customEndDate,
        label: `Du ${formatDate(customStartDate)} au ${formatDate(customEndDate)}`
      };
    }

    if (periodType === 'yearly') {
      return {
        type: 'yearly',
        year: selectedYear,
        label: `Année ${selectedYear}`
      };
    }

    return {
      type: 'monthly',
      year: selectedYear,
      month: selectedMonth,
      label: `${months[selectedMonth - 1]} ${selectedYear}`
    };
  };

  const generateAbsenceReport = async (headers, period) => {
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/absences`, { headers });
    const absences = await response.json();

    const filtered = filterByPeriod(absences, period, 'date_debut');

    const totalDays = filtered.reduce((sum, abs) => sum + parseFloat(abs.jours_absence || 0), 0);
    const byType = {};
    const byDepartment = {};
    const byEmployee = {};

    filtered.forEach(abs => {
      const type = abs.motif_absence || 'Non spécifié';
      const dept = abs.department || 'Non spécifié';
      const emp = abs.employee || 'Non spécifié';
      const days = parseFloat(abs.jours_absence || 0);

      byType[type] = (byType[type] || 0) + days;
      byDepartment[dept] = (byDepartment[dept] || 0) + days;
      byEmployee[emp] = (byEmployee[emp] || 0) + days;
    });

    return {
      period: period.label,
      totalAbsences: filtered.length,
      totalDays: totalDays.toFixed(1),
      byType: Object.entries(byType).map(([type, days]) => ({ type, days: days.toFixed(1) })).sort((a, b) => b.days - a.days),
      byDepartment: Object.entries(byDepartment).map(([dept, days]) => ({ department: dept, days: days.toFixed(1) })).sort((a, b) => b.days - a.days),
      topEmployees: Object.entries(byEmployee).map(([name, days]) => ({ name, days: days.toFixed(1) })).sort((a, b) => b.days - a.days).slice(0, 10)
    };
  };

  const generateOvertimeReport = async (headers, period) => {
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/overtime/all`, { headers });
    const overtime = await response.json();

    const totalAccumulated = overtime.reduce((sum, emp) => sum + emp.accumulated, 0);
    const totalRecovered = overtime.reduce((sum, emp) => sum + emp.recovered, 0);
    const totalBalance = overtime.reduce((sum, emp) => sum + emp.balance, 0);

    return {
      period: period.label,
      totalEmployees: overtime.length,
      totalAccumulated: totalAccumulated.toFixed(1),
      totalRecovered: totalRecovered.toFixed(1),
      totalBalance: totalBalance.toFixed(1),
      byEmployee: overtime.map(emp => ({
        name: emp.name,
        department: emp.department,
        accumulated: emp.accumulated.toFixed(1),
        recovered: emp.recovered.toFixed(1),
        balance: emp.balance.toFixed(1)
      })).sort((a, b) => b.balance - a.balance)
    };
  };

  const generateDelegationReport = async (headers, period) => {
    // À implémenter avec les vraies données de délégation
    return {
      period: period.label,
      totalDelegates: 0,
      totalHoursUsed: 0,
      totalHoursRemaining: 0
    };
  };

  const generateTurnoverReport = async (headers, period) => {
    const empResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users`, { headers });
    const employees = await empResponse.json();

    const activeEmployees = employees.filter(emp => !emp.date_fin_contrat);
    const leftEmployees = employees.filter(emp => {
      if (!emp.date_fin_contrat) return false;
      const endDate = new Date(emp.date_fin_contrat);
      return isInPeriod(endDate, period);
    });

    const turnoverRate = activeEmployees.length > 0 
      ? ((leftEmployees.length / activeEmployees.length) * 100).toFixed(1)
      : 0;

    const byDepartment = {};
    leftEmployees.forEach(emp => {
      const dept = emp.department || 'Non spécifié';
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;
    });

    return {
      period: period.label,
      activeEmployees: activeEmployees.length,
      departures: leftEmployees.length,
      turnoverRate: `${turnoverRate}%`,
      departuresList: leftEmployees.map(emp => ({
        name: emp.name,
        department: emp.department,
        endDate: emp.date_fin_contrat,
        reason: emp.departure_reason || 'Non spécifié'
      })),
      byDepartment: Object.entries(byDepartment).map(([dept, count]) => ({ department: dept, count }))
    };
  };

  const filterByPeriod = (items, period, dateField) => {
    return items.filter(item => {
      const itemDate = new Date(item[dateField] || item.date);
      return isInPeriod(itemDate, period);
    });
  };

  const isInPeriod = (date, period) => {
    if (period.type === 'custom') {
      const start = new Date(period.start);
      const end = new Date(period.end);
      return date >= start && date <= end;
    }

    if (period.type === 'yearly') {
      return date.getFullYear() === period.year;
    }

    return date.getFullYear() === period.year && date.getMonth() + 1 === period.month;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const exportToCSV = () => {
    if (!reportData) return;

    let csvContent = `Rapport: ${reportTypes.find(r => r.id === reportType)?.name}\n`;
    csvContent += `Période: ${reportData.period}\n\n`;

    // Contenu selon le type de rapport
    // ... (logique d'export à implémenter)

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rapport_${reportType}_${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">📊 Rapports Standards</h1>
            <p className="text-indigo-100">Génération de rapports personnalisés</p>
          </div>
          
          {/* Bouton retour au hub */}
          {showBackButton && onBackToHub && (
            <button
              onClick={onBackToHub}
              className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2.5 rounded-lg transition-all border border-white/30 hover:border-white/50 group"
            >
              <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-semibold">Retour au Hub</span>
            </button>
          )}
        </div>
      </div>

      {/* Sélection du type de rapport */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Type de Rapport</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setReportType(type.id)}
              className={`p-4 rounded-xl border-2 transition-all ${
                reportType === type.id
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-3xl mb-2">{type.icon}</div>
              <div className="font-medium text-gray-800">{type.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Sélection de la période */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Période d'Analyse</h3>
        
        {/* Type de période */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'monthly', label: '📅 Mensuel' },
              { value: 'yearly', label: '📆 Annuel' },
              { value: 'custom', label: '🎯 Période Personnalisée' }
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

        {/* Filtres selon le type */}
        <div className="flex flex-wrap gap-4 items-end">
          {periodType === 'monthly' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Année</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  {months.map((month, index) => (
                    <option key={index} value={index + 1}>{month}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {periodType === 'yearly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Année</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                {[2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}

          {periodType === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📅 Date de Début</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📅 Date de Fin</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </>
          )}

          <button
            onClick={generateReport}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
          >
            🔄 Générer
          </button>

          {reportData && (
            <button
              onClick={exportToCSV}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              📥 Exporter CSV
            </button>
          )}
        </div>
      </div>

      {/* Affichage du rapport */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      )}

      {reportData && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {reportTypes.find(r => r.id === reportType)?.name}
              </h2>
              <p className="text-gray-600">Période: {reportData.period}</p>
            </div>
          </div>

          {/* Contenu selon le type de rapport */}
          {reportType === 'absences' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 font-medium">Total Absences</p>
                  <p className="text-3xl font-bold text-blue-900">{reportData.totalAbsences}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-600 font-medium">Total Jours</p>
                  <p className="text-3xl font-bold text-purple-900">{reportData.totalDays}j</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Par Type</h3>
                <div className="space-y-2">
                  {reportData.byType.map((item, index) => (
                    <div key={index} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{item.type}</span>
                      <span className="text-purple-600 font-bold">{item.days}j</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {reportType === 'turnover' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium">👥 Employés Actifs</p>
                  <p className="text-3xl font-bold text-green-900">{reportData.activeEmployees}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-red-600 font-medium">📤 Départs</p>
                  <p className="text-3xl font-bold text-red-900">{reportData.departures}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm text-orange-600 font-medium">📊 Taux de Rotation</p>
                  <p className="text-3xl font-bold text-orange-900">{reportData.turnoverRate}</p>
                </div>
              </div>

              {reportData.departures > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Liste des Départs</h3>
                  <div className="space-y-2">
                    {reportData.departuresList.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">{item.department}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatDate(item.endDate)}</p>
                          <p className="text-xs text-gray-500">{item.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StandardReports;
