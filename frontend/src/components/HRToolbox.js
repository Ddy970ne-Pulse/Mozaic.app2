import React, { useState } from 'react';

const HRToolbox = ({ user }) => {
  const [activeSection, setActiveSection] = useState('access-control');
  const [calculationResult, setCalculationResult] = useState(null);
  const [leaveCalculation, setLeaveCalculation] = useState(null);
  const [ccn66TestResult, setCcn66TestResult] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '', type: 'company' });

  const sections = [
    { 
      id: 'access-control', 
      name: 'Contrôle d\'Accès', 
      icon: '🔒', 
      color: 'from-blue-500 to-blue-600',
      description: 'Gestion des permissions et rôles' 
    },
    { 
      id: 'legal-concepts', 
      name: 'Concepts Juridiques', 
      icon: '⚖️', 
      color: 'from-green-500 to-green-600',
      description: 'Références légales et calculateurs' 
    },
    { 
      id: 'holidays', 
      name: 'Jours Fériés', 
      icon: '🎆', 
      color: 'from-purple-500 to-purple-600',
      description: 'Configuration des jours fériés' 
    },
    { 
      id: 'leave-entitlements', 
      name: 'Droits aux Congés', 
      icon: '🏖️', 
      color: 'from-orange-500 to-orange-600',
      description: 'Gestion des contingents CCN66' 
    },
    { 
      id: 'ccn66-engine', 
      name: 'Moteur CCN66', 
      icon: '⚙️', 
      color: 'from-red-500 to-red-600',
      description: 'Règles Convention Collective' 
    },
    { 
      id: 'payroll-export', 
      name: 'Export Paie', 
      icon: '💼', 
      color: 'from-teal-500 to-teal-600',
      description: 'Extraction données paie' 
    }
  ];

  // Fonction pour calculer les droits aux congés
  const calculateLeaveRights = () => {
    const anciennete = document.querySelector('input[placeholder="Années"]')?.value || 0;
    const tempsPlein = document.querySelector('select').value === 'Temps plein';
    
    let droitsBase = 25; // Base CCN66
    let droitsAnciennete = anciennete >= 10 ? 1 : 0;
    let droitsTotal = droitsBase + droitsAnciennete;
    
    if (!tempsPlein) {
      droitsTotal = Math.round(droitsTotal * 0.8); // Exemple proratisation
    }
    
    setCalculationResult({
      base: droitsBase,
      anciennete: droitsAnciennete, 
      total: droitsTotal,
      details: `${droitsBase} jours de base + ${droitsAnciennete} jour(s) d'ancienneté = ${droitsTotal} jours${!tempsPlein ? ' (proratisé temps partiel)' : ''}`
    });
  };

  // Fonction pour recalculer tous les droits
  const recalculateAllRights = () => {
    setIsExporting(true);
    // Simulation du recalcul
    setTimeout(() => {
      setLeaveCalculation({
        employees: 156,
        processed: 156,
        errors: 0,
        warnings: 3,
        summary: "Recalcul effectué avec succès pour tous les employés"
      });
      setIsExporting(false);
    }, 2000);
  };

  // Fonction pour tester le moteur CCN66
  const testCcn66Engine = () => {
    setCcn66TestResult({
      testsRun: 24,
      passed: 22,
      failed: 1,
      warnings: 1,
      details: [
        { test: "Calcul congés base", status: "✅ Réussi" },
        { test: "Ancienneté +10 ans", status: "✅ Réussi" },
        { test: "Temps partiel", status: "⚠️ Avertissement" },
        { test: "Congés exceptionnels", status: "❌ Échec" }
      ]
    });
  };

  // Fonction pour valider le moteur CCN66
  const validateCcn66Engine = () => {
    if (ccn66TestResult && ccn66TestResult.failed === 0) {
      alert("✅ Moteur CCN66 validé avec succès !");
    } else {
      alert("❌ Impossible de valider : des tests ont échoué. Veuillez corriger les erreurs d'abord.");
    }
  };

  // Fonctions d'export paie
  const exportPayrollData = (format) => {
    setIsExporting(true);
    // Simulation export
    setTimeout(() => {
      const data = {
        csv: "employee_id,name,salary,hours\n1,Sophie Martin,3500,151.67\n2,Jean Dupont,4200,151.67",
        excel: "Export Excel généré",
        xml: "<?xml version='1.0'?><payroll>...</payroll>"
      };
      
      // Créer un lien de téléchargement simulé
      const blob = new Blob([data[format]], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_paie_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      
      setIsExporting(false);
    }, 1500);
  };

  // Fonction pour ajouter un jour férié personnalisé
  const addCustomHoliday = () => {
    if (newHoliday.name && newHoliday.date) {
      console.log('Nouveau jour férié ajouté:', newHoliday);
      setNewHoliday({ name: '', date: '', type: 'company' });
      alert(`✅ Jour férié "${newHoliday.name}" ajouté avec succès !`);
    }
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'access-control':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">Gestion des Permissions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-medium text-gray-800 mb-3">Rôles Système</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Administrateur RH</span>
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Actif</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Manager</span>
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Actif</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Employé</span>
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Actif</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-medium text-gray-800 mb-3">Permissions par Module</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Planning Mensuel</span>
                      <span className="text-blue-600">Lecture/Écriture</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Analytics</span>
                      <span className="text-blue-600">Lecture seule</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Validation Absences</span>
                      <span className="text-green-600">Manager+</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Export Paie</span>
                      <span className="text-red-600">Admin RH seul</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'legal-concepts':
        return (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-3">Références Légales CCN66</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-medium text-gray-800 mb-3">Calculateur Congés Annuels</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700 w-32">Ancienneté:</label>
                      <input type="number" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Années" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700 w-32">Temps de travail:</label>
                      <select className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option>Temps plein</option>
                        <option>Temps partiel</option>
                      </select>
                    </div>
                    <button 
                      onClick={calculateLeaveRights}
                      className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors duration-200"
                    >
                      Calculer les Droits
                    </button>
                    {calculationResult && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-sm text-green-800">
                          <strong>Résultat:</strong> {calculationResult.total} jours de congés payés
                        </div>
                        <div className="text-xs text-green-700 mt-1">
                          {calculationResult.details}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-medium text-gray-800 mb-3">Règles d'Acquisition</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="p-2 bg-blue-50 rounded">
                      <strong>Principe:</strong> 2,5 jours par mois travaillé
                    </div>
                    <div className="p-2 bg-yellow-50 rounded">
                      <strong>Période:</strong> 1er juin N-1 au 31 mai N
                    </div>
                    <div className="p-2 bg-purple-50 rounded">
                      <strong>Ancienneté:</strong> +1 jour supplémentaire après 10 ans
                    </div>
                    <div className="p-2 bg-orange-50 rounded">
                      <strong>Temps partiel:</strong> Proratisation au temps de travail
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'holidays':
        return (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-purple-800 mb-3">Configuration des Jours Fériés</h3>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="mb-4">
                  <h4 className="font-medium text-gray-800 mb-3">Jours Fériés 2024</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { name: 'Jour de l\'An', date: '1er janvier', fixed: true },
                      { name: 'Lundi de Pâques', date: '1er avril', fixed: false },
                      { name: 'Fête du Travail', date: '1er mai', fixed: true },
                      { name: 'Victoire 1945', date: '8 mai', fixed: true },
                      { name: 'Ascension', date: '9 mai', fixed: false },
                      { name: 'Lundi de Pentecôte', date: '20 mai', fixed: false },
                      { name: 'Fête Nationale', date: '14 juillet', fixed: true },
                      { name: 'Assomption', date: '15 août', fixed: true },
                      { name: 'Toussaint', date: '1er novembre', fixed: true },
                      { name: 'Armistice 1918', date: '11 novembre', fixed: true },
                      { name: 'Noël', date: '25 décembre', fixed: true }
                    ].map((holiday, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-800">{holiday.name}</div>
                          <div className="text-sm text-gray-600">{holiday.date}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            holiday.fixed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {holiday.fixed ? 'Fixe' : 'Variable'}
                          </span>
                          <input type="checkbox" defaultChecked className="rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'leave-entitlements':
        return (
          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-orange-800 mb-3">Gestion des Droits aux Congés</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-medium text-gray-800 mb-3">Contingents par Type</h4>
                  <div className="space-y-3">
                    {[
                      { type: 'Congés Payés', base: 25, bonus: '+1 (>10 ans)', color: 'blue' },
                      { type: 'RTT', base: 12, bonus: '', color: 'green' },
                      { type: 'Congés Ancienneté', base: 'Variable', bonus: 'Selon CCN66', color: 'purple' },
                      { type: 'Congés Exceptionnels', base: 'Variable', bonus: 'Selon motif', color: 'orange' }
                    ].map((item, index) => (
                      <div key={index} className={`p-3 bg-${item.color}-50 border border-${item.color}-200 rounded-lg`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-800">{item.type}</div>
                            <div className="text-sm text-gray-600">{item.bonus}</div>
                          </div>
                          <div className={`text-lg font-bold text-${item.color}-600`}>{item.base}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-medium text-gray-800 mb-3">Calcul Automatique</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-700 mb-2">Paramètres de calcul:</div>
                      <div className="space-y-2 text-xs text-gray-600">
                        <div>• Calcul en jours ouvrables uniquement</div>
                        <div>• Exclusion automatique des week-ends</div>
                        <div>• Prise en compte des jours fériés</div>
                        <div>• Application des règles CCN66</div>
                        <div>• Proratisation selon temps de travail</div>
                      </div>
                    </div>
                    <button 
                      onClick={recalculateAllRights}
                      disabled={isExporting}
                      className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isExporting ? 'Recalcul en cours...' : 'Recalculer Tous les Droits'}
                    </button>
                    {leaveCalculation && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-sm text-green-800">
                          <strong>✅ Recalcul terminé</strong>
                        </div>
                        <div className="text-xs text-green-700 mt-1">
                          {leaveCalculation.processed} employés traités • {leaveCalculation.errors} erreurs • {leaveCalculation.warnings} avertissements
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'ccn66-engine':
        return (
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-800 mb-3">Moteur de Règles CCN66</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-medium text-gray-800 mb-3">Règles Actives</h4>
                  <div className="space-y-2">
                    {[
                      { rule: 'Acquisition congés 2.5j/mois', status: 'active' },
                      { rule: 'Bonus ancienneté 10 ans', status: 'active' },
                      { rule: 'Fractionnement congés', status: 'active' },
                      { rule: 'Congés exceptionnels', status: 'active' },
                      { rule: 'Temps partiel prorata', status: 'active' }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{item.rule}</span>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Actif</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-medium text-gray-800 mb-3">Validation et Tests</h4>
                  <div className="space-y-3">
                    <button 
                      onClick={testCcn66Engine}
                      className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors duration-200"
                    >
                      Tester Règles CCN66
                    </button>
                    <button 
                      onClick={validateCcn66Engine}
                      disabled={!ccn66TestResult}
                      className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Valider Conformité
                    </button>
                    {ccn66TestResult ? (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm text-blue-800 mb-2">
                          <strong>Résultats des tests:</strong> {ccn66TestResult.passed}/{ccn66TestResult.testsRun} réussis
                        </div>
                        <div className="space-y-1 text-xs">
                          {ccn66TestResult.details.map((detail, index) => (
                            <div key={index}>{detail.test}: {detail.status}</div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-sm text-green-800">
                          <strong>Dernière validation:</strong> 15/01/2024<br />
                          <strong>Statut:</strong> Conforme CCN66 v2024
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'payroll-export':
        return (
          <div className="space-y-6">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-teal-800 mb-3">Export des Données de Paie</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-medium text-gray-800 mb-3">Paramètres d'Export</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700 w-24">Période:</label>
                      <select className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option>Janvier 2024</option>
                        <option>Décembre 2023</option>
                        <option>Novembre 2023</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700 w-24">Format:</label>
                      <select className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option>Excel (.xlsx)</option>
                        <option>CSV</option>
                        <option>PDF</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700 w-24">Inclure:</label>
                      <div className="flex-1 space-y-2">
                        <label className="flex items-center space-x-2">
                          <input type="checkbox" defaultChecked className="rounded" />
                          <span className="text-sm">Heures supplémentaires</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input type="checkbox" defaultChecked className="rounded" />
                          <span className="text-sm">Absences</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm">Détails par jour</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-medium text-gray-800 mb-3">Actions Rapides</h4>
                  <div className="space-y-3">
                    <button 
                      onClick={() => exportPayrollData('excel')}
                      disabled={isExporting}
                      className="w-full bg-teal-500 text-white py-2 px-4 rounded-lg hover:bg-teal-600 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isExporting ? 'Export en cours...' : 'Générer Export Complet'}
                    </button>
                    <button 
                      onClick={() => exportPayrollData('csv')}
                      disabled={isExporting}
                      className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isExporting ? 'Export en cours...' : 'Export Heures Sup Uniquement'}
                    </button>
                    <button 
                      onClick={() => exportPayrollData('xml')}
                      disabled={isExporting}
                      className="w-full bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isExporting ? 'Export en cours...' : 'Export Absences Uniquement'}
                    </button>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">
                        <strong>Dernier export:</strong> 12/01/2024<br />
                        <strong>Fichier:</strong> paie_jan2024.xlsx<br />
                        <strong>Taille:</strong> 2.4 MB
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Section non trouvée</div>;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Boîte à Outils RH</h1>
        <p className="text-gray-600">Outils et configurations avancés pour la gestion RH</p>
      </div>

      {/* Navigation Sections */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`group relative p-4 rounded-xl transition-all duration-200 ${
                  activeSection === section.id
                    ? `bg-gradient-to-br ${section.color} text-white shadow-lg transform -translate-y-1`
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 hover:shadow-md'
                }`}
              >
                <div className="text-center">
                  <div className={`text-2xl mb-2 transition-transform duration-200 ${
                    activeSection === section.id ? 'scale-110' : 'group-hover:scale-110'
                  }`}>
                    {section.icon}
                  </div>
                  <h3 className="font-semibold text-sm leading-tight mb-1">
                    {section.name}
                  </h3>
                  <p className={`text-xs opacity-80 ${
                    activeSection === section.id ? 'text-white' : 'text-gray-500'
                  }`}>
                    {section.description}
                  </p>
                </div>
                
                {/* Active indicator */}
                {activeSection === section.id && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full animate-pulse"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section Content */}
      <div className="min-h-[400px]">
        {renderSectionContent()}
      </div>
    </div>
  );
};

export default HRToolbox;