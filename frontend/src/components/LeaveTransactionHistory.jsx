/**
 * LeaveTransactionHistory.jsx
 * 
 * Composant d'affichage de l'historique des transactions de congés
 * Affiche les déductions, réintégrations, attributions et corrections
 * 
 * @integration Placer dans src/components/
 */

import React, { useEffect, useState } from 'react';
import { Calendar, TrendingUp, TrendingDown, Award, Edit, RefreshCw, Filter } from 'lucide-react';

const LeaveTransactionHistory = ({ employeeId, limit = 20, compact = false }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    leaveType: '',
    year: new Date().getFullYear()
  });
  const [showFilters, setShowFilters] = useState(false);

  // Charger les transactions
  const loadTransactions = async () => {
    if (!employeeId) {
      setError("ID employé manquant");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Construire les paramètres de query
      const params = new URLSearchParams({
        limit: limit.toString()
      });
      
      if (filters.year) {
        params.append('year', filters.year.toString());
      }
      
      if (filters.leaveType) {
        params.append('leave_type', filters.leaveType);
      }
      
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/leave-balance/transactions/${employeeId}?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
        setError(null);
      } else if (response.status === 404) {
        setTransactions([]);
        setError(null);
      } else {
        throw new Error(`Erreur ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erreur chargement transactions:', error);
      setError("Impossible de charger l'historique");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [employeeId, filters]);

  // Écouter les événements de changement
  useEffect(() => {
    const handleChange = () => {
      console.log('🔄 Rechargement historique suite à changement');
      loadTransactions();
    };

    window.addEventListener('websocket-absence-change', handleChange);
    
    return () => {
      window.removeEventListener('websocket-absence-change', handleChange);
    };
  }, [employeeId]);

  // Configuration des types d'opération
  const operationConfig = {
    deduct: {
      label: 'Déduction',
      icon: <TrendingDown className="w-4 h-4" />,
      color: 'red',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      textColor: 'text-red-800',
      badgeBg: 'bg-red-100'
    },
    reintegrate: {
      label: 'Réintégration',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
      textColor: 'text-green-800',
      badgeBg: 'bg-green-100'
    },
    grant: {
      label: 'Attribution',
      icon: <Award className="w-4 h-4" />,
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      textColor: 'text-blue-800',
      badgeBg: 'bg-blue-100'
    },
    correction: {
      label: 'Correction',
      icon: <Edit className="w-4 h-4" />,
      color: 'purple',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-300',
      textColor: 'text-purple-800',
      badgeBg: 'bg-purple-100'
    }
  };

  // Types de congés disponibles pour le filtre
  const leaveTypes = ['CA', 'CP', 'RTT', 'REC', 'CT', 'CEX'];

  // Affichage loading
  if (loading) {
    return (
      <div className="bg-white/70 backdrop-blur-sm border-2 border-purple-200 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  // Affichage erreur
  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
        <div className="flex items-center space-x-3">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold text-red-800">Erreur de chargement</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
        <button
          onClick={loadTransactions}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
        >
          Réessayer
        </button>
      </div>
    );
  }

  // Mode compact (pour dashboard)
  if (compact) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800">📜 Historique Récent</h3>
          <button
            onClick={loadTransactions}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        {transactions.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">Aucune transaction</p>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 3).map(tx => {
              const config = operationConfig[tx.operation] || operationConfig.deduct;
              return (
                <div key={tx.transaction_id} className={`${config.bgColor} border ${config.borderColor} rounded-lg p-2`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={config.textColor}>{config.icon}</div>
                      <span className="text-xs font-medium text-gray-700">{tx.leave_type}</span>
                    </div>
                    <span className={`text-sm font-bold ${config.textColor}`}>
                      {tx.operation === 'deduct' ? '-' : '+'}{tx.amount}j
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Mode complet
  return (
    <div className="bg-white/70 backdrop-blur-sm border-2 border-purple-200 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <Calendar className="w-6 h-6" />
              <span>Historique des Mouvements</span>
            </h3>
            <p className="text-blue-100 text-sm mt-1">
              {transactions.length} transaction(s) • Année {filters.year}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              title="Filtres"
            >
              <Filter className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={loadTransactions}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              title="Actualiser"
            >
              <RefreshCw className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="bg-gray-50 border-b-2 border-purple-200 px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de congé
              </label>
              <select
                value={filters.leaveType}
                onChange={(e) => setFilters({...filters, leaveType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Tous les types</option>
                {leaveTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Année
              </label>
              <select
                value={filters.year}
                onChange={(e) => setFilters({...filters, year: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {[2025, 2024, 2023].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Liste des transactions */}
      <div className="p-6">
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-lg font-medium">Aucune transaction</p>
            <p className="text-sm mt-2">L'historique apparaîtra ici au fur et à mesure</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map(tx => {
              const config = operationConfig[tx.operation] || operationConfig.deduct;
              const date = new Date(tx.transaction_date);
              
              return (
                <div
                  key={tx.transaction_id}
                  className={`${config.bgColor} border-2 ${config.borderColor} rounded-xl p-4 transition-all hover:shadow-md`}
                >
                  <div className="flex items-start justify-between">
                    {/* Left side - Details */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`${config.badgeBg} ${config.textColor} p-2 rounded-lg`}>
                          {config.icon}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-bold ${config.textColor}`}>
                              {config.label}
                            </span>
                            <span className="text-xs bg-white px-2 py-1 rounded-full font-semibold text-gray-700">
                              {tx.leave_type}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {date.toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="ml-11">
                        <p className="text-sm text-gray-800 mt-2">{tx.reason}</p>
                        
                        {/* Détails du changement de solde */}
                        <div className="mt-2 flex items-center space-x-2 text-xs text-gray-600">
                          <span>Solde:</span>
                          <span className="font-mono">{tx.balance_before.toFixed(1)}j</span>
                          <span>→</span>
                          <span className={`font-mono font-bold ${config.textColor}`}>
                            {tx.balance_after.toFixed(1)}j
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right side - Amount */}
                    <div className="text-right ml-4">
                      <div className={`text-3xl font-bold ${config.textColor}`}>
                        {tx.operation === 'deduct' ? '-' : '+'}
                        {tx.amount}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">jour(s)</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Info si limite atteinte */}
        {transactions.length >= limit && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Affichage limité</p>
                <p className="text-xs mt-1">
                  Seules les {limit} transactions les plus récentes sont affichées. 
                  Utilisez les filtres pour affiner votre recherche.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveTransactionHistory;
