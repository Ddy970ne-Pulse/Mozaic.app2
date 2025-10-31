/**
 * GUIDE D'INTÉGRATION - Phase 3 Frontend
 * ========================================
 * 
 * Instructions pour intégrer les widgets de soldes de congés 
 * dans votre composant AbsenceRequests.jsx existant
 */

// ============================================================================
// ÉTAPE 1 : IMPORTS
// ============================================================================

// En haut de AbsenceRequests.jsx, ajouter ces imports :

import LeaveBalanceWidget from './LeaveBalanceWidget';
import LeaveTransactionHistory from './LeaveTransactionHistory';
import { AlertTriangle } from 'lucide-react'; // Pour les alertes


// ============================================================================
// ÉTAPE 2 : STATE POUR LA VALIDATION DES SOLDES
// ============================================================================

// Dans la section des states (après const [newRequest, setNewRequest] = useState(...))
// Ajouter :

const [employeeBalances, setEmployeeBalances] = useState(null);
const [validationError, setValidationError] = useState(null);


// ============================================================================
// ÉTAPE 3 : FONCTION DE VÉRIFICATION DU SOLDE
// ============================================================================

// Ajouter cette fonction avant handleSubmitRequest :

/**
 * Vérifie si l'employé a assez de jours disponibles pour le type de congé demandé
 */
const checkLeaveBalance = async (leaveType, requestedDays, employeeId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `${process.env.REACT_APP_BACKEND_URL}/api/leave-balance/${employeeId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      setEmployeeBalances(data);
      
      // Normaliser le type (CP → CA)
      const normalizedType = normalizeAbsenceType(leaveType);
      const availableBalance = data.balances[normalizedType] || 0;
      
      // Vérifier si le solde est suffisant
      if (requestedDays > availableBalance) {
        setValidationError({
          type: normalizedType,
          available: availableBalance,
          requested: requestedDays,
          message: `Solde insuffisant : vous avez ${availableBalance} jour(s) de ${normalizedType} disponible(s), mais vous demandez ${requestedDays} jour(s)`
        });
        return false;
      }
      
      setValidationError(null);
      return true;
    }
    
    // Si pas de solde trouvé (404), on autorise quand même (pas encore initialisé)
    if (response.status === 404) {
      console.warn('⚠️ Solde non trouvé pour cet employé, autorisation par défaut');
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur vérification solde:', error);
    // En cas d'erreur, on autorise (ne pas bloquer l'utilisateur)
    return true;
  }
};


// ============================================================================
// ÉTAPE 4 : MODIFIER handleSubmitRequest
// ============================================================================

// Remplacer la fonction handleSubmitRequest existante par :

const handleSubmitRequest = async (e) => {
  e.preventDefault();
  
  // Calculer la durée
  const start = new Date(newRequest.startDate);
  const end = new Date(newRequest.endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  // Pour les types décomptés (CA, RTT, etc.), vérifier le solde
  const deductedTypes = ['CA', 'CP', 'CT', 'RTT', 'REC', 'CEX'];
  const normalizedType = normalizeAbsenceType(newRequest.type);
  
  if (deductedTypes.includes(normalizedType)) {
    const requestedDays = newRequest.absence_unit === 'heures' 
      ? parseFloat(newRequest.hours_amount) / 7 
      : diffDays;
    
    // 🆕 VÉRIFICATION DU SOLDE
    const hasEnoughBalance = await checkLeaveBalance(
      normalizedType,
      requestedDays,
      newRequest.employee_id || user.id
    );
    
    if (!hasEnoughBalance) {
      // Afficher l'erreur de validation (le message est déjà dans validationError)
      return; // Arrêter la soumission
    }
  }
  
  try {
    const token = localStorage.getItem('token');
    
    // Préparer les données pour l'API
    const absenceData = {
      employee_id: newRequest.employee_id || user.id,
      employee_name: newRequest.employee_name || user.name,
      email: user.email,
      motif_absence: newRequest.type,
      date_debut: newRequest.startDate,
      date_fin: newRequest.endDate,
      jours_absence: newRequest.absence_unit === 'heures' ? 
        (parseFloat(newRequest.hours_amount) / 7).toFixed(2) : 
        diffDays.toString(),
      notes: newRequest.reason,
      status: 'pending',
      absence_unit: newRequest.absence_unit,
      hours_amount: newRequest.absence_unit === 'heures' ? parseFloat(newRequest.hours_amount) : null,
      created_by: user.id
    };
    
    console.log('📤 Envoi nouvelle demande d\'absence:', absenceData);
    
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
      console.log('✅ Demande créée avec succès:', result);
      
      // 🆕 Message amélioré avec info sur les compteurs
      let successMessage = '✅ Demande d\'absence créée avec succès';
      
      if (deductedTypes.includes(normalizedType)) {
        successMessage += `\n\n📊 Solde mis à jour : ${normalizedType} décompté automatiquement`;
      }
      
      alert(successMessage);
      
      // Recharger les données
      loadAbsencesFromAPI();
      
      // Fermer le modal
      setShowNewRequest(false);
      
      // Réinitialiser le formulaire et les erreurs
      setValidationError(null);
      setNewRequest({ 
        type: 'CP', 
        startDate: '', 
        endDate: '', 
        reason: '', 
        halfDay: false, 
        documents: [], 
        requiresAcknowledgment: false,
        absence_unit: 'jours',
        hours_amount: null,
        employee_id: user?.id || '',
        employee_name: user?.name || ''
      });
    } else {
      const error = await response.json();
      console.error('❌ Erreur création demande:', error);
      alert(`❌ Erreur: ${error.detail || 'Impossible de créer la demande'}`);
    }
  } catch (error) {
    console.error('❌ Erreur création demande:', error);
    alert('❌ Erreur lors de la création de la demande');
  }
};


// ============================================================================
// ÉTAPE 5 : AJOUTER L'AFFICHAGE DE L'ERREUR DE VALIDATION DANS LE FORMULAIRE
// ============================================================================

// Dans le formulaire modal (juste après l'ouverture de <form onSubmit={handleSubmitRequest}>)
// Ajouter ce bloc d'alerte AVANT les autres champs :

{/* 🆕 Alerte de validation du solde */}
{validationError && (
  <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-4">
    <div className="flex items-start space-x-3">
      <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
      <div className="flex-1">
        <h4 className="font-bold text-red-800 mb-2">❌ Solde insuffisant</h4>
        <p className="text-sm text-red-700 mb-3">{validationError.message}</p>
        
        <div className="bg-white rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Solde disponible :</span>
            <span className="font-bold text-red-700">
              {validationError.available} jour(s)
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Jours demandés :</span>
            <span className="font-bold text-red-700">
              {validationError.requested} jour(s)
            </span>
          </div>
          <div className="flex items-center justify-between text-sm border-t border-gray-200 pt-2">
            <span className="text-gray-600">Manquant :</span>
            <span className="font-bold text-red-700">
              {(validationError.requested - validationError.available).toFixed(1)} jour(s)
            </span>
          </div>
        </div>
        
        <p className="text-xs text-red-600 mt-3">
          💡 Veuillez ajuster votre demande ou contacter les RH
        </p>
      </div>
    </div>
  </div>
)}


// ============================================================================
// ÉTAPE 6 : AJOUTER LES WIDGETS DANS LA PAGE
// ============================================================================

// Option A : Afficher les widgets AVANT les statistiques rapides
// (Juste après le <ModuleHeader> et avant <div className="space-y-4">)

{/* 🆕 Widgets de soldes et historique - Visible uniquement pour les employés */}
{isEmployee && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    <LeaveBalanceWidget employeeId={user.id} />
    <LeaveTransactionHistory employeeId={user.id} limit={10} />
  </div>
)}

// OU

// Option B : Afficher les widgets dans un onglet séparé
// (Si vous utilisez un système d'onglets, créer un onglet "Mes Soldes")


// ============================================================================
// ÉTAPE 7 : AJOUTER UN INDICATEUR DE SOLDE DANS LA LISTE DES DEMANDES
// ============================================================================

// Dans le rendu de chaque demande, vous pouvez ajouter un badge indiquant le type décompté
// Juste après le badge de statut, ajouter :

{['CA', 'CP', 'CT', 'RTT', 'REC', 'CEX'].includes(normalizeAbsenceType(request.type)) && (
  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
    💼 Décompté
  </span>
)}


// ============================================================================
// EXEMPLE COMPLET DE PLACEMENT DANS LA PAGE
// ============================================================================

/*
return (
  <div className="p-6 space-y-6">
    {/* Header *}
    <ModuleHeader
      title={isEmployee ? 'Mes Demandes d\'Absence' : 'Demandes d\'Absence'}
      subtitle={isEmployee 
        ? 'Gestion de vos demandes d\'absence et suivi des validations'
        : 'Validation et suivi des demandes d\'absence des employés'
      }
      icon="📝"
      action={
        <Button
          onClick={() => setShowNewRequest(true)}
          variant="primary"
          icon="➕"
        >
          Nouvelle Demande
        </Button>
      }
    />

    {/* 🆕 WIDGETS DE SOLDES - Pour employés uniquement *}
    {isEmployee && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeaveBalanceWidget employeeId={user.id} />
        <LeaveTransactionHistory employeeId={user.id} limit={10} />
      </div>
    )}

    {/* Statistiques rapides *}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* ... vos stats existantes ... *}
    </div>

    {/* Liste des demandes *}
    <div className="bg-white/70 backdrop-blur-sm border-2 border-purple-200 rounded-xl p-6">
      {/* ... votre liste existante ... *}
    </div>

    {/* Modals existants ... *}
  </div>
);
*/


// ============================================================================
// ÉTAPE 8 : VARIANTE POUR ADMIN/MANAGER
// ============================================================================

// Pour les admins/managers, vous pouvez afficher les soldes de l'employé sélectionné
// dans le modal de création de demande :

{/* Dans le modal, après la sélection de l'employé */}
{(user.role === 'admin' || user.role === 'manager') && newRequest.employee_id && (
  <div className="mt-4">
    <LeaveBalanceWidget employeeId={newRequest.employee_id} compact={true} />
  </div>
)}


// ============================================================================
// TESTS DE VALIDATION
// ============================================================================

/**
 * Scénarios à tester après intégration :
 * 
 * 1. ✅ Employé avec solde suffisant
 *    - Créer demande 5j CA avec solde 25j
 *    - → Doit passer sans erreur
 * 
 * 2. ❌ Employé avec solde insuffisant
 *    - Créer demande 30j CA avec solde 25j
 *    - → Doit afficher alerte rouge avec détails
 *    - → Bouton "Soumettre" doit être désactivé ou bloqué
 * 
 * 3. 🔄 Après approbation
 *    - Widget soldes doit se mettre à jour automatiquement
 *    - Historique doit afficher la nouvelle transaction "deduct"
 * 
 * 4. ✅ Après réintégration (AM)
 *    - Si AM interrompt CA, widget doit montrer badge vert de réintégration
 *    - Historique doit montrer transaction "reintegrate"
 * 
 * 5. 🎯 Admin créant demande pour employé
 *    - Sélectionner employé dans dropdown
 *    - Widget compact doit afficher les soldes de l'employé sélectionné
 *    - Validation doit se faire sur les soldes de l'employé, pas de l'admin
 */


// ============================================================================
// DÉPANNAGE
// ============================================================================

/**
 * Problème : "Employee balance not found (404)"
 * Solution : C'est normal si l'employé n'a pas encore de solde initialisé.
 *            Lancez l'endpoint admin pour initialiser :
 *            POST /api/leave-balance/admin/initialize-balances
 * 
 * Problème : Les widgets ne se rafraîchissent pas après création d'absence
 * Solution : Vérifiez que l'événement 'websocket-absence-change' est bien émis
 *            après la création/approbation d'une absence
 * 
 * Problème : "Solde insuffisant" s'affiche alors que l'employé a des jours
 * Solution : Vérifiez la normalisation CP → CA. Le backend stocke en "CA"
 *            mais le frontend peut envoyer "CP". Utilisez normalizeAbsenceType()
 * 
 * Problème : Import Lucide React échoue
 * Solution : Installer lucide-react : npm install lucide-react
 */


// ============================================================================
// PERSONNALISATION
// ============================================================================

/**
 * Vous pouvez personnaliser :
 * 
 * 1. Couleurs des types de congés
 *    → Modifier leaveTypeConfig dans LeaveBalanceWidget.jsx
 * 
 * 2. Nombre de transactions affichées
 *    → Changer la prop "limit" de LeaveTransactionHistory
 * 
 * 3. Affichage compact ou complet
 *    → Utiliser la prop "compact={true}" pour version mini
 * 
 * 4. Position des widgets
 *    → Les placer où vous voulez dans la page
 *    → Possibilité de créer une page dédiée "Mon Espace / Mes Soldes"
 */


// ============================================================================
// FIN DU GUIDE
// ============================================================================

console.log('✅ Guide d\'intégration Phase 3 Frontend terminé');
console.log('📚 Consultez les fichiers suivants :');
console.log('   - LeaveBalanceWidget.jsx');
console.log('   - LeaveTransactionHistory.jsx');
console.log('   - Ce guide d\'intégration');
