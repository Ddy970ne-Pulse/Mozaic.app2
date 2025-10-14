// Force rebuild - cache buster v6 - 2025-01-15-date-fix
import React, { useState, useEffect } from 'react';

const EmployeeSpaceV2 = ({ user }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Fix: myAbsences state declaration
  
  // Données réelles de l'utilisateur
  const [userData, setUserData] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  
  // Soldes et compteurs réels
  const [absenceStats, setAbsenceStats] = useState({
    totalDays: 0,
    byType: {}
  });
  const [myAbsences, setMyAbsences] = useState([]);
  const [overtimeBalance, setOvertimeBalance] = useState({
    accumulated: 0,
    recovered: 0,
    balance: 0
  });
  
  // État pour le formulaire de demande d'absence
  const [absenceRequest, setAbsenceRequest] = useState({
    type: '',
    days: '',
    startDate: '',
    endDate: '',
    comment: ''
  });

  // Charger les données au montage
  useEffect(() => {
    fetchUserData();
  }, [user.id]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // 1. Charger les infos utilisateur
      const userResponse = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/users/${user.id}`,
        { headers }
      );
      const userInfo = await userResponse.json();
      setUserData(userInfo);
      setEditedData(userInfo);

      // 2. Charger les absences de l'utilisateur
      const absResponse = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/absences`,
        { headers }
      );
      const allAbsences = await absResponse.json();
      
      // Filtrer par employee_id (prioritaire), email, ou nom
      const myAbsencesData = allAbsences.filter(abs => {
        // Méthode 1: Par employee_id (le plus fiable)
        if (abs.employee_id === user.id) return true;
        
        // Méthode 2: Par email
        if (abs.email && user.email && abs.email.toLowerCase() === user.email.toLowerCase()) return true;
        
        // Méthode 3: Par nom (fallback)
        if (abs.employee_name && user.name && 
            abs.employee_name.toLowerCase().includes(user.name.toLowerCase())) return true;
        
        return false;
      });
      
      console.log(`📊 Absences trouvées: ${myAbsencesData.length}/${allAbsences.length} pour ${user.name}`);
      setMyAbsences(myAbsencesData);
      calculateAbsenceStats(myAbsencesData);

      // 3. Charger les heures supplémentaires
      const overtimeResponse = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/overtime/all`,
        { headers }
      );
      const overtimeData = await overtimeResponse.json();
      const myOvertime = overtimeData.find(
        emp => emp.id === user?.id || emp.name === user?.name
      );
      if (myOvertime) {
        setOvertimeBalance({
          accumulated: myOvertime.accumulated || 0,
          recovered: myOvertime.recovered || 0,
          balance: myOvertime.balance || 0
        });
      }

    } catch (error) {
      console.error('Erreur chargement données:', error);
      showMessage('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateAbsenceStats = (absences) => {
    const currentYear = new Date().getFullYear();
    const yearAbsences = absences.filter(abs => {
      const absDate = new Date(abs.date_debut || abs.date);
      return absDate.getFullYear() === currentYear;
    });

    const totalDays = yearAbsences.reduce((sum, abs) => {
      return sum + parseFloat(abs.jours_absence || abs.days || 0);
    }, 0);

    const byType = {};
    yearAbsences.forEach(abs => {
      const type = abs.motif_absence || abs.motif || 'Non spécifié';
      byType[type] = (byType[type] || 0) + parseFloat(abs.jours_absence || abs.days || 0);
    });

    setAbsenceStats({ totalDays, byType });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/users/${user.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(editedData)
        }
      );

      if (response.ok) {
        setUserData(editedData);
        setIsEditing(false);
        showMessage('Profil mis à jour avec succès', 'success');
        // Actualiser les données
        fetchUserData();
      } else {
        throw new Error('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      showMessage('Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleInputChange = (field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitAbsenceRequest = async (e) => {
    e.preventDefault(); // Empêcher le rechargement de la page
    
    // Validation
    if (!absenceRequest.type || !absenceRequest.days || !absenceRequest.startDate || !absenceRequest.endDate) {
      showMessage('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      // Préparer les données de l'absence
      const absenceData = {
        employee_id: user.id,
        employee_name: user.name || userData?.name,
        email: user.email || userData?.email,
        motif_absence: absenceRequest.type,
        jours_absence: parseFloat(absenceRequest.days),
        date_debut: absenceRequest.startDate,
        date_fin: absenceRequest.endDate,
        notes: absenceRequest.comment,
        status: 'pending' // Nouvelle demande en attente
      };
      
      console.log('📤 Envoi demande d\'absence:', absenceData);
      
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/absences`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(absenceData)
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Réponse serveur:', result);
        showMessage('✅ Demande soumise avec succès', 'success');
        // Réinitialiser le formulaire
        setAbsenceRequest({
          type: '',
          days: '',
          startDate: '',
          endDate: '',
          comment: ''
        });
        // Recharger les absences
        fetchUserData();
      } else {
        const errorData = await response.json();
        console.error('❌ Erreur backend:', errorData);
        
        // Formater le message d'erreur
        let errorMessage = 'Erreur lors de la soumission';
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map(e => `${e.loc?.join('.')}: ${e.msg}`).join(', ');
        } else if (errorData.detail) {
          errorMessage = JSON.stringify(errorData.detail);
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Erreur soumission demande:', error);
      showMessage('❌ Erreur lors de la soumission: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };
  
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    
    // Gérer les deux formats de date
    // Format 1: DD/MM/YYYY (anciennes absences)
    // Format 2: YYYY-MM-DD (nouvelles absences ISO)
    
    if (dateStr.includes('/')) {
      // Format français DD/MM/YYYY
      const [day, month, year] = dateStr.split('/');
      return `${day}/${month}/${year}`;
    } else {
      // Format ISO YYYY-MM-DD
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Erreur : Impossible de charger les données utilisateur</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold text-xl border-2 border-white/30">
              {userData.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{userData.name}</h1>
              <p className="text-blue-100">{userData.department || 'N/A'} - {userData.role}</p>
            </div>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all border border-white/30"
          >
            {isEditing ? '❌ Annuler' : '✏️ Modifier'}
          </button>
        </div>
      </div>

      {/* Message de confirmation */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex gap-2 p-2">
            {[
              { id: 'profile', label: '👤 Profil', icon: '👤' },
              { id: 'absences', label: '📅 Mes Absences', icon: '📅' },
              { id: 'overtime', label: '⏰ Heures Sup', icon: '⏰' },
              { id: 'requests', label: '📝 Mes Demandes', icon: '📝' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Tab: Profil */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informations Personnelles */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Informations Personnelles</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom Complet</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedData.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    ) : (
                      <p className="text-gray-900">{userData.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editedData.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    ) : (
                      <p className="text-gray-900">{userData.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editedData.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="+33 1 23 45 67 89"
                      />
                    ) : (
                      <p className="text-gray-900">{userData.phone || 'Non renseigné'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                    {isEditing ? (
                      <textarea
                        value={editedData.address || ''}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        rows="2"
                        placeholder="Adresse complète"
                      />
                    ) : (
                      <p className="text-gray-900">{userData.address || 'Non renseigné'}</p>
                    )}
                  </div>
                </div>

                {/* Informations Professionnelles */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Informations Professionnelles</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Département</label>
                    <p className="text-gray-900">{userData.department || 'N/A'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Métier</label>
                    <p className="text-gray-900">{userData.metier || 'N/A'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                    <p className="text-gray-900">{userData.categorie_employe || 'N/A'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                    <p className="text-gray-900">{userData.site || 'N/A'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date d'entrée</label>
                    <p className="text-gray-900">{formatDate(userData.date_debut_contrat)}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Temps de travail</label>
                    <p className="text-gray-900">{userData.temps_travail || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setEditedData(userData);
                      setIsEditing(false);
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {saving ? 'Enregistrement...' : '💾 Enregistrer'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab: Mes Absences */}
          {activeTab === 'absences' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Mes Absences {new Date().getFullYear()}</h3>
              
              {/* Résumé */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 font-medium">Total</p>
                  <p className="text-2xl font-bold text-blue-900">{absenceStats.totalDays.toFixed(1)}j</p>
                </div>
                {Object.entries(absenceStats.byType).slice(0, 3).map(([type, days]) => (
                  <div key={type} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 font-medium truncate">{type}</p>
                    <p className="text-2xl font-bold text-gray-900">{days.toFixed(1)}j</p>
                  </div>
                ))}
              </div>

              {/* Détail par type avec périodes */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Détail par motif</h4>
                {Object.entries(absenceStats.byType).map(([type, days]) => {
                  // Filtrer les absences de ce type (avec safety check)
                  const absencesOfType = (myAbsences || []).filter(abs => abs.motif_absence === type);
                  
                  return (
                    <div key={type} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-gray-800">{type}</span>
                        <span className="text-lg font-bold text-purple-600">{days.toFixed(1)} jours</span>
                      </div>
                      
                      {/* Liste des périodes */}
                      {absencesOfType.length > 0 && (
                        <div className="space-y-2 mt-3 pl-4 border-l-2 border-purple-300">
                          {absencesOfType.map((absence, idx) => (
                            <div key={idx} className="text-sm text-gray-600 flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-purple-500">📅</span>
                                <span>
                                  Du {absence.date_debut} 
                                  {absence.date_fin && ` au ${absence.date_fin}`}
                                </span>
                              </div>
                              <span className="font-medium text-gray-700">
                                {absence.jours_absence} {absence.absence_unit === 'heures' ? 'h' : 'j'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {Object.keys(absenceStats.byType).length === 0 && (
                  <p className="text-center text-gray-500 py-8">Aucune absence enregistrée cette année</p>
                )}
              </div>
            </div>
          )}

          {/* Tab: Heures Supplémentaires */}
          {activeTab === 'overtime' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Mes Heures Supplémentaires</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
                  <p className="text-sm text-green-600 font-medium mb-2">✅ Accumulées</p>
                  <p className="text-3xl font-bold text-green-900">{overtimeBalance.accumulated.toFixed(1)}h</p>
                </div>
                
                <div className="bg-orange-50 rounded-xl p-6 border-2 border-orange-200">
                  <p className="text-sm text-orange-600 font-medium mb-2">🔄 Récupérées</p>
                  <p className="text-3xl font-bold text-orange-900">{overtimeBalance.recovered.toFixed(1)}h</p>
                </div>
                
                <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-200">
                  <p className="text-sm text-purple-600 font-medium mb-2">💰 Solde Actuel</p>
                  <p className="text-3xl font-bold text-purple-900">{overtimeBalance.balance.toFixed(1)}h</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>Astuce:</strong> Vous pouvez demander une récupération de vos heures supplémentaires 
                  via l'onglet "Mes Demandes" ou le module de demandes d'absence (motif: Récupération).
                </p>
              </div>
            </div>
          )}

          {/* Tab: Mes Demandes */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              {/* Section Admin/Manager */}
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-orange-200 rounded-xl p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">👔</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">
                        🎯 Espace Séparé pour {user?.role === 'admin' ? 'Administrateur' : 'Manager'}
                      </h3>
                      <p className="text-sm text-gray-700 mb-4">
                        En tant que <strong>{user?.role === 'admin' ? 'administrateur' : 'manager'}</strong>, 
                        vous avez accès à deux espaces distincts :
                      </p>
                      
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">👤</span>
                            <h4 className="font-semibold text-gray-800">Mon Espace Personnel</h4>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            Cet onglet : Gérez VOS propres demandes d'absence et consultez VOS soldes personnels.
                          </p>
                          <div className="text-xs text-green-600 font-medium">
                            ✓ Vous êtes ici actuellement
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">📝</span>
                            <h4 className="font-semibold text-gray-800">Gestion d'Équipe</h4>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            Module "Demandes d'Absence" : Validez et gérez les demandes de VOTRE équipe.
                          </p>
                          <button
                            onClick={() => window.location.href = '#absence-requests'}
                            className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                          >
                            → Accéder au module
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Formulaire de demande personnelle */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  📝 Faire une Demande d'Absence Personnelle
                </h3>
                
                <form className="space-y-4" onSubmit={handleSubmitAbsenceRequest}>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type d'Absence *
                      </label>
                      <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        value={absenceRequest.type}
                        onChange={(e) => setAbsenceRequest({...absenceRequest, type: e.target.value})}
                        required
                      >
                        <option value="">Sélectionner...</option>
                        <option value="CA">Congés Annuels (CA)</option>
                        <option value="CT">Congés Trimestriels (CT)</option>
                        <option value="RTT">RTT</option>
                        <option value="REC">Récupération</option>
                        <option value="AM">Arrêt Maladie</option>
                        <option value="CSS">Congés Sans Solde</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre de Jours *
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="Ex: 5"
                        value={absenceRequest.days}
                        onChange={(e) => setAbsenceRequest({...absenceRequest, days: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date de Début *
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        value={absenceRequest.startDate}
                        onChange={(e) => setAbsenceRequest({...absenceRequest, startDate: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date de Fin *
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        value={absenceRequest.endDate}
                        onChange={(e) => setAbsenceRequest({...absenceRequest, endDate: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Motif / Commentaire
                    </label>
                    <textarea
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Précisez le motif de votre demande..."
                      value={absenceRequest.comment}
                      onChange={(e) => setAbsenceRequest({...absenceRequest, comment: e.target.value})}
                    ></textarea>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      type="button"
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      onClick={() => setAbsenceRequest({
                        type: '',
                        days: '',
                        startDate: '',
                        endDate: '',
                        comment: ''
                      })}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      disabled={saving}
                    >
                      {saving ? '⏳ Envoi...' : '📤 Soumettre Ma Demande'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Mes demandes - Afficher toutes les absences avec leur statut */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  📋 Mes Demandes d'Absence
                </h3>
                
                {myAbsences && myAbsences.length > 0 ? (
                  <div className="space-y-3">
                    {myAbsences.map((absence, idx) => {
                      const statusColors = {
                        'approved': 'bg-green-100 text-green-800 border-green-300',
                        'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
                        'rejected': 'bg-red-100 text-red-800 border-red-300'
                      };
                      const statusLabels = {
                        'approved': '✅ Validée',
                        'pending': '⏳ En attente',
                        'rejected': '❌ Refusée'
                      };
                      const status = absence.status || 'approved';
                      
                      return (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">{absence.motif_absence === 'CA' ? '🏖️' : 
                                                             absence.motif_absence === 'RTT' ? '🏝️' : 
                                                             absence.motif_absence === 'AM' ? '🤒' : '📝'}</span>
                                <div>
                                  <h4 className="font-semibold text-gray-800">
                                    {absence.motif_absence} - {absence.jours_absence} jour(s)
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    Du {formatDate(absence.date_debut)} 
                                    {absence.date_fin && ` au ${formatDate(absence.date_fin)}`}
                                  </p>
                                </div>
                              </div>
                              {absence.notes && (
                                <p className="text-sm text-gray-600 mt-2">
                                  💬 {absence.notes}
                                </p>
                              )}
                            </div>
                            <div>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[status]}`}>
                                {statusLabels[status]}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Aucune demande enregistrée
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeSpaceV2;
// Force rebuild Mon Oct 13 01:39:44 UTC 2025
