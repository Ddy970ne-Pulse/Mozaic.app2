"""
Service d'envoi d'emails via SMTP Gmail
Pour l'envoi des identifiants aux nouveaux employés
"""

import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

logger = logging.getLogger(__name__)

def send_credential_email(
    recipient_email: str,
    recipient_name: str,
    password: str,
    department: Optional[str] = None
) -> bool:
    """
    Envoie un email avec les identifiants de connexion à un nouvel employé
    
    Args:
        recipient_email: Email du destinataire (identifiant de connexion)
        recipient_name: Nom complet de l'employé
        password: Mot de passe initial
        department: Département (optionnel)
    
    Returns:
        bool: True si envoyé avec succès, False sinon
    """
    
    # Ne pas envoyer aux adresses internes auto-générées
    if "@internal.aaea-gpe.fr" in recipient_email:
        logger.info(f"Email non envoyé à {recipient_email} (adresse interne auto-générée)")
        return False
    
    try:
        # Configuration SMTP Gmail
        smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_email = os.getenv('SMTP_EMAIL')
        smtp_password = os.getenv('SMTP_PASSWORD')
        
        if not smtp_email or not smtp_password:
            logger.error("Configuration SMTP manquante dans .env")
            return False
        
        # Créer le message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = '🔐 Vos identifiants MOZAIK RH - AAEA GPE'
        msg['From'] = f"MOZAIK RH <{smtp_email}>"
        msg['To'] = recipient_email
        
        # Template HTML professionnel
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                }}
                .content {{
                    background: white;
                    padding: 30px;
                    border: 1px solid #e0e0e0;
                }}
                .credentials-box {{
                    background: #f8f9fa;
                    border-left: 4px solid #667eea;
                    padding: 20px;
                    margin: 20px 0;
                    border-radius: 5px;
                }}
                .credential-item {{
                    margin: 15px 0;
                }}
                .credential-label {{
                    font-weight: bold;
                    color: #667eea;
                    display: block;
                    margin-bottom: 5px;
                }}
                .credential-value {{
                    font-family: 'Courier New', monospace;
                    font-size: 16px;
                    background: white;
                    padding: 10px;
                    border-radius: 4px;
                    border: 1px solid #dee2e6;
                    color: #212529;
                }}
                .password-value {{
                    font-size: 18px;
                    font-weight: bold;
                    color: #d63384;
                    letter-spacing: 1px;
                }}
                .instructions {{
                    background: #e7f3ff;
                    border-left: 4px solid #2196F3;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 5px;
                }}
                .instructions h3 {{
                    color: #1976d2;
                    margin-top: 0;
                }}
                .instructions ol {{
                    margin: 10px 0;
                    padding-left: 20px;
                }}
                .instructions li {{
                    margin: 8px 0;
                }}
                .warning {{
                    background: #fff3cd;
                    border-left: 4px solid #ffc107;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 5px;
                }}
                .warning strong {{
                    color: #856404;
                }}
                .footer {{
                    background: #f8f9fa;
                    padding: 20px;
                    text-align: center;
                    border-radius: 0 0 10px 10px;
                    border: 1px solid #e0e0e0;
                    border-top: none;
                    color: #6c757d;
                    font-size: 14px;
                }}
                .button {{
                    display: inline-block;
                    background: #667eea;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                    font-weight: bold;
                }}
                .logo {{
                    font-size: 40px;
                    margin-bottom: 10px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">🔐</div>
                <h1>MOZAIK RH</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">AAEA GPE - Gestion des Ressources Humaines</p>
            </div>
            
            <div class="content">
                <h2 style="color: #667eea;">Bienvenue, {recipient_name} !</h2>
                
                <p>Votre compte MOZAIK RH a été créé avec succès. Vous trouverez ci-dessous vos identifiants de connexion.</p>
                
                {f'<p><strong>Département :</strong> {department}</p>' if department else ''}
                
                <div class="credentials-box">
                    <h3 style="margin-top: 0; color: #667eea;">🔑 Vos Identifiants de Connexion</h3>
                    
                    <div class="credential-item">
                        <span class="credential-label">📧 Identifiant (Email) :</span>
                        <div class="credential-value">{recipient_email}</div>
                    </div>
                    
                    <div class="credential-item">
                        <span class="credential-label">🔒 Mot de Passe Initial :</span>
                        <div class="credential-value password-value">{password}</div>
                    </div>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Important :</strong> Conservez ce mot de passe en lieu sûr. Il vous permettra de vous reconnecter en cas d'oubli de votre mot de passe personnel.
                </div>
                
                <div class="instructions">
                    <h3>📋 Instructions de Première Connexion</h3>
                    <ol>
                        <li>Connectez-vous sur la plateforme MOZAIK RH</li>
                        <li>Utilisez votre email professionnel comme identifiant</li>
                        <li>Saisissez le mot de passe initial ci-dessus</li>
                        <li>Vous serez invité à changer votre mot de passe</li>
                        <li>Choisissez un mot de passe personnel et sécurisé</li>
                    </ol>
                </div>
                
                <div style="text-align: center;">
                    <p style="margin: 30px 0 10px 0; color: #6c757d;">En cas de problème de connexion, contactez votre administrateur.</p>
                </div>
            </div>
            
            <div class="footer">
                <p style="margin: 0;"><strong>AAEA GPE</strong></p>
                <p style="margin: 5px 0;">Ce message est confidentiel et destiné uniquement à {recipient_name}</p>
                <p style="margin: 5px 0; font-size: 12px;">Merci de ne pas répondre à cet email automatique</p>
            </div>
        </body>
        </html>
        """
        
        # Version texte simple (fallback)
        text_content = f"""
        MOZAIK RH - AAEA GPE
        Vos Identifiants de Connexion
        
        Bienvenue, {recipient_name} !
        
        Votre compte MOZAIK RH a été créé avec succès.
        {f'Département : {department}' if department else ''}
        
        VOS IDENTIFIANTS :
        - Identifiant (Email) : {recipient_email}
        - Mot de Passe Initial : {password}
        
        IMPORTANT : Conservez ce mot de passe en lieu sûr.
        
        INSTRUCTIONS DE PREMIÈRE CONNEXION :
        1. Connectez-vous sur MOZAIK RH
        2. Utilisez votre email professionnel comme identifiant
        3. Saisissez le mot de passe initial
        4. Changez votre mot de passe lors de la première connexion
        
        En cas de problème, contactez votre administrateur.
        
        AAEA GPE
        """
        
        # Attacher les deux versions
        part1 = MIMEText(text_content, 'plain')
        part2 = MIMEText(html_content, 'html')
        msg.attach(part1)
        msg.attach(part2)
        
        # Connexion et envoi
        logger.info(f"Envoi email à {recipient_email} via {smtp_host}:{smtp_port}")
        
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.send_message(msg)
        
        logger.info(f"✅ Email envoyé avec succès à {recipient_email}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de l'envoi de l'email à {recipient_email}: {str(e)}")
        return False


def send_bulk_credential_emails(users_data: list) -> dict:
    """
    Envoie les identifiants par email à plusieurs utilisateurs
    
    Args:
        users_data: Liste de dict avec {name, email, password, department}
    
    Returns:
        dict: Résumé des envois {sent: int, failed: int, skipped: int, details: list}
    """
    results = {
        "sent": 0,
        "failed": 0,
        "skipped": 0,
        "details": []
    }
    
    for user in users_data:
        email = user.get('email')
        name = user.get('name')
        password = user.get('password')
        department = user.get('department')
        
        # Vérifier si adresse interne
        if "@internal.aaea-gpe.fr" in email:
            results["skipped"] += 1
            results["details"].append({
                "email": email,
                "status": "skipped",
                "reason": "Adresse interne auto-générée"
            })
            continue
        
        # Envoyer l'email
        success = send_credential_email(email, name, password, department)
        
        if success:
            results["sent"] += 1
            results["details"].append({
                "email": email,
                "status": "sent"
            })
        else:
            results["failed"] += 1
            results["details"].append({
                "email": email,
                "status": "failed"
            })
    
    return results
