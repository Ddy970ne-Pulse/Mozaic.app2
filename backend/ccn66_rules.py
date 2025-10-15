"""
Règles CCN66 pour le calcul des droits à congés
Convention Collective Nationale 66 - Établissements et services pour personnes inadaptées et handicapées
"""

from datetime import datetime, date
from typing import Dict, Optional
import math

# Catégories bénéficiant de 18 jours de CT
CATEGORY_A_KEYWORDS = [
    "educateur", "éducateur", "moniteur", "ouvrier qualifié", 
    "chef de service", "technique", "spécialisé", "specialise"
]

# Mapping des types de congés vers leurs codes
LEAVE_TYPE_CODES = {
    "Congés Payés": "CA",
    "Congés Trimestriels": "CT",
    "Congés d'ancienneté": "CEX",
    "Récupération": "REC",
    "RTT": "RTT"
}


def is_category_a(categorie_employe: Optional[str], metier: Optional[str]) -> bool:
    """
    Détermine si un employé appartient à la catégorie A (18j CT)
    
    Catégorie A : Éducateurs (tous types), Ouvriers qualifiés, Chefs de service
    Catégorie B : Autres (Cadres, Administratifs, etc.)
    
    Args:
        categorie_employe: Catégorie de l'employé (ex: "Cadre", "Technicien", etc.)
        metier: Métier de l'employé (ex: "Éducateur Spécialisé", "Chef de Service", etc.)
    
    Returns:
        bool: True si catégorie A (18j CT), False si catégorie B (9j CT)
    """
    # Combiner les deux champs pour la recherche
    search_text = f"{categorie_employe or ''} {metier or ''}".lower()
    
    # Vérifier si contient un mot-clé de catégorie A
    return any(keyword in search_text for keyword in CATEGORY_A_KEYWORDS)


def calculate_anciennete_days(date_embauche: Optional[str], reference_date: Optional[date] = None) -> int:
    """
    Calcule les jours de congés d'ancienneté selon CCN66
    
    Règle CCN66 : 2 jours par tranche de 5 ans, plafonné à 6 jours (15 ans)
    
    Args:
        date_embauche: Date d'embauche (format DD/MM/YYYY ou YYYY-MM-DD ou datetime)
        reference_date: Date de référence pour le calcul (défaut: aujourd'hui)
    
    Returns:
        int: Nombre de jours de congés d'ancienneté (0, 2, 4 ou 6)
    """
    if not date_embauche:
        return 0
    
    if reference_date is None:
        reference_date = date.today()
    
    try:
        # Parser la date d'embauche
        if isinstance(date_embauche, (date, datetime)):
            hire_date = date_embauche if isinstance(date_embauche, date) else date_embauche.date()
        elif isinstance(date_embauche, str):
            # Essayer format DD/MM/YYYY
            if '/' in date_embauche:
                parts = date_embauche.split('/')
                if len(parts) == 3:
                    hire_date = date(int(parts[2]), int(parts[1]), int(parts[0]))
            # Essayer format YYYY-MM-DD
            elif '-' in date_embauche:
                hire_date = datetime.fromisoformat(date_embauche).date()
            else:
                return 0
        else:
            return 0
        
        # Calculer l'ancienneté en années
        delta = reference_date - hire_date
        years = delta.days / 365.25
        
        # Calculer les jours selon tranches de 5 ans
        if years < 5:
            return 0
        elif years < 10:
            return 2
        elif years < 15:
            return 4
        else:
            return 6  # Plafonné à 6 jours
            
    except Exception as e:
        print(f"Erreur calcul ancienneté: {e}")
        return 0


def calculate_prorata(base_days: float, temps_travail: Optional[str]) -> float:
    """
    Calcule la proratisation pour temps partiel
    
    Args:
        base_days: Nombre de jours de base (temps plein)
        temps_travail: Description du temps de travail (ex: "Temps Plein", "Temps Partiel", "80%", etc.)
    
    Returns:
        float: Nombre de jours proratisé
    """
    if not temps_travail:
        return base_days
    
    temps_travail_lower = temps_travail.lower()
    
    # Temps plein
    if "temps plein" in temps_travail_lower or "plein" in temps_travail_lower:
        return base_days
    
    # Temps partiel avec pourcentage
    if "%" in temps_travail:
        try:
            # Extraire le pourcentage
            percentage_str = ''.join(filter(lambda x: x.isdigit() or x == '.', temps_travail))
            percentage = float(percentage_str)
            return round(base_days * (percentage / 100), 1)
        except:
            pass
    
    # Temps partiel avec fraction (ex: "80/100", "4/5")
    if "/" in temps_travail:
        try:
            parts = temps_travail.split("/")
            if len(parts) == 2:
                numerator = float(parts[0].strip())
                denominator = float(parts[1].strip())
                return round(base_days * (numerator / denominator), 1)
        except:
            pass
    
    # Si "temps partiel" sans précision, on considère 80% par défaut
    if "temps partiel" in temps_travail_lower or "partiel" in temps_travail_lower:
        return round(base_days * 0.8, 1)
    
    # Par défaut, temps plein
    return base_days


def calculate_employee_rights(
    categorie_employe: Optional[str],
    metier: Optional[str],
    date_embauche: Optional[str],
    temps_travail: Optional[str],
    reference_year: Optional[int] = None
) -> Dict[str, float]:
    """
    Calcule tous les droits à congés d'un employé selon CCN66
    
    Args:
        categorie_employe: Catégorie de l'employé
        metier: Métier de l'employé
        date_embauche: Date d'embauche
        temps_travail: Description du temps de travail
        reference_year: Année de référence (défaut: année actuelle)
    
    Returns:
        Dict avec les droits calculés:
        {
            "CA": float,  # Congés Payés
            "CT": float,  # Congés Trimestriels
            "CEX": float, # Congés d'ancienneté
            "category": str,  # "A" ou "B"
            "temps_travail_percent": float,  # Pourcentage temps de travail
            "is_temps_plein": bool
        }
    """
    if reference_year is None:
        reference_year = datetime.now().year
    
    # Déterminer la catégorie
    is_cat_a = is_category_a(categorie_employe, metier)
    category = "A" if is_cat_a else "B"
    
    # Droits de base (temps plein)
    ca_base = 30.0  # Congés Payés
    ct_base = 18.0 if is_cat_a else 9.0  # Congés Trimestriels
    cex_base = float(calculate_anciennete_days(date_embauche))  # Congés d'ancienneté
    
    # Déterminer si temps plein
    is_temps_plein = True
    temps_travail_percent = 100.0
    
    if temps_travail:
        temps_travail_lower = temps_travail.lower()
        if "partiel" in temps_travail_lower:
            is_temps_plein = False
            # Essayer d'extraire le pourcentage
            if "%" in temps_travail:
                try:
                    percentage_str = ''.join(filter(lambda x: x.isdigit() or x == '.', temps_travail))
                    temps_travail_percent = float(percentage_str)
                except:
                    temps_travail_percent = 80.0  # Défaut
            else:
                temps_travail_percent = 80.0  # Défaut pour temps partiel
    
    # Proratisation pour temps partiel
    ca_final = calculate_prorata(ca_base, temps_travail)
    ct_final = calculate_prorata(ct_base, temps_travail)
    # CCN66: Congés d'ancienneté NON proratisés (maintien intégral)
    cex_final = cex_base
    
    return {
        "CA": ca_final,
        "CT": ct_final,
        "CEX": cex_final,
        "REC": 0.0,  # Récupération (géré séparément)
        "RTT": 0.0,  # RTT (si applicable)
        "category": category,
        "temps_travail_percent": temps_travail_percent,
        "is_temps_plein": is_temps_plein,
        "ca_base": ca_base,
        "ct_base": ct_base,
        "cex_base": cex_base
    }


def format_rights_display(rights: Dict[str, float]) -> str:
    """
    Formate les droits pour affichage
    
    Args:
        rights: Dictionnaire retourné par calculate_employee_rights
    
    Returns:
        str: Texte formaté pour affichage
    """
    lines = []
    lines.append(f"Catégorie: {rights['category']} ({'18j CT' if rights['category'] == 'A' else '9j CT'})")
    lines.append(f"Temps de travail: {rights['temps_travail_percent']:.0f}%")
    lines.append(f"")
    lines.append(f"DROITS À CONGÉS:")
    lines.append(f"  • Congés Payés (CA): {rights['CA']:.1f} jours")
    lines.append(f"  • Congés Trimestriels (CT): {rights['CT']:.1f} jours")
    lines.append(f"  • Congés d'Ancienneté (CEX): {rights['CEX']:.0f} jours")
    
    if not rights['is_temps_plein']:
        lines.append(f"")
        lines.append(f"Droits temps plein (référence):")
        lines.append(f"  • CA: {rights['ca_base']:.0f}j → {rights['CA']:.1f}j")
        lines.append(f"  • CT: {rights['ct_base']:.0f}j → {rights['CT']:.1f}j")
        lines.append(f"  • CEX: {rights['cex_base']:.0f}j (non proratisé)")
    
    return "\n".join(lines)


# Tests unitaires
if __name__ == "__main__":
    print("🧪 TESTS CCN66 RULES")
    print("=" * 60)
    
    # Test 1: Éducateur temps plein, 12 ans d'ancienneté
    print("\n1️⃣ Éducateur Spécialisé - Temps Plein - 12 ans")
    rights = calculate_employee_rights(
        categorie_employe="Technicien",
        metier="Educateur Spécialisé",
        date_embauche="01/01/2013",
        temps_travail="Temps Plein"
    )
    print(format_rights_display(rights))
    
    # Test 2: Comptable temps partiel 80%, 7 ans d'ancienneté
    print("\n2️⃣ Comptable - Temps Partiel 80% - 7 ans")
    rights = calculate_employee_rights(
        categorie_employe="Cadre",
        metier="Comptable",
        date_embauche="01/01/2018",
        temps_travail="Temps Partiel 80%"
    )
    print(format_rights_display(rights))
    
    # Test 3: Chef de Service temps plein, 20 ans d'ancienneté
    print("\n3️⃣ Chef de Service - Temps Plein - 20 ans")
    rights = calculate_employee_rights(
        categorie_employe="Cadre",
        metier="Chef de Service",
        date_embauche="01/01/2005",
        temps_travail="Temps Plein"
    )
    print(format_rights_display(rights))
    
    print("\n" + "=" * 60)
