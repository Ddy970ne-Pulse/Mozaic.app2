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
  const [showLegendDetails, setShowLegendDetails] = useState(false);
  const [legendView, setLegendView] = useState('compact'); // 'compact' or 'detailed'

  const employees = [
    { 
      id: 1, name: 'Sophie Martin', department: 'Direction', site: 'Siège', category: 'Cadre Supérieur', 
      contract: 'CDI - Cadre', gender: 'Femme', workTime: 'Temps Plein', job: 'Directrice RH',
      absences: { '3': 'CA', '4': 'CA', '17': 'REC', '24': 'AM' } 
    },
    { 
      id: 2, name: 'Jean Dupont', department: 'Administratif', site: 'Siège', category: 'Cadre', 
      contract: 'CDI - Cadre', gender: 'Homme', workTime: 'Temps Plein', job: 'Responsable IT',
      absences: { '10': 'CA', '11': 'CA', '12': 'CA', '25': 'DEL' } 
    },
    { 
      id: 3, name: 'Marie Leblanc', department: 'Commercial', site: 'Pôle Éducatif', category: 'Employé Qualifié', 
      contract: 'CDI - Non Cadre', gender: 'Femme', workTime: 'Temps Plein', job: 'Commerciale',
      absences: { '8': 'REC', '22': 'CA', '23': 'CA', '14': 'RMED' } 
    },
    { 
      id: 4, name: 'Pierre Martin', department: 'Comptable', site: 'Siège', category: 'Technicien', 
      contract: 'CDI - Non Cadre', gender: 'Homme', workTime: 'Temps Partiel', job: 'Comptable',
      absences: { '5': 'AM', '15': 'CA', '16': 'CA', '29': 'REC' } 
    },
    { 
      id: 5, name: 'Claire Dubois', department: 'Éducatif', site: 'Pôle Éducatif', category: 'Employé Qualifié', 
      contract: 'CDD - Non Cadre', gender: 'Femme', workTime: 'Temps Plein', job: 'Éducatrice',
      absences: { '7': 'CA', '20': 'AM', '21': 'AM', '13': 'TEL' } 
    },
    { 
      id: 6, name: 'Lucas Bernard', department: 'Production', site: 'Menuiserie 44', category: 'Ouvrier qualifié', 
      contract: 'CDI - Non Cadre', gender: 'Homme', workTime: 'Temps Plein', job: 'Menuisier',
      absences: { '12': 'REC', '26': 'CA', '27': 'CA', '30': 'AT' } 
    },
    { 
      id: 7, name: 'Emma Rousseau', department: 'ASI', site: 'Alpinia 44', category: 'Agent administratif', 
      contract: 'CDI - Non Cadre', gender: 'Femme', workTime: 'Temps Partiel', job: 'Agent ASI',
      absences: { '2': 'CA', '18': 'REC', '31': 'AM', '6': 'FO' } 
    },
    { 
      id: 8, name: 'Thomas Leroy', department: 'Production', site: 'Garage 44', category: 'Ouvrier qualifié', 
      contract: 'CDI - Non Cadre', gender: 'Homme', workTime: 'Temps Plein', job: 'Mécanicien',
      absences: { '9': 'CA', '19': 'CA', '28': 'REC', '4': 'CT' } 
    },
    { 
      id: 9, name: 'Isabelle Moreau', department: 'Éducatif', site: 'Pôle Éducatif', category: 'Employé Qualifié', 
      contract: 'CDI - Non Cadre', gender: 'Femme', workTime: 'Temps Plein', job: 'Éducatrice',
      absences: { '1': 'MAT', '2': 'MAT', '3': 'MAT', '4': 'MAT', '5': 'MAT' } 
    },
    { 
      id: 10, name: 'Marc Dubois', department: 'Production', site: 'Menuiserie 44', category: 'Ouvrier qualifié', 
      contract: 'CDD - Non Cadre', gender: 'Homme', workTime: 'Temps Plein', job: 'Apprenti Menuisier',
      absences: { '11': 'STG', '12': 'STG', '13': 'STG', '26': 'EMAL' } 
    }
  ];

  // Listes de filtres basées sur l'image fournie
  const departmentsList = ['Direction', 'Éducatif', 'Administratif', 'Comptable', 'ASI', 'Production', 'Commercial', 'Technique', 'Maintenance', 'Qualité'];
  const sites = ['Siège', 'Pôle Éducatif', 'Menuiserie 44', 'Voiles 44', 'Garage 44', 'Alpinia 44', 'Ferme 44', 'Restaurant 44'];
  const categories = ['Cadre Supérieur', 'Cadre', 'Employé Qualifié', 'Technicien', 'Ouvrier qualifié', 'Ouvrier non qualifié', 'Agent administratif', 'Personnel ASI'];
  const contracts = ['CDI - Non Cadre', 'CDD - Non Cadre', 'CDI - Cadre', 'CDD - Cadre', 'Stagiaire', 'Apprenti(e)'];
  const jobs = ['Directrice RH', 'Responsable IT', 'Commerciale', 'Comptable', 'Éducatrice', 'Menuisier', 'Agent ASI', 'Mécanicien', 'Chef de Service'];
  const absenceCategories = ['Absence Programmée', 'Absentéisme'];
  const absenceReasons = [
    'Accident du travail / Trajet', 'Arrêt maladie', 'Absence non autorisée', 'Absence autorisée',
    'Évènement familiale', 'Congé maternité', 'Congé paternité', 'Congés annuels', 'Congé formation',
    'Congés Sans Solde', 'Congés Trimestriels', 'Récupération', 'Repos Hebdomadaire', 'Repos Dominical',
    'Télétravail', 'Délégation', 'Stage', 'Congé exceptionnel', 'Maladie Professionnelle', 
    'Enfants malades', 'Rendez-vous médical'
  ];

  // Comprehensive absence legend based on the provided list
  const absenceColorMap = {
    'AT': { name: 'Accident du travail / Trajet', color: 'bg-red-600', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'AM': { name: 'Arrêt maladie', color: 'bg-red-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'NAUT': { name: 'Absence non autorisée', color: 'bg-gray-600', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'AUT': { name: 'Absence autorisée', color: 'bg-gray-400', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'FAM': { name: 'Évènement familiale', color: 'bg-pink-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'MAT': { name: 'Congé maternité', color: 'bg-pink-400', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Calendaires' },
    'PAT': { name: 'Congé paternité', color: 'bg-blue-400', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Calendaires' },
    'CA': { name: 'Congés annuels', color: 'bg-blue-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrables' },
    'FO': { name: 'Congé formation', color: 'bg-indigo-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables' },
    'CSS': { name: 'Congés Sans Solde', color: 'bg-gray-700', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables' },
    'CT': { name: 'Congés Trimestriels', color: 'bg-orange-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrés' },
    'REC': { name: 'Récupération', color: 'bg-green-400', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrables' },
    'RH': { name: 'Repos Hebdomadaire', color: 'bg-green-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrables' },
    'RHD': { name: 'Repos Dominical', color: 'bg-green-600', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Calendaires' },
    'TEL': { name: 'Télétravail', color: 'bg-cyan-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables' },
    'DEL': { name: 'Délégation', color: 'bg-purple-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrés' },
    'STG': { name: 'Stage', color: 'bg-yellow-500', textColor: 'text-black', type: 'Absence Programmée', decompte: 'Jours Calendaires' },
    'CEX': { name: 'Congé exceptionnel', color: 'bg-amber-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables' },
    'MPRO': { name: 'Maladie Professionnelle', color: 'bg-red-700', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'EMAL': { name: 'Enfants malades', color: 'bg-red-400', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Calendaires' },
    'RMED': { name: 'Rendez-vous médical', color: 'bg-teal-500', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrés' },
    // Deprecated codes (keeping for backward compatibility)
    'CP': { name: 'Congés Payés', color: 'bg-blue-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrables' },
    'RTT': { name: 'RTT', color: 'bg-green-500', textColor: 'text-white', type: 'Absence Programmée', decompte: 'Jours Ouvrables' },
    'HS': { name: 'Heures Sup', color: 'bg-purple-600', textColor: 'text-white', type: 'Présence', decompte: 'Heures' },
    'FM': { name: 'Formation', color: 'bg-indigo-600', textColor: 'text-white', type: 'Absentéisme', decompte: 'Jours Ouvrables' }
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

  const filteredEmployees = sortedEmployees.filter(emp => {
    return (filterDept === 'all' || emp.department === filterDept) &&
           (filterSite === 'all' || emp.site === filterSite) &&
           (filterCategory === 'all' || emp.category === filterCategory) &&
           (filterContract === 'all' || emp.contract === filterContract) &&
           (filterGender === 'all' || emp.gender === filterGender) &&
           (filterWorkTime === 'all' || emp.workTime === filterWorkTime);
  });

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

        {/* Filtres avancés basés sur l'image fournie */}
        <div className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-4">
            {/* Filtre Mois */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
              <select className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white">
                <option>janv</option><option>févr</option><option>mars</option><option>avr</option>
                <option>mai</option><option>juin</option><option>juil</option><option>août</option>
                <option>sept</option><option>oct</option><option>nov</option><option>déc</option>
              </select>
            </div>

            {/* Type Absence */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type Absence</label>
              <select 
                value={filterAbsenceType}
                onChange={(e) => setFilterAbsenceType(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="all">(tous)</option>
                {absenceCategories.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Motif Absence */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Motif Absence</label>
              <select 
                value={filterAbsenceReason}
                onChange={(e) => setFilterAbsenceReason(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="all">(tous)</option>
                {absenceReasons.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>

            {/* Catégorie Employé */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie Employé</label>
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="all">(tous)</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Métier */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Métier</label>
              <select className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white">
                <option>(tous)</option>
                {jobs.map(job => (
                  <option key={job} value={job}>{job}</option>
                ))}
              </select>
            </div>

            {/* Genre */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Genre</label>
              <select 
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="all">(tous)</option>
                <option value="Femme">Femme</option>
                <option value="Homme">Homme</option>
              </select>
            </div>

            {/* Temps de travail */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Temps de travail</label>
              <select 
                value={filterWorkTime}
                onChange={(e) => setFilterWorkTime(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="all">(tous)</option>
                <option value="Temps Partiel">Temps Partiel</option>
                <option value="Temps Plein">Temps Plein</option>
              </select>
            </div>

            {/* Département */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Département</label>
              <select 
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="all">(tous)</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Deuxième ligne de filtres */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Site */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Site</label>
              <select 
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="all">(tous)</option>
                {sites.map(site => (
                  <option key={site} value={site}>{site}</option>
                ))}
              </select>
            </div>

            {/* Type de contrat */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type Contrat</label>
              <select 
                value={filterContract}
                onChange={(e) => setFilterContract(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="all">(tous)</option>
                {contracts.map(contract => (
                  <option key={contract} value={contract}>{contract}</option>
                ))}
              </select>
            </div>

            {/* Tri */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Trier par</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="name">Nom</option>
                <option value="department">Département</option>
                <option value="absences">Nb absences</option>
              </select>
            </div>

            {/* Résultats */}
            <div className="flex items-end">
              <div className="text-xs text-gray-600">
                {filteredEmployees.length} employé(s) affiché(s)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Légende des absences</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(absenceColorMap).map(([code, type]) => (
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
                            absenceColorMap[absence]?.color || 'bg-gray-500'
                          } ${absenceColorMap[absence]?.textColor || 'text-white'}`}
                               title={`${absenceColorMap[absence]?.name || absence} - ${employee.name}`}>
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

      {/* Légende des absences */}
      <div className="mt-6 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="text-xl mr-2">📋</span>
            Légende des Codes d'Absence
          </h3>
          <div className="text-sm text-gray-600">
            {Object.keys(absenceColorMap).length} types d'absence
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Object.entries(absenceColorMap)
            .filter(([code]) => !['CP', 'RTT', 'HS', 'FM'].includes(code)) // Exclude deprecated codes from main display
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([code, info]) => (
            <div
              key={code}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:shadow-md transition-shadow duration-200"
            >
              <div className={`w-10 h-8 rounded flex items-center justify-center text-xs font-bold ${info.color} ${info.textColor} flex-shrink-0`}>
                {code}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate" title={info.name}>
                  {info.name}
                </div>
                <div className="text-xs text-gray-500 flex flex-col">
                  <span className="truncate">{info.type}</span>
                  <span className="text-xs text-gray-400">{info.decompte}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Types d'absence summary */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
              <span className="text-gray-700">Absence Programmée</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
              <span className="text-gray-700">Absentéisme</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
              <span className="text-gray-700">Présence</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyPlanning;