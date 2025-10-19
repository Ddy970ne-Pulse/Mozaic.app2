import React from 'react';
import { ModuleHeader, ContentCard, Section } from './shared/UIComponents';

const HelpPage = ({ user }) => {
  const helpSections = [
    {
      title: 'Guide de Démarrage',
      icon: '🚀',
      items: [
        { question: 'Comment créer une demande d\'absence ?', answer: 'Allez dans "Demandes d\'Absence" > "Nouvelle Demande", sélectionnez le type, les dates et soumettez.' },
        { question: 'Comment consulter le planning ?', answer: 'Accédez au "Planning Mensuel" depuis le menu principal. Vous pouvez filtrer par mois et année.' },
        { question: 'Comment gérer mes heures supplémentaires ?', answer: 'Le module "Heures Supplémentaires" permet de consulter vos heures accumulées et demander des récupérations.' }
      ]
    },
    {
      title: 'Import de Données',
      icon: '📥',
      items: [
        { question: 'Quels formats Excel sont supportés ?', answer: 'Format .xlsx avec les colonnes: Nom, Prénom, Email, Date début, Jours absence, Motif.' },
        { question: 'Comment importer du personnel ?', answer: 'Module "Import Excel" > Type: Personnel > Charger le fichier > Valider > Importer.' },
        { question: 'Que faire en cas d\'erreur d\'import ?', answer: 'Le système affiche les erreurs et avertissements. Corrigez le fichier Excel selon les indications et réessayez.' }
      ]
    },
    {
      title: 'Analytics & Rapports',
      icon: '📊',
      items: [
        { question: 'Comment générer un rapport ?', answer: 'Module "Rapports Standards" > Sélectionnez la période > Choisissez le format > Exporter.' },
        { question: 'Quels KPI sont disponibles ?', answer: 'Taux d\'absentéisme, heures sup totales, congés par département, effectif actif, etc.' },
        { question: 'Comment filtrer les analytics ?', answer: 'Utilisez les filtres de période (mensuel, trimestriel, annuel, personnalisé) en haut du module.' }
      ]
    },
    {
      title: 'CSE & Délégation',
      icon: '🏛️',
      items: [
        { question: 'Comment gérer les membres CSE ?', answer: 'Les membres CSE sont automatiquement détectés depuis le champ statut_cse des utilisateurs.' },
        { question: 'Comment céder des heures de délégation ?', answer: 'Module "CSE & Délégation" > Onglet "Cessions" > "Nouvelle Cession" > Remplir le formulaire.' },
        { question: 'Quelle est la limite de cession ?', answer: 'Selon CCN66, un délégué peut recevoir jusqu\'à 1,5x son crédit de base (max 15h pour 10h de base).' }
      ]
    },
    {
      title: 'Gestion des Absences',
      icon: '📅',
      items: [
        { question: 'Types d\'absences disponibles ?', answer: 'CA (Congés Annuels), RTT, Maladie, Congé Maternité/Paternité, Accident de travail, etc. (21 types au total).' },
        { question: 'Comment calculer les jours d\'absence ?', answer: 'Le système utilise la méthode CCN66 avec jours ouvrés et calendaires selon le type d\'absence.' },
        { question: 'Peut-on demander une demi-journée ?', answer: 'Oui, cochez l\'option "Demi-journée" lors de la création de la demande.' }
      ]
    },
    {
      title: 'Sécurité & Permissions',
      icon: '🔒',
      items: [
        { question: 'Qui peut valider les absences ?', answer: 'Les utilisateurs avec rôle Admin, Manager ou RH peuvent valider les demandes.' },
        { question: 'Comment changer mon mot de passe ?', answer: 'Paramètres > Sécurité > Changer le mot de passe.' },
        { question: 'Puis-je supprimer des données ?', answer: 'Seuls les admins peuvent supprimer des données via la "Zone de Danger" dans Import Excel (nécessite confirmation).' }
      ]
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <ModuleHeader
        title="Centre d'Aide"
        subtitle="Documentation et guide d'utilisation de MOZAIK RH"
        icon="❓"
      />

      {/* Recherche rapide */}
      <ContentCard color="purple">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🔍</span>
          <input
            type="text"
            placeholder="Rechercher dans l'aide..."
            className="flex-1 px-4 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
      </ContentCard>

      {/* Raccourcis rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ContentCard color="blue">
          <div className="text-center py-4">
            <div className="text-4xl mb-3">📚</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">Documentation</h3>
            <p className="text-sm text-gray-600">Guide complet d'utilisation</p>
          </div>
        </ContentCard>

        <ContentCard color="green">
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🎥</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">Tutoriels Vidéo</h3>
            <p className="text-sm text-gray-600">Apprenez en vidéo</p>
          </div>
        </ContentCard>

        <ContentCard color="purple">
          <div className="text-center py-4">
            <div className="text-4xl mb-3">💬</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">Support</h3>
            <p className="text-sm text-gray-600">Contactez l'équipe</p>
          </div>
        </ContentCard>
      </div>

      {/* Sections d'aide */}
      <div className="space-y-6">
        {helpSections.map((section, index) => (
          <ContentCard key={index} title={section.title} icon={section.icon}>
            <div className="space-y-4">
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex} className="border-l-4 border-purple-500 pl-4 py-2">
                  <h4 className="font-semibold text-gray-800 mb-2">{item.question}</h4>
                  <p className="text-gray-600 text-sm">{item.answer}</p>
                </div>
              ))}
            </div>
          </ContentCard>
        ))}
      </div>

      {/* Contact Support */}
      <ContentCard color="blue">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-5xl">🆘</div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Besoin d'aide supplémentaire ?</h3>
              <p className="text-gray-600">Notre équipe support est là pour vous aider</p>
            </div>
          </div>
          <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-md">
            Contacter le Support
          </button>
        </div>
      </ContentCard>

      {/* Version et informations */}
      <div className="text-center text-sm text-gray-500 space-y-1">
        <p>MOZAIK RH - Version 2.0</p>
        <p>Dernière mise à jour: Janvier 2025</p>
      </div>
    </div>
  );
};

export default HelpPage;
