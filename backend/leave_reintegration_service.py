"""
Service de Réintégration Automatique des Congés
================================================

Ce service détecte automatiquement quand une absence de haute priorité 
(AM, MA, AT, etc.) interrompt des congés (CA, RTT, etc.) et déclenche 
la réintégration des jours concernés.

À intégrer dans votre logique d'import d'absences.
"""

from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)


# === CONFIGURATION DES PRIORITÉS ===

ABSENCE_PRIORITIES = {
    # Priorité 1 : Absences impératives (remplacent tout)
    "AM": 1,   # Arrêt Maladie
    "MA": 1,   # Maladie
    "AT": 1,   # Accident du Travail
    "MP": 1,   # Maladie Professionnelle
    
    # Priorité 2 : Absences légales (remplacent les congés)
    "CF": 2,   # Congé de Formation
    "PAT": 2,  # Paternité
    "MAT": 2,  # Maternité
    
    # Priorité 3 : Congés décomptés (peuvent être remplacés)
    "CA": 3,   # Congés Annuels
    "CP": 3,   # Congés Payés
    "CT": 3,   # Congés Trimestriels
    "RTT": 3,  # RTT
    "REC": 3,  # Récupération
    "CEX": 3,  # Congé Exceptionnel
    
    # Priorité 4 : Absences non décomptées (ne sont jamais remplacées)
    "TEL": 4,  # Télétravail
    "DEL": 4,  # Délégation
    "FO": 4,   # Formation
}

# Types d'absences qui doivent être réintégrées quand interrompues
REINTEGRATABLE_TYPES = ["CA", "CP", "CT", "RTT", "REC", "CEX"]


class LeaveReintegrationService:
    """
    Service pour gérer la réintégration automatique des congés.
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    
    def _get_priority(self, absence_type: str) -> int:
        """Retourne la priorité d'un type d'absence (plus petit = plus prioritaire)"""
        return ABSENCE_PRIORITIES.get(absence_type, 99)
    
    
    def _should_replace(self, existing_type: str, new_type: str) -> bool:
        """
        Détermine si new_type doit remplacer existing_type.
        
        Règle : new_type remplace existing_type si sa priorité est PLUS PETITE.
        """
        existing_priority = self._get_priority(existing_type)
        new_priority = self._get_priority(new_type)
        
        return new_priority < existing_priority
    
    
    def _should_reintegrate(self, replaced_type: str) -> bool:
        """
        Détermine si replaced_type doit être réintégré au compteur.
        
        Retourne True si c'est un type décompté (CA, RTT, etc.)
        """
        return replaced_type in REINTEGRATABLE_TYPES
    
    
    async def detect_replacements(
        self,
        employee_id: str,
        new_absence_id: str,
        new_absence_type: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict]:
        """
        Détecte les absences existantes qui vont être remplacées.
        
        **Paramètres** :
        - employee_id : ID de l'employé
        - new_absence_id : ID de la nouvelle absence
        - new_absence_type : Type de la nouvelle absence (ex: "AM")
        - start_date : Date de début (datetime)
        - end_date : Date de fin (datetime)
        
        **Retour** :
        Liste des remplacements détectés :
        ```python
        [
            {
                "original_absence_id": "507f...",
                "original_type": "CA",
                "days_to_reintegrate": 4.0,
                "reason": "Interrompu par AM du 05/01 au 10/01"
            }
        ]
        ```
        """
        replacements = []
        
        # Récupérer toutes les absences de l'employé qui chevauchent la période
        overlapping_absences = await self.db.absences.find({
            "employee_id": employee_id,
            "_id": {"$ne": new_absence_id},  # Exclure la nouvelle absence
            "$or": [
                # Cas 1 : L'absence existante commence pendant la nouvelle période
                {
                    "start_date": {"$gte": start_date, "$lte": end_date}
                },
                # Cas 2 : L'absence existante se termine pendant la nouvelle période
                {
                    "end_date": {"$gte": start_date, "$lte": end_date}
                },
                # Cas 3 : L'absence existante englobe toute la nouvelle période
                {
                    "start_date": {"$lte": start_date},
                    "end_date": {"$gte": end_date}
                }
            ]
        }).to_list(None)
        
        for existing in overlapping_absences:
            existing_type = existing.get("type", "")
            
            # Vérifier si la nouvelle absence doit remplacer l'existante
            if not self._should_replace(existing_type, new_absence_type):
                continue
            
            # Vérifier si l'absence remplacée doit être réintégrée
            if not self._should_reintegrate(existing_type):
                continue
            
            # Calculer le nombre de jours ouvrables à réintégrer
            overlap_start = max(start_date, existing["start_date"])
            overlap_end = min(end_date, existing["end_date"])
            
            days_to_reintegrate = self._count_workdays(overlap_start, overlap_end)
            
            if days_to_reintegrate > 0:
                replacements.append({
                    "original_absence_id": existing["_id"],
                    "original_type": existing_type,
                    "days_to_reintegrate": days_to_reintegrate,
                    "reason": (
                        f"Interrompu par {new_absence_type} "
                        f"du {start_date.strftime('%d/%m')} au {end_date.strftime('%d/%m')}"
                    ),
                    "overlap_start": overlap_start,
                    "overlap_end": overlap_end
                })
        
        return replacements
    
    
    def _count_workdays(self, start: datetime, end: datetime) -> float:
        """
        Compte le nombre de jours ouvrables entre deux dates (exclut samedi/dimanche).
        
        **Note** : Cette méthode ne prend PAS en compte les jours fériés.
        Pour une version plus précise, intégrez la liste des jours fériés français.
        """
        workdays = 0
        current = start
        
        while current <= end:
            # Lundi = 0, Dimanche = 6
            if current.weekday() < 5:  # Du lundi (0) au vendredi (4)
                workdays += 1
            current += timedelta(days=1)
        
        return float(workdays)
    
    
    async def process_reintegration(
        self,
        employee_id: str,
        leave_type: str,
        days: float,
        reason: str,
        original_absence_id: str,
        interrupting_absence_id: str
    ) -> Dict:
        """
        Effectue la réintégration d'un type de congé.
        
        Appelle l'API de réintégration et retourne le résultat.
        """
        try:
            # Importer le service de mise à jour des soldes
            from leave_balance_routes import update_balance, create_transaction
            
            # Mettre à jour le solde
            result = await update_balance(
                self.db,
                employee_id,
                leave_type,
                "reintegrate",
                days
            )
            
            # Créer la transaction
            transaction = await create_transaction(
                self.db,
                employee_id,
                leave_type,
                "reintegrate",
                days,
                result["balance_before"],
                result["balance_after"],
                reason,
                related_absence_id=original_absence_id,
                interrupting_absence_id=interrupting_absence_id,
                is_automatic=True
            )
            
            logger.info(
                f"✅ Réintégration automatique : {days} jour(s) de {leave_type} "
                f"pour employee={employee_id}"
            )
            
            return {
                "success": True,
                "transaction_id": transaction.id,
                "balance_after": result["balance_after"]
            }
        
        except Exception as e:
            logger.error(f"❌ Erreur réintégration : {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    
    async def handle_absence_creation(
        self,
        employee_id: str,
        absence_id: str,
        absence_type: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """
        Point d'entrée principal : à appeler lors de la création d'une absence.
        
        Détecte les remplacements et effectue les réintégrations si nécessaire.
        
        **Retour** :
        ```python
        {
            "replacements_detected": 2,
            "reintegrations_performed": 2,
            "details": [
                {
                    "leave_type": "CA",
                    "days": 4.0,
                    "success": True,
                    "transaction_id": "507f..."
                }
            ]
        }
        ```
        """
        # 1. Détecter les remplacements
        replacements = await self.detect_replacements(
            employee_id,
            absence_id,
            absence_type,
            start_date,
            end_date
        )
        
        if not replacements:
            logger.info(f"ℹ️ Aucun remplacement détecté pour absence {absence_id}")
            return {
                "replacements_detected": 0,
                "reintegrations_performed": 0,
                "details": []
            }
        
        # 2. Effectuer les réintégrations
        reintegration_results = []
        
        for replacement in replacements:
            result = await self.process_reintegration(
                employee_id,
                replacement["original_type"],
                replacement["days_to_reintegrate"],
                replacement["reason"],
                replacement["original_absence_id"],
                absence_id
            )
            
            reintegration_results.append({
                "leave_type": replacement["original_type"],
                "days": replacement["days_to_reintegrate"],
                "success": result["success"],
                "transaction_id": result.get("transaction_id"),
                "error": result.get("error")
            })
        
        successful_reintegrations = sum(1 for r in reintegration_results if r["success"])
        
        logger.info(
            f"📊 Résumé réintégration pour absence {absence_id} : "
            f"{successful_reintegrations}/{len(replacements)} réussies"
        )
        
        return {
            "replacements_detected": len(replacements),
            "reintegrations_performed": successful_reintegrations,
            "details": reintegration_results
        }


# === FONCTION D'INTÉGRATION DANS VOTRE CODE EXISTANT ===

async def integrate_reintegration_on_absence_creation(
    db: AsyncIOMotorDatabase,
    employee_id: str,
    absence_data: Dict
) -> Dict:
    """
    Fonction à appeler après la création d'une absence dans votre code existant.
    
    **Exemple d'utilisation dans votre endpoint de création d'absence** :
    
    ```python
    @api_router.post("/absences")
    async def create_absence(absence: AbsenceCreate):
        # 1. Créer l'absence comme d'habitude
        absence_id = await db.absences.insert_one(absence.dict())
        
        # 2. 🆕 Déclencher la réintégration automatique
        reintegration_result = await integrate_reintegration_on_absence_creation(
            db,
            absence.employee_id,
            {
                "absence_id": str(absence_id.inserted_id),
                "type": absence.type,
                "start_date": absence.start_date,
                "end_date": absence.end_date
            }
        )
        
        # 3. Retourner le résultat avec les infos de réintégration
        return {
            "success": True,
            "absence_id": str(absence_id.inserted_id),
            "reintegration": reintegration_result
        }
    ```
    """
    service = LeaveReintegrationService(db)
    
    result = await service.handle_absence_creation(
        employee_id,
        absence_data["absence_id"],
        absence_data["type"],
        absence_data["start_date"],
        absence_data["end_date"]
    )
    
    return result


# === EXEMPLE D'UTILISATION STANDALONE ===

async def example_usage():
    """Exemple complet d'utilisation du service"""
    from motor.motor_asyncio import AsyncIOMotorClient
    import os
    
    # Connexion MongoDB
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Créer le service
    service = LeaveReintegrationService(db)
    
    # Exemple : Un employé a posé CA du 01/01 au 14/01
    # Puis un AM survient du 05/01 au 10/01
    
    result = await service.handle_absence_creation(
        employee_id="507f1f77bcf86cd799439012",
        absence_id="507f1f77bcf86cd799439015",  # ID de l'AM
        absence_type="AM",
        start_date=datetime(2025, 1, 5),
        end_date=datetime(2025, 1, 10)
    )
    
    print(result)
    # {
    #     "replacements_detected": 1,
    #     "reintegrations_performed": 1,
    #     "details": [
    #         {
    #             "leave_type": "CA",
    #             "days": 4.0,
    #             "success": True,
    #             "transaction_id": "507f..."
    #         }
    #     ]
    # }


# === TESTS UNITAIRES ===

async def test_priority_logic():
    """Test de la logique de priorités"""
    from motor.motor_asyncio import AsyncIOMotorClient
    import os
    
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    service = LeaveReintegrationService(db)
    
    # Test 1 : AM doit remplacer CA
    assert service._should_replace("CA", "AM") == True
    print("✅ Test 1 : AM remplace CA")
    
    # Test 2 : CA ne doit PAS remplacer AM
    assert service._should_replace("AM", "CA") == False
    print("✅ Test 2 : CA ne remplace pas AM")
    
    # Test 3 : TEL ne doit PAS remplacer CA
    assert service._should_replace("CA", "TEL") == False
    print("✅ Test 3 : TEL ne remplace pas CA")
    
    # Test 4 : CA doit être réintégré
    assert service._should_reintegrate("CA") == True
    print("✅ Test 4 : CA est réintégrable")
    
    # Test 5 : AM ne doit PAS être réintégré
    assert service._should_reintegrate("AM") == False
    print("✅ Test 5 : AM n'est pas réintégrable")
    
    print("\n🎉 Tous les tests passent !")


if __name__ == "__main__":
    import asyncio
    
    # Exécuter les tests
    asyncio.run(test_priority_logic())
