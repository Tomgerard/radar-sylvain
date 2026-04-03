import os
import json
import base64
import httpx
from datetime import datetime
from models import Devis

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_DIR = os.path.join(BASE_DIR, "pdfs")

MENTIONS_GUSO = "Contrat GUSO intermittent du spectacle. Merci de vous renseigner sur www.guso.fr pour faire les démarches. Pour le GUSO merci de me l'envoyer avant validation. Les informations pour le GUSO et le descriptif de la prestation ont été envoyés par mail."
CLAUSE_ANNULATION = "En cas de maladie, d'accident ou de tout autre empêchement indépendant de la volonté de l'artiste rendant impossible l'exécution de la prestation prévue, la responsabilité de l'artiste ne pourra en aucun cas être engagée."

_LOGO_CACHE: str = ""


async def get_logo_base64() -> str:
    global _LOGO_CACHE
    if _LOGO_CACHE:
        return _LOGO_CACHE
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get("https://i.postimg.cc/dQXhdWD3/logo.png")
            if resp.status_code == 200:
                _LOGO_CACHE = base64.b64encode(resp.content).decode()
                return _LOGO_CACHE
    except Exception:
        pass
    return ""


def _lignes_pdf(devis: Devis) -> list[dict]:
    raw = getattr(devis, "lignes_prestations", None)
    if raw:
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list) and parsed:
                return parsed
        except json.JSONDecodeError:
            pass
    return [{"libelle": devis.type_prestation or "Prestation artistique", "prix_ttc": float(devis.prix_ttc or 0)}]


def _opt(val) -> str:
    return (val or "").strip()


def generer_html_devis(devis: Devis, logo_b64: str = "") -> str:
    date_formatee = datetime.now().strftime("%d/%m/%Y")
    lignes = _lignes_pdf(devis)
    total = sum(float(l.get("prix_ttc", 0)) for l in lignes)

    logo_html = (
        f'<img src="data:image/png;base64,{logo_b64}" alt="Logo" style="max-height:70px;max-width:120px;object-fit:contain">'
        if logo_b64 else
        '<div style="font-size:18px;font-weight:900;color:#08112c;letter-spacing:1px">Sylvain Gérard</div>'
    )

    rows_html = "".join(
        f'<tr>'
        f'<td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:9px">{l.get("libelle","")}</td>'
        f'<td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:700;font-size:9px;white-space:nowrap">{float(l.get("prix_ttc",0)):.2f} €</td>'
        f'</tr>'
        for l in lignes
    )

    # Informations légales client
    client_lines = []
    if _opt(devis.nom_client):
        client_lines.append(f'<div style="font-weight:700;font-size:10px;color:#08112c">{_opt(devis.nom_client)}</div>')
    if _opt(getattr(devis, "raison_sociale", "")):
        client_lines.append(f'<div style="font-size:9px">{_opt(devis.raison_sociale)}</div>')
    if _opt(devis.adresse_client):
        client_lines.append(f'<div style="font-size:9px">{_opt(devis.adresse_client)}</div>')
    cp = _opt(getattr(devis, "code_postal_client", ""))
    ville = _opt(getattr(devis, "ville_client", ""))
    if cp or ville:
        client_lines.append(f'<div style="font-size:9px">{" ".join(filter(None,[cp,ville]))}</div>')
    if _opt(getattr(devis, "siret", "")):
        client_lines.append(f'<div style="font-size:9px;color:#555">SIRET : {_opt(devis.siret)}</div>')
    if _opt(getattr(devis, "numero_tva", "")):
        client_lines.append(f'<div style="font-size:9px;color:#555">TVA : {_opt(devis.numero_tva)}</div>')
    if _opt(getattr(devis, "representant_legal", "")):
        client_lines.append(f'<div style="font-size:9px;color:#555">Représentant : {_opt(devis.representant_legal)}</div>')
    if _opt(getattr(devis, "telephone_client", "")):
        client_lines.append(f'<div style="font-size:9px;color:#555">{_opt(devis.telephone_client)}</div>')
    if _opt(getattr(devis, "email_client", "")):
        client_lines.append(f'<div style="font-size:9px;color:#555">{_opt(devis.email_client)}</div>')
    client_html = "\n".join(client_lines) if client_lines else '<div style="font-size:9px;color:#999">—</div>'

    # Prestation
    type_ligne = ""
    if _opt(devis.type_prestation):
        type_ligne = f'<div style="font-size:9px"><span style="color:#888">Type :</span> {_opt(devis.type_prestation)}</div>'

    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  @page {{ size: A4; margin: 12mm; }}
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family: Arial, Helvetica, sans-serif; font-size:9px; color:#1a1a1a; background:#fff; }}
  .sep {{ border:none; border-top:1px solid #08112c; margin:6px 0; }}
  .section-title {{ font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#08112c; margin-bottom:5px; }}
  /* En-tête */
  .header {{ display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:8px; border-bottom:2px solid #08112c; margin-bottom:8px; }}
  .header-right {{ text-align:right; font-size:9px; color:#444; }}
  .header-right .numero {{ background:#08112c; color:#fff; padding:4px 10px; font-size:10px; font-weight:700; display:inline-block; margin-bottom:4px; }}
  .artiste-info {{ font-size:9px; color:#444; margin-top:4px; }}
  .artiste-info div {{ margin-top:1px; }}
  /* Grille 2 colonnes */
  .grid2 {{ display:flex; gap:12px; margin-bottom:8px; }}
  .col {{ flex:1; }}
  .box {{ border:1px solid #ddd; padding:6px 8px; background:#fafafa; min-height:60px; }}
  /* Table prestations */
  .table-prest {{ width:100%; border-collapse:collapse; margin-top:4px; }}
  .table-prest th {{ text-align:left; font-size:8px; text-transform:uppercase; letter-spacing:0.5px; color:#08112c; padding:4px 8px; border-bottom:1.5px solid #08112c; font-weight:700; }}
  .table-prest th:last-child {{ text-align:right; }}
  /* Prix */
  .prix-box {{ text-align:right; margin:6px 0; }}
  .prix-box .total {{ font-size:22px; font-weight:900; color:#f90932; }}
  .prix-box .label {{ font-size:8px; color:#666; text-transform:uppercase; letter-spacing:1px; }}
  /* Mentions */
  .mention {{ font-size:7.5px; color:#666; font-style:italic; line-height:1.5; padding:4px 6px; border-left:2px solid #08112c; margin-bottom:5px; }}
  /* Signatures */
  .sig-grid {{ display:flex; gap:16px; margin-top:8px; }}
  .sig-box {{ flex:1; border:1px solid #ccc; padding:8px; min-height:50px; }}
  .sig-title {{ font-size:8px; font-weight:700; color:#08112c; text-transform:uppercase; margin-bottom:4px; }}
  .sig-hint {{ font-size:7.5px; color:#999; font-style:italic; }}
</style>
</head>
<body>

<!-- EN-TÊTE -->
<div class="header">
  <div>
    {logo_html}
    <div class="artiste-info">
      <div><strong>Sylvain Gérard</strong> — Artiste de spectacle</div>
      <div>La Thuile de Vulmix — 73700 Bourg-Saint-Maurice</div>
      <div>06 23 26 13 59 &nbsp;|&nbsp; contact@sylvaingerard.com &nbsp;|&nbsp; sylvaingerard.com</div>
    </div>
  </div>
  <div class="header-right">
    <div class="numero">DEVIS N° {_opt(devis.numero)}</div>
    <div>Date : {date_formatee}</div>
    <div>Validité : 1 mois</div>
  </div>
</div>

<!-- CLIENT + PRESTATION -->
<div class="grid2">
  <div class="col">
    <div class="section-title">Client</div>
    <div class="box">
      {client_html}
    </div>
  </div>
  <div class="col">
    <div class="section-title">Prestation</div>
    <div class="box">
      {"" if not _opt(devis.nom_evenement) else f'<div style="font-weight:700;font-size:10px;color:#08112c;margin-bottom:3px">{_opt(devis.nom_evenement)}</div>'}
      {type_ligne}
      {"" if not _opt(devis.date_evenement) else f'<div style="font-size:9px"><span style="color:#888">Date :</span> {_opt(devis.date_evenement)}</div>'}
      {"" if not _opt(devis.duree) else f'<div style="font-size:9px"><span style="color:#888">Durée :</span> {_opt(devis.duree)}</div>'}
      {"" if not _opt(devis.horaires) or devis.horaires == "À définir" else f'<div style="font-size:9px"><span style="color:#888">Horaires :</span> {_opt(devis.horaires)}</div>'}
      {"" if not _opt(devis.description) else f'<div style="font-size:8.5px;color:#444;margin-top:4px;line-height:1.4">{_opt(devis.description)}</div>'}
    </div>
  </div>
</div>

<!-- DÉTAIL PRESTATIONS -->
<div class="section-title">Détail des prestations</div>
<table class="table-prest">
  <thead><tr><th>Prestation</th><th style="text-align:right">Montant TTC</th></tr></thead>
  <tbody>{rows_html}</tbody>
</table>

<!-- TOTAL -->
<div class="prix-box">
  <div class="total">{total:.2f} €</div>
  <div class="label">Total TTC</div>
</div>

<hr class="sep">

<!-- MENTIONS LÉGALES -->
<div class="section-title">Mentions légales</div>
<div class="mention">{MENTIONS_GUSO}</div>
<div class="mention">{CLAUSE_ANNULATION}</div>
<div style="font-size:8px;color:#555;margin-bottom:8px">Ce devis est valable 1 mois à compter de sa date d'émission ({date_formatee}).</div>

<hr class="sep">

<!-- SIGNATURES -->
<div class="sig-grid">
  <div class="sig-box">
    <div class="sig-title">Signature de l'artiste</div>
    <div style="margin-top:6px;font-size:9px;color:#444">Sylvain Gérard</div>
  </div>
  <div class="sig-box">
    <div class="sig-title">Bon pour accord — Client</div>
    <div class="sig-hint">Précéder la signature de la mention "Lu et approuvé"</div>
  </div>
</div>

</body>
</html>"""


async def generer_pdf(devis: Devis) -> str:
    from weasyprint import HTML
    os.makedirs(PDF_DIR, exist_ok=True)
    logo_b64 = await get_logo_base64()
    html_content = generer_html_devis(devis, logo_b64)
    pdf_path = os.path.join(PDF_DIR, f"devis_{devis.numero}.pdf")
    HTML(string=html_content).write_pdf(pdf_path)
    return pdf_path
