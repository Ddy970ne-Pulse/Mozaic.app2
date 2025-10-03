// Système de design moderne pour MOZAIK RH
// Inspiré des meilleures applications RH (BambooHR, Workday)

export const theme = {
  // Palette de couleurs corporate moderne
  colors: {
    // Bleus corporate raffinés
    primary: {
      50: '#eff6ff',
      100: '#dbeafe', 
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Bleu principal
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a'
    },
    
    // Grays modernes pour l'interface
    gray: {
      25: '#fcfcfd',
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827'
    },
    
    // Couleurs fonctionnelles
    success: {
      50: '#ecfdf5',
      500: '#10b981',
      600: '#059669'
    },
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      600: '#d97706'
    },
    error: {
      50: '#fef2f2',
      500: '#ef4444',
      600: '#dc2626'
    },
    
    // Couleurs d'accent pour les départements
    accent: {
      blue: '#3b82f6',
      indigo: '#6366f1',
      purple: '#8b5cf6',
      pink: '#ec4899',
      rose: '#f43f5e',
      orange: '#f97316',
      amber: '#f59e0b',
      yellow: '#eab308',
      lime: '#84cc16',
      green: '#10b981',
      emerald: '#059669',
      teal: '#14b8a6',
      cyan: '#06b6d4'
    }
  },
  
  // Typographie moderne
  typography: {
    fontFamily: {
      display: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif'],
      body: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif'],
      mono: ['JetBrains Mono', 'Monaco', 'Consolas', 'monospace']
    },
    fontSize: {
      xs: ['12px', { lineHeight: '16px' }],
      sm: ['14px', { lineHeight: '20px' }],
      base: ['16px', { lineHeight: '24px' }],
      lg: ['18px', { lineHeight: '28px' }],
      xl: ['20px', { lineHeight: '28px' }],
      '2xl': ['24px', { lineHeight: '32px' }],
      '3xl': ['30px', { lineHeight: '36px' }],
      '4xl': ['36px', { lineHeight: '40px' }]
    }
  },
  
  // Espacements standardisés
  spacing: {
    section: '2rem',
    card: '1.5rem',
    element: '1rem',
    component: '0.75rem',
    tight: '0.5rem'
  },
  
  // Bordures et rayons
  borderRadius: {
    sm: '0.375rem',
    base: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    full: '9999px'
  },
  
  // Ombres modernes
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    card: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)'
  },
  
  // Animations et transitions
  animations: {
    transition: {
      fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
      base: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
      slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)'
    }
  }
};

// Classes CSS utilitaires modernes
export const styles = {
  // Cards modernes
  card: {
    base: `
      bg-white rounded-xl border border-gray-200 shadow-sm
      hover:shadow-md transition-all duration-250
      overflow-hidden
    `,
    elevated: `
      bg-white rounded-xl shadow-lg border border-gray-100
      hover:shadow-xl transition-all duration-250
      overflow-hidden
    `,
    interactive: `
      bg-white rounded-xl border border-gray-200 shadow-sm
      hover:shadow-md hover:border-primary-300 
      transition-all duration-250 cursor-pointer
      overflow-hidden
    `
  },
  
  // Boutons modernes
  button: {
    primary: `
      inline-flex items-center justify-center px-4 py-2.5 
      bg-primary-600 hover:bg-primary-700 
      text-white font-medium text-sm rounded-lg
      shadow-sm hover:shadow-md
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    secondary: `
      inline-flex items-center justify-center px-4 py-2.5 
      bg-gray-100 hover:bg-gray-200 
      text-gray-700 font-medium text-sm rounded-lg
      border border-gray-200 hover:border-gray-300
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    ghost: `
      inline-flex items-center justify-center px-3 py-2 
      text-gray-600 hover:text-gray-900 hover:bg-gray-100
      font-medium text-sm rounded-lg
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
    `
  },
  
  // Formulaires modernes
  input: {
    base: `
      w-full px-3 py-2.5 text-sm
      bg-white border border-gray-300 rounded-lg
      placeholder-gray-400 text-gray-900
      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
      transition-colors duration-200
      disabled:bg-gray-50 disabled:cursor-not-allowed
    `,
    error: `
      w-full px-3 py-2.5 text-sm
      bg-white border border-error-300 rounded-lg
      placeholder-gray-400 text-gray-900
      focus:outline-none focus:ring-2 focus:ring-error-500 focus:border-error-500
      transition-colors duration-200
    `
  },
  
  // Navigation moderne
  nav: {
    item: `
      flex items-center px-3 py-2 text-sm font-medium rounded-lg
      text-gray-600 hover:text-gray-900 hover:bg-gray-100
      transition-all duration-200
      group
    `,
    itemActive: `
      flex items-center px-3 py-2 text-sm font-medium rounded-lg
      bg-primary-50 text-primary-700 border-r-2 border-primary-600
      group
    `
  },
  
  // Tableaux modernes
  table: {
    container: `
      bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden
    `,
    header: `
      bg-gray-50 border-b border-gray-200
    `,
    headerCell: `
      px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider
    `,
    row: `
      border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150
    `,
    cell: `
      px-6 py-4 text-sm text-gray-900
    `
  }
};

export default theme;