import aiosmtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SYLVAIN_EMAIL = os.getenv("SYLVAIN_EMAIL", "")

async def envoyer_devis_email(
    destinataire: str,
    nom_client: str,
    numero_devis: str,
    pdf_path: str
):
    """
    Envoie le devis PDF par email au client.
    Met Sylvain en copie automatiquement.
    """
    msg = MIMEMultipart()
    msg["From"] = SMTP_USER
    msg["To"] = destinataire
    msg["Cc"] = SYLVAIN_EMAIL
    msg["Subject"] = f"Devis N°{numero_devis} — Sylvain Gérard, Artiste"

    corps = f"""
Bonjour {nom_client},

Veuillez trouver ci-joint votre devis N°{numero_devis}.

N'hésitez pas à me contacter pour toute question.

Bien cordialement,
Sylvain Gérard
Artiste de spectacle
06 23 26 13 59
www.sylvaingerard.com
    """

    msg.attach(MIMEText(corps, "plain", "utf-8"))

    # Attacher le PDF
    with open(pdf_path, "rb") as f:
        part = MIMEBase("application", "octet-stream")
        part.set_payload(f.read())
        encoders.encode_base64(part)
        part.add_header(
            "Content-Disposition",
            f"attachment; filename=devis_{numero_devis}.pdf"
        )
        msg.attach(part)

    await aiosmtplib.send(
        msg,
        hostname=SMTP_HOST,
        port=SMTP_PORT,
        username=SMTP_USER,
        password=SMTP_PASSWORD,
        start_tls=True,
    )