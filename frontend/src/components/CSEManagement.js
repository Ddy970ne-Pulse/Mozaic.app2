import React, { useState, useEffect } from 'react';

const CSEManagement = ({ user, onChangeView }) => {
  const [currentTab, setCurrentTab] = useState('delegates'); // delegates, hours, cessions, statistics
  const [delegates, setDelegates] = useState([]);
  const [declarations, setDeclarations] = useState([]);
  const [cessions, setCessions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddDelegate, setShowAddDelegate] = useState(false);
  const [showDeclareHours, setShowDeclareHours] = useState(false);
  const [showRequestCession, setShowRequestCession] = useState(false);

  // Formulaire nouveau délégué
  const [newDelegate, setNewDelegate] = useState({
    user_id: '',
    statut: 'titulaire',
    heures_mensuelles: 24,
    college: 'employes',
    date_debut: new Date().toISOString().split('T')[0],
    date_fin: ''
  });

  // Formulaire déclaration heures
  const [hoursDeclaration, setHoursDeclaration] = useState({
    delegate_id: '',
    date: new Date().toISOString().split('T')[0],
    heures_utilisees: '',
    motif: '',
    notes: ''
  });

  // Formulaire cession
  const [cessionRequest, setCessionRequest] = useState({
    beneficiaire_id: '',
    heures_cedees: '',
    mois: new Date().toISOString().substring(0, 7),
    motif: ''
  });

  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadDelegates();
    loadUsers();
    loadStatistics();
  }, []);

  useEffect(() => {
    if (currentTab === 'hours') {
      loadDeclarations();
    } else if (currentTab === 'cessions') {
      loadCessions();
    }
  }, [currentTab]);

  const loadUsers = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
    }
  };

  const loadDelegates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cse/delegates`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDelegates(data);
      }
    } catch (error) {
      console.error('Erreur chargement délégués:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDeclarations = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cse/hours`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDeclarations(data);
      }
    } catch (error) {
      console.error('Erreur chargement déclarations:', error);
    }
  };

  const loadCessions = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cse/cessions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCessions(data);
      }
    } catch (error) {
      console.error('Erreur chargement cessions:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cse/statistics`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
    }
  };

  const handleAddDelegate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cse/delegates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newDelegate)
      });

      if (response.ok) {
        alert('Délégué CSE désigné avec succès !');
        setShowAddDelegate(false);
        setNewDelegate({
          user_id: '',
          statut: 'titulaire',
          heures_mensuelles: 24,
          college: 'employes',
          date_debut: new Date().toISOString().split('T')[0],
          date_fin: ''
        });
        loadDelegates();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.detail}`);
      }
    } catch (error) {
      console.error('Erreur ajout délégué:', error);
      alert('Erreur lors de l\'ajout du délégué');
    }
  };

  const handleDeclareHours = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cse/hours/declare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(hoursDeclaration)
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Heures déclarées avec succès ! Solde restant: ${result.solde_restant}h`);
        setShowDeclareHours(false);
        setHoursDeclaration({
          delegate_id: '',
          date: new Date().toISOString().split('T')[0],
          heures_utilisees: '',
          motif: '',
          notes: ''
        });
        loadDeclarations();
        loadStatistics();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.detail}`);
      }
    } catch (error) {
      console.error('Erreur déclaration heures:', error);
      alert('Erreur lors de la déclaration');
    }
  };

  const handleRequestCession = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cse/cession/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(cessionRequest)
      });

      if (response.ok) {
        alert('Demande de cession enregistrée !');
        setShowRequestCession(false);
        setCessionRequest({
          beneficiaire_id: '',
          heures_cedees: '',
          mois: new Date().toISOString().substring(0, 7),
          motif: ''
        });
        loadCessions();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.detail}`);
      }
    } catch (error) {
      console.error('Erreur demande cession:', error);
      alert('Erreur lors de la demande');
    }
  };

  const handleAcknowledgeDeclaration = async (declarationId) => {
    if (!window.confirm('Confirmer la prise de connaissance de cette déclaration ?')) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/cse/hours/acknowledge/${declarationId}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.ok) {
        alert('Prise de connaissance enregistrée');
        loadDeclarations();
        loadStatistics();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.detail}`);
      }
    } catch (error) {
      console.error('Erreur prise de connaissance:', error);
    }
  };

  const handleAcknowledgeCession = async (cessionId) => {
    if (!window.confirm('Confirmer la prise de connaissance de cette cession ?')) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/cse/cession/acknowledge/${cessionId}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.ok) {
        alert('Cession prise en compte');
        loadCessions();
        loadStatistics();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.detail}`);
      }
    } catch (error) {
      console.error('Erreur prise en compte cession:', error);
    }
  };

  const renderDelegatesTab = () => (
    <div>
      {/* En-tête avec bouton d'ajout */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800">
          <span className="mr-2">🏛️</span>
          Délégués CSE
        </h3>
        {user.role === 'admin' && (
          <button
            onClick={() => setShowAddDelegate(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 shadow-lg transition-all duration-200"
          >
            + Désigner un délégué
          </button>
        )}
      </div>

      {/* Liste des délégués */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {delegates.map((delegate) => (
          <div
            key={delegate.id}
            className="bg-white rounded-lg shadow-md p-4 border border-gray-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏛️</span>
                  <h4 className="font-semibold text-gray-800">{delegate.user_name}</h4>
                </div>
                <p className="text-sm text-gray-600">{delegate.email}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                delegate.statut === 'titulaire'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {delegate.statut === 'titulaire' ? 'Titulaire' : 'Suppléant'}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Heures mensuelles:</span>
                <span className="font-semibold text-gray-800">{delegate.heures_mensuelles}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Collège:</span>
                <span className="font-semibold text-gray-800">
                  {delegate.college === 'cadres' ? 'Cadres' : 
                   delegate.college === 'employes' ? 'Employés' : 'Ouvriers'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mandat:</span>
                <span className="text-xs text-gray-600">
                  Du {new Date(delegate.date_debut).toLocaleDateString('fr-FR')}
                  {delegate.date_fin && ` au ${new Date(delegate.date_fin).toLocaleDateString('fr-FR')}`}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {delegates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Aucun délégué CSE désigné
        </div>
      )}

      {/* Modal ajout délégué */}
      {showAddDelegate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Désigner un délégué CSE</h3>
            <form onSubmit={handleAddDelegate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employé
                </label>
                <select
                  value={newDelegate.user_id}
                  onChange={(e) => setNewDelegate({...newDelegate, user_id: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un employé</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} - {u.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Statut
                </label>
                <select
                  value={newDelegate.statut}
                  onChange={(e) => setNewDelegate({...newDelegate, statut: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="titulaire">Titulaire</option>
                  <option value="suppléant">Suppléant</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heures mensuelles allouées
                </label>
                <input
                  type="number"
                  value={newDelegate.heures_mensuelles}
                  onChange={(e) => setNewDelegate({...newDelegate, heures_mensuelles: parseInt(e.target.value)})}
                  min="1"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Défaut: 24h pour entreprise +250 salariés
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collège
                </label>
                <select
                  value={newDelegate.college}
                  onChange={(e) => setNewDelegate({...newDelegate, college: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cadres">Cadres</option>
                  <option value="employes">Employés</option>
                  <option value="ouvriers">Ouvriers</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date début mandat
                </label>
                <input
                  type="date"
                  value={newDelegate.date_debut}
                  onChange={(e) => setNewDelegate({...newDelegate, date_debut: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date fin mandat (optionnel)
                </label>
                <input
                  type="date"
                  value={newDelegate.date_fin}
                  onChange={(e) => setNewDelegate({...newDelegate, date_fin: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700"
                >
                  Désigner
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddDelegate(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderHoursTab = () => (
    <div>
      {/* En-tête */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800">
          <span className="mr-2">⏱️</span>
          Heures de Délégation
        </h3>
        <button
          onClick={() => setShowDeclareHours(true)}
          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 shadow-lg transition-all duration-200"
        >
          + Déclarer des heures
        </button>
      </div>

      {/* Liste des déclarations */}
      <div className="space-y-3">
        {declarations.map((decl) => (
          <div
            key={decl.id}
            className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${
              decl.statut === 'acknowledged' ? 'border-green-500' : 'border-yellow-500'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-gray-800">{decl.delegate_name}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    decl.statut === 'acknowledged'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {decl.statut === 'acknowledged' ? '✓ Pris en compte' : '⏳ En attente'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Date:</strong> {new Date(decl.date).toLocaleDateString('fr-FR')}</p>
                  <p><strong>Heures:</strong> {decl.heures_utilisees}h</p>
                  <p><strong>Motif:</strong> {decl.motif}</p>
                  {decl.notes && <p><strong>Notes:</strong> {decl.notes}</p>}
                  {decl.acknowledged_by && (
                    <p className="text-green-600 text-xs">
                      Pris en compte par {decl.acknowledged_by} le {new Date(decl.acknowledged_at).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>
              {user.role === 'admin' && decl.statut === 'declared' && (
                <button
                  onClick={() => handleAcknowledgeDeclaration(decl.id)}
                  className="ml-4 px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600"
                >
                  ✓ Prendre connaissance
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {declarations.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Aucune déclaration d'heures
        </div>
      )}

      {/* Modal déclaration heures */}
      {showDeclareHours && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Déclarer des heures de délégation</h3>
            <form onSubmit={handleDeclareHours} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Délégué
                </label>
                <select
                  value={hoursDeclaration.delegate_id}
                  onChange={(e) => setHoursDeclaration({...hoursDeclaration, delegate_id: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Sélectionner un délégué</option>
                  {delegates.map(d => (
                    <option key={d.id} value={d.id}>{d.user_name} ({d.heures_mensuelles}h/mois)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={hoursDeclaration.date}
                  onChange={(e) => setHoursDeclaration({...hoursDeclaration, date: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre d'heures
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={hoursDeclaration.heures_utilisees}
                  onChange={(e) => setHoursDeclaration({...hoursDeclaration, heures_utilisees: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motif
                </label>
                <textarea
                  value={hoursDeclaration.motif}
                  onChange={(e) => setHoursDeclaration({...hoursDeclaration, motif: e.target.value})}
                  required
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optionnel)
                </label>
                <textarea
                  value={hoursDeclaration.notes}
                  onChange={(e) => setHoursDeclaration({...hoursDeclaration, notes: e.target.value})}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700"
                >
                  Déclarer
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeclareHours(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderCessionsTab = () => (
    <div>
      {/* En-tête */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800">
          <span className="mr-2">🔄</span>
          Cessions d'Heures
        </h3>
        <button
          onClick={() => setShowRequestCession(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 shadow-lg transition-all duration-200"
        >
          + Demander une cession
        </button>
      </div>

      {/* Liste des cessions */}
      <div className="space-y-3">
        {cessions.map((cession) => (
          <div
            key={cession.id}
            className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${
              cession.statut === 'acknowledged' ? 'border-green-500' : 'border-purple-500'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    cession.statut === 'acknowledged'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {cession.statut === 'acknowledged' ? '✓ Validée' : '⏳ En attente'}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <p>
                    <strong className="text-blue-600">{cession.cedant_name}</strong>
                    {' → '}
                    <strong className="text-green-600">{cession.beneficiaire_name}</strong>
                  </p>
                  <p><strong>Heures cédées:</strong> {cession.heures_cedees}h</p>
                  <p><strong>Mois:</strong> {cession.mois}</p>
                  {cession.motif && <p><strong>Motif:</strong> {cession.motif}</p>}
                  {cession.validated_by && (
                    <p className="text-green-600 text-xs">
                      Validée par {cession.validated_by} le {new Date(cession.validated_at).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>
              {user.role === 'admin' && cession.statut === 'pending' && (
                <button
                  onClick={() => handleAcknowledgeCession(cession.id)}
                  className="ml-4 px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600"
                >
                  ✓ Prendre connaissance
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {cessions.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Aucune cession d'heures
        </div>
      )}

      {/* Modal demande cession */}
      {showRequestCession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Demander une cession d'heures</h3>
            <form onSubmit={handleRequestCession} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bénéficiaire
                </label>
                <select
                  value={cessionRequest.beneficiaire_id}
                  onChange={(e) => setCessionRequest({...cessionRequest, beneficiaire_id: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Sélectionner un délégué</option>
                  {delegates.map(d => (
                    <option key={d.id} value={d.id}>{d.user_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre d'heures à céder
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={cessionRequest.heures_cedees}
                  onChange={(e) => setCessionRequest({...cessionRequest, heures_cedees: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mois concerné
                </label>
                <input
                  type="month"
                  value={cessionRequest.mois}
                  onChange={(e) => setCessionRequest({...cessionRequest, mois: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motif (optionnel)
                </label>
                <textarea
                  value={cessionRequest.motif}
                  onChange={(e) => setCessionRequest({...cessionRequest, motif: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700"
                >
                  Demander
                </button>
                <button
                  type="button"
                  onClick={() => setShowRequestCession(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderStatisticsTab = () => (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-6">
        <span className="mr-2">📊</span>
        Statistiques CSE
      </h3>

      {statistics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-3xl font-bold">{statistics.total_delegates}</div>
            <div className="text-sm opacity-90">Délégués actifs</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="text-3xl mb-2">⏱️</div>
            <div className="text-3xl font-bold">{statistics.heures_utilisees_mois}h</div>
            <div className="text-sm opacity-90">Heures utilisées ce mois</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="text-3xl mb-2">📈</div>
            <div className="text-3xl font-bold">{statistics.taux_utilisation}%</div>
            <div className="text-sm opacity-90">Taux d'utilisation</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-3xl font-bold">{statistics.cessions_en_attente}</div>
            <div className="text-sm opacity-90">Cessions en attente</div>
          </div>
        </div>
      )}

      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h4 className="font-semibold text-gray-800 mb-4">Répartition</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Titulaires</span>
            <span className="font-semibold text-blue-600">{statistics?.titulaires || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Suppléants</span>
            <span className="font-semibold text-green-600">{statistics?.suppleants || 0}</span>
          </div>
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Heures allouées/mois</span>
              <span className="font-semibold text-gray-800">{statistics?.heures_allouees_mois || 0}h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>🏛️</span>
          Gestion CSE
        </h2>
        <p className="text-gray-600">Comité Social et Économique</p>
      </div>

      {/* Onglets */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-4">
          <button
            onClick={() => setCurrentTab('delegates')}
            className={`pb-3 px-4 font-medium transition-all duration-200 ${
              currentTab === 'delegates'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            👥 Délégués
          </button>
          <button
            onClick={() => setCurrentTab('hours')}
            className={`pb-3 px-4 font-medium transition-all duration-200 ${
              currentTab === 'hours'
                ? 'border-b-2 border-green-500 text-green-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            ⏱️ Heures de Délégation
          </button>
          <button
            onClick={() => setCurrentTab('cessions')}
            className={`pb-3 px-4 font-medium transition-all duration-200 ${
              currentTab === 'cessions'
                ? 'border-b-2 border-purple-500 text-purple-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🔄 Cessions
          </button>
          <button
            onClick={() => setCurrentTab('statistics')}
            className={`pb-3 px-4 font-medium transition-all duration-200 ${
              currentTab === 'statistics'
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📊 Statistiques
          </button>
        </div>
      </div>

      {/* Contenu des onglets */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {currentTab === 'delegates' && renderDelegatesTab()}
          {currentTab === 'hours' && renderHoursTab()}
          {currentTab === 'cessions' && renderCessionsTab()}
          {currentTab === 'statistics' && renderStatisticsTab()}
        </>
      )}
    </div>
  );
};

export default CSEManagement;
