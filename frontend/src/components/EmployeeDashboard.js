import React, { useState, useEffect } from 'react';
import { ModuleHeader, StatCard, ContentCard, Button } from './shared/UIComponents';

const EmployeeDashboard = ({ user }) => {
  const [stats, setStats] = useState({
    absences: { total: 0, remaining: 25 },
    overtime: { accumulated: 0, recovered: 0 },
    requests: { pending: 0, approved: 0 }
  });

  const navigateTo = (view) => {
    // Déclencher un événement custom pour la navigation
    window.dispatchEvent(new CustomEvent('navigate-to-view', { 
      detail: { view } 
    }));
  };

  return (
    <div className="space-y-6 p-6">
      <ModuleHeader
        title={`Bonjour ${user?.name || 'Employé'}`}
        subtitle="Votre tableau de bord personnel"
        icon="👤"
        user={user}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Congés Restants"
          value={stats.absences.remaining}
          unit="jours"
          icon="🏖️"
          color="blue"
        />
        <StatCard
          title="Heures Sup."
          value={stats.overtime.accumulated}
          unit="heures"
          icon="⏰"
          color="green"
        />
        <StatCard
          title="Demandes"
          value={stats.requests.pending}
          unit="en attente"
          icon="📝"
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <ContentCard>
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🚀 Actions Rapides</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="primary" onClick={() => navigateTo('my-requests')}>
              📝 Nouvelle Demande d'Absence
            </Button>
            <Button variant="secondary" onClick={() => navigateTo('my-space')}>
              📊 Voir Mes Absences
            </Button>
            <Button variant="secondary" onClick={() => navigateTo('monthly-planning')}>
              📅 Consulter le Planning
            </Button>
            <Button variant="secondary" onClick={() => navigateTo('on-call-schedule')}>
              🔔 Planning Astreintes
            </Button>
          </div>
        </div>
      </ContentCard>

      {/* Recent Activity */}
      <ContentCard>
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📋 Activité Récente</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">Demande de congés validée</p>
                <p className="text-sm text-gray-600">Du 15/01 au 20/01/2025</p>
              </div>
              <span className="text-green-600 font-semibold">✓ Approuvé</span>
            </div>
          </div>
        </div>
      </ContentCard>
    </div>
  );
};

export default EmployeeDashboard;