import React, { useState } from 'react';
import AbsenceAnalytics from './AbsenceAnalytics';
import AnalyticsNew from './AnalyticsNew';
import StandardReports from './StandardReports';

const AnalyticsHub = ({ user, onChangeView }) => {
  const [activeModule, setActiveModule] = useState(null);

  const modules = [
    {
      id: 'absence-analytics',
      name: 'Analyse des Absences',
      icon: '📊',
      description: 'Statistiques détaillées et tendances des absences',
      gradient: 'from-purple-600 to-pink-600',
      component: AbsenceAnalytics
    },
    {
      id: 'analytics-kpi',
      name: 'Analytics & KPI',
      icon: '📈',
      description: 'Indicateurs de performance et tableaux de bord',
      gradient: 'from-indigo-500 to-indigo-600',
      component: AnalyticsNew
    },
    {
      id: 'standard-reports',
      name: 'Rapports Standards',
      icon: '📄',
      description: 'Rapports prédéfinis et exports',
      gradient: 'from-teal-500 to-cyan-600',
      component: StandardReports
    }
  ];

  // Si un module est sélectionné, afficher le bandeau + module
  if (activeModule) {
    const currentModule = modules.find(m => m.id === activeModule);
    const Module = currentModule?.component;
    if (Module) {
      return (
        <div className="space-y-4">
          {/* Bandeau de navigation bien visible */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              {/* Bouton retour à gauche */}
              <button
                onClick={() => {
                  console.log('🔙 Bouton retour cliqué - activeModule:', activeModule);
                  setActiveModule(null);
                  console.log('✅ activeModule réinitialisé à null');
                }}
                className="flex items-center space-x-3 bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-600 px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg border-2 border-gray-300 hover:border-blue-400 group"
              >
                <svg className="w-6 h-6 transform group-hover:-translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="text-lg">Retour à Analytics & Rapports</span>
              </button>
              
              {/* Badge du module actuel à droite */}
              <div className={`flex items-center space-x-3 bg-gradient-to-r ${currentModule.gradient} text-white px-6 py-3 rounded-lg shadow-lg`}>
                <span className="text-2xl">{currentModule.icon}</span>
                <div>
                  <p className="text-xs opacity-80">Module actif</p>
                  <p className="font-bold text-lg">{currentModule.name}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Contenu du module */}
          <Module 
            user={user} 
            onChangeView={onChangeView}
          />
        </div>
      );
    }
  }

  // Sinon, afficher le hub de sélection
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">📊 Analytics & Rapports</h1>
            <p className="text-white/90">
              Accédez à tous vos outils d'analyse et de reporting
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <span className="text-6xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900">Centre d'Analytics Unifié</p>
            <p className="text-sm text-blue-700 mt-1">
              Sélectionnez un module ci-dessous pour accéder aux analyses et rapports correspondants.
            </p>
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modules.map((module) => (
          <button
            key={module.id}
            onClick={() => setActiveModule(module.id)}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-gray-100 hover:border-indigo-300"
          >
            {/* Header avec gradient */}
            <div className={`bg-gradient-to-br ${module.gradient} p-6 text-white`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-5xl">{module.icon}</span>
                <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold">{module.name}</h3>
            </div>

            {/* Description */}
            <div className="p-6">
              <p className="text-gray-600 text-sm leading-relaxed">
                {module.description}
              </p>
              
              <div className="mt-4 flex items-center justify-between">
                <span className={`text-xs font-semibold bg-gradient-to-r ${module.gradient} bg-clip-text text-transparent`}>
                  Accéder au module
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-500">Disponible</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Bouton retour rapide */}
      <div className="flex items-center justify-center pt-4">
        <button
          onClick={() => onChangeView && onChangeView('dashboard')}
          className="text-gray-600 hover:text-gray-900 text-sm font-medium flex items-center space-x-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Retour au tableau de bord</span>
        </button>
      </div>

      {/* Statistics Overview */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Aperçu Rapide</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Absences</p>
                <p className="text-2xl font-bold text-purple-600">127</p>
              </div>
              <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taux Présence</p>
                <p className="text-2xl font-bold text-indigo-600">94.5%</p>
              </div>
              <div className="w-12 h-12 bg-indigo-200 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rapports Générés</p>
                <p className="text-2xl font-bold text-teal-600">45</p>
              </div>
              <div className="w-12 h-12 bg-teal-200 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📄</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsHub;
