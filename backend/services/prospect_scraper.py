import re
import json
import httpx
from pathlib import Path
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import Prospect

HEADERS = {
    "User-Agent": "RadarSylvain/1.0",
    "Accept": "application/json",
}

LAST_SCRAPE_FILE = Path(__file__).parent.parent / "last_prospect_scrape.json"


def peut_lancer_scrape() -> bool:
    """Limite le scraping à 1 fois par jour."""
    if not LAST_SCRAPE_FILE.exists():
        return True
    try:
        data = json.loads(LAST_SCRAPE_FILE.read_text())
        last = datetime.fromisoformat(data.get("last_run", "2000-01-01"))
        return (datetime.now() - last).total_seconds() > 86400
    except Exception:
        return True


def enregistrer_scrape():
    LAST_SCRAPE_FILE.write_text(json.dumps({"last_run": datetime.now().isoformat()}))


# ─── Scraper 1 : CSE / Comités d'entreprise ──────────────────────

async def scraper_cse_savoie() -> list[dict]:
    prospects = []
    requetes = [
        {"q": "comite social economique", "departement": "73"},
        {"q": "comite social economique", "departement": "74"},
    ]
    async with httpx.AsyncClient(headers=HEADERS, timeout=15) as client:
        for params in requetes:
            try:
                resp = await client.get(
                    "https://recherche-entreprises.api.gouv.fr/search",
                    params={**params, "per_page": 25}
                )
                if resp.status_code != 200:
                    print(f"CSE API: statut {resp.status_code}")
                    continue
                for r in resp.json().get("results", []):
                    nom = r.get("nom_complet", "")
                    if not nom:
                        continue
                    siege = r.get("siege") or {}
                    siren = r.get("siren", "")
                    site = siege.get("site_internet", "") or ""
                    if site and not site.startswith("http"):
                        site = "https://" + site
                    prospects.append({
                        "nom": nom,
                        "type_structure": "CE/CSE",
                        "adresse": siege.get("adresse", ""),
                        "ville": siege.get("libelle_commune", ""),
                        "departement": siege.get("departement", params["departement"]),
                        "telephone": siege.get("telephone", "") or "",
                        "email": siege.get("email", "") or "",
                        "site_web": site,
                        "source": "api_entreprises",
                        "lien_source": f"https://annuaire-entreprises.data.gouv.fr/entreprise/{siren}" if siren else "",
                    })
            except Exception as e:
                print(f"Erreur scraper CSE ({params['departement']}): {e}")
    print(f"✓ CSE : {len(prospects)} trouvés")
    return prospects


# ─── Scraper 2 : Mairies ─────────────────────────────────────────

async def scraper_mairies() -> list[dict]:
    prospects = []
    requetes = [
        {"q": "mairie commune", "departement": "73"},
        {"q": "mairie commune", "departement": "74"},
    ]
    async with httpx.AsyncClient(headers=HEADERS, timeout=15) as client:
        for params in requetes:
            try:
                resp = await client.get(
                    "https://recherche-entreprises.api.gouv.fr/search",
                    params={**params, "per_page": 25}
                )
                if resp.status_code != 200:
                    continue
                for r in resp.json().get("results", []):
                    nom = r.get("nom_complet", "")
                    if not nom:
                        continue
                    siege = r.get("siege") or {}
                    siren = r.get("siren", "")
                    site = siege.get("site_internet", "") or ""
                    if site and not site.startswith("http"):
                        site = "https://" + site
                    prospects.append({
                        "nom": nom,
                        "type_structure": "mairie",
                        "adresse": siege.get("adresse", ""),
                        "ville": siege.get("libelle_commune", ""),
                        "departement": siege.get("departement", params["departement"]),
                        "telephone": siege.get("telephone", "") or "",
                        "email": siege.get("email", "") or "",
                        "site_web": site,
                        "source": "api_entreprises",
                        "lien_source": f"https://annuaire-entreprises.data.gouv.fr/entreprise/{siren}" if siren else "",
                    })
            except Exception as e:
                print(f"Erreur scraper mairies ({params['departement']}): {e}")
    print(f"✓ Mairies : {len(prospects)} trouvées")
    return prospects


# ─── Scraper 3 : Hôtels, campings, stations de ski ───────────────

async def scraper_hotels_campings() -> list[dict]:
    prospects = []
    requetes = [
        {"q": "hotel restaurant", "departement": "73", "activite_principale": "55.10Z", "type": "hotel"},
        {"q": "hotel restaurant", "departement": "74", "activite_principale": "55.10Z", "type": "hotel"},
        {"q": "camping", "departement": "73", "activite_principale": "55.30Z", "type": "camping"},
        {"q": "camping", "departement": "74", "activite_principale": "55.30Z", "type": "camping"},
        {"q": "remontees mecaniques ski", "departement": "73", "type": "station_ski"},
    ]
    async with httpx.AsyncClient(headers=HEADERS, timeout=15) as client:
        for params in requetes:
            type_struct = params.pop("type")
            try:
                resp = await client.get(
                    "https://recherche-entreprises.api.gouv.fr/search",
                    params={**params, "per_page": 25}
                )
                if resp.status_code != 200:
                    continue
                for r in resp.json().get("results", []):
                    nom = r.get("nom_complet", "")
                    if not nom:
                        continue
                    siege = r.get("siege") or {}
                    siren = r.get("siren", "")
                    site = siege.get("site_internet", "") or ""
                    if site and not site.startswith("http"):
                        site = "https://" + site
                    prospects.append({
                        "nom": nom,
                        "type_structure": type_struct,
                        "adresse": siege.get("adresse", ""),
                        "ville": siege.get("libelle_commune", ""),
                        "departement": siege.get("departement", "73"),
                        "telephone": siege.get("telephone", "") or "",
                        "email": siege.get("email", "") or "",
                        "site_web": site,
                        "source": "api_entreprises",
                        "lien_source": f"https://annuaire-entreprises.data.gouv.fr/entreprise/{siren}" if siren else "",
                    })
            except Exception as e:
                print(f"Erreur scraper hôtels/campings ({type_struct}): {e}")
    print(f"✓ Hôtels / campings / stations : {len(prospects)} trouvés")
    return prospects


# ─── Scraper 4 : Associations locales ────────────────────────────

async def scraper_associations() -> list[dict]:
    prospects = []
    url = "https://www.data.gouv.fr/api/1/organizations/"
    params = {"q": "association animation savoie", "page_size": 20}
    async with httpx.AsyncClient(headers=HEADERS, timeout=15) as client:
        try:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                print(f"Associations data.gouv: statut {resp.status_code}")
                return []
            for org in resp.json().get("data", []):
                nom = org.get("name", "")
                if not nom:
                    continue
                prospects.append({
                    "nom": nom,
                    "type_structure": "association",
                    "adresse": "",
                    "ville": "Savoie",
                    "departement": "73",
                    "telephone": "",
                    "email": "",
                    "site_web": org.get("url", "") or "",
                    "source": "data_gouv",
                    "lien_source": org.get("page", "") or "",
                })
        except Exception as e:
            print(f"Erreur scraper associations: {e}")
    print(f"✓ Associations : {len(prospects)} trouvées")
    return prospects


# ─── Enrichissement email ─────────────────────────────────────────

IGNORER_EMAILS = {"noreply", "no-reply", "donotreply", "wordpress", "contact@example", "test@"}

async def enrichir_email(site_web: str, nom: str) -> str:
    """Tente de trouver un email via Hunter.io ou en scrapant le site."""
    import os
    from dotenv import load_dotenv
    load_dotenv()

    if not site_web or not site_web.startswith("http"):
        return ""

    hunter_key = os.getenv("HUNTER_API_KEY", "")
    if hunter_key:
        try:
            domaine = site_web.split("/")[2].replace("www.", "")
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    "https://api.hunter.io/v2/domain-search",
                    params={"domain": domaine, "api_key": hunter_key}
                )
                if resp.status_code == 200:
                    emails = resp.json().get("data", {}).get("emails", [])
                    if emails:
                        return emails[0].get("value", "")
        except Exception:
            pass

    # Fallback : scraper la page contact du site
    for path in ["", "/contact", "/contact.html", "/nous-contacter"]:
        try:
            async with httpx.AsyncClient(
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=10,
                follow_redirects=True
            ) as client:
                resp = await client.get(site_web.rstrip("/") + path)
                if resp.status_code != 200:
                    continue
                # Chercher href mailto:
                mailto = re.search(r'href="mailto:([^"]+)"', resp.text)
                if mailto:
                    email = mailto.group(1).lower()
                    if not any(spam in email for spam in IGNORER_EMAILS):
                        return email
                # Chercher pattern email dans le texte
                emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', resp.text)
                for email in emails:
                    email_lower = email.lower()
                    if not any(spam in email_lower for spam in IGNORER_EMAILS):
                        return email_lower
                break
        except Exception:
            pass

    return ""


# ─── Orchestrateur principal ──────────────────────────────────────

async def lancer_scraper_prospects(db: AsyncSession, session_id: int | None = None) -> int:
    """
    Lance tous les scrapers prospects, filtre géographiquement,
    déduplique par nom+ville, enrichit les emails si possible, sauvegarde en BDD.
    """
    from services.geo_filter import est_dans_zone

    tous = []

    print("🔍 Scraping CSE / comités d'entreprise...")
    tous += await scraper_cse_savoie()

    print("🔍 Scraping mairies...")
    tous += await scraper_mairies()

    print("🔍 Scraping hôtels, campings, stations ski...")
    tous += await scraper_hotels_campings()

    print("🔍 Scraping associations...")
    tous += await scraper_associations()

    print(f"📊 {len(tous)} prospects bruts, filtrage géographique...")

    count = 0
    rejetes = 0
    for p in tous:
        nom = p.get("nom", "").strip()
        ville = p.get("ville", "").strip()
        if not nom:
            continue

        # Filtre géographique strict
        if not est_dans_zone(p):
            print(f"❌ Rejeté (hors zone): {nom} - {ville}")
            rejetes += 1
            continue

        # Déduplication par nom + ville
        existing = await db.execute(
            select(Prospect).where(
                Prospect.nom == nom,
                Prospect.ville == ville
            )
        )
        if existing.scalar_one_or_none():
            continue

        # Enrichissement email si site web disponible
        if p.get("site_web"):
            p["email"] = await enrichir_email(p["site_web"], nom)

        prospect = Prospect(**p)
        db.add(prospect)
        count += 1

    await db.commit()
    enregistrer_scrape()
    print(f"✅ {count} nouveaux prospects sauvegardés ({rejetes} rejetés hors zone)")
    return count
