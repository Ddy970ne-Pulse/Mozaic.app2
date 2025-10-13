import React, { useState } from 'react';
import { ModuleHeader, ContentCard, Button, StatCard } from './shared/UIComponents';

const HRToolbox = ({ user, onChangeView }) => {
  const [activeSection, setActiveSection] = useState('overview');

  const tools = [
    {
      id: 'templates',
      title: '📄 Modèles de Documents',
      description: 'Contrats, avenants, attestations',
      icon: '📄',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'calculator',
      title: '🧮 Calculateurs RH',
      description: 'Congés, préavis, indemnités',
      icon: '🧮',
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'legal',
      title: '⚖️ Veille Légale',
      description: 'CCN66, Code du travail',
      icon: '⚖️',
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'procedures',
      title: '📋 Procédures',
      description: 'Recrutement, intégration, départ',
      icon: '📋',
      color: 'from-orange-500 to-orange-600'
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <ModuleHeader
        title="Boîte à Outils RH"
        subtitle="Ressources et outils pour la gestion quotidienne"
        icon="🧰"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tools.map(tool => (
          <ContentCard key={tool.id}>
            <div className="text-center p-6">
              <div className={`mx-auto w-20 h-20 rounded-full bg-gradient-to-br ${tool.color} flex items-center justify-center text-4xl mb-4 shadow-lg`}>
                {tool.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">{tool.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{tool.description}</p>
              <Button variant="secondary" onClick={() => setActiveSection(tool.id)}>
                Accéder
              </Button>
            </div>
          </ContentCard>
        ))}
      </div>

      <ContentCard>
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📚 Ressources Disponibles</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">📄 Modèles de contrats</span>
              <span className="text-sm text-gray-500">12 documents</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">⚖️ Guides légaux</span>
              <span className="text-sm text-gray-500">8 guides</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">🧮 Calculateurs</span>
              <span className="text-sm text-gray-500">6 outils</span>
            </div>
          </div>
        </div>
      </ContentCard>
    </div>
  );
};

export default HRToolbox;