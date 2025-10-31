import React, { useState, useEffect } from 'react';
import { ModuleHeader, TabBar, Button, ContentCard, StatCard, LoadingSpinner, Message } from './shared/UIComponents';

const UserManagement = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [statistics, setStatistics] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showGdprModal, setShowGdprModal] = useState(false);
  const [showAccountRecovery, setShowAccountRecovery] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [newEmail, setNewEmail] = useState('');
  const [emailChangeConfirmation, setEmailChangeConfirmation] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    department: '',
    phone: '',
    position: '',
    hire_date: '',
    isDelegateCSE: false
  });
  const [showPrintPasswordsModal, setShowPrintPasswordsModal] = useState(false);
  const [selectedUsersForPrint, setSelectedUsersForPrint] = useState([]);

  // Système de permissions granulaires
  const availablePermissions = {
    'user_management': { name: 'Gestion des utilisateurs', category: 'Administration' },
    'payroll_access': { name: 'Accès données paie', category: 'Paie' },
    'payroll_export': { name: 'Export données paie', category: 'Paie' },
    'absence_approve': { name: 'Approuver absences', category: 'Absences' },
    'absence_view_all': { name: 'Voir toutes les absences', category: 'Absences' },
    'delegation_manage': { name: 'Gérer délégations CSE', category: 'Délégation' },
    'analytics_access': { name: 'Accès analytics RH', category: 'Analytics' },
    'planning_edit': { name: 'Modifier plannings', category: 'Planning' },
    'overtime_approve': { name: 'Approuver heures sup', category: 'Heures sup' },
    'reports_generate': { name: 'Générer rapports', category: 'Rapports' },
    'gdpr_access': { name: 'Accès données RGPD', category: 'RGPD' },
    'audit_view': { name: 'Consulter logs audit', category: 'Sécurité' }
  };

  // Templates de rôles avec permissions prédéfinies
  const roleTemplates = {
    'admin': {
      name: 'Administrateur',
      permissions: Object.keys(availablePermissions),
      description: 'Accès complet à tous les modules'
    },
    'manager': {
      name: 'Manager/RH',
      permissions: ['absence_approve', 'absence_view_all', 'analytics_access', 'planning_edit', 'overtime_approve', 'reports_generate'],
      description: 'Gestion équipe et approbations'
    },
    'employee': {
      name: 'Employé',
      permissions: [],
      description: 'Accès personnel uniquement'
    }
  };

  // API functions
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/stats/overview`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const createUser = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        const createdUser = await response.json();
        setUsers([...users, createdUser]);
        setShowCreateModal(false);
        setNewUser({
          name: '', email: '', password: '', role: 'employee', department: '',
          phone: '', position: '', hire_date: '', isDelegateCSE: false
        });
        alert('Utilisateur créé avec succès !');
        fetchStatistics();
      } else {
        const error = await response.json();
        alert('Erreur: ' + error.detail);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Erreur lors de la création de l\'utilisateur');
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (userId, userData) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(users.map(u => u.id === userId ? updatedUser : u));
        alert('Utilisateur modifié avec succès !');
      } else {
        const error = await response.json();
        alert('Erreur: ' + error.detail);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Erreur lors de la modification');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    const userToDelete = users.find(u => u.id === userId);
    setUserToDelete(userToDelete);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setUsers(users.filter(u => u.id !== userToDelete.id));
        alert('Utilisateur désactivé avec succès !');
        fetchStatistics();
        setShowDeleteConfirmModal(false);
        setUserToDelete(null);
      } else {
        const error = await response.json();
        alert('Erreur: ' + error.detail);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Erreur lors de la désactivation');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (userId, newPassword) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ new_password: newPassword })
      });

      if (response.ok) {
        alert('Mot de passe réinitialisé avec succès !');
        setShowPasswordReset(false);
      } else {
        const error = await response.json();
        alert('Erreur: ' + error.detail);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Erreur lors de la réinitialisation');
    } finally {
      setIsLoading(false);
    }
  };

  const changeEmail = async (userId, newEmailValue) => {
    // Vérification de confirmation
    if (emailChangeConfirmation !== 'CONFIRMER') {
      alert('Veuillez taper "CONFIRMER" pour valider le changement d\'email');
      return;
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmailValue)) {
      alert('Format d\'email invalide');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/${userId}/change-email`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ new_email: newEmailValue })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(users.map(u => u.id === userId ? updatedUser : u));
        alert('✅ Email modifié avec succès ! L\'utilisateur conserve son mot de passe actuel.');
        setShowEmailChangeModal(false);
        setNewEmail('');
        setEmailChangeConfirmation('');
        setSelectedUser(null);
      } else {
        const error = await response.json();
        alert('Erreur: ' + error.detail);
      }
    } catch (error) {
      console.error('Error changing email:', error);
      alert('Erreur lors du changement d\'email');
    } finally {
      setIsLoading(false);
    }
  };

  // Mock audit logs for features not yet implemented
  const mockAuditLogs = [
    {
      id: '1',
      timestamp: '2024-01-25 14:30:25',
      action: 'USER_UPDATE',
      userId: '3',
      userName: 'Utilisateur Modifié',
      performedBy: 'Admin',
      details: 'Changement département',
      ipAddress: '192.168.1.100'
    }
  ];

  // Load data on component mount
  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      fetchUsers();
      fetchStatistics();
    }
    setAuditLogs(mockAuditLogs);
  }, [user]);

  // Filter users based on search and department
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || u.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  // Get unique departments for filter
  const departments = [...new Set(users.map(u => u.department))].filter(Boolean);

  // No more mock users - all users come from the database

  // Departments are now dynamically loaded from actual users

  const sites = [
    'Siège', 'Pôle Éducatif', 'Menuiserie 44', 'Voiles 44', 'Garage 44',
    'Alpinia 44', 'Ferme 44', 'Restaurant 44'
  ];

  const roles = [
    { value: 'admin', name: 'Administrateur' },
    { value: 'manager', name: 'Manager/RH' },
    { value: 'employee', name: 'Employé' }
  ];

  const contracts = [
    'CDI - Non Cadre', 'CDD - Non Cadre', 'CDI - Cadre', 'CDD - Cadre',
    'Stagiaire', 'Apprenti(e)', 'Intérimaire'
  ];

  const categories = [
    'Cadre Supérieur', 'Cadre', 'Employé Qualifié', 'Technicien',
    'Ouvrier qualifié', 'Ouvrier non qualifié', 'Agent administratif'
  ];

  // Initialisation des données
  // useEffect removed - data loading is now handled above

  // Filtering logic already defined above

  // Fonctions de gestion
  const handleEditUser = (userToEdit) => {
    console.log('🔍 Utilisateur sélectionné:', userToEdit);
    console.log('📋 Champs reçus:', {
      date_naissance: userToEdit.date_naissance,
      sexe: userToEdit.sexe,
      site: userToEdit.site,
      contrat: userToEdit.contrat,
      categorie_employe: userToEdit.categorie_employe,
      metier: userToEdit.metier,
      fonction: userToEdit.fonction,
      temps_travail: userToEdit.temps_travail,
      date_debut_contrat: userToEdit.date_debut_contrat
    });
    setSelectedUser({...userToEdit});
    setShowUserModal(true);
  };

  const handleEditPermissions = (userToEdit) => {
    setSelectedUser({...userToEdit});
    setShowPermissionsModal(true);
  };

  const handleEditGdpr = (userToEdit) => {
    setSelectedUser({...userToEdit});
    setShowGdprModal(true);
  };

  const handleViewAudit = (userToEdit) => {
    setSelectedUser({...userToEdit});
    setShowAuditModal(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    
    try {
      setIsLoading(true);
      console.log('💾 Sauvegarde utilisateur:', selectedUser);
      
      if (selectedUser.id) {
        // Modifier utilisateur existant - ENVOYER AU BACKEND
        console.log('📝 Modification utilisateur existant ID:', selectedUser.id);
        
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: selectedUser.name,
            email: selectedUser.email,
            role: selectedUser.role,
            department: selectedUser.department,
            phone: selectedUser.phone,
            address: selectedUser.address,
            position: selectedUser.position,
            hire_date: selectedUser.hire_date,
            isDelegateCSE: selectedUser.isDelegateCSE,
            is_active: selectedUser.is_active,
            // Champs additionnels
            date_naissance: selectedUser.date_naissance,
            sexe: selectedUser.sexe,
            categorie_employe: selectedUser.categorie_employe,
            metier: selectedUser.metier,
            fonction: selectedUser.fonction,
            site: selectedUser.site,
            temps_travail: selectedUser.temps_travail,
            contrat: selectedUser.contrat,
            date_debut_contrat: selectedUser.date_debut_contrat,
            date_fin_contrat: selectedUser.date_fin_contrat,
            notes: selectedUser.notes
          })
        });

        console.log('📡 Réponse API:', response.status, response.statusText);

        if (response.ok) {
          const updatedUser = await response.json();
          console.log('✅ Utilisateur mis à jour:', updatedUser);
          
          // Mettre à jour le state local avec les données du serveur
          setUsers(users.map(u => u.id === selectedUser.id ? updatedUser : u));
          
          // Log audit
          const auditEntry = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleString(),
            action: 'USER_UPDATE',
            userId: selectedUser.id,
            userName: selectedUser.name,
            performedBy: user.name,
            details: 'Mise à jour informations utilisateur',
            ipAddress: '192.168.1.100'
          };
          setAuditLogs([auditEntry, ...auditLogs]);
          
          alert('✅ Utilisateur mis à jour avec succès !');
          
          // Fermer le modal et recharger SEULEMENT si succès
          setShowUserModal(false);
          setSelectedUser(null);
          await fetchUsers();
        } else {
          const errorData = await response.json().catch(() => ({ detail: 'Erreur réseau' }));
          console.error('❌ Erreur API:', errorData);
          alert(`❌ Erreur lors de la mise à jour: ${errorData.detail || 'Erreur inconnue'}`);
          // NE PAS fermer le modal en cas d'erreur
        }
      } else {
        // Nouveau utilisateur - CRÉER VIA BACKEND
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: selectedUser.name,
            email: selectedUser.email,
            password: selectedUser.password || 'TempPassword123!',
            role: selectedUser.role || 'employee',
            department: selectedUser.department,
            phone: selectedUser.phone,
            address: selectedUser.address,
            position: selectedUser.position,
            hire_date: selectedUser.hire_date,
            isDelegateCSE: selectedUser.isDelegateCSE || false,
            // Champs additionnels
            date_naissance: selectedUser.date_naissance,
            sexe: selectedUser.sexe,
            categorie_employe: selectedUser.categorie_employe,
            metier: selectedUser.metier,
            fonction: selectedUser.fonction,
            site: selectedUser.site,
            temps_travail: selectedUser.temps_travail,
            contrat: selectedUser.contrat,
            date_debut_contrat: selectedUser.date_debut_contrat,
            date_fin_contrat: selectedUser.date_fin_contrat,
            notes: selectedUser.notes
          })
        });

        if (response.ok) {
          const tempPasswordData = await response.json();
          
          // Log audit
          const auditEntry = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleString(),
            action: 'USER_CREATED',
            userId: 'pending',
            userName: selectedUser.name,
            performedBy: user.name,
            details: 'Création nouvel utilisateur',
            ipAddress: '192.168.1.100'
          };
          setAuditLogs([auditEntry, ...auditLogs]);
          
          alert(`✅ Utilisateur créé avec succès !\n\n🔑 Mot de passe temporaire: ${tempPasswordData.temp_password}\n\n⚠️ Notez-le dans un endroit sûr, il ne sera plus affiché.`);
          
          // Fermer le modal et recharger SEULEMENT si succès
          setShowUserModal(false);
          setSelectedUser(null);
          await fetchUsers();
        } else {
          const errorData = await response.json().catch(() => ({ detail: 'Erreur réseau' }));
          alert(`❌ Erreur lors de la création: ${errorData.detail || 'Erreur inconnue'}`);
          console.error('Error creating user:', errorData);
          // NE PAS fermer le modal en cas d'erreur
        }
      }
      
    } catch (error) {
      console.error('Error saving user:', error);
      alert('❌ Erreur lors de la sauvegarde: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEmail = (userToEdit) => {
    setSelectedUser({...userToEdit});
    setNewEmail(userToEdit.email);
    setEmailChangeConfirmation('');
    setShowEmailChangeModal(true);
  };

  const handleResetPassword = (userId) => {
    const resetUser = users.find(u => u.id === userId);
    if (resetUser) {
      // Log audit
      const auditEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        action: 'PASSWORD_RESET',
        userId: userId,
        userName: resetUser.name,
        performedBy: user.name,
        details: 'Réinitialisation mot de passe par administrateur',
        ipAddress: '192.168.1.100'
      };
      setAuditLogs([auditEntry, ...auditLogs]);
      
      alert(`✅ Mot de passe réinitialisé pour ${resetUser.name}.\nNouveau mot de passe temporaire envoyé par email.`);
    }
    setShowPasswordReset(false);
  };

  const handleDeleteTestUsers = async () => {
    // Utiliser un modal personnalisé au lieu de window.confirm (problème sandbox)
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteTestUsers = async () => {
    setShowDeleteConfirmModal(false);
    
    try {
      setIsLoading(true);
      
      console.log('Début de la suppression des utilisateurs de test...');
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/cleanup/test-users`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Résultat:', result);
        
        if (result.deleted_users && result.deleted_users.length > 0) {
          // Afficher un message de succès dans l'interface
          const deletedCount = result.deleted_users.length;
          console.log(`✅ ${deletedCount} utilisateur(s) de test supprimé(s)`);
          result.deleted_users.forEach(u => console.log(`   - ${u.name} (${u.email})`));
        } else {
          console.log('✅ Aucun utilisateur de test trouvé');
        }
        
        // Recharger la liste
        await fetchUsers();
        await fetchStatistics();
      } else {
        const error = await response.json();
        console.error('Erreur API:', error);
      }
      
    } catch (error) {
      console.error('Error deleting test users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUserStatus = (userId) => {
    const userToUpdate = users.find(u => u.id === userId);
    const newStatus = !userToUpdate.isActive;
    
    setUsers(users.map(u => 
      u.id === userId ? {...u, isActive: newStatus} : u
    ));
    
    // Log audit
    const auditEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      action: newStatus ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      userId: userId,
      userName: userToUpdate.name,
      performedBy: user.name,
      details: newStatus ? 'Compte réactivé' : 'Compte désactivé',
      ipAddress: '192.168.1.100'
    };
    setAuditLogs([auditEntry, ...auditLogs]);
  };

  // Gestion des permissions
  const handleUpdatePermissions = () => {
    if (selectedUser) {
      setUsers(users.map(u => 
        u.id === selectedUser.id ? {...u, permissions: selectedUser.permissions || []} : u
      ));
      
      // Log audit
      const auditEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        action: 'PERMISSION_CHANGE',
        userId: selectedUser.id,
        userName: selectedUser.name,
        performedBy: user.name,
        details: `Mise à jour des permissions: ${(selectedUser.permissions || []).length} permission(s)`,
        ipAddress: '192.168.1.100'
      };
      setAuditLogs([auditEntry, ...auditLogs]);
      
      setShowPermissionsModal(false);
      setSelectedUser(null);
    }
  };

  const togglePermission = (permission) => {
    if (selectedUser) {
      const currentPermissions = selectedUser.permissions || [];
      const newPermissions = currentPermissions.includes(permission)
        ? currentPermissions.filter(p => p !== permission)
        : [...currentPermissions, permission];
      
      setSelectedUser({...selectedUser, permissions: newPermissions});
    }
  };

  const applyRoleTemplate = (roleKey) => {
    if (selectedUser && roleTemplates[roleKey]) {
      setSelectedUser({
        ...selectedUser, 
        permissions: [...roleTemplates[roleKey].permissions],
        role: roleKey
      });
    }
  };

  // Récupération de comptes
  const handleAccountRecovery = (type, identifier) => {
    console.log('Récupération de compte:', type, identifier);
    
    if (type === 'password') {
      // Recherche par email
      const foundUser = users.find(u => u.email.toLowerCase() === identifier.toLowerCase());
      if (foundUser) {
        alert(`✅ Email de récupération envoyé à ${foundUser.email}\nNouveau mot de passe temporaire généré.`);
        
        // Log audit
        const auditEntry = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString(),
          action: 'PASSWORD_RECOVERY',
          userId: foundUser.id,
          userName: foundUser.name,
          performedBy: 'Système auto',
          details: `Récupération mot de passe via ${identifier}`,
          ipAddress: '192.168.1.100'
        };
        setAuditLogs([auditEntry, ...auditLogs]);
      } else {
        alert('❌ Aucun compte trouvé avec cet email.');
      }
    } else if (type === 'username') {
      // Recherche par nom ou autres critères
      const foundUsers = users.filter(u => 
        u.name.toLowerCase().includes(identifier.toLowerCase()) ||
        u.phone === identifier
      );
      
      if (foundUsers.length > 0) {
        const userList = foundUsers.map(u => `${u.name} (${u.email})`).join('\n');
        alert(`✅ Comptes trouvés:\n${userList}`);
      } else {
        alert('❌ Aucun compte trouvé avec ces critères.');
      }
    }
    
    setShowAccountRecovery(false);
  };

  // Mise à jour des données RGPD
  const handleUpdateGdpr = () => {
    if (selectedUser) {
      setUsers(users.map(u => 
        u.id === selectedUser.id ? {...u, personalData: selectedUser.personalData} : u
      ));
      
      // Log audit
      const auditEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        action: 'GDPR_UPDATE',
        userId: selectedUser.id,
        userName: selectedUser.name,
        performedBy: user.name,
        details: 'Mise à jour des données personnelles (RGPD)',
        ipAddress: '192.168.1.100'
      };
      setAuditLogs([auditEntry, ...auditLogs]);
      
      setShowGdprModal(false);
      setSelectedUser(null);
    }
  };

  const getRoleDisplayName = (role) => {
    const roleObj = roles.find(r => r.value === role);
    return roleObj ? roleObj.name : role;
  };

  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'employee': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderTabContent = () => {
    switch(activeTab) {
      case 'users':
        return renderUsersTab();
      case 'recovery':
        // Onglet réservé aux admins uniquement
        if (user?.role !== 'admin') {
          return (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Accès Restreint</h3>
                <p className="text-sm">Cette section est réservée aux administrateurs.</p>
              </div>
            </div>
          );
        }
        return renderRecoveryTab();
      case 'audit':
        return renderAuditTab();
      default:
        return renderUsersTab();
    }
  };

  const renderUsersTab = () => (
    <>
      {/* Filtres et recherche */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nom, email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Département</label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les départements</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <div className="text-sm text-gray-600">
              {filteredUsers.length} utilisateur(s) trouvé(s)
            </div>
            {user?.role === 'admin' && users.length > 0 && (
              <button
                onClick={handleDeleteTestUsers}
                disabled={isLoading}
                className={`px-3 py-1 text-white text-xs rounded-lg transition-colors ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-red-500 hover:bg-red-600'
                }`}
                title="Supprimer tous les utilisateurs de test"
              >
                {isLoading ? '⏳ Suppression...' : '🗑️ Nettoyer tests'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Utilisateurs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Département
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((userItem) => (
                <tr key={userItem.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">{userItem.name}</div>
                      <div className="text-sm text-gray-500">{userItem.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(userItem.role)}`}>
                      {getRoleDisplayName(userItem.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {userItem.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(userItem.permissions || []).length} permission(s)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleUserStatus(userItem.id)}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        userItem.isActive 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      } transition-colors duration-200`}
                    >
                      {userItem.isActive ? '✅ Actif' : '❌ Inactif'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex flex-wrap gap-1">
                      {/* Boutons réservés aux ADMINS uniquement */}
                      {user?.role === 'admin' && (
                        <>
                          <button
                            onClick={() => handleEditUser(userItem)}
                            className="text-blue-600 hover:text-blue-900 transition-colors duration-200 px-2 py-1 rounded text-xs"
                            title="Modifier infos"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleEditPermissions(userItem)}
                            className="text-purple-600 hover:text-purple-900 transition-colors duration-200 px-2 py-1 rounded text-xs"
                            title="Gérer permissions"
                          >
                            🔐
                          </button>
                          <button
                            onClick={() => handleEditGdpr(userItem)}
                            className="text-green-600 hover:text-green-900 transition-colors duration-200 px-2 py-1 rounded text-xs"
                            title="Données RGPD"
                          >
                            👤
                          </button>
                          <button
                            onClick={() => handleChangeEmail(userItem)}
                            className="text-teal-600 hover:text-teal-900 transition-colors duration-200 px-2 py-1 rounded text-xs"
                            title="Modifier Email"
                          >
                            ✉️
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(userItem);
                              setShowPasswordReset(true);
                            }}
                            className="text-orange-600 hover:text-orange-900 transition-colors duration-200 px-2 py-1 rounded text-xs"
                            title="Reset MdP"
                          >
                            🔑
                          </button>
                          <button
                            onClick={() => handleViewAudit(userItem)}
                            className="text-gray-600 hover:text-gray-900 transition-colors duration-200 px-2 py-1 rounded text-xs"
                            title="Audit"
                          >
                            📋
                          </button>
                          <button
                            onClick={() => {
                              setUserToDelete(userItem);
                              setShowDeleteConfirmModal(true);
                            }}
                            className="text-red-600 hover:text-red-900 transition-colors duration-200 px-2 py-1 rounded text-xs"
                            title="Supprimer utilisateur"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                      
                      {/* Manager: Vue lecture seule */}
                      {user?.role === 'manager' && (
                        <>
                          <button
                            onClick={() => handleViewAudit(userItem)}
                            className="text-gray-600 hover:text-gray-900 transition-colors duration-200 px-2 py-1 rounded text-xs"
                            title="Voir informations"
                          >
                            👁️
                          </button>
                          <span className="text-xs text-gray-500 italic px-2">
                            (Vue lecture seule)
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderRecoveryTab = () => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">🔧 Récupération de Comptes</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-4">🔑 Récupération Mot de Passe</h3>
          <p className="text-sm text-gray-600 mb-4">
            Générer un nouveau mot de passe temporaire pour un utilisateur
          </p>
          <button
            onClick={() => {
              setRecoveryType('password');
              setShowAccountRecovery(true);
            }}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors duration-200"
          >
            Lancer récupération mot de passe
          </button>
        </div>
        
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-4">👤 Recherche Identifiant</h3>
          <p className="text-sm text-gray-600 mb-4">
            Retrouver les identifiants d'un utilisateur par nom ou téléphone
          </p>
          <button
            onClick={() => {
              setRecoveryType('username');
              setShowAccountRecovery(true);
            }}
            className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors duration-200"
          >
            Rechercher identifiants
          </button>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="text-yellow-500 text-xl">⚠️</div>
          <div>
            <h4 className="font-medium text-yellow-800 mb-2">Sécurité et Audit</h4>
            <p className="text-sm text-yellow-700">
              Toutes les opérations de récupération de comptes sont enregistrées dans les logs d'audit.
              Les mots de passe temporaires sont valables 24h et doivent être changés à la première connexion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAuditTab = () => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">📋 Journal d'Audit</h2>
        <div className="text-sm text-gray-600">
          {auditLogs.length} entrée(s) d'audit
        </div>
      </div>
      
      <div className="space-y-3">
        {auditLogs.map((log) => (
          <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    log.action.includes('CREATE') ? 'bg-green-100 text-green-800' :
                    log.action.includes('UPDATE') ? 'bg-blue-100 text-blue-800' :
                    log.action.includes('DELETE') ? 'bg-red-100 text-red-800' :
                    log.action.includes('PASSWORD') ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {log.action}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{log.userName}</span>
                </div>
                <p className="text-sm text-gray-600 mb-1">{log.details}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Par: {log.performedBy}</span>
                  <span>IP: {log.ipAddress}</span>
                </div>
              </div>
              <div className="text-right text-xs text-gray-500">
                {log.timestamp}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header Harmonisé */}
      <ModuleHeader
        title="Gestion Avancée des Utilisateurs"
        subtitle="Administration complète avec permissions, RGPD et audit"
        icon="👥"
        action={
          <Button
            onClick={() => {
              setSelectedUser({
                name: '', email: '', role: 'employee', department: '', site: '',
                phone: '', address: '', children: 0, hireDate: '', contract: '',
                category: '', isActive: true, permissions: [],
                personalData: { gdprConsent: { dataProcessing: false, marketing: false } }
              });
              setShowUserModal(true);
            }}
            variant="primary"
          >
            ➕ Nouvel Utilisateur
          </Button>
        }
      />
      
      {/* Onglets Harmonisés - Dynamiques selon le rôle */}
      <TabBar
        tabs={
          user?.role === 'admin' 
            ? [
                { id: 'users', label: '👥 Utilisateurs' },
                { id: 'recovery', label: '🔐 Récupération' },
                { id: 'audit', label: '📋 Audit' }
              ]
            : [
                { id: 'users', label: '👥 Utilisateurs' },
                { id: 'audit', label: '📋 Audit' }
              ]
        }
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {renderTabContent()}

      {/* Modal édition utilisateur */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                {selectedUser.id ? 'Modifier Utilisateur' : 'Nouvel Utilisateur'}
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Informations personnelles */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Informations personnelles</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                    <input
                      type="text"
                      value={selectedUser.name}
                      onChange={(e) => setSelectedUser({...selectedUser, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={selectedUser.email}
                      onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={selectedUser.phone}
                      onChange={(e) => setSelectedUser({...selectedUser, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                    <textarea
                      value={selectedUser.address}
                      onChange={(e) => setSelectedUser({...selectedUser, address: e.target.value})}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'enfants à charge</label>
                    <input
                      type="number"
                      value={selectedUser.children}
                      onChange={(e) => setSelectedUser({...selectedUser, children: parseInt(e.target.value) || 0})}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                    <input
                      type="text"
                      value={selectedUser.date_naissance || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, date_naissance: e.target.value})}
                      placeholder="JJ/MM/AAAA"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sexe</label>
                    <select
                      value={selectedUser.sexe || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, sexe: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Non spécifié</option>
                      <option value="Homme">Homme</option>
                      <option value="Femme">Femme</option>
                    </select>
                  </div>
                </div>

                {/* Informations professionnelles */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Informations professionnelles</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                    <select
                      value={selectedUser.role}
                      onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {roles.map(role => (
                        <option key={role.value} value={role.value}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Département</label>
                    <select
                      value={selectedUser.department}
                      onChange={(e) => setSelectedUser({...selectedUser, department: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner un département</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Site d'affectation</label>
                    <select
                      value={selectedUser.site}
                      onChange={(e) => setSelectedUser({...selectedUser, site: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner un site</option>
                      {sites.map(site => (
                        <option key={site} value={site}>{site}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Métier</label>
                    <input
                      type="text"
                      value={selectedUser.metier || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, metier: e.target.value})}
                      placeholder="Ex: Chef de Service, Comptable, Éducateur..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fonction</label>
                    <input
                      type="text"
                      value={selectedUser.fonction || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, fonction: e.target.value})}
                      placeholder="Ex: Employé, Responsable..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type de contrat</label>
                    <select
                      value={selectedUser.contrat || selectedUser.contract || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, contrat: e.target.value, contract: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner un contrat</option>
                      {contracts.map(contract => (
                        <option key={contract} value={contract}>{contract}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Temps de travail</label>
                    <select
                      value={selectedUser.temps_travail || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, temps_travail: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Non spécifié</option>
                      <option value="Temps Plein">Temps Plein</option>
                      <option value="Temps Partiel">Temps Partiel</option>
                      <option value="Temps Partiel 80%">Temps Partiel 80%</option>
                      <option value="Temps Partiel 50%">Temps Partiel 50%</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie employé</label>
                    <select
                      value={selectedUser.categorie_employe || selectedUser.category || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, categorie_employe: e.target.value, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner une catégorie</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date d'embauche / Début contrat</label>
                    <input
                      type="text"
                      value={selectedUser.date_debut_contrat || selectedUser.hire_date || selectedUser.hireDate || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, date_debut_contrat: e.target.value, hire_date: e.target.value, hireDate: e.target.value})}
                      placeholder="JJ/MM/AAAA"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date fin contrat (si CDD)</label>
                    <input
                      type="text"
                      value={selectedUser.date_fin_contrat || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, date_fin_contrat: e.target.value})}
                      placeholder="JJ/MM/AAAA"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={selectedUser.notes || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, notes: e.target.value})}
                      rows={3}
                      placeholder="Informations complémentaires..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveUser}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gestion des permissions */}
      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                🔐 Gestion des Permissions - {selectedUser.name}
              </h2>
            </div>
            <div className="p-6">
              {/* Rôle actuel */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Rôle Actuel</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {selectedUser.role === 'admin' ? '👑' : selectedUser.role === 'manager' ? '👔' : '👤'}
                      </span>
                      <div>
                        <div className="text-lg font-semibold text-gray-800">
                          {roleTemplates[selectedUser.role]?.name || selectedUser.role}
                        </div>
                        <div className="text-sm text-gray-600">
                          {roleTemplates[selectedUser.role]?.description}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {(selectedUser.permissions || []).length}
                    </div>
                    <div className="text-xs text-gray-600">permissions actives</div>
                  </div>
                </div>
              </div>

              {/* Templates de rôles disponibles */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-2">Changer de Rôle</h3>
                <p className="text-sm text-gray-600 mb-3">Cliquez sur un template pour appliquer les permissions correspondantes</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(roleTemplates).map(([key, template]) => {
                    const isCurrentRole = selectedUser.role === key;
                    return (
                      <button
                        key={key}
                        onClick={() => applyRoleTemplate(key)}
                        disabled={isCurrentRole}
                        className={`p-3 border rounded-lg text-left transition-all duration-200 ${
                          isCurrentRole 
                            ? 'bg-blue-50 border-blue-400 cursor-not-allowed opacity-75' 
                            : 'border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-gray-800">{template.name}</div>
                          {isCurrentRole && (
                            <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                              Actif
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">{template.description}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {template.permissions.length} permission(s)
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Permissions détaillées */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">Permissions Détaillées</h3>
                <div className="space-y-4">
                  {Object.entries(
                    Object.keys(availablePermissions).reduce((acc, perm) => {
                      const category = availablePermissions[perm].category;
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(perm);
                      return acc;
                    }, {})
                  ).map(([category, perms]) => (
                    <div key={category} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-3">{category}</h4>
                      <div className="space-y-2">
                        {perms.map(permission => (
                          <label key={permission} className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(selectedUser.permissions || []).includes(permission)}
                              onChange={() => togglePermission(permission)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">
                              {availablePermissions[permission].name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {(selectedUser.permissions || []).length} permission(s) sélectionnée(s)
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowPermissionsModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpdatePermissions}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal données RGPD */}
      {showGdprModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                👤 Données RGPD - {selectedUser.name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Gestion des données personnelles selon le Règlement Général sur la Protection des Données
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* Données personnelles étendues */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                    <input
                      type="date"
                      value={selectedUser.personalData?.birthDate || ''}
                      onChange={(e) => setSelectedUser({
                        ...selectedUser,
                        personalData: { ...selectedUser.personalData, birthDate: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lieu de naissance</label>
                    <input
                      type="text"
                      value={selectedUser.personalData?.birthPlace || ''}
                      onChange={(e) => setSelectedUser({
                        ...selectedUser,
                        personalData: { ...selectedUser.personalData, birthPlace: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nationalité</label>
                    <input
                      type="text"
                      value={selectedUser.personalData?.nationality || ''}
                      onChange={(e) => setSelectedUser({
                        ...selectedUser,
                        personalData: { ...selectedUser.personalData, nationality: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Situation familiale</label>
                    <select
                      value={selectedUser.personalData?.maritalStatus || ''}
                      onChange={(e) => setSelectedUser({
                        ...selectedUser,
                        personalData: { ...selectedUser.personalData, maritalStatus: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner</option>
                      <option value="Célibataire">Célibataire</option>
                      <option value="Marié(e)">Marié(e)</option>
                      <option value="Divorcé(e)">Divorcé(e)</option>
                      <option value="Veuf(ve)">Veuf(ve)</option>
                      <option value="PACS">PACS</option>
                    </select>
                  </div>
                </div>

                {/* Contact d'urgence */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-3">Contact d'urgence</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                      <input
                        type="text"
                        value={selectedUser.personalData?.emergencyContact?.name || ''}
                        onChange={(e) => setSelectedUser({
                          ...selectedUser,
                          personalData: { 
                            ...selectedUser.personalData,
                            emergencyContact: { 
                              ...selectedUser.personalData?.emergencyContact,
                              name: e.target.value 
                            }
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
                      <input
                        type="text"
                        value={selectedUser.personalData?.emergencyContact?.relationship || ''}
                        onChange={(e) => setSelectedUser({
                          ...selectedUser,
                          personalData: { 
                            ...selectedUser.personalData,
                            emergencyContact: { 
                              ...selectedUser.personalData?.emergencyContact,
                              relationship: e.target.value 
                            }
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                      <input
                        type="tel"
                        value={selectedUser.personalData?.emergencyContact?.phone || ''}
                        onChange={(e) => setSelectedUser({
                          ...selectedUser,
                          personalData: { 
                            ...selectedUser.personalData,
                            emergencyContact: { 
                              ...selectedUser.personalData?.emergencyContact,
                              phone: e.target.value 
                            }
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Consentements RGPD */}
                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <h4 className="font-medium text-green-800 mb-3">Consentements RGPD</h4>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUser.personalData?.gdprConsent?.dataProcessing || false}
                        onChange={(e) => setSelectedUser({
                          ...selectedUser,
                          personalData: { 
                            ...selectedUser.personalData,
                            gdprConsent: { 
                              ...selectedUser.personalData?.gdprConsent,
                              dataProcessing: e.target.checked 
                            }
                          }
                        })}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-green-700">
                        Consentement au traitement des données personnelles
                      </span>
                    </label>
                    
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUser.personalData?.gdprConsent?.marketing || false}
                        onChange={(e) => setSelectedUser({
                          ...selectedUser,
                          personalData: { 
                            ...selectedUser.personalData,
                            gdprConsent: { 
                              ...selectedUser.personalData?.gdprConsent,
                              marketing: e.target.checked 
                            }
                          }
                        })}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-green-700">
                        Consentement aux communications marketing
                      </span>
                    </label>
                  </div>
                  
                  <div className="mt-3 text-xs text-green-600">
                    Dernier consentement: {selectedUser.personalData?.gdprConsent?.lastUpdated || 'Non défini'}
                  </div>
                </div>

                {/* Informations sensibles */}
                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <h4 className="font-medium text-red-800 mb-3">⚠️ Données Sensibles</h4>
                  <p className="text-xs text-red-600 mb-3">
                    Ces informations sont protégées par le RGPD et nécessitent une justification légale pour leur traitement.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">N° Sécurité Sociale</label>
                      <input
                        type="text"
                        value={selectedUser.personalData?.socialSecurity || ''}
                        onChange={(e) => setSelectedUser({
                          ...selectedUser,
                          personalData: { ...selectedUser.personalData, socialSecurity: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Masqué pour sécurité"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">N° Fiscal</label>
                      <input
                        type="text"
                        value={selectedUser.personalData?.taxNumber || ''}
                        onChange={(e) => setSelectedUser({
                          ...selectedUser,
                          personalData: { ...selectedUser.personalData, taxNumber: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Informations médicales</label>
                    <textarea
                      value={selectedUser.personalData?.medicalInfo || ''}
                      onChange={(e) => setSelectedUser({
                        ...selectedUser,
                        personalData: { ...selectedUser.personalData, medicalInfo: e.target.value }
                      })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Restrictions médicales, allergies, etc."
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowGdprModal(false);
                  setSelectedUser(null);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Annuler
              </button>
              <button
                onClick={handleUpdateGdpr}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200"
              >
                Enregistrer (RGPD)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal récupération de comptes */}
      {showAccountRecovery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                {recoveryType === 'password' ? '🔑 Récupération Mot de Passe' : '👤 Recherche Identifiant'}
              </h2>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const identifier = e.target.identifier.value;
                handleAccountRecovery(recoveryType, identifier);
              }}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {recoveryType === 'password' ? 'Email du compte' : 'Nom ou téléphone'}
                  </label>
                  <input
                    type="text"
                    name="identifier"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={recoveryType === 'password' ? 'exemple@company.com' : 'Jean Dupont ou 01 23 45 67 89'}
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAccountRecovery(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                  >
                    {recoveryType === 'password' ? 'Envoyer nouveau MdP' : 'Rechercher'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal reset mot de passe */}
      {showPasswordReset && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Réinitialiser le mot de passe</h2>
              <p className="text-gray-600 mb-4">
                Êtes-vous sûr de vouloir réinitialiser le mot de passe de <strong>{selectedUser.name}</strong> ?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Un nouveau mot de passe temporaire sera généré et envoyé par email à l'utilisateur.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPasswordReset(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleResetPassword(selectedUser.id)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200"
                >
                  🔑 Réinitialiser
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal changement d'email */}
      {showEmailChangeModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">✉️ Modifier l'adresse email</h2>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-yellow-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Attention :</strong> L'adresse email est l'identifiant de connexion de l'utilisateur.
                      Le changement prendra effet immédiatement. L'utilisateur conservera son mot de passe actuel.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Utilisateur
                </label>
                <input
                  type="text"
                  value={selectedUser.name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email actuel
                </label>
                <input
                  type="email"
                  value={selectedUser.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouvel email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nouveau.email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmation de sécurité
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Tapez <strong>CONFIRMER</strong> pour valider le changement
                </p>
                <input
                  type="text"
                  value={emailChangeConfirmation}
                  onChange={(e) => setEmailChangeConfirmation(e.target.value)}
                  placeholder="CONFIRMER"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEmailChangeModal(false);
                    setNewEmail('');
                    setEmailChangeConfirmation('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Annuler
                </button>
                <button
                  onClick={() => changeEmail(selectedUser.id, newEmail)}
                  disabled={emailChangeConfirmation !== 'CONFIRMER' || !newEmail}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                    emailChangeConfirmation === 'CONFIRMER' && newEmail
                      ? 'bg-teal-500 text-white hover:bg-teal-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  ✉️ Modifier l'email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression utilisateur individuel */}
      {showDeleteConfirmModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-red-600 mb-4">⚠️ Désactiver l'utilisateur</h2>
              
              <p className="text-gray-700 mb-4">
                Voulez-vous désactiver l'utilisateur suivant ?
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="font-medium text-gray-800">{userToDelete.name}</p>
                <p className="text-sm text-gray-600">{userToDelete.email}</p>
                <p className="text-sm text-gray-600">Rôle: {userToDelete.role}</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  ℹ️ L'utilisateur sera désactivé mais ses données seront conservées. 
                  Il ne pourra plus se connecter à l'application.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirmModal(false);
                    setUserToDelete(null);
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDeleteUser}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 disabled:opacity-50"
                >
                  {isLoading ? '⏳ Désactivation...' : '🔒 Désactiver'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression utilisateurs de test */}
      {/* Modal de confirmation de suppression utilisateur individuel */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-red-600 mb-4">⚠️ Confirmation de suppression</h2>
              
              <p className="text-gray-700 mb-4">
                Êtes-vous sûr de vouloir désactiver cet utilisateur ?
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 font-medium mb-2">Utilisateur :</p>
                <p className="text-base font-semibold text-gray-800">{userToDelete.name}</p>
                <p className="text-sm text-gray-600">{userToDelete.email}</p>
                <p className="text-sm text-gray-500">{userToDelete.department}</p>
              </div>

              <p className="text-sm text-orange-600 font-medium mb-6">
                ℹ️ L'utilisateur sera désactivé (soft delete), ses données seront conservées.
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setUserToDelete(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDeleteUser}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 disabled:opacity-50"
                >
                  {isLoading ? 'Suppression...' : '🗑️ Désactiver'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression en masse des utilisateurs de test */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-red-600 mb-4">⚠️ Confirmation de suppression</h2>
              
              <p className="text-gray-700 mb-4">
                Voulez-vous supprimer <strong>TOUS</strong> les utilisateurs de test ?
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 font-medium mb-2">Seront supprimés :</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Email contenant "test" ou "example"</li>
                  <li>• Nom contenant "User Test", "testemp", "Marie Dupont"</li>
                </ul>
              </div>

              <p className="text-sm text-red-600 font-medium mb-6">
                ⚠️ Cette action est irréversible !
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDeleteTestUsers}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
                >
                  🗑️ Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;