import React, { useState, useEffect } from 'react';

/**
 * Theme Customizer Component
 * Allows users to customize their MOZAIK RH interface colors
 */
const ThemeCustomizer = ({ user }) => {
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [customColors, setCustomColors] = useState({
    primary: '#4f46e5',    // Indigo
    secondary: '#8b5cf6',  // Purple
    accent: '#ec4899',     // Pink
    success: '#10b981',    // Green
    warning: '#f59e0b',    // Amber
    danger: '#ef4444'      // Red
  });

  // Predefined themes
  const themes = {
    default: {
      name: 'MOZAIK Classique',
      icon: '🎨',
      colors: {
        primary: '#4f46e5',
        secondary: '#8b5cf6',
        accent: '#ec4899',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444'
      },
      gradient: 'from-indigo-600 via-purple-600 to-pink-600'
    },
    ocean: {
      name: 'Océan Profond',
      icon: '🌊',
      colors: {
        primary: '#0891b2',
        secondary: '#0284c7',
        accent: '#06b6d4',
        success: '#14b8a6',
        warning: '#f59e0b',
        danger: '#ef4444'
      },
      gradient: 'from-cyan-600 via-blue-600 to-teal-600'
    },
    forest: {
      name: 'Forêt Émeraude',
      icon: '🌲',
      colors: {
        primary: '#059669',
        secondary: '#10b981',
        accent: '#34d399',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444'
      },
      gradient: 'from-emerald-600 via-green-600 to-teal-600'
    },
    sunset: {
      name: 'Coucher de Soleil',
      icon: '🌅',
      colors: {
        primary: '#f59e0b',
        secondary: '#f97316',
        accent: '#ef4444',
        success: '#10b981',
        warning: '#eab308',
        danger: '#dc2626'
      },
      gradient: 'from-amber-500 via-orange-500 to-red-500'
    },
    professional: {
      name: 'Professionnel Sobre',
      icon: '💼',
      colors: {
        primary: '#374151',
        secondary: '#6b7280',
        accent: '#9ca3af',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444'
      },
      gradient: 'from-gray-600 via-gray-700 to-gray-800'
    },
    lavender: {
      name: 'Lavande Douce',
      icon: '💜',
      colors: {
        primary: '#a855f7',
        secondary: '#c084fc',
        accent: '#e879f9',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444'
      },
      gradient: 'from-purple-500 via-fuchsia-500 to-pink-500'
    }
  };

  // Load saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(`mozaik_theme_${user.id}`);
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme);
        setSelectedTheme(parsed.name);
        setCustomColors(parsed.colors);
        applyTheme(parsed.colors);
      } catch (error) {
        console.error('Error loading saved theme:', error);
      }
    }
  }, [user.id]);

  const applyTheme = (colors) => {
    // Apply CSS custom properties to the document root
    const root = document.documentElement;
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-success', colors.success);
    root.style.setProperty('--color-warning', colors.warning);
    root.style.setProperty('--color-danger', colors.danger);
  };

  const selectTheme = (themeName) => {
    const theme = themes[themeName];
    if (theme) {
      setSelectedTheme(themeName);
      setCustomColors(theme.colors);
      applyTheme(theme.colors);
      
      // Save to localStorage
      localStorage.setItem(`mozaik_theme_${user.id}`, JSON.stringify({
        name: themeName,
        colors: theme.colors
      }));
    }
  };

  const resetToDefault = () => {
    selectTheme('default');
    localStorage.removeItem(`mozaik_theme_${user.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`bg-gradient-to-r ${themes[selectedTheme].gradient} rounded-2xl shadow-lg p-8 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">🎨 Personnalisation des Couleurs</h1>
            <p className="text-white/90">
              Choisissez un thème ou personnalisez vos couleurs d'interface
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <span className="text-6xl">{themes[selectedTheme].icon}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Theme Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900">Thème Actuel: {themes[selectedTheme].name}</p>
            <p className="text-sm text-blue-700 mt-1">
              Les modifications sont sauvegardées automatiquement et appliquées à votre session uniquement
            </p>
          </div>
        </div>
      </div>

      {/* Theme Selection Grid */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Thèmes Prédéfinis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(themes).map(([key, theme]) => (
            <button
              key={key}
              onClick={() => selectTheme(key)}
              className={`relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-2 ${
                selectedTheme === key ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'
              }`}
            >
              {/* Theme Preview */}
              <div className={`bg-gradient-to-r ${theme.gradient} h-24 flex items-center justify-center`}>
                <span className="text-5xl">{theme.icon}</span>
              </div>
              
              {/* Theme Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-800 mb-2">{theme.name}</h3>
                
                {/* Color Swatches */}
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-lg shadow-sm" style={{ backgroundColor: theme.colors.primary }}></div>
                  <div className="w-8 h-8 rounded-lg shadow-sm" style={{ backgroundColor: theme.colors.secondary }}></div>
                  <div className="w-8 h-8 rounded-lg shadow-sm" style={{ backgroundColor: theme.colors.accent }}></div>
                </div>
              </div>

              {/* Selected Indicator */}
              {selectedTheme === key && (
                <div className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-lg">
                  <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Colors (Advanced) */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">🔧 Couleurs Personnalisées (Avancé)</h2>
        <p className="text-sm text-gray-600 mb-6">
          Personnalisez chaque couleur individuellement pour créer votre propre thème
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(customColors).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-3">
              <input
                type="color"
                value={value}
                onChange={(e) => {
                  const newColors = { ...customColors, [key]: e.target.value };
                  setCustomColors(newColors);
                  applyTheme(newColors);
                  setSelectedTheme('custom');
                  localStorage.setItem(`mozaik_theme_${user.id}`, JSON.stringify({
                    name: 'custom',
                    colors: newColors
                  }));
                }}
                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300"
              />
              <div>
                <div className="font-medium text-gray-700 capitalize">{key}</div>
                <div className="text-xs text-gray-500 font-mono">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <div className="flex justify-end">
        <button
          onClick={resetToDefault}
          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors duration-200"
        >
          🔄 Réinitialiser au Thème Par Défaut
        </button>
      </div>

      {/* Preview Note */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-yellow-900">Note</p>
            <p className="text-sm text-yellow-700 mt-1">
              La personnalisation complète nécessite un rechargement de page. Certains éléments utiliseront les couleurs après actualisation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeCustomizer;
