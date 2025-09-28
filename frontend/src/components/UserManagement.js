import React, { useState, useEffect } from 'react';

const UserManagement = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showGdprModal, setShowGdprModal] = useState(false);
  const [showAccountRecovery, setShowAccountRecovery] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [recoveryType, setRecoveryType] = useState('password'); // 'password' ou 'username'
  const [auditLogs, setAuditLogs] = useState([]);

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
      lastLogin: '2024-01-25 09:30'
    },
    {
      id: '2', 
      name: 'Jean Dupont',
      email: 'manager@company.com',
      role: 'manager',
      department: 'IT',
      site: 'Siège',
      phone: '01 23 45 67 90',
      address: '456 Avenue des Champs, 75008 Paris',
      children: 1,
      hireDate: '2019-07-22',
      contract: 'CDI - Cadre',
      category: 'Cadre',
      isActive: true,
      lastLogin: '2024-01-24 17:45'
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
      lastLogin: '2024-01-25 08:15'
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
      lastLogin: '2024-01-23 16:20'
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

  useEffect(() => {
    setUsers(mockUsers);
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

  const handleSaveUser = () => {
    if (selectedUser.id) {
      // Modifier utilisateur existant
      setUsers(users.map(u => u.id === selectedUser.id ? selectedUser : u));
    } else {
      // Nouveau utilisateur
      const newUser = {...selectedUser, id: Date.now().toString()};
      setUsers([...users, newUser]);
    }
    setShowUserModal(false);
    setSelectedUser(null);
  };

  const handleResetPassword = (userId) => {
    const resetUser = users.find(u => u.id === userId);
    if (resetUser) {
      // Simulation de reset
      alert(`✅ Mot de passe réinitialisé pour ${resetUser.name}.\nNouveau mot de passe temporaire envoyé par email.`);
    }
    setShowPasswordReset(false);
  };

  const handleToggleUserStatus = (userId) => {
    setUsers(users.map(u => 
      u.id === userId ? {...u, isActive: !u.isActive} : u
    ));
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Gestion des Utilisateurs</h1>
            <p className="text-gray-600">Administration des comptes et droits d'accès</p>
          </div>
          <button
            onClick={() => {
              setSelectedUser({
                name: '', email: '', role: 'employee', department: '', site: '',
                phone: '', address: '', children: 0, hireDate: '', contract: '',
                category: '', isActive: true
              });
              setShowUserModal(true);
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            ➕ Nouvel Utilisateur
          </button>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
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
                  Site
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dernière connexion
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {userItem.site}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {userItem.lastLogin}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditUser(userItem)}
                      className="text-blue-600 hover:text-blue-900 transition-colors duration-200"
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(userItem);
                        setShowPasswordReset(true);
                      }}
                      className="text-orange-600 hover:text-orange-900 transition-colors duration-200"
                    >
                      🔑 Reset MdP
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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