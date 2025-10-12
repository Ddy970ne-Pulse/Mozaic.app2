import React, { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';

const ExcelImport = ({ user, onChangeView }) => {
  const [importStep, setImportStep] = useState('upload'); // upload, preview, mapping, validation, import, complete
  const [file, setFile] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [dataType, setDataType] = useState('employees'); // employees, planning, hr, timedata
  const [columnMapping, setColumnMapping] = useState({});
  
  // Debug useEffect to track headers state
  useEffect(() => {
    console.log('🔍 Headers state changed:', headers);
    console.log('🔍 Headers length:', headers.length);
    console.log('🔍 Current import step:', importStep);
  }, [headers, importStep]);
  const [validationResults, setValidationResults] = useState({ valid: [], errors: [], warnings: [] });
  const [importResults, setImportResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);

  // Fonction pour convertir les dates Excel en format français DD/MM/YYYY
  const excelDateToJSDate = (excelDate) => {
    if (!excelDate) return null;
    
    // Si c'est déjà une chaîne de date au format français, la retourner
    if (typeof excelDate === 'string') {
      // Vérifier si c'est au format DD/MM/YYYY ou similaire
      if (excelDate.includes('/') || excelDate.includes('-')) {
        return excelDate;
      }
    }
    
    // Si c'est un nombre (format Excel)
    if (typeof excelDate === 'number') {
      // Excel stocke les dates comme nombre de jours depuis 1900-01-01
      const excelEpoch = new Date(1899, 11, 30); // 30 décembre 1899
      const date = new Date(excelEpoch.getTime() + excelDate * 86400000);
      
      // Retourner au format français DD/MM/YYYY
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
    
    return excelDate;
  };

  // Fonction pour convertir le format heure en nombre décimal
  const convertTimeToDecimal = (value) => {
    // Si c'est déjà un nombre, le retourner
    if (typeof value === 'number') {
      // Excel peut stocker les heures comme fraction de jour (ex: 0.208333 = 5 heures)
      if (value < 1) {
        const hours = value * 24;
        console.log(`⏰ Heure Excel décimale convertie: ${value} → ${hours.toFixed(2)}h`);
        return hours.toFixed(2);
      }
      return value.toString();
    }
    
    // Si c'est une chaîne au format "HH:MM" ou "H:MM"
    if (typeof value === 'string') {
      const timeMatch = value.match(/^(\d{1,2}):(\d{2})$/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const decimal = hours + (minutes / 60);
        console.log(`⏰ Heure convertie: ${value} → ${decimal.toFixed(2)}h`);
        return decimal.toFixed(2);
      }
      
      // Si c'est déjà un nombre sous forme de chaîne
      const numMatch = value.match(/^(\d+\.?\d*)$/);
      if (numMatch) {
        return parseFloat(value).toFixed(2);
      }
    }
    
    return value;
  };

  // Fonction pour détecter et convertir les valeurs
  const processExcelValue = (value, headerName) => {
    if (value === null || value === undefined) return '';
    
    // Liste des colonnes qui contiennent des dates (très complète)
    const dateKeywords = [
      'date', 'naissance', 'debut', 'fin', 'contrat',
      'Date', 'Naissance', 'Début', 'Fin', 'Contrat'
    ];
    
    // Liste des colonnes qui contiennent des heures
    const timeKeywords = [
      'heure', 'heures', 'travaillées', 'travaillees', 'travail',
      'Heure', 'Heures', 'Travaillées', 'Travaillees', 'Travail'
    ];
    
    // Vérifier si le nom de la colonne contient un mot-clé de date
    const headerLower = headerName.toLowerCase();
    const isDateColumn = dateKeywords.some(keyword => 
      headerLower.includes(keyword.toLowerCase())
    );
    
    // Vérifier si le nom de la colonne contient un mot-clé d'heure
    const isTimeColumn = timeKeywords.some(keyword => 
      headerLower.includes(keyword.toLowerCase())
    );
    
    // Si c'est une colonne d'heures, convertir en nombre décimal
    if (isTimeColumn) {
      return convertTimeToDecimal(value);
    }
    
    // Si c'est une colonne de date ET que la valeur est un nombre Excel
    if (isDateColumn && typeof value === 'number') {
      const formattedDate = excelDateToJSDate(value);
      console.log(`📅 Date convertie: ${headerName} = ${value} → ${formattedDate}`);
      return formattedDate;
    }
    
    // Si c'est une colonne de date mais déjà une chaîne, normaliser le format
    if (isDateColumn && typeof value === 'string' && value.trim()) {
      // Si format ISO (YYYY-MM-DD), convertir en français (DD/MM/YYYY)
      const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        const formatted = `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
        console.log(`📅 Date ISO convertie: ${value} → ${formatted}`);
        return formatted;
      }
      
      // Si format américain (MM/DD/YYYY), convertir en français (DD/MM/YYYY)
      const usMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (usMatch && parseInt(usMatch[1]) > 12) { // Probablement déjà DD/MM/YYYY
        return value.trim();
      }
      
      return value.trim();
    }
    
    return String(value).trim();
  };

  // Modèles de données pour différents types d'import basés sur l'analyse du fichier Excel
  const dataModels = {
    employees: {
      name: 'Données Employés (16 colonnes)',
      icon: '👥',
      color: 'from-blue-500 to-blue-600',
      requiredFields: ['nom', 'prenom'],
      optionalFields: ['email', 'date_naissance', 'sexe', 'categorie_employe', 'metier', 'fonction', 'departement', 'site', 'temps_travail', 'contrat', 'date_debut_contrat', 'date_fin_contrat', 'notes', 'membre_cse'],
      validationRules: {
        date_naissance: 'date',
        date_debut_contrat: 'date',
        date_fin_contrat: 'date'
      }
    },
    planning: {
      name: 'Données Absences (6 colonnes)',
      icon: '📅',
      color: 'from-green-500 to-green-600',
      requiredFields: ['nom', 'prenom', 'motif_absence'],
      optionalFields: ['date_debut', 'jours_absence', 'notes'],
      validationRules: {
        date_debut: 'date',
        jours_absence: 'number'
      }
    },
    timedata: {
      name: 'Données Heures Travaillées (5 colonnes)',
      icon: '⏰',
      color: 'from-orange-500 to-orange-600',
      requiredFields: ['nom', 'prenom', 'date', 'heures_travaillees'],
      optionalFields: ['motif'],
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

    // ⚠️ Vérifier que le type de données est sélectionné
    if (!dataType) {
      alert('⚠️ Veuillez d\'abord sélectionner le type de données à importer (Employés, Absences ou Heures Travaillées)');
      event.target.value = ''; // Reset input
      return;
    }

    if (!uploadedFile.name.match(/\.(xlsx|xls)$/)) {
      alert('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)');
      return;
    }
    
    console.log('📁 Fichier sélectionné:', uploadedFile.name, 'pour type:', dataType);

    setFile(uploadedFile);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        console.log('📊 Workbook sheets:', workbook.SheetNames);
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        console.log('📋 Raw JSON data length:', jsonData.length);
        console.log('📋 First few rows:', jsonData.slice(0, 3));

        if (jsonData.length === 0) {
          throw new Error('Le fichier Excel est vide');
        }

        const [headerRow, ...dataRows] = jsonData;
        
        // Better header cleaning and validation
        const rawHeaders = headerRow.filter(h => h !== null && h !== undefined && String(h).trim() !== '');
        const cleanHeaders = rawHeaders.map(h => {
          // Keep original header but clean it
          const cleaned = String(h).trim();
          return cleaned;
        });
        
        console.log('📝 Raw headers:', rawHeaders);
        console.log('📝 Clean headers:', cleanHeaders);

        if (cleanHeaders.length === 0) {
          throw new Error('Aucune en-tête valide trouvée dans le fichier Excel');
        }

        // FIX: Filtrer selon le type de données sélectionné
        console.log('🔍 Total dataRows avant filtre:', dataRows.length);
        console.log('📊 Type de données sélectionné:', dataType);
        
        const cleanData = dataRows
          .map((row, rowIndex) => {
            const obj = {};
            cleanHeaders.forEach((header, index) => {
              obj[header] = row[index] !== undefined ? processExcelValue(row[index], header) : '';
            });
            return obj;
          })
          .filter((obj, index) => {
            // Filtrage adaptatif selon le type de données
            let keep = false;
            
            if (dataType === 'employees') {
              // Pour employés: doit avoir NOM ou PRENOM
              const hasNom = obj['NOM'] && String(obj['NOM']).trim() !== '';
              const hasPrenom = obj['PRENOM'] && String(obj['PRENOM']).trim() !== '';
              keep = hasNom || hasPrenom;
            } else if (dataType === 'planning') {
              // Pour absences: doit avoir NOM ou Date Début
              const hasNom = obj['NOM'] && String(obj['NOM']).trim() !== '';
              const hasDate = obj['Date Début'] && String(obj['Date Début']).trim() !== '';
              keep = hasNom || hasDate;
            } else if (dataType === 'timedata') {
              // Pour heures travaillées: doit avoir employee_name ou Date ou Heures
              // Recherche flexible avec différentes variantes de colonnes
              const hasEmploye = Object.keys(obj).some(key => {
                const keyLower = key.toLowerCase();
                return (keyLower.includes('employ') || keyLower.includes('nom') || keyLower.includes('prenom')) 
                  && obj[key] && String(obj[key]).trim() !== '';
              });
              const hasDate = Object.keys(obj).some(key => {
                const keyLower = key.toLowerCase();
                return keyLower.includes('date') && obj[key] && String(obj[key]).trim() !== '';
              });
              const hasHeures = Object.keys(obj).some(key => {
                const keyLower = key.toLowerCase();
                return (keyLower.includes('heure') || keyLower.includes('travail')) 
                  && obj[key] && String(obj[key]).trim() !== '';
              });
              keep = hasEmploye || hasDate || hasHeures;
              
              if (!keep) {
                console.log(`⚠️ Ligne ${index + 1} [Heures Travaillées] ignorée (vide ou incomplète):`, obj);
              }
            } else {
              // Par défaut: garder toutes les lignes non-vides
              keep = Object.values(obj).some(val => val && String(val).trim() !== '');
            }
            
            if (!keep && dataType !== 'timedata') {
              console.log(`⚠️ Ligne ${index + 1} ignorée (vide ou incomplète):`, obj);
            }
            
            return keep;
          })
          .slice(0, 1000); // Limit to 1000 rows for performance

        console.log('✅ Final headers count:', cleanHeaders.length);
        console.log('✅ Final data count:', cleanData.length);
        console.log('✅ Sample data (first 2):', cleanData.slice(0, 2));
        console.log('✅ Sample data (last 2):', cleanData.slice(-2));
        console.log('🎯 OBJECTIF: Toutes les lignes avec NOM ou PRENOM doivent être importées');

        // Store in state with validation
        if (cleanHeaders.length === 0) {
          throw new Error('Aucune colonne valide détectée dans le fichier Excel');
        }
        
        if (cleanData.length === 0) {
          throw new Error('Aucune donnée trouvée dans le fichier Excel');
        }
        
        console.log('💾 Storing headers:', cleanHeaders);
        console.log('💾 Storing data:', cleanData.length, 'rows');
        
        setHeaders([...cleanHeaders]); // Force new array
        setExcelData([...cleanData]); // Force new array
        setImportStep('preview');
      } catch (error) {
        console.error('❌ Erreur lors de la lecture du fichier:', error);
        alert('Erreur lors de la lecture du fichier Excel: ' + error.message);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  }, [dataType]); // Dépendance sur dataType pour filtrage adaptatif

  // Configuration du mapping des colonnes
  const handleColumnMapping = (excelColumn, modelField) => {
    console.log('🔗 Mapping column:', excelColumn, '→', modelField);
    setColumnMapping(prev => {
      const newMapping = {
        ...prev,
        [modelField]: excelColumn
      };
      console.log('🗺️ Updated mapping:', newMapping);
      return newMapping;
    });
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
            warnings: rowWarnings.map(warn => warn.warning || warn.message),
            data: row  // Ajouter les données complètes pour l'affichage
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
      console.log('🚀 Début de l\'import');
      console.log('📋 Column Mapping:', columnMapping);
      console.log('✅ Valid rows count:', validationResults.valid.length);
      console.log('📝 Première ligne valide:', validationResults.valid[0]);
      console.log('🔑 Clés de la première ligne:', Object.keys(validationResults.valid[0] || {}));
      
      // Préparer les données pour l'API
      // IMPORTANT: Utiliser excelData (données brutes) au lieu de validationResults.valid
      const mappedData = excelData.map((row, idx) => {
        const mappedRow = {};
        
        console.log(`🔄 Mapping ligne ${idx + 1}:`, {
          rowKeys: Object.keys(row),
          columnMapping: columnMapping
        });
        
        Object.entries(columnMapping).forEach(([field, column]) => {
          const value = row[column];
          console.log(`   🔍 Field: ${field}, Column: ${column}, Value: ${value}`);
          if (column && value !== undefined && value !== null && value !== '') {
            mappedRow[field] = value;
          }
        });
        
        console.log(`   ✅ Résultat ligne ${idx + 1}:`, mappedRow);
        
        // Pour les absences et work_hours, mapper les noms d'employés
        if (dataType === 'absences' || dataType === 'work_hours') {
          if (row.employé || row.employee_name) {
            mappedRow.employee_name = row.employé || row.employee_name;
          }
        }
        
        return mappedRow;
      }).filter(row => {
        // Ne garder que les lignes qui ont au moins nom ET prenom (email optionnel)
        const hasNom = row.nom && String(row.nom).trim() !== '';
        const hasPrenom = row.prenom && String(row.prenom).trim() !== '';
        
        if (!hasNom || !hasPrenom) {
          console.log('⚠️ Ligne ignorée dans mapping (manque nom ou prenom):', row);
        }
        
        return hasNom && hasPrenom;
      });
      
      console.log('📊 Mapped data count:', mappedData.length);
      console.log('📝 Première ligne mappée:', mappedData[0]);
      console.log('📝 Dernière ligne mappée:', mappedData[mappedData.length - 1]);
      console.log('🎯 ENVOI AU BACKEND: ' + mappedData.length + ' lignes');

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
        total: result.total_processed,
        created_users: result.created_users || [],
        message: result.message
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
    // Double confirmation avec message d'avertissement fort
    if (!window.confirm('⚠️ ATTENTION : Cette action va SUPPRIMER DÉFINITIVEMENT toutes les données !\n\n' +
                        '❌ Absences importées\n' +
                        '❌ Heures de travail\n' +
                        '❌ Employés importés\n' +
                        '❌ Tous les utilisateurs sauf vous\n\n' +
                        'Êtes-vous ABSOLUMENT SÛR de vouloir continuer ?')) {
      return;
    }
    
    // Deuxième confirmation
    const confirmText = prompt('Pour confirmer, tapez "SUPPRIMER TOUT" en majuscules:');
    if (confirmText !== 'SUPPRIMER TOUT') {
      alert('❌ Annulation - La phrase de confirmation ne correspond pas');
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
          
          <div className="flex items-center space-x-3">
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
                onClick={() => {
                  console.log('🔄 Moving to mapping step');
                  console.log('📝 Headers available:', headers);
                  console.log('📊 Data type:', dataType);
                  console.log('🎯 Model fields:', dataModels[dataType]);
                  setImportStep('mapping');
                }}
                disabled={headers.length === 0}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuer ({headers.length} colonnes détectées)
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
                    {headers.map((header, colIndex) => {
                      let displayValue = row[header] || '';
                      
                      // Formater les dates si nécessaire
                      if (typeof displayValue === 'number' && (
                        header.toLowerCase().includes('date') || 
                        header.toLowerCase().includes('naissance') ||
                        header.toLowerCase().includes('debut') ||
                        header.toLowerCase().includes('fin')
                      )) {
                        displayValue = excelDateToJSDate(displayValue);
                      }
                      
                      const displayStr = String(displayValue);
                      return (
                        <td key={colIndex} className="px-4 py-3 text-sm text-gray-900">
                          {displayStr.substring(0, 50)}
                          {displayStr.length > 50 && '...'}
                        </td>
                      );
                    })}
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
      {importStep === 'mapping' && headers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Correspondance des colonnes</h2>
              <p className="text-gray-600 mt-2">
                Associez les colonnes de votre fichier aux champs du modèle {dataModels[dataType].name}
              </p>
              {/* Debug info */}
              <div className="mt-2 text-xs text-gray-500">
                Debug: {headers.length} colonnes détectées: {headers.join(', ')}
              </div>
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

      {/* Fallback si les headers sont perdus */}
      {importStep === 'mapping' && headers.length === 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-6 text-center">
          <div className="text-red-600 mb-4">
            <div className="text-4xl mb-2">⚠️</div>
            <h3 className="text-lg font-semibold">Données perdues</h3>
            <p className="text-sm">Les colonnes du fichier Excel ont été perdues. Veuillez recommencer l'import.</p>
          </div>
          <button
            onClick={() => {
              setImportStep('upload');
              setHeaders([]);
              setExcelData([]);
              setColumnMapping({});
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Recommencer
          </button>
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
            <div className="bg-yellow-50 rounded-xl shadow-lg border-2 border-yellow-400 p-6 mt-6">
              <div className="flex items-center mb-6 bg-yellow-100 p-4 rounded-lg">
                <div className="flex-shrink-0">
                  <span className="text-5xl">⚠️</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-yellow-800">
                    {validationResults.warnings.length} Avertissement{validationResults.warnings.length > 1 ? 's' : ''} à Corriger
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Corrigez ces problèmes dans votre fichier Excel avant de réimporter
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                {validationResults.warnings.map((row, index) => (
                  <div key={index} className="bg-white rounded-lg border-2 border-yellow-300 p-5 shadow-sm">
                    {/* En-tête avec numéro de ligne */}
                    <div className="flex items-start mb-3 pb-3 border-b border-yellow-200">
                      <div className="flex-shrink-0 bg-yellow-400 text-white font-bold px-3 py-1 rounded text-sm">
                        Ligne {row.rowIndex} dans Excel
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="text-lg font-bold text-gray-800">
                          {row.data?.prenom || row.prenom || '?'} {row.data?.nom || row.nom || '?'}
                        </div>
                        {(row.data?.email || row.email) && (
                          <div className="text-sm text-gray-600">
                            📧 {row.data?.email || row.email}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Problèmes détectés */}
                    <div className="mb-3">
                      <div className="font-semibold text-yellow-800 mb-2">🔍 Problème(s) détecté(s):</div>
                      <ul className="space-y-2">
                        {row.warnings.map((warning, i) => (
                          <li key={i} className="flex items-start bg-yellow-50 p-3 rounded">
                            <span className="text-yellow-600 mr-2">•</span>
                            <span className="text-gray-800 font-medium flex-1">{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Données complètes pour référence */}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 font-medium">
                        📋 Voir toutes les données de cette ligne
                      </summary>
                      <div className="mt-2 bg-gray-50 p-3 rounded text-xs">
                        <table className="w-full">
                          <tbody>
                            {Object.entries(row.data || row).filter(([key]) => 
                              !['warnings', 'rowIndex'].includes(key)
                            ).map(([key, value]) => (
                              <tr key={key} className="border-b border-gray-200">
                                <td className="py-1 pr-3 font-semibold text-gray-700">{key}:</td>
                                <td className="py-1 text-gray-900">{String(value || '(vide)')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>

                    {/* Suggestion de correction */}
                    <div className="mt-3 bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r">
                      <div className="text-sm font-semibold text-blue-800 mb-1">💡 Comment corriger:</div>
                      <div className="text-sm text-blue-700">
                        1. Ouvrez votre fichier Excel<br/>
                        2. Allez à la <strong>ligne {row.rowIndex}</strong> (ligne avec {row.data?.prenom || row.prenom} {row.data?.nom || row.nom})<br/>
                        3. Corrigez les problèmes indiqués ci-dessus<br/>
                        4. Enregistrez et réimportez le fichier
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {validationResults.warnings.length > 5 && (
                <div className="mt-6 text-center p-4 bg-yellow-100 rounded-lg">
                  <p className="text-yellow-800 font-semibold">
                    📊 Total: {validationResults.warnings.length} avertissement{validationResults.warnings.length > 1 ? 's' : ''} à traiter
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Prenez le temps de corriger chaque problème pour un import parfait
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Étape 5: Terminé */}
      {importStep === 'complete' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center">
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
          </div>

          {/* Temporary Passwords Section */}
          {importResults && importResults.created_users && importResults.created_users.length > 0 && (
            <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Mots de passe temporaires générés
              </h3>
              <p className="text-sm text-blue-700 mb-4">
                Les employés suivants ont été créés avec des mots de passe temporaires. Ils devront changer leur mot de passe lors de leur première connexion.
              </p>
              <div className="bg-white rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mot de passe temporaire</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {importResults.created_users.map((user, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <code className="px-3 py-1 bg-gray-100 text-red-600 rounded font-mono text-sm border border-gray-300">
                            {user.temporary_password}
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Important :</strong> Notez ces mots de passe dans un endroit sûr ou transmettez-les directement aux employés concernés. 
                  Ces mots de passe ne seront plus affichés après cette session.
                </p>
              </div>
            </div>
          )}

          {/* Detailed Warnings Section */}
          {validationResults && validationResults.warnings && validationResults.warnings.length > 0 && (
            <div className="mt-8 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="text-xl font-bold text-yellow-900 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Avertissements détaillés ({validationResults.warnings.length})
              </h3>
              <div className="space-y-3">
                {validationResults.warnings.map((warning, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-yellow-300 shadow-sm">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-yellow-100 text-yellow-800 font-bold text-sm">
                          {warning.row || index + 1}
                        </span>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">{warning.message}</p>
                        {warning.field && (
                          <p className="text-xs text-gray-600 mt-1">Champ concerné : <code className="bg-gray-100 px-2 py-0.5 rounded">{warning.field}</code></p>
                        )}
                        {warning.details && (
                          <p className="text-xs text-gray-600 mt-1">{warning.details}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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