import React, { useState, useEffect } from 'react';
import { ModuleHeader, TabBar, StatCard, Button, ContentCard, Message, LoadingSpinner } from './shared/UIComponents';

const CSEManagementNew = ({ user }) => {
  const [activeTab, setActiveTab] = useState('members');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  
  // Données
  const [titulaires, setTitulaires] = useState([]);
  const [suppleants, setSuppleants] = useState([]);
  const [cessions, setCessions] = useState([]);
  
  // Formulaire cession
  const [showCessionModal, setShowCessionModal] = useState(false);
  const [cessionData, setCessionData] = useState({
    from_id: '',
    to_id: '',
    to_name: '',  // Ajout pour saisie libre
    is_external: false,  // Flag pour bénéficiaire externe
    hours: '',
    usage_date: '',
    reason: ''
  });
  const [delegates, setDelegates] = useState([]); // AJOUT: Liste complète des délégués avec heures

  // SUPPRESSION: creditMensuelBase codé en dur
  // const creditMensuelBase = 10; // Ancien commentaire obsolète

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // 1. Charger les délégués CSE (avec heures mensuelles)
      const delegatesResponse = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/cse/delegates`,
        { headers }
      );
      const delegatesData = await delegatesResponse.json();
      
      console.log('🏛️ Délégués CSE chargés:', delegatesData);
      
      setDelegates(delegatesData);

      // 2. Séparer titulaires et suppléants
      const tit = delegatesData.filter(d => d.statut && d.statut.toLowerCase() === 'titulaire');
      const sup = delegatesData.filter(d => d.statut && d.statut.toLowerCase() === 'suppléant');

      console.log(`👥 Titulaires: ${tit.length}, 🔄 Suppléants: ${sup.length}`);

      setTitulaires(tit);
      setSuppleants(sup);

      // 3. Charger les cessions
      try {
        const cessionsResponse = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}/api/cse/cessions`,
          { headers }
        );
        if (cessionsResponse.ok) {
          const cessionsData = await cessionsResponse.json();
          setCessions(cessionsData);
        }
      } catch (error) {
        console.log('Endpoint cessions non disponible');
      }

    } catch (error) {
      console.error('Erreur chargement données CSE:', error);
      showMessage('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateBalance = (memberId) => {
    // Calculer le solde d'heures d'un membre
    const cessionsDonnees = cessions.filter(c => c.from_id === memberId);
    const cessionsRecues = cessions.filter(c => c.to_id === memberId);
    
    // CORRECTION: Utiliser les vraies heures du délégué CSE
    const delegate = delegates.find(d => d.user_id === memberId);
    const creditInitial = delegate?.heures_mensuelles || 0;
    
    const cedees = cessionsDonnees.reduce((sum, c) => sum + parseFloat(c.hours || 0), 0);
    const recues = cessionsRecues.reduce((sum, c) => sum + parseFloat(c.hours || 0), 0);
    
    return {
      initial: creditInitial,
      cedees,
      recues,
      balance: creditInitial - cedees + recues
    };
  };

  const handleSubmitCession = async (e) => {
    e.preventDefault();
    
    console.log('🔵 handleSubmitCession appelé');
    console.log('📋 Données cession:', cessionData);
    
    try {
      // Validations
      const cedant = titulaires.find(t => t.id === cessionData.from_id);
      
      if (!cedant) {
        console.error('❌ Cédant non trouvé');
        showMessage('Cédant non trouvé', 'error');
        return;
      }
      
      console.log('✅ Cédant trouvé:', cedant.name);

      // Validation bénéficiaire
      if (cessionData.is_external) {
        console.log('🔵 Mode externe, vérification nom...');
        // Personne externe - vérifier que le nom est saisi
        if (!cessionData.to_name || cessionData.to_name.trim() === '') {
          console.error('❌ Nom bénéficiaire externe manquant');
          showMessage('Veuillez saisir le nom du bénéficiaire externe', 'error');
          return;
        }
        console.log('✅ Nom externe valide:', cessionData.to_name);
      } else {
        console.log('🔵 Mode membre CSE, vérification membre...');
        // Membre CSE - vérifier qu'il existe
        const beneficiaire = [...titulaires, ...suppleants].find(m => m.id === cessionData.to_id);
        if (!beneficiaire) {
          console.error('❌ Bénéficiaire CSE non trouvé');
          showMessage('Bénéficiaire non trouvé', 'error');
          return;
        }
        console.log('✅ Bénéficiaire CSE trouvé:', beneficiaire.name);

        // Validation limite 1.5x (seulement pour membres CSE)
        const beneficiaireBalance = calculateBalance(beneficiaire.user_id);
        const newBalance = beneficiaireBalance.balance + parseFloat(cessionData.hours);
        
        // CORRECTION: Utiliser les heures du bénéficiaire pour calculer la limite
        const beneficiaireDelegate = delegates.find(d => d.user_id === beneficiaire.user_id);
        const creditBeneficiaire = beneficiaireDelegate?.heures_mensuelles || 22;
        const maxAllowed = creditBeneficiaire * 1.5;

        console.log(`🔵 Vérification limite: ${newBalance.toFixed(1)}h vs max ${maxAllowed}h`);
        
        if (newBalance > maxAllowed) {
          console.error('❌ Dépassement limite');
          showMessage(
            `Dépassement limite: Le bénéficiaire aurait ${newBalance.toFixed(1)}h mais le maximum autorisé est ${maxAllowed}h (1.5× ${creditBeneficiaire}h)`,
            'error'
          );
          return;
        }
      }

      // Validation délai 8 jours
      const today = new Date();
      const usageDate = new Date(cessionData.usage_date);
      const daysDiff = Math.ceil((usageDate - today) / (1000 * 60 * 60 * 24));

      console.log(`🔵 Vérification délai: ${daysDiff} jours`);

      if (daysDiff < 8) {
        console.warn('⚠️ Délai < 8 jours, demande confirmation');
        if (!window.confirm(
          `⚠️ ATTENTION: L'employeur doit être informé au moins 8 jours avant.\n` +
          `Délai actuel: ${daysDiff} jour(s)\n\n` +
          `Voulez-vous continuer quand même ?`
        )) {
          console.log('❌ Utilisateur a annulé');
          return;
        }
      }

      console.log('🔵 Préparation de la requête API...');

      // Soumettre la cession
      const token = localStorage.getItem('token');
      const body = {
        from_id: cessionData.from_id,
        from_name: cedant.name,
        to_id: cessionData.is_external ? 'external' : cessionData.to_id,
        to_name: cessionData.is_external ? cessionData.to_name : [...titulaires, ...suppleants].find(m => m.id === cessionData.to_id)?.name,
        is_external: cessionData.is_external,
        hours: parseFloat(cessionData.hours),
        usage_date: cessionData.usage_date,
        reason: cessionData.reason,
        created_by: user.name
      };
      
      console.log('📤 Envoi requête:', body);
      
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/cse/cessions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );

      console.log('📥 Réponse reçue:', response.status);

      if (response.ok) {
        console.log('✅ Cession créée avec succès');
        showMessage('Cession créée avec succès', 'success');
        setShowCessionModal(false);
        setCessionData({ from_id: '', to_id: '', to_name: '', is_external: false, hours: '', usage_date: '', reason: '' });
        fetchData(); // Recharger les données
      } else {
        const error = await response.json();
        showMessage(error.detail || 'Erreur lors de la création', 'error');
      }

    } catch (error) {
      console.error('❌ Erreur lors de la création de la cession:', error);
      showMessage(`Erreur lors de la création de la cession: ${error.message}`, 'error');
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header Harmonisé */}
      <ModuleHeader
        title="Gestion CSE & Délégation"
        subtitle="Module unifié - Membres, Heures de Délégation & Cessions (CCN66)"
        icon="🏛️"
      />

      {/* Message */}
      {message && (
        <Message type={message.type} onClose={() => setMessage(null)}>
          {message.text}
        </Message>
      )}

      {/* Tabs Harmonisés */}
      <TabBar
        tabs={[
          { id: 'members', label: '👥 Membres CSE' },
          { id: 'hours', label: '⚖️ Heures de Délégation' },
          { id: 'cessions', label: '🔄 Cessions d\'Heures' },
          { id: 'reports', label: '📊 Rapports' }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="hidden">
            {/* Ancien code tabs - masqué */}
          </div>
        </div>

        <div className="p-6">
          {/* Tab: Membres CSE */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  ℹ️ <strong>Chargement automatique:</strong> Les membres CSE sont automatiquement 
                  détectés depuis la Gestion des Utilisateurs (champ "Statut CSE").
                </p>
              </div>

              {/* Titulaires */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  👔 Titulaires ({titulaires.length})
                </h3>
                {titulaires.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {titulaires.map(member => {
                      const balance = calculateBalance(member.user_id);
                      return (
                        <div key={member.user_id} className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                              {member.user_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">{member.user_name}</p>
                              <p className="text-sm text-gray-600">{member.college || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Crédit mensuel:</span>
                              <span className="font-semibold text-purple-600">{balance.initial}h</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Solde actuel:</span>
                              <span className="font-bold text-purple-900">{balance.balance.toFixed(1)}h</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    Aucun titulaire défini. Ajoutez le statut "Titulaire" dans la Gestion des Utilisateurs.
                  </div>
                )}
              </div>

              {/* Suppléants */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  👤 Suppléants ({suppleants.length})
                </h3>
                {suppleants.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suppleants.map(member => {
                      const balance = calculateBalance(member.user_id);
                      return (
                        <div key={member.user_id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold">
                              {member.user_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">{member.user_name}</p>
                              <p className="text-sm text-gray-600">{member.college || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Heures reçues:</span>
                              <span className="font-semibold text-gray-900">{balance.recues.toFixed(1)}h</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    Aucun suppléant défini.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Heures de Délégation */}
          {activeTab === 'hours' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  ⚖️ <strong>Réglementation:</strong> Heures calculées automatiquement selon l'effectif de l'entreprise (22h/mois pour 250+ salariés)
                </p>
              </div>

              <div className="space-y-4">
                {[...titulaires, ...suppleants].map(member => {
                  const balance = calculateBalance(member.id);
                  return (
                    <div key={member.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-800">{member.name}</p>
                          <p className="text-sm text-gray-600">
                            {member.statut_cse} - {member.department || 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-purple-600">{balance.balance.toFixed(1)}h</p>
                          <p className="text-xs text-gray-500">Solde actuel</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                        <div className="bg-green-50 rounded p-2">
                          <p className="text-gray-600">Crédit initial</p>
                          <p className="font-semibold text-green-700">{balance.initial}h</p>
                        </div>
                        <div className="bg-orange-50 rounded p-2">
                          <p className="text-gray-600">Cédées</p>
                          <p className="font-semibold text-orange-700">-{balance.cedees.toFixed(1)}h</p>
                        </div>
                        <div className="bg-blue-50 rounded p-2">
                          <p className="text-gray-600">Reçues</p>
                          <p className="font-semibold text-blue-700">+{balance.recues.toFixed(1)}h</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab: Cessions */}
          {activeTab === 'cessions' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Cessions d'Heures</h3>
                  <p className="text-sm text-gray-600">Mutualisation conforme Code du travail L.2315-9</p>
                </div>
                <button
                  onClick={() => setShowCessionModal(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-sm"
                >
                  ➕ Nouvelle Cession
                </button>
              </div>

              {/* Historique */}
              <div className="space-y-3">
                {cessions.length > 0 ? (
                  cessions.map(cession => (
                    <div key={cession.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-800">
                            {cession.from_name} → {cession.to_name}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {cession.reason || 'Aucun motif'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Utilisation prévue: {formatDate(cession.usage_date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-purple-600">{cession.hours}h</p>
                          <p className="text-xs text-gray-500">{formatDate(cession.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    Aucune cession enregistrée
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Rapports */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">📊 Statistiques</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-lg p-6">
                  <p className="text-sm text-blue-600 font-medium mb-2">Total Titulaires</p>
                  <p className="text-4xl font-bold text-blue-900">{titulaires.length}</p>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-6">
                  <p className="text-sm text-purple-600 font-medium mb-2">Total Suppléants</p>
                  <p className="text-4xl font-bold text-purple-900">{suppleants.length}</p>
                </div>
                
                <div className="bg-orange-50 rounded-lg p-6">
                  <p className="text-sm text-orange-600 font-medium mb-2">Total Cessions</p>
                  <p className="text-4xl font-bold text-orange-900">{cessions.length}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nouvelle Cession */}
      {showCessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
              <h2 className="text-xl font-bold">🔄 Nouvelle Cession d'Heures</h2>
              <p className="text-sm text-purple-100 mt-1">Mutualisation conforme CCN66</p>
            </div>

            <form onSubmit={handleSubmitCession} className="p-6 space-y-6">
              {/* Règles légales */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-medium mb-2">⚖️ Règles Légales:</p>
                <ul className="text-xs text-yellow-700 space-y-1 ml-4 list-disc">
                  <li>Seuls les <strong>titulaires</strong> peuvent céder des heures</li>
                  <li>Maximum <strong>1.5× le crédit titulaire</strong> par bénéficiaire (33h max pour 250+ salariés)</li>
                  <li>Employeur informé au moins <strong>8 jours avant</strong> utilisation</li>
                </ul>
              </div>

              {/* Cédant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cédant (Titulaire uniquement) *
                </label>
                <select
                  required
                  value={cessionData.from_id}
                  onChange={(e) => setCessionData({ ...cessionData, from_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Sélectionner un titulaire...</option>
                  {titulaires.map(t => {
                    const balance = calculateBalance(t.user_id);
                    return (
                      <option key={t.user_id} value={t.user_id}>
                        {t.user_name} (Solde: {balance.balance.toFixed(1)}h)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Bénéficiaire */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bénéficiaire *
                </label>
                
                {/* Toggle Membre CSE / Personne externe */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setCessionData({...cessionData, is_external: false, to_id: '', to_name: ''})}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      !cessionData.is_external
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    👥 Membre CSE
                  </button>
                  <button
                    type="button"
                    onClick={() => setCessionData({...cessionData, is_external: true, to_id: 'external', to_name: ''})}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      cessionData.is_external
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    👤 Personne externe
                  </button>
                </div>
                
                {/* Select pour membre CSE */}
                {!cessionData.is_external ? (
                  <select
                    required
                    value={cessionData.to_id}
                    onChange={(e) => setCessionData({ ...cessionData, to_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Sélectionner un membre CSE...</option>
                    <optgroup label="Titulaires">
                      {titulaires.filter(t => t.user_id !== cessionData.from_id).map(t => {
                        const balance = calculateBalance(t.user_id);
                        return (
                          <option key={t.user_id} value={t.user_id}>
                            {t.user_name} (Solde: {balance.balance.toFixed(1)}h)
                          </option>
                        );
                      })}
                    </optgroup>
                    <optgroup label="Suppléants">
                      {suppleants.map(s => {
                        const balance = calculateBalance(s.user_id);
                        return (
                          <option key={s.user_id} value={s.user_id}>
                            {s.user_name} (Solde: {balance.balance.toFixed(1)}h)
                          </option>
                        );
                      })}
                    </optgroup>
                  </select>
                ) : (
                  /* Input pour personne externe */
                  <input
                    type="text"
                    required
                    value={cessionData.to_name}
                    onChange={(e) => setCessionData({ ...cessionData, to_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Nom et prénom de la personne externe..."
                  />
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Nombre d'heures */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre d'Heures *
                  </label>
                  <input
                    type="number"
                    required
                    min="0.5"
                    step="0.5"
                    value={cessionData.hours}
                    onChange={(e) => setCessionData({ ...cessionData, hours: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Ex: 5"
                  />
                  {cessionData.to_id && cessionData.hours && !cessionData.is_external && (
                    <p className="text-xs text-gray-600 mt-1">
                      Max autorisé: 33h (1.5× 22h) pour 250+ salariés
                    </p>
                  )}
                </div>

                {/* Date d'utilisation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date d'Utilisation *
                  </label>
                  <input
                    type="date"
                    required
                    value={cessionData.usage_date}
                    onChange={(e) => setCessionData({ ...cessionData, usage_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    ℹ️ Employeur informé 8j avant
                  </p>
                </div>
              </div>

              {/* Motif */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motif / Raison
                </label>
                <textarea
                  rows="3"
                  value={cessionData.reason}
                  onChange={(e) => setCessionData({ ...cessionData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Réunion extraordinaire, formation, etc."
                ></textarea>
              </div>

              {/* Boutons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowCessionModal(false);
                    setCessionData({ from_id: '', to_id: '', to_name: '', is_external: false, hours: '', usage_date: '', reason: '' });
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  📤 Créer la Cession
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CSEManagementNew;
