import React, { useState, useEffect } from 'react';

/**
 * OnCallSchedule - Planning des Astreintes (Lecture seule)
 * Accessible aux managers et employés pour consulter les astreintes
 */
const OnCallSchedule = ({ user }) => {
  const [onCallData, setOnCallData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

  useEffect(() => {
    fetchOnCallSchedule();
  }, [selectedMonth, selectedYear]);

  const fetchOnCallSchedule = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${backendUrl}/api/on-call/schedule?month=${selectedMonth + 1}&year=${selectedYear}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">📅 Planning des Astreintes</h1>
        <p className="text-cyan-100">Consultez le planning des astreintes du mois</p>
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
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
              <div key={day} className="text-center font-semibold text-gray-700 py-2">
                {day}
              </div>
            ))}

            {/* Jours du mois */}
            {Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, i) => i + 1).map(day => {
              const onCallForDay = getOnCallForDay(day);
              const isToday = 
                day === new Date().getDate() &&
                selectedMonth === new Date().getMonth() &&
                selectedYear === new Date().getFullYear();

              return (
                <div
                  key={day}
                  className={`
                    min-h-24 p-2 border rounded-lg
                    ${isToday ? 'bg-blue-50 border-blue-300' : 'border-gray-200'}
                    ${onCallForDay.length > 0 ? 'bg-orange-50' : ''}
                  `}
                >
                  <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                    {day}
                  </div>
                  
                  {onCallForDay.map((item, idx) => (
                    <div
                      key={idx}
                      className="text-xs bg-orange-100 border border-orange-300 rounded px-2 py-1 mb-1"
                      title={`${item.employee_name} - ${item.type}`}
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
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white border border-gray-200 rounded"></div>
            <span className="text-sm text-gray-700">Jour normal</span>
          </div>
        </div>
      </div>

      {/* Info pour les managers */}
      {user?.role === 'manager' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">ℹ️</div>
            <div>
              <h4 className="font-semibold text-blue-800 mb-1">Information Manager</h4>
              <p className="text-sm text-blue-700">
                Vous consultez le planning des astreintes en mode lecture seule. 
                Pour modifier ou gérer les astreintes, contactez un administrateur.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnCallSchedule;
