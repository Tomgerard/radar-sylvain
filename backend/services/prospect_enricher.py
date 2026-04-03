import re
import json
import asyncio
import unicodedata
import httpx
from bs4 import BeautifulSoup
from datetime import datetime

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9",
}
IGNORER_EMAILS = {"noreply", "no-reply", "donotreply", "wordpress", "exemple@", "test@", "example.com"}
IGNORER_DOMAINES = {"google.com", "facebook.com", "pagesjaunes.fr", "wikipedia.org", "youtube.com",
                    "twitter.com", "instagram.com", "linkedin.com", "duckduckgo.com"}


def slugifier(texte: str) -> str:
    """Convertit "Bourg-Saint-Maurice" → "bourg-saint-maurice"."""
    nfkd = unicodedata.normalize("NFKD", texte)
    ascii_ = nfkd.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", ascii_.lower()).strip("-")


async def verifier_url(client: httpx.AsyncClient, url: str) -> bool:
    """Retourne True si l'URL répond en 2xx/3xx."""
    try:
        r = await client.head(url, follow_redirects=True, timeout=6)
        return r.status_code < 400
    except Exception:
        return False


# ─── 1A. Trouver le site web ─────────────────────────────────────────────────

async def chercher_site_web(nom: str, ville: str, type_structure: str = "") -> str:
    slug_ville = slugifier(ville)
    slug_nom = slugifier(nom)

    async with httpx.AsyncClient(headers=HEADERS, timeout=10, follow_redirects=True) as client:

        # Heuristique mairies (très fiable)
        if type_structure in ("mairie",):
            candidats = [
                f"https://www.mairie-{slug_ville}.fr",
                f"https://mairie-{slug_ville}.fr",
                f"https://www.{slug_ville}.fr",
                f"https://www.commune-{slug_ville}.fr",
                f"https://ville-{slug_ville}.fr",
            ]
            for url in candidats:
                if await verifier_url(client, url):
                    return url

        # DuckDuckGo HTML (pas d'anti-bot contrairement à Google)
        query = f"{nom} {ville} site officiel"
        ddg_url = f"https://html.duckduckgo.com/html/?q={query}"
        try:
            resp = await client.get(ddg_url, headers={**HEADERS, "Accept": "text/html"})
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                for a in soup.select("a.result__url, .result__extras__url, a[href]"):
                    href = a.get("href", "")
                    # DuckDuckGo encode les URLs dans des redirects /l/?uddg=...
                    if "uddg=" in href:
                        from urllib.parse import unquote, urlparse, parse_qs
                        qs = parse_qs(urlparse(href).query)
                        href = unquote(qs.get("uddg", [""])[0])
                    if href.startswith("http") and not any(d in href for d in IGNORER_DOMAINES):
                        return href
        except Exception:
            pass

    return ""


# ─── 1B. Scraper le site web ─────────────────────────────────────────────────

def normaliser_telephone(tel: str) -> str:
    tel = re.sub(r"[\s.\-()]", "", tel)
    if tel.startswith("+33"):
        tel = "0" + tel[3:]
    if len(tel) == 10 and tel.startswith("0"):
        return " ".join([tel[i:i+2] for i in range(0, 10, 2)])
    return tel


def extraire_email(texte: str, html: str) -> str:
    # Chercher href mailto: en priorité
    mailto = re.search(r'href=["\']mailto:([^"\'?\s]+)', html)
    if mailto:
        email = mailto.group(1).lower()
        if not any(spam in email for spam in IGNORER_EMAILS):
            return email

    # Regex sur le texte
    emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', texte)
    for email in emails:
        el = email.lower()
        if not any(spam in el for spam in IGNORER_EMAILS):
            return el
    return ""


def extraire_telephone(texte: str, html: str) -> str:
    # Chercher href tel:
    tel_link = re.search(r'href=["\']tel:([^"\']+)', html)
    if tel_link:
        return normaliser_telephone(tel_link.group(1))

    # Regex sur le texte
    tels = re.findall(r'0[1-9][\s.\-]?(?:[0-9]{2}[\s.\-]?){4}', texte)
    if tels:
        return normaliser_telephone(tels[0])
    return ""


def extraire_responsable(soup: BeautifulSoup) -> tuple[str, str, str]:
    """Retourne (prenom, nom, titre)"""
    mots_cles = ["directeur", "président", "responsable", "gérant", "contact",
                 "directrice", "présidente", "manager", "pdg", "dg", "ceo"]
    for balise in ["h2", "h3", "p", "span", "div", "li"]:
        for el in soup.find_all(balise):
            texte = el.get_text(" ", strip=True).lower()
            if any(mot in texte for mot in mots_cles):
                texte_orig = el.get_text(" ", strip=True)
                # Chercher un vrai nom (2 mots capitalisés)
                noms = re.findall(r'\b([A-ZÉÈÊËÀÂÙÛÎÏÔŒÇ][a-zéèêëàâùûîïôœç]+)\b', texte_orig)
                if len(noms) >= 2:
                    titre = next((m for m in ["Directeur", "Directrice", "Président", "Présidente",
                                               "Responsable", "Gérant", "Manager"] if m.lower() in texte), "")
                    return noms[0], noms[1], titre
    return "", "", ""


def extraire_description(soup: BeautifulSoup) -> str:
    # Meta description
    meta = soup.find("meta", attrs={"name": "description"})
    if meta and meta.get("content", ""):
        return meta["content"][:300]
    # Premier paragraphe substantiel
    for p in soup.find_all("p"):
        texte = p.get_text(strip=True)
        if len(texte) > 50:
            return texte[:300]
    return ""


async def scraper_site(site_web: str) -> dict:
    """Scrape le site pour extraire email, tel, responsable, description."""
    base = site_web.rstrip("/")
    pages_a_tester = [
        base + "/contact",
        base + "/nous-contacter",
        base + "/contactez-nous",
        base + "/a-propos",
        base + "/equipe",
        base,
    ]

    resultats = {"email": "", "telephone": "", "responsable_prenom": "",
                 "responsable_nom": "", "responsable_titre": "", "description": "", "html": ""}

    async with httpx.AsyncClient(headers=HEADERS, timeout=10, follow_redirects=True) as client:
        for url in pages_a_tester:
            try:
                resp = await client.get(url)
                if resp.status_code != 200:
                    continue
                html = resp.text
                soup = BeautifulSoup(html, "html.parser")
                texte = soup.get_text(" ", strip=True)

                if not resultats["email"]:
                    resultats["email"] = extraire_email(texte, html)
                if not resultats["telephone"]:
                    resultats["telephone"] = extraire_telephone(texte, html)
                if not resultats["responsable_prenom"]:
                    p, n, t = extraire_responsable(soup)
                    resultats["responsable_prenom"] = p
                    resultats["responsable_nom"] = n
                    resultats["responsable_titre"] = t
                if not resultats["description"]:
                    resultats["description"] = extraire_description(soup)
                if not resultats["html"]:
                    resultats["html"] = html[:3000]

                # Si on a tout, on s'arrête
                if resultats["email"] and resultats["telephone"] and resultats["responsable_prenom"]:
                    break
            except Exception:
                continue

    return resultats


# ─── 1C. Enrichissement via Claude ───────────────────────────────────────────

async def enrichir_via_claude(nom: str, ville: str, type_structure: str, html: str) -> dict:
    from services.claude_service import client as claude_client
    prompt = f"""Voici le contenu HTML de la page contact de {nom} situé à {ville} ({type_structure}).

{html}

Extrais en JSON :
{{
  "email": "email trouvé ou null",
  "telephone": "tel trouvé ou null",
  "responsable_prenom": "prénom ou null",
  "responsable_nom": "nom ou null",
  "responsable_titre": "titre/poste ou null",
  "description": "description de la structure en 1 phrase"
}}
Réponds UNIQUEMENT en JSON."""

    try:
        message = await claude_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )
        texte = message.content[0].text.strip()
        # Nettoyer le JSON si encadré par ```
        texte = re.sub(r"^```(?:json)?\s*", "", texte)
        texte = re.sub(r"\s*```$", "", texte)
        return json.loads(texte)
    except Exception:
        return {}


# ─── Orchestrateur principal ─────────────────────────────────────────────────

async def enrichir_prospect(prospect: dict) -> dict:
    """
    Enrichit un prospect avec site web, email, téléphone, responsable.
    Retourne le prospect mis à jour.
    """
    nom = prospect.get("nom", "")
    ville = prospect.get("ville", "")
    type_structure = prospect.get("type_structure", "")

    # 1A — Trouver le site web si absent
    if not prospect.get("site_web"):
        site = await chercher_site_web(nom, ville, type_structure)
        if site:
            prospect["site_web"] = site

    # 1B — Scraper le site web
    if prospect.get("site_web"):
        donnees = await scraper_site(prospect["site_web"])

        # Compléter avec ce qu'on n'a pas encore
        if not prospect.get("email") and donnees["email"]:
            prospect["email"] = donnees["email"]
        if not prospect.get("telephone") and donnees["telephone"]:
            prospect["telephone"] = donnees["telephone"]
        if not prospect.get("responsable_prenom") and donnees["responsable_prenom"]:
            prospect["responsable_prenom"] = donnees["responsable_prenom"]
        if not prospect.get("responsable_nom") and donnees["responsable_nom"]:
            prospect["responsable_nom"] = donnees["responsable_nom"]
        if not prospect.get("responsable_titre") and donnees["responsable_titre"]:
            prospect["responsable_titre"] = donnees["responsable_titre"]
        if not prospect.get("description_structure") and donnees["description"]:
            prospect["description_structure"] = donnees["description"]

        # 1C — Enrichissement via Claude si on a du HTML
        if donnees["html"] and not (prospect.get("email") and prospect.get("responsable_prenom")):
            claude_data = await enrichir_via_claude(nom, ville, type_structure, donnees["html"])
            for champ in ["email", "telephone", "responsable_prenom", "responsable_nom",
                          "responsable_titre", "description_structure"]:
                if not prospect.get(champ):
                    val = claude_data.get(champ if champ != "description_structure" else "description")
                    if val and val != "null":
                        prospect[champ] = val

    prospect["site_web_scrape"] = 1
    prospect["email_trouve"] = 1 if prospect.get("email") else 0
    prospect["enrichissement_date"] = datetime.now().isoformat()

    return prospect
