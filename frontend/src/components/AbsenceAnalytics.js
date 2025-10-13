import React, { useState, useEffect } from 'react';

const AbsenceAnalytics = ({ user }) => {
  const [absences, setAbsences] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filtres
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedAbsenceType, setSelectedAbsenceType] = useState('all');
  const [selectedMotif, setSelectedMotif] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMetier, setSelectedMetier] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedSite, setSelectedSite] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedTempsTravail, setSelectedTempsTravail] = useState('all');
  
  const months = [
    'janv', 'févr', 'mars', 'avr', 'mai', 'juin',
    'juil', 'août', 'sept', 'oct', 'nov', 'déc'
  ];
  
  const monthsMapping = {
    'janv': 1, 'févr': 2, 'mars': 3, 'avr': 4, 'mai': 5, 'juin': 6,
    'juil': 7, 'août': 8, 'sept': 9, 'oct': 10, 'nov': 11, 'déc': 12
  };

  // Charger les données
  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Charger les employés
      const empResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const empData = await empResponse.json();
      setEmployees(empData);
      
      // Charger toutes les absences
      const absResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/absences`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const absData = await absResponse.json();
      setAbsences(absData);
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculer les statistiques pour chaque employé
  const calculateEmployeeStats = (employee) => {
    // Filtrer les absences de cet employé
    const employeeAbsences = absences.filter(abs => {
      const matchEmployee = abs.employee_id === employee.id || abs.user_id === employee.id;
      if (!matchEmployee) return false;
      
      // Filtrer par année
      const absDate = new Date(abs.date_debut || abs.date);
      const absYear = absDate.getFullYear();
      if (absYear !== selectedYear) return false;
      
      // Filtrer par mois si sélectionné
      if (selectedMonths.length > 0) {
        const absMonth = absDate.getMonth() + 1;
        if (!selectedMonths.includes(absMonth)) return false;
      }
      
      return true;
    });

    const stats = {
      absenteisme: 0,
      absenceProgrammee: 0,
      totalJours: 0,
      arretMaladie: 0,
      congesSansSolde: 0,
      teletravail: 0,
      rdvMedical: 0,
      evenementFamilial: 0,
      congesAnnuels: 0,
      congesTrimestriels: 0,
      rtt: 0,
      recuperation: 0,
      stage: 0
    };

    employeeAbsences.forEach(abs => {
      const jours = parseFloat(abs.jours_absence || abs.days || 0);
      const motif = (abs.motif_absence || abs.motif || '').toLowerCase();
      
      stats.totalJours += jours;
      
      // Catégoriser selon le motif
      if (motif.includes('maladie') || motif.includes('ma') || motif === 'am') {
        stats.arretMaladie += jours;
      } else if (motif.includes('sans solde') || motif.includes('css')) {
        stats.congesSansSolde += jours;
      } else if (motif.includes('télétravail') || motif.includes('tt')) {
        stats.teletravail += jours;
      } else if (motif.includes('médical') || motif.includes('rdv')) {
        stats.rdvMedical += jours;
      } else if (motif.includes('familial') || motif.includes('événement')) {
        stats.evenementFamilial += jours;
      } else if (motif.includes('annuel') || motif.includes('ca') || motif.includes('congés payés')) {
        stats.congesAnnuels += jours;
      } else if (motif.includes('trimestriel') || motif.includes('ct')) {
        stats.congesTrimestriels += jours;
      } else if (motif.includes('rtt')) {
        stats.rtt += jours;
      } else if (motif.includes('récupération') || motif.includes('recup') || motif.includes('rec')) {
        stats.recuperation += jours;
      } else if (motif.includes('stage') || motif.includes('formation')) {
        stats.stage += jours;
      }
      
      // Absence programmée vs absentéisme
      if (abs.is_validated || abs.validated) {
        stats.absenceProgrammee += jours;
      } else {
        stats.absenteisme += jours;
      }
    });

    return stats;
  };

  // Filtrer les employés selon les critères
  const filteredEmployees = employees.filter(emp => {
    if (selectedCategory !== 'all' && emp.categorie_employe !== selectedCategory) return false;
    if (selectedMetier !== 'all' && emp.metier !== selectedMetier) return false;
    if (selectedDepartment !== 'all' && emp.department !== selectedDepartment) return false;
    if (selectedSite !== 'all' && emp.site !== selectedSite) return false;
    if (selectedGender !== 'all' && emp.sexe !== selectedGender) return false;
    if (selectedTempsTravail !== 'all' && emp.temps_travail !== selectedTempsTravail) return false;
    return true;
  });

  // Toggle month selection
  const toggleMonth = (monthIndex) => {
    if (selectedMonths.includes(monthIndex)) {
      setSelectedMonths(selectedMonths.filter(m => m !== monthIndex));
    } else {
      setSelectedMonths([...selectedMonths, monthIndex]);
    }
  };

  // Get unique values for filters
  const getUniqueValues = (field) => {
    const values = [...new Set(employees.map(emp => emp[field]).filter(v => v))];
    return values.sort();
  };

  const getCellColor = (value, type) => {
    if (!value || value === 0) return '';
    
    if (type === 'arretMaladie' && value > 15) {
      return 'bg-yellow-100 text-yellow-800 font-semibold';
    }
    if (type === 'congesSansSolde' && value > 5) {
      return 'bg-orange-100 text-orange-800 font-semibold';
    }
    if (type === 'congesAnnuels') {
      if (value > 30) return 'bg-green-200 text-green-900 font-semibold';
      if (value > 20) return 'bg-green-100 text-green-800';
      return 'bg-green-50 text-green-700';
    }
    return '';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">📊 Analyse des Absences</h1>
            <p className="text-purple-100">Vue détaillée et statistiques par employé</p>
          </div>
          
          {/* Bouton retour au hub si appelé depuis AnalyticsHub */}
          {showBackButton && onBackToHub && (
            <button
              onClick={onBackToHub}
              className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg transition-all group"
            >
              <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">Retour au Hub</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Années et Mois */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedYear(2025)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedYear === 2025
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                2025
              </button>
              <button
                onClick={() => setSelectedYear(2024)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedYear === 2024
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                2024
              </button>
            </div>
            
            <div className="h-8 w-px bg-gray-300"></div>
            
            <div className="text-sm font-medium text-gray-700">Mois:</div>
            <div className="flex flex-wrap gap-2">
              {months.map((month, index) => (
                <button
                  key={month}
                  onClick={() => toggleMonth(monthsMapping[month])}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    selectedMonths.includes(monthsMapping[month])
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {month}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filtres supplémentaires */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Catégorie Employé */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Catégorie Employé</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Tous</option>
              {getUniqueValues('categorie_employe').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Métier */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Métier</label>
            <select
              value={selectedMetier}
              onChange={(e) => setSelectedMetier(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Tous</option>
              {getUniqueValues('metier').map(metier => (
                <option key={metier} value={metier}>{metier}</option>
              ))}
            </select>
          </div>

          {/* Département */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Département</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Tous</option>
              {getUniqueValues('department').map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Site */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Site</label>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Tous</option>
              {getUniqueValues('site').map(site => (
                <option key={site} value={site}>{site}</option>
              ))}
            </select>
          </div>

          {/* Genre */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Genre</label>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Tous</option>
              <option value="Femme">Femme</option>
              <option value="Homme">Homme</option>
            </select>
          </div>

          {/* Temps de travail */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Temps de travail</label>
            <select
              value={selectedTempsTravail}
              onChange={(e) => setSelectedTempsTravail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Tous</option>
              <option value="Temps Plein">Temps Plein</option>
              <option value="Temps Partiel">Temps Partiel</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Chargement des données...</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10">Employé</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Absentéisme</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Absence Programmée</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 bg-blue-50">Total Jours Absence</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Arrêt maladie</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Congés Sans Solde</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Télétravail</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Rendez-vous médical</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Evènement familiale</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Congés annuels</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Congés Trimestriels</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">RTT</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Récupération</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Stage</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => {
                  const stats = calculateEmployeeStats(employee);
                  
                  // Ne pas afficher si aucune absence
                  if (stats.totalJours === 0) return null;
                  
                  return (
                    <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800 sticky left-0 bg-white hover:bg-gray-50">
                        {employee.name}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {stats.absenteisme > 0 ? stats.absenteisme.toFixed(1) : ''}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {stats.absenceProgrammee > 0 ? stats.absenceProgrammee.toFixed(1) : ''}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-blue-600 bg-blue-50">
                        {stats.totalJours.toFixed(1)}
                      </td>
                      <td className={`px-4 py-3 text-center ${getCellColor(stats.arretMaladie, 'arretMaladie')}`}>
                        {stats.arretMaladie > 0 ? stats.arretMaladie.toFixed(1) : ''}
                      </td>
                      <td className={`px-4 py-3 text-center ${getCellColor(stats.congesSansSolde, 'congesSansSolde')}`}>
                        {stats.congesSansSolde > 0 ? stats.congesSansSolde.toFixed(1) : ''}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {stats.teletravail > 0 ? stats.teletravail.toFixed(1) : ''}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {stats.rdvMedical > 0 ? stats.rdvMedical.toFixed(1) : ''}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {stats.evenementFamilial > 0 ? stats.evenementFamilial.toFixed(1) : ''}
                      </td>
                      <td className={`px-4 py-3 text-center ${getCellColor(stats.congesAnnuels, 'congesAnnuels')}`}>
                        {stats.congesAnnuels > 0 ? stats.congesAnnuels.toFixed(1) : ''}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {stats.congesTrimestriels > 0 ? stats.congesTrimestriels.toFixed(1) : ''}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {stats.rtt > 0 ? stats.rtt.toFixed(1) : ''}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {stats.recuperation > 0 ? stats.recuperation.toFixed(1) : ''}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {stats.stage > 0 ? stats.stage.toFixed(1) : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AbsenceAnalytics;
