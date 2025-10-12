/**
 * MOZAIK RH - Composants UI Standardisés
 * Style cohérent inspiré de "Mon Espace"
 */
import React from 'react';

// 🎨 Design Tokens
export const colors = {
  primary: {
    gradient: 'bg-gradient-to-r from-blue-600 to-purple-600',
    cardGradient: 'bg-gradient-to-br from-purple-50 to-indigo-50',
    border: 'border-purple-200',
    tabActive: 'bg-purple-600',
    hover: 'hover:bg-purple-700'
  },
  secondary: {
    gradient: 'bg-gradient-to-r from-indigo-600 to-purple-600',
    cardGradient: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    border: 'border-indigo-200'
  },
  success: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200'
  },
  error: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200'
  },
  warning: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200'
  },
  info: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200'
  }
};

// 📦 Header avec gradient et avatar
export const ModuleHeader = ({ title, subtitle, icon, user, action }) => (
  <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        {user && (
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold text-xl border-2 border-white/30">
            {user.name?.split(' ').map(n => n[0]).join('') || '??'}
          </div>
        )}
        {icon && !user && (
          <div className="text-4xl">{icon}</div>
        )}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {icon && user && <span>{icon}</span>}
            {title}
          </h1>
          {subtitle && <p className="text-blue-100 mt-1">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  </div>
);

// 📑 Système de tabs standardisé
export const TabBar = ({ tabs, activeTab, onTabChange }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
    <div className="border-b border-gray-200">
      <div className="flex gap-2 p-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  </div>
);

// 📊 Carte statistique (KPI)
export const StatCard = ({ title, value, icon, color = 'blue', trend, subtitle }) => {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-900',
    purple: 'from-purple-50 to-purple-100 border-purple-200 text-purple-900',
    green: 'from-green-50 to-green-100 border-green-200 text-green-900',
    orange: 'from-orange-50 to-orange-100 border-orange-200 text-orange-900',
    red: 'from-red-50 to-red-100 border-red-200 text-red-900',
    indigo: 'from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-900'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border-2 rounded-xl p-6 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium opacity-80">{title}</p>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <p className="text-3xl font-bold">{value}</p>
      {trend && (
        <p className="text-xs mt-2 opacity-70">{trend}</p>
      )}
      {subtitle && (
        <p className="text-sm mt-2 opacity-80">{subtitle}</p>
      )}
    </div>
  );
};

// 💬 Messages de notification
export const Message = ({ text, type = 'info', onClose }) => {
  const typeClasses = {
    success: 'bg-green-100 text-green-800 border-green-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <div className={`${typeClasses[type]} border-2 rounded-lg p-4 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{icons[type]}</span>
        <p className="font-medium">{text}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-lg hover:opacity-70 transition-opacity"
        >
          ×
        </button>
      )}
    </div>
  );
};

// 🃏 Carte de contenu standardisée
export const ContentCard = ({ title, children, icon, actions, color = 'default' }) => {
  const gradients = {
    default: 'bg-white',
    purple: 'bg-gradient-to-br from-purple-50 to-indigo-50',
    blue: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    green: 'bg-gradient-to-br from-green-50 to-emerald-50'
  };

  return (
    <div className={`${gradients[color]} border-2 border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all`}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              {icon && <span>{icon}</span>}
              {title}
            </h3>
          )}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

// 🔘 Boutons standardisés
export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  icon,
  className = ''
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700',
    secondary: 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50',
    success: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${variants[variant]} ${sizes[size]} rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${className}`}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};

// 📝 Input standardisé
export const Input = ({ 
  label, 
  value, 
  onChange, 
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  error,
  helper
}) => (
  <div className="space-y-2">
    {label && (
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    )}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all ${
        error ? 'border-red-300 bg-red-50' : 'border-gray-300'
      } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
    />
    {error && <p className="text-sm text-red-600">{error}</p>}
    {helper && <p className="text-sm text-gray-500">{helper}</p>}
  </div>
);

// 🔄 Loading spinner
export const LoadingSpinner = ({ text = 'Chargement...' }) => (
  <div className="flex flex-col items-center justify-center h-64 space-y-4">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    <p className="text-gray-600">{text}</p>
  </div>
);

// 📊 Section avec titre
export const Section = ({ title, icon, children, className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    {title && (
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 border-b-2 border-gray-200 pb-2">
        {icon && <span>{icon}</span>}
        {title}
      </h2>
    )}
    {children}
  </div>
);

export default {
  ModuleHeader,
  TabBar,
  StatCard,
  Message,
  ContentCard,
  Button,
  Input,
  LoadingSpinner,
  Section,
  colors
};
