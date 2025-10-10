import React, { useState, useEffect } from 'react';

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

  // Mock audit logs
  const mockAuditLogs = [
    {
      id: '1',
      timestamp: '2024-01-25 14:30:25',
      action: 'USER_UPDATE',
      userId: '3',
      userName: 'Marie Leblanc',
      performedBy: 'Sophie Martin',
      details: 'Changement département: Commercial → Éducatif',
      ipAddress: '192.168.1.100'
    },
    {
      id: '2',
      timestamp: '2024-01-24 09:15:10',
      action: 'PASSWORD_RESET',
      userId: '4',
      userName: 'Pierre Moreau',
      performedBy: 'Sophie Martin',
      details: 'Réinitialisation mot de passe - Demande utilisateur',
      ipAddress: '192.168.1.100'
    },
    {
      id: '3',
      timestamp: '2024-01-23 16:45:30',
      action: 'PERMISSION_CHANGE',
      userId: '2',
      userName: 'Jean Dupont',
      performedBy: 'Sophie Martin',
      details: 'Ajout permission: analytics_access',
      ipAddress: '192.168.1.100'
    }
  ];

  // Données d'exemple des utilisateurs étendues
  const mockUsers = [
    {
      id: '1',
      name: 'Sophie Martin',
      email: 'admin@company.com',
      role: 'admin',
      department: 'Direction',
      site: 'Siège',
      phone: '01 23 45 67 89',
      address: '123 Rue de la Paix, 75001 Paris',
      children: 2,
      hireDate: '2018-03-15',
      contract: 'CDI - Cadre',
      category: 'Cadre Supérieur',
      isActive: true,
      lastLogin: '2024-01-25 09:30',
      permissions: Object.keys(availablePermissions),
      // Données RGPD étendues
      personalData: {
        birthDate: '1985-06-15',
        birthPlace: 'Paris',
        nationality: 'Française',
        maritalStatus: 'Mariée',
        emergencyContact: {
          name: 'Martin Pierre',
          relationship: 'Époux',
          phone: '06 12 34 56 78'
        },
        bankDetails: {
          iban: 'FR76 3000 6000 0112 3456 7890 189',
          bank: 'Banque Populaire'
        },
        socialSecurity: '1 85 06 75 001 234 56',
        taxNumber: 'MARTSO850615789',
        medicalInfo: 'Aucune restriction médicale',
        gdprConsent: {
          dataProcessing: true,
          marketing: false,
          consentDate: '2023-05-25',
          lastUpdated: '2024-01-15'
        }
      }
    },
    {
      id: '2', 
      name: 'Jean Dupont',
      email: 'manager@company.com',
      role: 'manager',
      department: 'Administratif',
      site: 'Siège',
      phone: '01 23 45 67 90',
      address: '456 Avenue des Champs, 75008 Paris',
      children: 1,
      hireDate: '2019-07-22',
      contract: 'CDI - Cadre',
      category: 'Cadre',
      isActive: true,
      lastLogin: '2024-01-24 17:45',
      permissions: ['absence_approve', 'absence_view_all', 'analytics_access'],
      personalData: {
        birthDate: '1980-11-20',
        birthPlace: 'Lyon',
        nationality: 'Française',
        maritalStatus: 'Marié',
        emergencyContact: { name: 'Dupont Anne', relationship: 'Épouse', phone: '06 87 65 43 21' },
        bankDetails: { iban: 'FR76 3000 6000 0187 6543 2109 876', bank: 'Crédit Agricole' },
        socialSecurity: '1 80 11 69 001 123 45',
        gdprConsent: { dataProcessing: true, marketing: true, consentDate: '2023-06-10', lastUpdated: '2023-12-20' }
      }
    },
    {
      id: '3',
      name: 'Marie Leblanc',
      email: 'marie.leblanc@company.com', 
      role: 'employee',
      department: 'Commercial',
      site: 'Pôle Éducatif',
      phone: '01 23 45 67 91',
      address: '789 Boulevard Saint-Germain, 75006 Paris',
      children: 0,
      hireDate: '2020-01-10',
      contract: 'CDI - Non Cadre',
      category: 'Employé Qualifié',
      isActive: true,
      lastLogin: '2024-01-25 08:15',
      permissions: [],
      personalData: {
        birthDate: '1990-03-12',
        birthPlace: 'Marseille',
        nationality: 'Française',
        maritalStatus: 'Célibataire',
        emergencyContact: { name: 'Leblanc Paul', relationship: 'Père', phone: '04 91 12 34 56' },
        gdprConsent: { dataProcessing: true, marketing: false, consentDate: '2023-01-15', lastUpdated: '2023-01-15' }
      }
    },
    {
      id: '4',
      name: 'Pierre Moreau',
      email: 'pierre.moreau@company.com',
      role: 'employee', 
      department: 'Production',
      site: 'Menuiserie 44',
      phone: '02 40 12 34 56',
      address: '321 Rue de Nantes, 44000 Nantes',
      children: 3,
      hireDate: '2017-09-05',
      contract: 'CDI - Non Cadre',
      category: 'Ouvrier qualifié',
      isActive: true,
      lastLogin: '2024-01-23 16:20',
      permissions: [],
      personalData: {
        birthDate: '1975-08-30',
        nationality: 'Française',
        maritalStatus: 'Marié',
        emergencyContact: { name: 'Moreau Claire', relationship: 'Épouse', phone: '06 12 34 56 78' },
        gdprConsent: { dataProcessing: true, marketing: false, consentDate: '2023-03-20', lastUpdated: '2023-03-20' }
      }
    }
  ];

  const departments = [
    'Direction', 'Éducatif', 'Administratif', 'Comptable', 'ASI',
    'Production', 'Commercial', 'Technique', 'Maintenance', 'Qualité'
  ];

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
  useEffect(() => {
    setUsers(mockUsers);
    setAuditLogs(mockAuditLogs);
  }, []);

  // Filtrage des utilisateurs
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || u.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  // Fonctions de gestion
  const handleEditUser = (userToEdit) => {
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

  const handleSaveUser = () => {
    if (selectedUser.id) {
      // Modifier utilisateur existant
      setUsers(users.map(u => u.id === selectedUser.id ? selectedUser : u));
      
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
    } else {
      // Nouveau utilisateur
      const newUser = {
        ...selectedUser, 
        id: Date.now().toString(),
        permissions: selectedUser.permissions || []
      };
      setUsers([...users, newUser]);
      
      // Log audit
      const auditEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        action: 'USER_CREATED',
        userId: newUser.id,
        userName: newUser.name,
        performedBy: user.name,
        details: 'Création nouvel utilisateur',
        ipAddress: '192.168.1.100'
      };
      setAuditLogs([auditEntry, ...auditLogs]);
    }
    setShowUserModal(false);
    setSelectedUser(null);
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
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              {filteredUsers.length} utilisateur(s) trouvé(s)
            </div>
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
      {/* Header avec onglets */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Gestion Avancée des Utilisateurs</h1>
            <p className="text-gray-600">Administration complète avec permissions, RGPD et audit</p>
          </div>
          <button
            onClick={() => {
              setSelectedUser({
                name: '', email: '', role: 'employee', department: '', site: '',
                phone: '', address: '', children: 0, hireDate: '', contract: '',
                category: '', isActive: true, permissions: [],
                personalData: { gdprConsent: { dataProcessing: false, marketing: false } }
              });
              setShowUserModal(true);
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            ➕ Nouvel Utilisateur
          </button>
        </div>
        
        {/* Onglets */}
        <div className="flex border-b border-gray-200 mt-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            👥 Utilisateurs
          </button>
          <button
            onClick={() => setActiveTab('recovery')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 ${
              activeTab === 'recovery'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🔧 Récupération
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 ${
              activeTab === 'audit'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 Audit
          </button>
        </div>
      </div>

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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type de contrat</label>
                    <select
                      value={selectedUser.contract}
                      onChange={(e) => setSelectedUser({...selectedUser, contract: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner un contrat</option>
                      {contracts.map(contract => (
                        <option key={contract} value={contract}>{contract}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie employé</label>
                    <select
                      value={selectedUser.category}
                      onChange={(e) => setSelectedUser({...selectedUser, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner une catégorie</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date d'embauche</label>
                    <input
                      type="date"
                      value={selectedUser.hireDate}
                      onChange={(e) => setSelectedUser({...selectedUser, hireDate: e.target.value})}
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
              {/* Templates de rôles */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-3">Templates de Rôles</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(roleTemplates).map(([key, template]) => (
                    <button
                      key={key}
                      onClick={() => applyRoleTemplate(key)}
                      className="p-3 border border-gray-200 rounded-lg text-left hover:bg-blue-50 hover:border-blue-300 transition-colors duration-200"
                    >
                      <div className="font-medium text-gray-800">{template.name}</div>
                      <div className="text-sm text-gray-600">{template.description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {template.permissions.length} permission(s)
                      </div>
                    </button>
                  ))}
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
    </div>
  );
};

export default UserManagement;