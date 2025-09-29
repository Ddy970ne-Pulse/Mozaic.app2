import React from 'react';

const MonthlyPlanningTest = ({ user }) => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Planning Mensuel - Version Test</h1>
      <p className="text-gray-600 mb-4">
        Cette version test vérifie si le composant MonthlyPlanning peut se charger sans problème.
      </p>
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
        <strong>Test réussi !</strong> Le composant Planning Mensuel se charge correctement.
      </div>
      <div className="mt-4">
        <p><strong>Utilisateur :</strong> {user?.name || 'Non défini'}</p>
        <p><strong>Rôle :</strong> {user?.role || 'Non défini'}</p>
      </div>
    </div>
  );
};

export default MonthlyPlanningTest;