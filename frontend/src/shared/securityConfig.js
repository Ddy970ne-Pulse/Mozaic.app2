// Configuration de sécurité renforcée pour MOZAIK RH
// Gestion des documents sensibles (arrêts maladie, certificats médicaux)

export const SECURITY_LEVELS = {
  PUBLIC: 'public',
  INTERNAL: 'internal', 
  CONFIDENTIAL: 'confidential',
  MEDICAL: 'medical' // Niveau spécial pour documents médicaux
};

export const DOCUMENT_TYPES = {
  MEDICAL_CERTIFICATE: {
    type: 'medical_certificate',
    securityLevel: SECURITY_LEVELS.MEDICAL,
    requiredEncryption: true,
    auditRequired: true,
    maxRetention: '10_years',
    accessControl: ['admin', 'hr_medical', 'employee_owner'],
    gdprCategory: 'sensitive_health_data'
  },
  SICK_LEAVE: {
    type: 'sick_leave',
    securityLevel: SECURITY_LEVELS.MEDICAL,
    requiredEncryption: true,
    auditRequired: true,
    maxRetention: '10_years', 
    accessControl: ['admin', 'hr_medical', 'employee_owner'],
    gdprCategory: 'sensitive_health_data'
  },
  GENERAL_DOCUMENT: {
    type: 'general_document',
    securityLevel: SECURITY_LEVELS.INTERNAL,
    requiredEncryption: false,
    auditRequired: true,
    maxRetention: '5_years',
    accessControl: ['admin', 'hr_general', 'manager', 'employee_owner'],
    gdprCategory: 'personal_data'
  }
};

export const ENCRYPTION_CONFIG = {
  algorithm: 'AES-256-GCM',
  keyRotationPeriod: '90_days',
  backupEncryption: true
};

export const AUDIT_CONFIG = {
  logLevel: 'detailed',
  retentionPeriod: '7_years',
  realTimeMonitoring: true,
  alerting: {
    unauthorizedAccess: true,
    dataExport: true,
    bulkDownload: true,
    suspiciousActivity: true
  }
};

export const ACCESS_CONTROL = {
  roles: {
    admin: {
      permissions: ['read', 'write', 'delete', 'audit', 'export'],
      departments: 'all'
    },
    hr_medical: {
      permissions: ['read', 'write', 'audit'],
      departments: 'all',
      specialization: 'medical_documents'
    },
    hr_general: {
      permissions: ['read', 'write'],
      departments: 'assigned',
      restrictions: ['no_medical_access']
    },
    manager: {
      permissions: ['read'],
      departments: 'managed_only',
      restrictions: ['no_medical_access', 'no_export']
    },
    employee_owner: {
      permissions: ['read', 'upload'],
      departments: 'own_data_only',
      restrictions: ['no_bulk_operations']
    }
  }
};

export const GDPR_COMPLIANCE = {
  dataProcessingPurpose: {
    medical_documents: 'Legal obligation for workplace health management',
    general_hr_documents: 'Contract execution and legal compliance'
  },
  legalBasis: {
    medical_documents: 'Article 9(2)(b) - Employment law',
    general_hr_documents: 'Article 6(1)(b) - Contract performance'
  },
  retentionPolicies: {
    medical_documents: '10 years after employment end',
    general_hr_documents: '5 years after employment end'
  },
  dataSubjectRights: {
    access: true,
    rectification: true,
    erasure: 'limited', // Limité par obligations légales
    portability: false, // Non applicable aux données médicales
    restriction: 'on_request'
  }
};

// Fonctions utilitaires de sécurité
export const SecurityUtils = {
  // Vérifier les permissions d'accès
  checkAccess: (userRole, documentType, action) => {
    const role = ACCESS_CONTROL.roles[userRole];
    const docConfig = DOCUMENT_TYPES[documentType];
    
    if (!role || !docConfig) return false;
    if (!role.permissions.includes(action)) return false;
    if (!docConfig.accessControl.includes(userRole)) return false;
    
    return true;
  },

  // Générer un ID de traçabilité
  generateAuditId: () => {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Logger les accès aux documents sensibles
  logAccess: (userId, documentId, action, documentType) => {
    const auditEntry = {
      id: SecurityUtils.generateAuditId(),
      timestamp: new Date().toISOString(),
      userId,
      documentId,
      action,
      documentType,
      securityLevel: DOCUMENT_TYPES[documentType]?.securityLevel,
      ipAddress: 'client_ip', // À remplacer par l'IP réelle
      userAgent: navigator.userAgent,
      sessionId: sessionStorage.getItem('sessionId') || 'unknown'
    };
    
    // En production, envoyer au système d'audit sécurisé
    console.log('[SECURITY AUDIT]', auditEntry);
    
    // Stocker localement pour cette démo
    const auditLog = JSON.parse(localStorage.getItem('security_audit_log') || '[]');
    auditLog.push(auditEntry);
    localStorage.setItem('security_audit_log', JSON.stringify(auditLog));
    
    return auditEntry.id;
  },

  // Vérifier l'intégrité des documents
  verifyDocumentIntegrity: (documentHash, storedHash) => {
    return documentHash === storedHash;
  },

  // Chiffrer les métadonnées sensibles (simulation)
  encryptMetadata: (metadata) => {
    // En production : utiliser un vrai chiffrement
    return btoa(JSON.stringify(metadata));
  },

  // Déchiffrer les métadonnées sensibles (simulation) 
  decryptMetadata: (encryptedMetadata) => {
    try {
      return JSON.parse(atob(encryptedMetadata));
    } catch {
      return null;
    }
  },

  // Générer un hash de document (simulation)
  generateDocumentHash: (fileContent) => {
    // En production : utiliser SHA-256 ou équivalent
    return btoa(fileContent).slice(0, 32);
  }
};

export default {
  SECURITY_LEVELS,
  DOCUMENT_TYPES,
  ENCRYPTION_CONFIG,
  AUDIT_CONFIG,
  ACCESS_CONTROL,
  GDPR_COMPLIANCE,
  SecurityUtils
};