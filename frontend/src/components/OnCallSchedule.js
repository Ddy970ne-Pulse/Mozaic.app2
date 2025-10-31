import React, { useState, useEffect } from 'react';

/**
 * OnCallSchedule - Planning des Astreintes Unifié v2
 * - Bouton Créer fonctionnel
 * - Codes couleur par salarié
 * - Affichage semaines complètes (avec jours mois précédent/suivant)
 */
const OnCallSchedule = ({ user }) => {
  const [onCallData, setOnCallData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // États pour l'ajout rapide
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddData, setQuickAddData] = useState({
    employeeId: '',
    date: '',
    type: 'semaine',
    notes: ''
  });
  const [hoveredDay, setHoveredDay] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // États pour le menu contextuel
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedOnCall, setSelectedOnCall] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Couleurs par employé (palette harmonieuse)
  const employeeColors = [
    'bg-blue-100 border-blue-300 text-blue-800',
    'bg-green-100 border-green-300 text-green-800',
    'bg-purple-100 border-purple-300 text-purple-800',
    'bg-orange-100 border-orange-300 text-orange-800',
    'bg-pink-100 border-pink-300 text-pink-800',
    'bg-cyan-100 border-cyan-300 text-cyan-800',
    'bg-yellow-100 border-yellow-300 text-yellow-800',
    'bg-red-100 border-red-300 text-red-800',
    'bg-indigo-100 border-indigo-300 text-indigo-800',
    'bg-teal-100 border-teal-300 text-teal-800'
  ];
  
  const getEmployeeColor = (employeeId) => {
    const index = employees.findIndex(e => e.id === employeeId);
    return employeeColors[index % employeeColors.length];
  };

  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

  useEffect(() => {
    fetchOnCallSchedule();
    fetchEmployees();
  }, [selectedMonth, selectedYear]);

  // Fermer le menu contextuel au clic
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Filtrer uniquement les cadres (éligibles pour astreintes)
        setEmployees(data.filter(emp => emp.categorie_employe === 'Cadre' || emp.role === 'manager'));
      }
    } catch (error) {
      console.error('Erreur chargement employés:', error);
    }
  };

  const fetchOnCallSchedule = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${backendUrl}/api/on-call/schedule?month=${selectedMonth + 1}&year=${selectedYear}`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setOnCallData(data);
      } else if (response.status === 404) {
        // API pas encore implémentée
        console.log('API non disponible');
        setOnCallData([]);
      }
    } catch (error) {
      console.error('Erreur chargement planning:', error);
      setOnCallData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getMonthName = (month) => {
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return months[month];
  };

  // Obtenir tous les jours à afficher (semaines complètes)
  const getCalendarDays = () => {
    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
    const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
    
    // Jour de la semaine du 1er du mois (0 = dimanche)
    const startDayOfWeek = firstDayOfMonth.getDay();
    
    // Début: aller au dimanche précédent si le mois ne commence pas un dimanche
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(firstDayOfMonth.getDate() - startDayOfWeek);
    
    // Fin: aller au samedi suivant
    const endDate = new Date(lastDayOfMonth);
    const endDayOfWeek = lastDayOfMonth.getDay();
    const daysToAdd = endDayOfWeek === 6 ? 0 : (6 - endDayOfWeek);
    endDate.setDate(lastDayOfMonth.getDate() + daysToAdd);
    
    // Générer tous les jours
    const days = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      days.push({
        date: new Date(currentDate),
        day: currentDate.getDate(),
        month: currentDate.getMonth(),
        year: currentDate.getFullYear(),
        isCurrentMonth: currentDate.getMonth() === selectedMonth
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const getOnCallForDay = (date) => {
    // Créer la chaîne de date au format YYYY-MM-DD pour la comparaison
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    const matches = onCallData.filter(item => {
      // Comparer directement les chaînes de date
      const match = item.date === dateStr;
      if (match) {
        console.log(`✅ Match trouvé: ${item.date} === ${dateStr} pour ${item.employee_name}`);
      }
      return match;
    });
    
    return matches;
  };

  // Ouvrir le modal d'ajout rapide
  const openQuickAddModal = (dayData) => {
    console.log('📅 Opening quick add modal for:', dayData);
    const dateStr = `${dayData.year}-${String(dayData.month + 1).padStart(2, '0')}-${String(dayData.day).padStart(2, '0')}`;
    console.log('📅 Date string:', dateStr);
    setQuickAddData({
      employeeId: '',
      date: dateStr,
      type: 'semaine',
      notes: ''
    });
    setShowQuickAddModal(true);
    console.log('✅ Modal should be visible now');
  };

  // Menu contextuel (clic droit)
  const handleRightClick = (e, onCallItem) => {
    e.preventDefault();
    if (user?.role !== 'admin') return;
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY
    });
    setSelectedOnCall(onCallItem);
  };

  // Créer une astreinte
  const handleQuickAddSubmit = async () => {
    if (!quickAddData.employeeId || !quickAddData.date) {
      alert('⚠️ Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsCreating(true);
    
    try {
      const employee = employees.find(e => e.id === quickAddData.employeeId);
      
      console.log('📅 Date sélectionnée par l\'utilisateur:', quickAddData.date);
      
      // Préparer les données pour l'API
      // Parser la date en local time pour éviter les problèmes de timezone
      const [year, month, day] = quickAddData.date.split('-').map(Number);
      let startDate = new Date(year, month - 1, day, 12, 0, 0); // Midi pour éviter les problèmes de timezone
      
      console.log('📅 Date parsée:', startDate);
      console.log('📅 Jour de la semaine:', ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][startDate.getDay()]);
      
      const schedulesToCreate = [];
      
      if (quickAddData.type === 'semaine') {
        // Pour une semaine d'astreinte, ajuster pour commencer le dimanche
        // 0 = dimanche, 1 = lundi, ..., 6 = samedi
        const dayOfWeek = startDate.getDay();
        
        console.log('📅 Jour de la semaine (0=Dim, 6=Sam):', dayOfWeek);
        
        // Si la date sélectionnée n'est pas un dimanche, remonter au dimanche précédent
        if (dayOfWeek !== 0) {
          console.log('📅 Ajustement: reculer de', dayOfWeek, 'jours pour atteindre le dimanche');
          startDate.setDate(startDate.getDate() - dayOfWeek);
        } else {
          console.log('📅 Date déjà un dimanche, pas d\'ajustement nécessaire');
        }
        
        console.log('📅 Début de la semaine (dimanche):', startDate, startDate.toISOString().split('T')[0]);
        
        // Créer 7 jours d'astreintes (dimanche → samedi)
        for (let i = 0; i < 7; i++) {
          // Créer une nouvelle date en ajoutant i jours (en millisecondes)
          const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
          const dateStr = date.toISOString().split('T')[0]; // Format YYYY-MM-DD
          console.log(`📅 Jour ${i} (${['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][date.getDay()]}): ${dateStr}`);
          schedulesToCreate.push({
            employee_id: quickAddData.employeeId,
            employee_name: employee?.name || `${employee?.prenom} ${employee?.nom}`,
            date: dateStr,
            type: 'Astreinte semaine',
            notes: quickAddData.notes || ''
          });
        }
      } else {
        schedulesToCreate.push({
          employee_id: quickAddData.employeeId,
          employee_name: employee?.name || `${employee?.prenom} ${employee?.nom}`,
          date: startDate.toISOString(),
          type: 'Astreinte jour',
          notes: quickAddData.notes || ''
        });
      }
      
      // Appel API pour créer les astreintes
      const response = await fetch(`${backendUrl}/api/on-call/schedule/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ schedules: schedulesToCreate })
      });

      if (response.ok) {
        const createdSchedules = await response.json();
        setOnCallData([...onCallData, ...createdSchedules]);
        alert(`✅ Astreinte créée pour ${employee?.name || employee?.prenom}`);
        setShowQuickAddModal(false);
        setQuickAddData({ employeeId: '', date: '', type: 'semaine', notes: '' });
        // Recharger les données
        fetchOnCallSchedule();
      } else {
        const error = await response.json();
        console.error('Erreur API:', error);
        alert(`❌ Erreur lors de la création: ${error.detail || 'Erreur inconnue'}`);
      }
      
    } catch (error) {
      console.error('Erreur création:', error);
      alert('❌ Erreur lors de la création');
    } finally {
      setIsCreating(false);
    }
  };

  // Supprimer une astreinte
  const handleDelete = async () => {
    if (!selectedOnCall) return;
    
    try {
      const response = await fetch(`${backendUrl}/api/on-call/schedule/${selectedOnCall.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setOnCallData(onCallData.filter(item => item.id !== selectedOnCall.id));
        alert('✅ Astreinte supprimée');
        setShowDeleteConfirm(false);
        setSelectedOnCall(null);
        // Recharger les données
        fetchOnCallSchedule();
      } else {
        const error = await response.json();
        alert(`❌ Erreur: ${error.detail || 'Impossible de supprimer'}`);
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('❌ Erreur lors de la suppression');
    }
  };

  const isAdmin = user?.role === 'admin';
  const calendarDays = getCalendarDays();
  
  const isToday = (dayData) => {
    const today = new Date();
    return dayData.day === today.getDate() &&
           dayData.month === today.getMonth() &&
           dayData.year === today.getFullYear();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">📅 Planning des Astreintes</h1>
        <p className="text-cyan-100">
          {isAdmin ? 'Consultez et gérez les astreintes' : 'Consultez les astreintes'} - Affichage par semaines complètes
        </p>
      </div>

      {/* Sélection mois/année */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (selectedMonth === 0) {
                  setSelectedMonth(11);
                  setSelectedYear(selectedYear - 1);
                } else {
                  setSelectedMonth(selectedMonth - 1);
                }
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              ← Précédent
            </button>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {getMonthName(selectedMonth)} {selectedYear}
              </div>
              <div className="text-sm text-gray-600">
                {onCallData.length} astreinte(s)
              </div>
            </div>

            <button
              onClick={() => {
                if (selectedMonth === 11) {
                  setSelectedMonth(0);
                  setSelectedYear(selectedYear + 1);
                } else {
                  setSelectedMonth(selectedMonth + 1);
                }
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Suivant →
            </button>
          </div>

          <button
            onClick={() => {
              setSelectedMonth(new Date().getMonth());
              setSelectedYear(new Date().getFullYear());
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Aujourd'hui
          </button>
        </div>
      </div>

      {/* Calendrier */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            Chargement...
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {/* En-têtes jours */}
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
              <div key={day} className="text-center font-semibold text-gray-700 py-2">
                {day}
              </div>
            ))}

            {/* Jours (semaines complètes) */}
            {calendarDays.map((dayData, index) => {
              const dayKey = `${dayData.year}-${dayData.month}-${dayData.day}`;
              const onCallForDay = getOnCallForDay(dayData.date);
              const isTodayDate = isToday(dayData);
              const isHovered = hoveredDay === dayKey;
              
              // Log pour déboguer
              if (onCallForDay.length > 0) {
                const dateStr = `${dayData.year}-${String(dayData.month + 1).padStart(2, '0')}-${String(dayData.day).padStart(2, '0')}`;
                console.log(`📅 Cellule: ${dateStr}, dayData.date:`, dayData.date, `Astreintes trouvées: ${onCallForDay.length}`);
              }

              return (
                <div
                  key={dayKey}
                  className={`
                    relative min-h-24 p-2 border rounded-lg transition-all
                    ${isTodayDate ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'border-gray-200'}
                    ${!dayData.isCurrentMonth ? 'bg-gray-50 opacity-50' : ''}
                    ${onCallForDay.length > 0 ? 'bg-gradient-to-br from-orange-50 to-yellow-50' : ''}
                    ${isAdmin && dayData.isCurrentMonth ? 'hover:shadow-md' : ''}
                  `}
                  onMouseEnter={() => setHoveredDay(dayKey)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  <div className={`text-sm font-semibold mb-1 ${
                    isTodayDate ? 'text-blue-600' : 
                    !dayData.isCurrentMonth ? 'text-gray-400' : 
                    'text-gray-700'
                  }`}>
                    {dayData.day}
                  </div>
                  
                  {/* Bouton + pour ajout rapide */}
                  {isAdmin && onCallForDay.length === 0 && isHovered && dayData.isCurrentMonth && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('🔔 Opening modal for date:', dayData);
                        openQuickAddModal(dayData);
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-cyan-500 bg-opacity-90 text-white font-bold text-2xl hover:bg-cyan-600 transition-all rounded z-10"
                      title="Ajouter une astreinte"
                    >
                      +
                    </button>
                  )}
                  
                  {/* Astreintes du jour */}
                  {onCallForDay.map((item, idx) => (
                    <div
                      key={idx}
                      className={`text-xs border rounded px-2 py-1 mb-1 cursor-pointer hover:opacity-80 ${getEmployeeColor(item.employee_id)}`}
                      title={`${item.employee_name} - ${item.type}\nClic droit pour gérer`}
                      onContextMenu={(e) => handleRightClick(e, item)}
                    >
                      <div className="font-medium truncate">
                        🔔 {item.employee_name}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Légende */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-3">Légende</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-50 border-2 border-blue-300 rounded"></div>
            <span className="text-sm text-gray-700">Aujourd'hui</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-50 opacity-50 border border-gray-300 rounded"></div>
            <span className="text-sm text-gray-700">Jours hors mois</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-orange-50 to-yellow-50 border border-gray-300 rounded"></div>
            <span className="text-sm text-gray-700">Jour avec astreinte</span>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-cyan-500 text-white flex items-center justify-center rounded font-bold text-xs">+</div>
              <span className="text-sm text-gray-700">Cliquez pour ajouter</span>
            </div>
          )}
        </div>
        
        {/* Légende des couleurs par employé */}
        {employees.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-700 mb-2 text-sm">Couleurs par employé :</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {employees.slice(0, 10).map((emp, idx) => (
                <div key={emp.id} className="flex items-center gap-2">
                  <div className={`w-4 h-4 border rounded ${employeeColors[idx % employeeColors.length]}`}></div>
                  <span className="text-xs text-gray-600 truncate">{emp.name || `${emp.prenom} ${emp.nom}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Quick Add */}
      {showQuickAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowQuickAddModal(false);
          }
        }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              🔔 Ajouter une Astreinte
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employé *
                </label>
                <select
                  value={quickAddData.employeeId}
                  onChange={(e) => setQuickAddData({...quickAddData, employeeId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Sélectionnez un employé</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name || `${emp.prenom} ${emp.nom}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type d'astreinte *
                </label>
                <select
                  value={quickAddData.type}
                  onChange={(e) => setQuickAddData({...quickAddData, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="semaine">Semaine complète (7 jours)</option>
                  <option value="jour">Un seul jour</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début
                </label>
                <input
                  type="date"
                  value={quickAddData.date}
                  onChange={(e) => setQuickAddData({...quickAddData, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={quickAddData.notes}
                  onChange={(e) => setQuickAddData({...quickAddData, notes: e.target.value})}
                  placeholder="Notes optionnelles..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  rows="3"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowQuickAddModal(false);
                  setQuickAddData({ employeeId: '', date: '', type: 'semaine', notes: '' });
                }}
                disabled={isCreating}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleQuickAddSubmit}
                disabled={isCreating}
                className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu contextuel */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl py-2 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              setContextMenu(null);
              setShowDeleteConfirm(true);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 font-medium"
          >
            🗑️ Supprimer
          </button>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Confirmer la suppression
            </h3>
            <p className="text-gray-600 mb-6">
              Voulez-vous vraiment supprimer cette astreinte pour <strong>{selectedOnCall?.employee_name}</strong> ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnCallSchedule;
