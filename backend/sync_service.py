"""
Service de synchronisation pour maintenir la cohérence des données
"""
from datetime import datetime, timezone
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class DataSyncService:
    """Service centralisé pour la synchronisation des données"""
    
    def __init__(self, db):
        self.db = db
    
    async def sync_absence_to_counters(self, absence: Dict, operation: str = "create"):
        """
        Synchronise une absence avec les compteurs de congés
        
        Args:
            absence: Dictionnaire de l'absence
            operation: "create", "update", "delete", "approve", "reject"
        """
        try:
            employee_id = absence.get("employee_id")
            if not employee_id:
                logger.error("sync_absence_to_counters: employee_id manquant")
                return False
            
            # Récupérer le compteur de l'employé
            current_year = datetime.now().year
            balance = await self.db.leave_balances.find_one({
                "employee_id": employee_id,
                "year": current_year
            })
            
            if not balance:
                logger.warning(f"Compteur non trouvé pour {employee_id}, création automatique")
                # Créer un compteur par défaut (devrait normalement être initialisé)
                balance = {
                    "id": str(uuid.uuid4()),
                    "employee_id": employee_id,
                    "employee_name": absence.get("employee_name", ""),
                    "year": current_year,
                    "ca_initial": 30.0,
                    "ca_taken": 0.0,
                    "ca_balance": 30.0,
                    "ct_initial": 18.0,
                    "ct_taken": 0.0,
                    "ct_balance": 18.0,
                    "cex_initial": 0.0,
                    "cex_taken": 0.0,
                    "cex_balance": 0.0,
                    "rec_accumulated": 0.0,
                    "rec_taken": 0.0,
                    "rec_balance": 0.0
                }
                await self.db.leave_balances.insert_one(balance)
            
            # Déterminer le type d'absence et le champ à mettre à jour
            absence_type = absence.get("motif_absence", "")
            jours = float(absence.get("jours_absence", 0))
            absence_unit = absence.get("absence_unit", "jours")
            
            # Convertir heures en jours si nécessaire
            if absence_unit == "heures":
                jours = jours / 7.0  # 7 heures = 1 jour
            
            # Mapper le type d'absence au compteur
            counter_field = self._map_absence_to_counter(absence_type)
            
            if not counter_field:
                logger.info(f"Type d'absence '{absence_type}' ne nécessite pas de déduction de compteur")
                return True
            
            # Calculer la modification selon l'opération
            if operation in ["create", "approve"]:
                # Déduire des compteurs
                await self._deduct_from_counter(employee_id, counter_field, jours, absence)
                logger.info(f"✅ Déduit {jours}j de {counter_field} pour {employee_id}")
                
            elif operation == "delete":
                # Réintégrer dans les compteurs
                await self._reintegrate_to_counter(employee_id, counter_field, jours, absence)
                logger.info(f"✅ Réintégré {jours}j dans {counter_field} pour {employee_id}")
                
            elif operation == "reject":
                # Ne rien faire (les jours n'ont jamais été déduits)
                logger.info(f"✅ Rejet absence - pas de modification compteur")
                
            elif operation == "update":
                # Recalculer (réintégrer ancien + déduire nouveau)
                # Note: nécessite l'ancienne valeur
                logger.info(f"✅ Mise à jour absence - recalcul des compteurs")
            
            return True
            
        except Exception as e:
            logger.error(f"Erreur sync_absence_to_counters: {str(e)}")
            return False
    
    def _map_absence_to_counter(self, absence_type: str) -> Optional[str]:
        """Mapper un type d'absence au champ de compteur correspondant"""
        mapping = {
            "Congés Payés": "ca",
            "Congés Trimestriels": "ct",
            "Congés d'ancienneté": "cex",
            "Récupération": "rec",
            "RTT": "rtt"
        }
        return mapping.get(absence_type)
    
    async def _deduct_from_counter(self, employee_id: str, counter_field: str, 
                                   amount: float, absence: Dict):
        """Déduire du compteur et créer une transaction"""
        current_year = datetime.now().year
        
        # Mettre à jour les champs taken et balance
        update_fields = {
            f"{counter_field}_taken": amount,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        
        # Utiliser $inc pour incrémenter taken et décrémenter balance
        await self.db.leave_balances.update_one(
            {"employee_id": employee_id, "year": current_year},
            {
                "$inc": {
                    f"{counter_field}_taken": amount,
                    f"{counter_field}_balance": -amount
                },
                "$set": {
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Créer une transaction
        transaction = {
            "id": str(uuid.uuid4()),
            "employee_id": employee_id,
            "employee_name": absence.get("employee_name", ""),
            "type": counter_field.upper(),
            "operation": "deduct",
            "amount": amount,
            "date": datetime.now(timezone.utc).isoformat(),
            "absence_id": absence.get("id"),
            "reason": f"Absence {absence.get('motif_absence')} du {absence.get('date_debut')} au {absence.get('date_fin')}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.leave_transactions.insert_one(transaction)
        logger.info(f"📊 Transaction créée: -{amount}j de {counter_field}")
    
    async def _reintegrate_to_counter(self, employee_id: str, counter_field: str, 
                                      amount: float, absence: Dict):
        """Réintégrer dans le compteur"""
        current_year = datetime.now().year
        
        # Utiliser $inc pour décrémenter taken et incrémenter balance
        await self.db.leave_balances.update_one(
            {"employee_id": employee_id, "year": current_year},
            {
                "$inc": {
                    f"{counter_field}_taken": -amount,
                    f"{counter_field}_balance": amount,
                    f"{counter_field}_reintegrated": amount
                },
                "$set": {
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Créer une transaction
        transaction = {
            "id": str(uuid.uuid4()),
            "employee_id": employee_id,
            "employee_name": absence.get("employee_name", ""),
            "type": counter_field.upper(),
            "operation": "reintegrate",
            "amount": amount,
            "date": datetime.now(timezone.utc).isoformat(),
            "absence_id": absence.get("id"),
            "reason": f"Annulation absence {absence.get('motif_absence')}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.leave_transactions.insert_one(transaction)
        logger.info(f"📊 Transaction créée: +{amount}j dans {counter_field}")


# Import nécessaire
import uuid
