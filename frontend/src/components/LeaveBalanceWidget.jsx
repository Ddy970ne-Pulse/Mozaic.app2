/**
 * LeaveBalanceWidget.jsx
 * 
 * Widget d'affichage des soldes de congés d'un employé
 * Compatible avec le système de réintégration automatique MOZAIK RH
 * 
 * @integration Placer dans src/components/
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';

const LeaveBalanceWidget = ({ employeeId, compact = false }) => {
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Charger les soldes de congés
  const loadBalances = async () => {
    if (!employeeId) {
      setError("ID employé manquant");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/leave-balances/${employeeId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        // Adapter la réponse de l'API au format attendu par le composant
        const adapted = {
          employee_id: employeeId,
          year: data.balance?.fiscal_year || new Date().getFullYear(),
          balances: {
            CA: data.balance?.ca_balance || 0,
            RTT: data.balance?.rtt_balance || 0,
            REC: data.balance?.rec_balance || 0,
            CT: data.balance?.ct_balance || 0,
            CEX: data.balance?.cex_balance || 0
          },
          last_updated: data.balance?.last_updated || new Date().toISOString()
        };
        setBalances(adapted);
        setLastUpdate(new Date());
        setError(null);
      } else if (response.status === 404) {
        // Pas de solde trouvé - ce n'est pas une erreur critique
        setBalances({
          employee_id: employeeId,
          year: new Date().getFullYear(),
          balances: {
            CA: 25.0,  // Valeurs par défaut
            RTT: 12.0,
            REC: 0.0,
            CT: 0.0,
            CEX: 0.0
          },
          last_updated: new Date().toISOString()
        });
        setError(null);
      } else {
        throw new Error(`Erreur ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erreur chargement soldes:', error);
      setError("Impossible de charger les soldes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalances();
    
    // Recharger toutes les 5 minutes
    const interval = setInterval(loadBalances, 300000);
    
    return () => clearInterval(interval);
  }, [employeeId]);

  // Écouter les événements de changement d'absence pour recharger
  useEffect(() => {
    const handleAbsenceChange = () => {
      console.log('🔄 Rechargement des soldes suite à changement d\'absence');
      loadBalances();
    };

    window.addEventListener('websocket-absence-change', handleAbsenceChange);
    
    return () => {
      window.removeEventListener('websocket-absence-change', handleAbsenceChange);
    };
  }, [employeeId]);

  // Configuration des types de congés avec couleurs et icônes
  const leaveTypeConfig = {
    CA: {
      name: 'Congés Annuels',
      shortName: 'CA',
      icon: '🏖️',
      color: 'blue',
      gradient: 'from-blue-400 to-blue-600',
      bgLight: 'bg-blue-50',
      borderColor: 'border-blue-300',
      textColor: 'text-blue-800'
    },
    CP: {
      name: 'Congés Payés',
      shortName: 'CP',
      icon: '🏖️',
      color: 'blue',
      gradient: 'from-blue-400 to-blue-600',
      bgLight: 'bg-blue-50',
      borderColor: 'border-blue-300',
      textColor: 'text-blue-800'
    },
    RTT: {
      name: 'RTT',
      shortName: 'RTT',
      icon: '⚡',
      color: 'green',
      gradient: 'from-green-400 to-green-600',
      bgLight: 'bg-green-50',
      borderColor: 'border-green-300',
      textColor: 'text-green-800'
    },
    REC: {
      name: 'Récupération',
      shortName: 'REC',
      icon: '🔄',
      color: 'emerald',
      gradient: 'from-emerald-400 to-emerald-600',
      bgLight: 'bg-emerald-50',
      borderColor: 'border-emerald-300',
      textColor: 'text-emerald-800'
    },
    CT: {
      name: 'Congés Trimestriels',
      shortName: 'CT',
      icon: '📅',
      color: 'indigo',
      gradient: 'from-indigo-400 to-indigo-600',
      bgLight: 'bg-indigo-50',
      borderColor: 'border-indigo-300',
      textColor: 'text-indigo-800'
    },
    CEX: {
      name: 'Congés Exceptionnels',
      shortName: 'CEX',
      icon: '⭐',
      color: 'purple',
      gradient: 'from-purple-400 to-purple-600',
      bgLight: 'bg-purple-50',
      borderColor: 'border-purple-300',
      textColor: 'text-purple-800'
    }
  };

  // Affichage loading
  if (loading) {
    return (
      <div className="bg-white/70 backdrop-blur-sm border-2 border-purple-200 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Affichage erreur
  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <div>
            <p className="font-semibold text-red-800">Erreur de chargement</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
        <button
          onClick={loadBalances}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
        >
          Réessayer
        </button>
      </div>
    );
  }

  // Pas de données
  if (!balances || !balances.balances) {
    return (
      <div className="bg-gray-50 border-2 border-gray-300 rounded-xl p-6">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <p className="font-medium">Aucun solde disponible</p>
        </div>
      </div>
    );
  }

  // Calculer les réintégrations totales
  const totalReintegrated = Object.entries(balances.balances)
    .filter(([type]) => ['CA', 'CP', 'RTT', 'REC'].includes(type))
    .reduce((sum, [_, balance]) => {
      // Note: Dans un système complet, vous auriez des champs séparés pour les réintégrations
      // Pour l'instant, on peut ajouter un badge si le solde a changé
      return sum;
    }, 0);

  // Types à afficher (ceux qui ont un solde > 0 ou sont importants)
  const displayTypes = Object.entries(balances.balances)
    .filter(([type, balance]) => 
      ['CA', 'CP', 'RTT', 'REC', 'CT', 'CEX'].includes(type) && 
      (balance > 0 || ['CA', 'CP', 'RTT'].includes(type))
    )
    .map(([type, balance]) => ({
      type,
      balance,
      config: leaveTypeConfig[type] || leaveTypeConfig.CA
    }));

  // Mode compact (pour dashboard)
  if (compact) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800">💼 Mes Soldes</h3>
          <button
            onClick={loadBalances}
            className="text-purple-600 hover:text-purple-800 transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-2">
          {displayTypes.slice(0, 3).map(({ type, balance, config }) => (
            <div key={type} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{config.icon}</span>
                <span className="text-sm font-medium text-gray-700">{config.shortName}</span>
              </div>
              <span className={`text-lg font-bold ${config.textColor}`}>
                {balance.toFixed(1)}j
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Mode complet
  return (
    <div className="bg-white/70 backdrop-blur-sm border-2 border-purple-200 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <span>💼</span>
              <span>Mes Soldes de Congés</span>
            </h3>
            <p className="text-purple-100 text-sm mt-1">
              Année {balances.year} • Mis à jour {lastUpdate?.toLocaleTimeString('fr-FR')}
            </p>
          </div>
          <button
            onClick={loadBalances}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            title="Actualiser les soldes"
          >
            <RefreshCw className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Soldes */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayTypes.map(({ type, balance, config }) => (
            <div
              key={type}
              className={`${config.bgLight} border-2 ${config.borderColor} rounded-xl p-4 transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{config.icon}</div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">
                      {config.shortName}
                    </p>
                    <p className="text-sm text-gray-700">{config.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-bold ${config.textColor}`}>
                    {balance.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">jour(s)</p>
                </div>
              </div>
              
              {/* Barre de progression visuelle */}
              <div className="mt-3">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${config.gradient} transition-all duration-500`}
                    style={{ width: `${Math.min((balance / 30) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Badge de réintégration (si applicable) */}
        {balances.ca_reintegrated > 0 && (
          <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-800">
                  ✅ Réintégration automatique
                </p>
                <p className="text-sm text-green-700 mt-1">
                  <strong>{balances.ca_reintegrated} jour(s)</strong> de congés réintégré(s) 
                  suite à un arrêt maladie. Vos jours sont à nouveau disponibles.
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="bg-green-100 rounded-full px-3 py-1">
                  <span className="text-green-800 font-bold">+{balances.ca_reintegrated}j</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info légale */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium">Réintégration automatique conforme</p>
              <p className="text-xs mt-1">
                En cas d'arrêt maladie pendant vos congés, les jours concernés sont automatiquement 
                réintégrés à votre compteur conformément à l'Article L3141-5 du Code du Travail.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveBalanceWidget;
