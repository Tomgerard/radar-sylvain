import httpx
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession
from models import Opportunite
from services.claude_service import scorer_opportunite

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}

# ─── Scraper 1 : Événements locaux Savoie ───────────────────────

async def scraper_evenements_savoie() -> list[dict]:
    """
    Scrape les événements de l'agenda de Savoie Mont Blanc.
    """
    opportunites = []
    urls = [
        "https://www.savoie-mont-blanc.com/agenda/",
        "https://www.hautesavoie-tourisme.com/agenda/",
    ]

    async with httpx.AsyncClient(headers=HEADERS, timeout=15) as client:
        for url in urls:
            try:
                resp = await client.get(url)
                soup = BeautifulSoup(resp.text, "html.parser")

                # Cherche les événements (adapté selon structure du site)
                events = soup.find_all(
                    ["article", "div"],
                    class_=lambda x: x and any(
                        k in x for k in ["event", "agenda", "item", "card"]
                    )
                )

                for event in events[:10]:
                    titre = event.find(["h2", "h3", "h4"])
                    if not titre:
                        continue
                    titre_text = titre.get_text(strip=True)
                    if len(titre_text) < 5:
                        continue

                    description = event.find("p")
                    desc_text = description.get_text(strip=True) if description else ""

                    lien = event.find("a")
                    lien_href = lien.get("href", url) if lien else url

                    opportunites.append({
                        "source": "evenement",
                        "titre": titre_text[:200],
                        "description": desc_text[:500],
                        "lieu": "Savoie / Haute-Savoie",
                        "lien": lien_href if lien_href.startswith("http") else url,
                    })

            except Exception as e:
                print(f"Erreur scraping {url}: {e}")

    return opportunites


# ─── Scraper 2 : BOAMP marchés publics ──────────────────────────

async def scraper_boamp() -> list[dict]:
    """
    Scrape les appels d'offres BOAMP pour animations/spectacles
    en Auvergne-Rhône-Alpes.
    """
    opportunites = []
    url = "https://www.boamp.fr/avis/detail/?q=animation+spectacle+artiste&champ=resume&departement=73,74,69,38,01"

    async with httpx.AsyncClient(headers=HEADERS, timeout=15) as client:
        try:
            resp = await client.get(url)
            soup = BeautifulSoup(resp.text, "html.parser")

            avis = soup.find_all(
                ["div", "article"],
                class_=lambda x: x and any(
                    k in x for k in ["avis", "result", "item", "notice"]
                )
            )

            for avis_item in avis[:10]:
                titre = avis_item.find(["h2", "h3", "h4", "a"])
                if not titre:
                    continue
                titre_text = titre.get_text(strip=True)
                if len(titre_text) < 5:
                    continue

                description = avis_item.find("p")
                desc_text = description.get_text(strip=True) if description else ""

                lien = avis_item.find("a")
                lien_href = lien.get("href", "") if lien else ""
                if lien_href and not lien_href.startswith("http"):
                    lien_href = f"https://www.boamp.fr{lien_href}"

                opportunites.append({
                    "source": "boamp",
                    "titre": titre_text[:200],
                    "description": desc_text[:500],
                    "lieu": "Auvergne-Rhône-Alpes",
                    "lien": lien_href or url,
                })

        except Exception as e:
            print(f"Erreur scraping BOAMP: {e}")

    return opportunites


# ─── Scraper 3 : Pages Jaunes CE et mairies ─────────────────────

async def scraper_pages_jaunes() -> list[dict]:
    """
    Cherche les comités d'entreprise et mairies en Savoie
    pour les contacter pour des animations.
    """
    opportunites = []
    recherches = [
        ("comite-entreprise", "Savoie"),
        ("mairie", "Savoie"),
        ("comite-entreprise", "Haute-Savoie"),
    ]

    async with httpx.AsyncClient(headers=HEADERS, timeout=15) as client:
        for quoi, ou in recherches:
            url = f"https://www.pagesjaunes.fr/annuaire/cherche?quoi={quoi}&ou={ou}"
            try:
                resp = await client.get(url)
                soup = BeautifulSoup(resp.text, "html.parser")

                resultats = soup.find_all(
                    ["div", "article", "li"],
                    class_=lambda x: x and any(
                        k in x for k in ["result", "bi-bloc", "item"]
                    )
                )

                for r in resultats[:8]:
                    nom = r.find(["h2", "h3", "a", "span"])
                    if not nom:
                        continue
                    nom_text = nom.get_text(strip=True)
                    if len(nom_text) < 3:
                        continue

                    tel = r.find(
                        ["span", "div"],
                        class_=lambda x: x and "tel" in str(x).lower()
                    )
                    tel_text = tel.get_text(strip=True) if tel else ""

                    adresse = r.find(
                        ["span", "div", "address"],
                        class_=lambda x: x and any(
                            k in str(x).lower() for k in ["adresse", "address", "street"]
                        )
                    )
                    adresse_text = adresse.get_text(strip=True) if adresse else ou

                    opportunites.append({
                        "source": "pages_jaunes",
                        "titre": f"{nom_text} — {quoi.replace('-', ' ').title()}",
                        "description": f"Contact potentiel pour animation en {ou}.",
                        "lieu": adresse_text or ou,
                        "contact": tel_text,
                        "lien": url,
                    })

            except Exception as e:
                print(f"Erreur scraping Pages Jaunes ({quoi}/{ou}): {e}")

    return opportunites


# ─── Orchestrateur principal ─────────────────────────────────────

async def lancer_tous_les_scrapers(db: AsyncSession) -> int:
    """
    Lance tous les scrapers, score chaque opportunité avec Claude,
    et sauvegarde en BDD en évitant les doublons.
    """
    toutes = []

    print("🔍 Scraping événements Savoie...")
    toutes += await scraper_evenements_savoie()

    print("🔍 Scraping BOAMP...")
    toutes += await scraper_boamp()

    print("🔍 Scraping Pages Jaunes...")
    toutes += await scraper_pages_jaunes()

    print(f"📊 {len(toutes)} opportunités trouvées, scoring en cours...")

    count = 0
    for opp_data in toutes:
        # Éviter les doublons par titre
        from sqlalchemy import select
        existing = await db.execute(
            select(Opportunite).where(Opportunite.titre == opp_data["titre"])
        )
        if existing.scalar_one_or_none():
            continue

        # Scoring Claude
        try:
            scoring = await scorer_opportunite(
                titre=opp_data["titre"],
                description=opp_data.get("description", ""),
                lieu=opp_data.get("lieu", "")
            )
            opp_data["score"] = scoring.get("score", "moyenne")
            opp_data["resume_ia"] = scoring.get("resume", "")
        except Exception as e:
            print(f"Erreur scoring Claude: {e}")
            opp_data["score"] = "moyenne"
            opp_data["resume_ia"] = ""

        opp = Opportunite(**opp_data)
        db.add(opp)
        count += 1

    await db.commit()
    print(f"✅ {count} nouvelles opportunités sauvegardées")
    return count