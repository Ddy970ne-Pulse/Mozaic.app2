import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

const ExcelImport = ({ user, onChangeView }) => {
  const [importStep, setImportStep] = useState('upload'); // upload, preview, mapping, validation, import, complete
  const [file, setFile] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [dataType, setDataType] = useState('employees'); // employees, planning, hr, timedata
  const [columnMapping, setColumnMapping] = useState({});
  const [validationResults, setValidationResults] = useState({ valid: [], errors: [], warnings: [] });
  const [importResults, setImportResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modèles de données pour différents types d'import basés sur l'analyse du fichier Excel
  const dataModels = {
    employees: {
      name: 'Données Employés (13 colonnes)',
      icon: '👥',
      color: 'from-blue-500 to-blue-600',
      requiredFields: ['nom', 'prenom', 'email', 'departement'],
      optionalFields: ['date_naissance', 'sexe', 'categorie_employe', 'metier', 'fonction', 'site', 'temps_travail', 'contrat', 'date_debut_contrat', 'date_fin_contrat', 'notes'],
      validationRules: {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        date_naissance: 'date',
        date_debut_contrat: 'date',
        date_fin_contrat: 'date'
      }
    },
    planning: {
      name: 'Données Absences (5 colonnes)',
      icon: '📅',
      color: 'from-green-500 to-green-600',
      requiredFields: ['employee_name', 'date_debut', 'jours_absence', 'motif_absence'],
      optionalFields: [],
      validationRules: {
        date_debut: 'date',
        jours_absence: 'number'
      }
    },
    timedata: {
      name: 'Données Heures Travaillées (4 colonnes)',
      icon: '⏰',
      color: 'from-orange-500 to-orange-600',
      requiredFields: ['employee_name', 'date', 'heures_travaillees'],
      optionalFields: ['notes'],
      validationRules: {
        date: 'date',
        heures_travaillees: 'number'
      }
    },
    settings: {
      name: 'Paramètres & Configuration',
      icon: '⚙️',
      color: 'from-purple-500 to-purple-600',
      requiredFields: ['setting_name', 'setting_value'],
      optionalFields: ['category', 'description'],
      validationRules: {}
    }
  };

  // Gestionnaire d'upload de fichier
  const handleFileUpload = useCallback((event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.match(/\.(xlsx|xls)$/)) {
      alert('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)');
      return;
    }

    setFile(uploadedFile);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (jsonData.length === 0) {
          throw new Error('Le fichier Excel est vide');
        }

        const [headerRow, ...dataRows] = jsonData;
        const cleanHeaders = headerRow.map(h => String(h).toLowerCase().trim());
        const cleanData = dataRows
          .filter(row => row.some(cell => cell !== ''))
          .map(row => {
            const obj = {};
            cleanHeaders.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });

        setHeaders(cleanHeaders);
        setExcelData(cleanData);
        setImportStep('preview');
      } catch (error) {
        console.error('Erreur lors de la lecture du fichier:', error);
        alert('Erreur lors de la lecture du fichier Excel: ' + error.message);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  }, []);

  // Configuration du mapping des colonnes
  const handleColumnMapping = (excelColumn, modelField) => {
    setColumnMapping(prev => ({
      ...prev,
      [modelField]: excelColumn
    }));
  };

  // Validation des données via API
  const validateData = async () => {
    setIsProcessing(true);
    
    try {
      // Préparer les données pour l'API
      const mappedData = excelData.map(row => {
        const mappedRow = {};
        Object.entries(columnMapping).forEach(([field, column]) => {
          if (column && row[column] !== undefined) {
            mappedRow[field] = row[column];
          }
        });
        return mappedRow;
      });

      // Appel API pour validation
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/import/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          data_type: dataType,
          data: mappedData
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur de validation: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Convertir les résultats de l'API au format attendu par l'UI
      const validRows = [];
      const errorRows = [];
      const warningRows = [];

      // Créer les lignes valides (celles sans erreurs)
      mappedData.forEach((row, index) => {
        const rowErrors = result.errors.filter(err => err.row === index + 1);
        const rowWarnings = result.warnings.filter(warn => warn.row === index + 1);
        
        const rowData = { ...row, rowIndex: index + 1 };
        
        if (rowErrors.length > 0) {
          errorRows.push({ 
            ...rowData, 
            errors: rowErrors.map(err => err.error || err.message)
          });
        } else if (rowWarnings.length > 0) {
          warningRows.push({ 
            ...rowData, 
            warnings: rowWarnings.map(warn => warn.warning || warn.message)
          });
          validRows.push(rowData);
        } else {
          validRows.push(rowData);
        }
      });

      setValidationResults({ valid: validRows, errors: errorRows, warnings: warningRows });
      setImportStep('validation');
      
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      alert('Erreur lors de la validation: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Import final des données
  const executeImport = async () => {
    setIsProcessing(true);
    
    try {
      // Préparer les données pour l'API
      const mappedData = validationResults.valid.map(row => {
        const mappedRow = {};
        Object.entries(columnMapping).forEach(([field, column]) => {
          if (column && row[column] !== undefined) {
            mappedRow[field] = row[column];
          }
        });
        
        // Pour les absences et work_hours, mapper les noms d'employés
        if (dataType === 'absences' || dataType === 'work_hours') {
          if (row.employé || row.employee_name) {
            mappedRow.employee_name = row.employé || row.employee_name;
          }
        }
        
        return mappedRow;
      });

      // Déterminer l'endpoint selon le type de données
      let endpoint = '';
      switch(dataType) {
        case 'employees':
          endpoint = '/api/import/employees';
          break;
        case 'planning':
          endpoint = '/api/import/absences';
          break;
        case 'timedata':
          endpoint = '/api/import/work-hours';
          break;
        default:
          endpoint = '/api/import/employees';
      }

      // Appel API pour import
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          data_type: dataType,
          data: mappedData,
          overwrite_existing: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erreur d'import: ${errorData.detail || response.statusText}`);
      }

      const result = await response.json();
      
      setImportResults({
        success: result.successful_imports,
        warnings: result.warnings?.length || 0,
        errors: result.failed_imports,
        total: result.total_processed
      });
      
      setImportStep('complete');
      
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      alert('Erreur lors de l\'import: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Réinitialiser l'import
  const resetImport = () => {
    setImportStep('upload');
    setFile(null);
    setExcelData([]);
    setHeaders([]);
    setColumnMapping({});
    setValidationResults({ valid: [], errors: [], warnings: [] });
    setImportResults(null);
  };

  // Réinitialiser les comptes de démo et créer l'admin DACALOR Diégo
  const resetDemoAccounts = async () => {
    if (!window.confirm('Cette action va supprimer tous les comptes de test et créer un nouveau compte admin pour DACALOR Diégo. Êtes-vous sûr ?')) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/import/reset-demo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erreur: ${errorData.detail || response.statusText}`);
      }

      const result = await response.json();
      
      alert(`✅ Comptes réinitialisés avec succès!\n\n` +
            `Nouvel administrateur créé:\n` +
            `Nom: ${result.new_admin.name}\n` +
            `Email: ${result.new_admin.email}\n` +
            `Mot de passe: ${result.new_admin.password}\n\n` +
            `Veuillez vous reconnecter avec ces identifiants.`);
      
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      alert('Erreur lors de la réinitialisation: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <span>📊</span>
              <span>Import Excel en Masse</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Importez vos données depuis un fichier Excel avec validation et prévisualisation
            </p>
          </div>
          
          {importStep !== 'upload' && (
            <button
              onClick={resetImport}
              className="p-3 rounded-xl bg-gradient-to-br from-gray-500 to-slate-600 text-white hover:from-gray-600 hover:to-slate-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 shadow-lg transition-all duration-200"
              title="Nouvel import"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Indicateur d'étapes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          {['upload', 'preview', 'mapping', 'validation', 'complete'].map((step, index) => {
            const stepNames = {
              upload: 'Upload',
              preview: 'Aperçu', 
              mapping: 'Mapping',
              validation: 'Validation',
              complete: 'Terminé'
            };
            
            const isActive = importStep === step;
            const isCompleted = ['upload', 'preview', 'mapping', 'validation'].indexOf(importStep) > index;
            
            return (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : isCompleted
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-500'
                }`}>
                  {isCompleted ? '✓' : index + 1}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {stepNames[step]}
                </span>
                {index < 4 && (
                  <div className={`w-12 h-0.5 mx-4 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Étape 1: Upload */}
      {importStep === 'upload' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Sélectionnez votre fichier Excel</h2>
            <p className="text-gray-600 mb-8">Formats supportés: .xlsx, .xls (jusqu'à 50MB)</p>

            {/* Sélection du type de données */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Type de données à importer</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(dataModels).map(([key, model]) => (
                  <button
                    key={key}
                    onClick={() => setDataType(key)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      dataType === key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-12 h-12 mx-auto mb-3 rounded-lg bg-gradient-to-br ${model.color} flex items-center justify-center text-white text-xl`}>
                      {model.icon}
                    </div>
                    <h4 className="font-semibold text-gray-800">{model.name}</h4>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-gray-400 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload"
                disabled={isProcessing}
              />
              <label 
                htmlFor="excel-upload" 
                className="cursor-pointer flex flex-col items-center"
              >
                <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-lg font-semibold text-gray-700">
                  {isProcessing ? 'Traitement en cours...' : 'Cliquez pour sélectionner ou glissez votre fichier ici'}
                </span>
                <span className="text-sm text-gray-500 mt-2">Maximum 50MB</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Étape 2: Aperçu */}
      {importStep === 'preview' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Aperçu des données</h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                📄 {file?.name} • {excelData.length} lignes
              </span>
              <button
                onClick={() => setImportStep('mapping')}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 shadow-lg transition-all duration-200"
              >
                Continuer
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ligne
                  </th>
                  {headers.map((header, index) => (
                    <th key={index} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {excelData.slice(0, 5).map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {index + 2}
                    </td>
                    {headers.map((header, colIndex) => (
                      <td key={colIndex} className="px-4 py-3 text-sm text-gray-900">
                        {String(row[header] || '').substring(0, 50)}
                        {String(row[header] || '').length > 50 && '...'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {excelData.length > 5 && (
            <div className="mt-4 text-center text-sm text-gray-500">
              ... et {excelData.length - 5} lignes supplémentaires
            </div>
          )}
        </div>
      )}

      {/* Étape 3: Mapping des colonnes */}
      {importStep === 'mapping' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Correspondance des colonnes</h2>
              <p className="text-gray-600 mt-2">
                Associez les colonnes de votre fichier aux champs du modèle {dataModels[dataType].name}
              </p>
            </div>
            <button
              onClick={validateData}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 shadow-lg transition-all duration-200"
              disabled={Object.keys(columnMapping).length === 0}
            >
              Valider les données
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Champs requis */}
            <div>
              <h3 className="text-lg font-semibold text-red-600 mb-4">🔴 Champs requis</h3>
              <div className="space-y-3">
                {dataModels[dataType].requiredFields.map(field => (
                  <div key={field} className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                    <span className="font-medium text-gray-800 capitalize">
                      {field.replace('_', ' ')}
                    </span>
                    <select
                      value={columnMapping[field] || ''}
                      onChange={(e) => handleColumnMapping(e.target.value, field)}
                      className="ml-4 px-3 py-1 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner...</option>
                      {headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Champs optionnels */}
            <div>
              <h3 className="text-lg font-semibold text-blue-600 mb-4">🔵 Champs optionnels</h3>
              <div className="space-y-3">
                {dataModels[dataType].optionalFields.map(field => (
                  <div key={field} className="flex items-center justify-between p-3 border border-blue-200 rounded-lg bg-blue-50">
                    <span className="font-medium text-gray-800 capitalize">
                      {field.replace('_', ' ')}
                    </span>
                    <select
                      value={columnMapping[field] || ''}
                      onChange={(e) => handleColumnMapping(e.target.value, field)}
                      className="ml-4 px-3 py-1 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Ignorer</option>
                      {headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Étape 4: Validation */}
      {importStep === 'validation' && (
        <div className="space-y-6">
          {/* Résumé de validation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Résultats de validation</h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setImportStep('mapping')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Retour
                </button>
                {validationResults.errors.length === 0 && (
                  <button
                    onClick={executeImport}
                    className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 shadow-lg transition-all duration-200"
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Import en cours...' : 'Lancer l\'import'}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-3xl font-bold text-green-600">{validationResults.valid.length}</div>
                <div className="text-sm text-green-700">Lignes valides</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="text-3xl font-bold text-yellow-600">{validationResults.warnings.length}</div>
                <div className="text-sm text-yellow-700">Avertissements</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="text-3xl font-bold text-red-600">{validationResults.errors.length}</div>
                <div className="text-sm text-red-700">Erreurs</div>
              </div>
            </div>
          </div>

          {/* Détail des erreurs */}
          {validationResults.errors.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
              <h3 className="text-lg font-semibold text-red-600 mb-4">❌ Erreurs à corriger</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-red-200">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-red-500 uppercase">Ligne</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-red-500 uppercase">Erreurs</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-red-500 uppercase">Données</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-200">
                    {validationResults.errors.slice(0, 10).map((row, index) => (
                      <tr key={index} className="hover:bg-red-50">
                        <td className="px-4 py-3 text-sm font-medium text-red-900">{row.rowIndex}</td>
                        <td className="px-4 py-3 text-sm text-red-700">
                          <ul className="list-disc list-inside">
                            {row.errors.map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {Object.entries(row).filter(([key]) => key !== 'errors' && key !== 'rowIndex').slice(0, 3).map(([key, value]) => (
                            <span key={key} className="inline-block mr-2">
                              <strong>{key}:</strong> {String(value).substring(0, 20)}...
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {validationResults.errors.length > 10 && (
                <div className="mt-4 text-center text-sm text-red-600">
                  ... et {validationResults.errors.length - 10} erreurs supplémentaires
                </div>
              )}
            </div>
          )}

          {/* Détail des avertissements */}
          {validationResults.warnings.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-6">
              <h3 className="text-lg font-semibold text-yellow-600 mb-4">⚠️ Avertissements</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-yellow-200">
                  <thead className="bg-yellow-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-yellow-500 uppercase">Ligne</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-yellow-500 uppercase">Avertissements</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-yellow-200">
                    {validationResults.warnings.slice(0, 5).map((row, index) => (
                      <tr key={index} className="hover:bg-yellow-50">
                        <td className="px-4 py-3 text-sm font-medium text-yellow-900">{row.rowIndex}</td>
                        <td className="px-4 py-3 text-sm text-yellow-700">
                          <ul className="list-disc list-inside">
                            {row.warnings.map((warning, i) => (
                              <li key={i}>{warning}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Étape 5: Terminé */}
      {importStep === 'complete' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Import terminé avec succès !</h2>
          
          {importResults && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-3xl font-bold text-green-600">{importResults.success}</div>
                <div className="text-sm text-green-700">Lignes importées</div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="text-3xl font-bold text-yellow-600">{importResults.warnings}</div>
                <div className="text-sm text-yellow-700">Avertissements</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-3xl font-bold text-blue-600">{importResults.total}</div>
                <div className="text-sm text-blue-700">Total traité</div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center space-x-4 mt-8">
            <button
              onClick={resetImport}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 shadow-lg transition-all duration-200"
            >
              Nouvel import
            </button>
            <button
              onClick={() => onChangeView && onChangeView('dashboard')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Retour au tableau de bord
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelImport;