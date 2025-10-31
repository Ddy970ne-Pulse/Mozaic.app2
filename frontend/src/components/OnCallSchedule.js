import React, { useState, useEffect } from 'react';

/**
 * OnCallSchedule - Planning des Astreintes Unifié
 * Consultation + Gestion (ajout/modification/suppression) avec validation CCN66
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
  
  // États pour le menu contextuel
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedOnCall, setSelectedOnCall] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      }
    } catch (error) {
      console.error('Erreur chargement planning astreintes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMonthName = (month) => {
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return months[month];
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getOnCallForDay = (day) => {
    return onCallData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.getDate() === day && 
             itemDate.getMonth() === selectedMonth && 
             itemDate.getFullYear() === selectedYear;
    });
  };

  // Obtenir les dates d'une semaine complète (dimanche → samedi)
  const getWeekDates = (day) => {
    const date = new Date(selectedYear, selectedMonth, day);
    const dayOfWeek = date.getDay(); // 0 = dimanche
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - dayOfWeek); // Revenir au dimanche
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      if (currentDate.getMonth() === selectedMonth) {
        weekDates.push(currentDate.getDate());
      }
    }
    return weekDates;
  };

  // Ouvrir le modal d'ajout rapide
  const openQuickAddModal = (day) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setQuickAddData({
      employeeId: '',
      date: dateStr,
      type: 'semaine',
      notes: ''
    });
    setShowQuickAddModal(true);
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

  // Validation CCN66
  const validateCCN66 = async (employeeId, dates) => {
    try {
      const response = await fetch(`${backendUrl}/api/on-call/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ employeeId, dates })
      });

      if (response.ok) {
        const result = await response.json();
        return { valid: result.valid, errors: result.errors || [] };
      }
      return { valid: false, errors: ['Erreur de validation'] };
    } catch (error) {
      console.error('Erreur validation CCN66:', error);
      return { valid: false, errors: ['Erreur réseau'] };
    }
  };

  // Créer une astreinte
  const handleQuickAddSubmit = async () => {
    if (!quickAddData.employeeId || !quickAddData.date) {
      alert('⚠️ Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const employee = employees.find(e => e.id === quickAddData.employeeId);
      const startDate = new Date(quickAddData.date);
      
      // Calculer les dates selon le type
      let dates = [];
      if (quickAddData.type === 'semaine') {
        const weekDates = getWeekDates(startDate.getDate());
        dates = weekDates.map(day => 
          `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        );
      } else {
        dates = [quickAddData.date];
      }

      // Validation CCN66
      console.log('🔍 Validation CCN66...');
      const validation = await validateCCN66(quickAddData.employeeId, dates);
      
      if (!validation.valid) {
        const confirmMessage = `⚠️ ALERTES CCN66:\n\n${validation.errors.join('\n')}\n\nVoulez-vous continuer quand même ?`;
        if (!window.confirm(confirmMessage)) {
          return;
        }
      }

      // Créer l'astreinte
      const response = await fetch(`${backendUrl}/api/on-call`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employee_id: quickAddData.employeeId,
          employee_name: employee.name || `${employee.prenom} ${employee.nom}`,
          dates: dates,
          type: quickAddData.type === 'semaine' ? 'Astreinte semaine' : 'Astreinte jour',
          notes: quickAddData.notes
        })
      });

      if (response.ok) {
        alert(`✅ Astreinte créée avec succès pour ${employee.name || employee.prenom}`);
        setShowQuickAddModal(false);
        fetchOnCallSchedule();
      } else {
        const error = await response.json();
        alert(`❌ Erreur: ${error.message || 'Impossible de créer l\'astreinte'}`);
      }
    } catch (error) {
      console.error('Erreur création astreinte:', error);
      alert('❌ Erreur lors de la création');
    }
  };

  // Supprimer une astreinte
  const handleDelete = async () => {
    if (!selectedOnCall) return;

    try {
      const response = await fetch(`${backendUrl}/api/on-call/${selectedOnCall.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        alert('✅ Astreinte supprimée');
        setShowDeleteConfirm(false);
        setSelectedOnCall(null);
        fetchOnCallSchedule();
      } else {
        alert('❌ Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('❌ Erreur réseau');
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">📅 Planning des Astreintes</h1>
        <p className="text-cyan-100">
          {isAdmin ? 'Consultez et gérez les astreintes du mois' : 'Consultez les astreintes du mois'}
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
                {onCallData.length} astreinte(s) ce mois
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
            Chargement du planning...
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {/* En-têtes jours */}
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
              <div key={day} className="text-center font-semibold text-gray-700 py-2">
                {day}
              </div>
            ))}

            {/* Espacer pour le premier jour du mois */}
            {Array.from({ length: new Date(selectedYear, selectedMonth, 1).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-24"></div>
            ))}

            {/* Jours du mois */}
            {Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, i) => i + 1).map(day => {
              const onCallForDay = getOnCallForDay(day);
              const isToday = 
                day === new Date().getDate() &&
                selectedMonth === new Date().getMonth() &&
                selectedYear === new Date().getFullYear();
              const isHovered = hoveredDay === day;

              return (
                <div
                  key={day}
                  className={`
                    relative min-h-24 p-2 border rounded-lg transition-all
                    ${isToday ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'border-gray-200'}
                    ${onCallForDay.length > 0 ? 'bg-orange-50' : ''}
                    ${isAdmin ? 'hover:shadow-md' : ''}
                  `}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                    {day}
                  </div>
                  
                  {/* Bouton + pour ajout rapide (admin uniquement, case vide) */}
                  {isAdmin && onCallForDay.length === 0 && isHovered && (
                    <button
                      onClick={() => openQuickAddModal(day)}
                      className="absolute inset-0 flex items-center justify-center bg-cyan-500 bg-opacity-90 text-white font-bold text-2xl hover:bg-cyan-600 transition-all rounded"
                      title="Ajouter une astreinte"
                    >
                      +
                    </button>
                  )}
                  
                  {/* Astreintes du jour */}
                  {onCallForDay.map((item, idx) => (
                    <div
                      key={idx}
                      className="text-xs bg-orange-100 border border-orange-300 rounded px-2 py-1 mb-1 cursor-pointer hover:bg-orange-200"
                      title={`${item.employee_name} - ${item.type}\nClic droit pour gérer`}
                      onContextMenu={(e) => handleRightClick(e, item)}
                    >
                      <div className="font-medium text-orange-800 truncate">
                        🔔 {item.employee_name}
                      </div>
                      <div className="text-orange-600 truncate">
                        {item.type}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-50 border-2 border-blue-300 rounded"></div>
            <span className="text-sm text-gray-700">Aujourd'hui</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-50 border border-orange-300 rounded"></div>
            <span className="text-sm text-gray-700">Jour avec astreinte(s)</span>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-cyan-500 text-white flex items-center justify-center rounded font-bold text-xs">+</div>
              <span className="text-sm text-gray-700">Cliquez pour ajouter</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal Quick Add */}
      {showQuickAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
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
                  <option value="semaine">Semaine complète (Dim → Sam)</option>
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
                onClick={() => setShowQuickAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleQuickAddSubmit}
                className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
              >
                Créer
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
