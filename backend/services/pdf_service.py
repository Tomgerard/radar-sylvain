import os
from datetime import datetime
from models import Devis

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_DIR = os.path.join(BASE_DIR, "pdfs")

MENTIONS_GUSO = """Contrat GUSO intermittent du spectacle. Merci de vous renseigner sur www.guso.fr pour faire les démarches. Pour le GUSO merci de me l'envoyer avant validation. Les informations pour le GUSO et le descriptif de la prestation ont été envoyés par mail."""

CLAUSE_ANNULATION = """En cas de maladie, d'accident ou de tout autre empêchement indépendant de la volonté de l'artiste rendant impossible l'exécution de la prestation prévue, la responsabilité de l'artiste ne pourra en aucun cas être engagée."""

def generer_html_devis(devis: Devis) -> str:
    date_formatee = datetime.now().strftime("%d/%m/%Y")
    return f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ font-family: Georgia, serif; color: #1a1a1a; padding: 40px; background: white; }}
            .header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #8B0000; padding-bottom: 20px; }}
            .header-left h1 {{ font-size: 28px; color: #8B0000; letter-spacing: 2px; text-transform: uppercase; }}
            .header-left p {{ color: #555; font-size: 13px; margin-top: 4px; }}
            .header-right {{ text-align: right; font-size: 13px; color: #555; }}
            .numero-devis {{ background: #8B0000; color: white; padding: 8px 16px; border-radius: 4px; font-size: 14px; margin-bottom: 30px; display: inline-block; }}
            .section {{ margin-bottom: 28px; }}
            .section-title {{ font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #8B0000; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 12px; }}
            .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
            .field label {{ font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }}
            .field p {{ font-size: 14px; color: #1a1a1a; margin-top: 2px; }}
            .prix {{ font-size: 32px; color: #8B0000; font-weight: bold; text-align: right; margin: 20px 0; }}
            .mention {{ background: #f9f9f9; border-left: 3px solid #8B0000; padding: 12px 16px; font-size: 12px; color: #555; line-height: 1.6; margin-bottom: 16px; }}
            .validite {{ font-size: 13px; color: #555; margin-bottom: 30px; }}
            .signature {{ display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }}
            .signature-box {{ border: 1px solid #ddd; padding: 16px; min-height: 100px; }}
            .signature-box p {{ font-size: 12px; color: #888; margin-bottom: 8px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="header-left">
                <h1>Sylvain Gérard</h1>
                <p>Artiste de spectacle</p>
                <p>La Thuile de Vulmix — 73700 Bourg-Saint-Maurice</p>
                <p>06 23 26 13 59</p>
            </div>
            <div class="header-right">
                <p>Date : {date_formatee}</p>
                <p>Validité : 1 mois</p>
            </div>
        </div>

        <div class="numero-devis">Devis N° {devis.numero}</div>

        <div class="section">
            <div class="section-title">Client</div>
            <div class="grid">
                <div class="field"><label>Nom / Organisateur</label><p>{devis.nom_client}</p></div>
                <div class="field"><label>Adresse</label><p>{devis.adresse_client}</p></div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Prestation</div>
            <div class="grid">
                <div class="field"><label>Événement</label><p>{devis.nom_evenement}</p></div>
                <div class="field"><label>Type de prestation</label><p>{devis.type_prestation}</p></div>
                <div class="field"><label>Date</label><p>{devis.date_evenement}</p></div>
                <div class="field"><label>Durée</label><p>{devis.duree}</p></div>
                <div class="field"><label>Horaires</label><p>{devis.horaires}</p></div>
            </div>
            <div class="field" style="margin-top:12px"><label>Description</label><p style="margin-top:6px;line-height:1.6">{devis.description}</p></div>
        </div>

        <div class="prix">{devis.prix_ttc:.2f} € TTC</div>

        <div class="section">
            <div class="section-title">Mentions légales</div>
            <div class="mention">{MENTIONS_GUSO}</div>
            <div class="mention">{CLAUSE_ANNULATION}</div>
            <p class="validite">Ce devis est valable 1 mois à compter de sa date d'émission.</p>
        </div>

        <div class="signature">
            <div class="signature-box">
                <p>Signature de l'artiste</p>
                <p style="margin-top:40px">Sylvain Gérard</p>
            </div>
            <div class="signature-box">
                <p>Bon pour accord — Signature du client</p>
                <p style="margin-top:8px;font-size:11px;color:#aaa">Précéder la signature de la mention "Lu et approuvé"</p>
            </div>
        </div>
    </body>
    </html>
    """

async def generer_pdf(devis: Devis) -> str:
    from weasyprint import HTML
    os.makedirs(PDF_DIR, exist_ok=True)
    html_content = generer_html_devis(devis)
    pdf_path = os.path.join(PDF_DIR, f"devis_{devis.numero}.pdf")
    HTML(string=html_content).write_pdf(pdf_path)
    return pdf_path