import asyncio
import httpx
from datetime import datetime
from urllib.parse import quote
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession
from models import Opportunite
from services.claude_service import scorer_opportunite

HEADERS = {
    "User-Agent": "RadarSylvain/1.0 (contact: sylvain.gerard@example.com)"
}

HEADERS_BROWSER = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "fr-FR,fr;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
}

MOTS_CLES_EVENEMENT = [
    "fête", "festival", "animation", "kermesse", "marché de noël",
    "spectacle", "village", "inauguration", "carnaval", "foire"
]


# ─── Scraper 1 : OpenAgenda (API officielle, sans clé) ──────────

async def scraper_evenements_savoie() -> list[dict]:
    """
    Récupère les événements en Auvergne-Rhône-Alpes via l'API OpenAgenda.
    """
    opportunites = []
    aujourd_hui = datetime.now().strftime("%Y-%m-%dT00:00:00")

    url = "https://api.openagenda.com/v2/events"
    params = {
        "size": 20,
        "filters[location][region]": "Auvergne-Rhône-Alpes",
        "filters[timings][gte]": aujourd_hui,
    }

    async with httpx.AsyncClient(headers=HEADERS, timeout=15) as client:
        for mot_cle in MOTS_CLES_EVENEMENT[:4]:  # 4 mots-clés pour rester raisonnable
            try:
                resp = await client.get(url, params={**params, "filters[search]": mot_cle})
                if resp.status_code != 200:
                    print(f"OpenAgenda: statut {resp.status_code} pour '{mot_cle}'")
                    continue

                data = resp.json()
                events = data.get("events", [])
                print(f"OpenAgenda '{mot_cle}': {len(events)} événements")

                for event in events:
                    titre = (event.get("title") or {}).get("fr", "")
                    if not titre or len(titre) < 5:
                        continue

                    description = (event.get("description") or {}).get("fr", "") or ""
                    location = event.get("location") or {}
                    city = location.get("city", "")
                    department = location.get("department", "")
                    lieu = f"{city}, {department}".strip(", ") or "Auvergne-Rhône-Alpes"

                    timings = event.get("timings") or []
                    date_evt = timings[0].get("begin", "")[:10] if timings else ""

                    slug = event.get("slug", "")
                    lien = f"https://openagenda.com/events/{slug}" if slug else ""

                    opportunites.append({
                        "source": "evenement",
                        "titre": titre[:200],
                        "description": description[:500],
                        "lieu": lieu,
                        "date_evenement": date_evt,
                        "lien": lien,
                    })

            except Exception as e:
                print(f"Erreur OpenAgenda ('{mot_cle}'): {e}")

    print(f"✓ Événements Savoie/RA : {len(opportunites)} trouvés")
    return opportunites


# ─── Scraper 2 : data.gouv.fr (marchés publics culture) ─────────

async def scraper_boamp() -> list[dict]:
    """
    Récupère des datasets liés à l'animation/spectacle/culture
    sur data.gouv.fr (API publique, sans clé).
    """
    opportunites = []

    url = "https://www.data.gouv.fr/api/1/datasets/"
    params = {
        "q": "animation spectacle culture",
        "organization_type": "local-authority",
        "page_size": 20,
    }

    async with httpx.AsyncClient(headers=HEADERS, timeout=15) as client:
        try:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                print(f"data.gouv.fr: statut {resp.status_code}")
                return []

            data = resp.json()
            datasets = data.get("data", [])
            print(f"data.gouv.fr: {len(datasets)} datasets")

            for dataset in datasets:
                titre = dataset.get("title", "")
                if not titre or len(titre) < 5:
                    continue

                description = dataset.get("description") or ""
                description = description[:300].replace("\n", " ").strip()

                lien = dataset.get("page", "")

                opportunites.append({
                    "source": "boamp",
                    "titre": titre[:200],
                    "description": description,
                    "lieu": "Auvergne-Rhône-Alpes",
                    "lien": lien,
                })

        except Exception as e:
            print(f"Erreur data.gouv.fr: {e}")

    print(f"✓ Marchés publics : {len(opportunites)} trouvés")
    return opportunites


# ─── Scraper 3 : Annuaire entreprises (API gouv, sans clé) ──────

async def scraper_pages_jaunes() -> list[dict]:
    """
    Recherche les comités d'entreprise en Savoie (73) et Haute-Savoie (74)
    via l'API officielle recherche-entreprises.api.gouv.fr.
    """
    opportunites = []
    requetes = [
        {"q": "comite entreprise", "departement": "73"},
        {"q": "comite entreprise", "departement": "74"},
        {"q": "mairie animation", "departement": "73"},
    ]

    async with httpx.AsyncClient(headers=HEADERS, timeout=15) as client:
        for params_base in requetes:
            url = "https://recherche-entreprises.api.gouv.fr/search"
            params = {
                **params_base,
                "activite_principale": "94.99Z",
                "per_page": 20,
            }
            try:
                resp = await client.get(url, params=params)
                if resp.status_code != 200:
                    print(f"API entreprises: statut {resp.status_code} ({params_base})")
                    continue

                data = resp.json()
                resultats = data.get("results", [])
                print(f"API entreprises ({params_base['q']}/{params_base['departement']}): {len(resultats)} résultats")

                for entreprise in resultats:
                    nom = entreprise.get("nom_complet", "")
                    if not nom or len(nom) < 3:
                        continue

                    siege = entreprise.get("siege") or {}
                    commune = siege.get("libelle_commune", "")
                    dept = siege.get("departement", params_base["departement"])
                    lieu = f"{commune}, {dept}".strip(", ") or "Savoie"

                    siren = entreprise.get("siren", "")
                    lien = f"https://annuaire-entreprises.data.gouv.fr/entreprise/{siren}" if siren else ""

                    dept_label = "Savoie" if dept == "73" else "Haute-Savoie"
                    opportunites.append({
                        "source": "pages_jaunes",
                        "titre": f"{nom} — Comité d'entreprise",
                        "description": f"Contact potentiel pour animation en {dept_label}.",
                        "lieu": lieu,
                        "contact": "",
                        "lien": lien,
                    })

            except Exception as e:
                print(f"Erreur API entreprises ({params_base}): {e}")

    print(f"✓ Annuaire entreprises : {len(opportunites)} trouvés")
    return opportunites


# ─── Scraper 4 : Le Bon Coin ─────────────────────────────────────

async def scraper_leboncoin() -> list[dict]:
    """
    Scrape les annonces Le Bon Coin recherchant un animateur/magicien en Savoie.
    """
    opportunites = []
    url = (
        "https://www.leboncoin.fr/recherche"
        "?category=140"
        "&locations=Savoie,Haute-Savoie,Ain,Isere"
        "&text=animateur+magicien+spectacle"
    )

    async with httpx.AsyncClient(headers=HEADERS_BROWSER, timeout=15, follow_redirects=True) as client:
        try:
            resp = await client.get(url)
            if resp.status_code != 200:
                print(f"Le Bon Coin: statut {resp.status_code}")
                return []

            soup = BeautifulSoup(resp.text, "html.parser")
            annonces = soup.find_all(
                ["a", "article", "div"],
                attrs={"data-qa-id": lambda v: v and "aditem" in str(v)}
            )
            # Fallback : chercher par structure générique
            if not annonces:
                annonces = soup.find_all("article") or soup.find_all("div", class_=lambda x: x and "ad" in str(x).lower())

            print(f"Le Bon Coin: {len(annonces)} éléments trouvés")

            for annonce in annonces[:15]:
                titre_el = annonce.find(attrs={"data-qa-id": "aditem_title"}) or annonce.find(["h2", "h3"])
                if not titre_el:
                    continue
                titre = titre_el.get_text(strip=True)
                if not titre or len(titre) < 5:
                    continue

                prix_el = annonce.find(attrs={"data-qa-id": "aditem_price"})
                prix = prix_el.get_text(strip=True) if prix_el else ""

                lieu_el = annonce.find(attrs={"data-qa-id": "aditem_location"})
                lieu = lieu_el.get_text(strip=True) if lieu_el else "Savoie"

                date_el = annonce.find(attrs={"data-qa-id": "aditem_date"})
                date_evt = date_el.get_text(strip=True) if date_el else ""

                lien_el = annonce.find("a", href=True)
                lien = lien_el["href"] if lien_el else ""
                if lien and not lien.startswith("http"):
                    lien = f"https://www.leboncoin.fr{lien}"

                opportunites.append({
                    "source": "leboncoin",
                    "titre": titre[:200],
                    "description": f"Annonce Le Bon Coin — {prix if prix else 'Prix non précisé'}",
                    "lieu": lieu,
                    "date_evenement": date_evt,
                    "lien": lien,
                })

        except Exception as e:
            print(f"Erreur Le Bon Coin: {e}")

    print(f"✓ Le Bon Coin : {len(opportunites)} trouvés")
    return opportunites


# ─── Scraper 5 : Google Search ────────────────────────────────────

async def scraper_google_search() -> list[dict]:
    """
    Lance 4 recherches Google ciblées pour trouver des demandes actives
    d'animateurs/magiciens en Savoie.
    """
    opportunites = []
    IGNORER_DOMAINES = ["google.com", "youtube.com", "wikipedia.org"]
    IGNORER_TITRES = ["formation", "emploi", "recrutement", "offre d'emploi"]

    queries = [
        'recherche animateur magicien spectacle Savoie 2025',
        'cherche magicien animation mariage "73" OR "74" 2025',
        'animateur spectacle enfants kermesse "Savoie" OR "Haute-Savoie"',
        'demande spectacle magie anniversaire Rhône-Alpes 2025',
    ]

    async with httpx.AsyncClient(headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9",
    }, timeout=15, follow_redirects=True) as client:

        for i, query in enumerate(queries):
            if i > 0:
                await asyncio.sleep(2)
            try:
                url = f"https://www.google.fr/search?q={quote(query)}&hl=fr&num=10"
                resp = await client.get(url)
                if resp.status_code != 200:
                    print(f"Google: statut {resp.status_code} pour '{query[:40]}'")
                    continue

                soup = BeautifulSoup(resp.text, "html.parser")
                resultats = soup.find_all("div", class_=lambda x: x and any(c in str(x) for c in ["g", "tF2Cxc", "MjjYud"]))

                print(f"Google '{query[:40]}...': {len(resultats)} résultats")

                for res in resultats[:8]:
                    h3 = res.find("h3")
                    if not h3:
                        continue
                    titre = h3.get_text(strip=True)
                    if not titre or len(titre) < 5:
                        continue
                    if any(mot in titre.lower() for mot in IGNORER_TITRES):
                        continue

                    lien_el = res.find("a", href=True)
                    lien = lien_el["href"] if lien_el else ""
                    if not lien or any(d in lien for d in IGNORER_DOMAINES):
                        continue
                    if lien.startswith("/url?q="):
                        lien = lien[7:].split("&")[0]

                    snippet_el = res.find("div", class_=lambda x: x and any(c in str(x) for c in ["VwiC3b", "s3v9rd", "IsZvec"]))
                    description = snippet_el.get_text(strip=True)[:300] if snippet_el else ""

                    opportunites.append({
                        "source": "evenement",
                        "titre": titre[:200],
                        "description": description,
                        "lieu": "Savoie / Haute-Savoie",
                        "lien": lien,
                    })

            except Exception as e:
                print(f"Erreur Google ('{query[:40]}'): {e}")

    print(f"✓ Google Search : {len(opportunites)} trouvés")
    return opportunites


# ─── Scraper 6 : Mariages.net ─────────────────────────────────────

async def scraper_mariages_net() -> list[dict]:
    """
    Scrape les prestataires/demandes mariage en Savoie sur mariages.net.
    """
    opportunites = []
    urls = [
        "https://www.mariages.net/animation-mariage/savoie--ar847/",
        "https://www.mariages.net/animation-mariage/haute-savoie--ar848/",
    ]

    async with httpx.AsyncClient(headers=HEADERS_BROWSER, timeout=15, follow_redirects=True) as client:
        for url in urls:
            dept = "Savoie" if "ar847" in url else "Haute-Savoie"
            try:
                resp = await client.get(url)
                if resp.status_code != 200:
                    print(f"Mariages.net: statut {resp.status_code} ({dept})")
                    continue

                soup = BeautifulSoup(resp.text, "html.parser")
                cards = soup.find_all(
                    ["div", "article", "li"],
                    class_=lambda x: x and any(k in str(x).lower() for k in ["supplier", "card", "listing", "item", "result"])
                )
                print(f"Mariages.net {dept}: {len(cards)} éléments")

                for card in cards[:10]:
                    titre_el = card.find(["h2", "h3"])
                    if not titre_el:
                        continue
                    titre = titre_el.get_text(strip=True)
                    if not titre or len(titre) < 5:
                        continue

                    desc_el = card.find("p")
                    description = desc_el.get_text(strip=True)[:300] if desc_el else ""

                    lieu_el = card.find(["span", "div"], class_=lambda x: x and any(k in str(x).lower() for k in ["location", "city", "lieu", "adresse"]))
                    lieu = lieu_el.get_text(strip=True) if lieu_el else dept

                    lien_el = card.find("a", href=True)
                    lien = lien_el["href"] if lien_el else url
                    if lien and not lien.startswith("http"):
                        lien = f"https://www.mariages.net{lien}"

                    opportunites.append({
                        "source": "evenement",
                        "titre": f"Mariage — {titre[:180]}",
                        "description": description,
                        "lieu": lieu or dept,
                        "lien": lien,
                    })

            except Exception as e:
                print(f"Erreur Mariages.net ({dept}): {e}")

    print(f"✓ Mariages.net : {len(opportunites)} trouvés")
    return opportunites


# ─── Scraper 7 : Agences événementielles ─────────────────────────

MOTS_CLES_SPECTACLE = [
    "animation", "animateur", "magicien", "spectacle", "magie",
    "ventriloque", "ballon", "événement", "fête", "kermesse",
    "mariage", "anniversaire", "soirée", "cabaret", "noël",
]
IGNORER_TITRES_AGENCE = ["formation", "emploi", "recrutement", "stage", "offre d'emploi"]

SITES_AGENCES = [
    ("https://www.animatout.fr/recherche?region=auvergne-rhone-alpes&type=magicien",    "animatout.fr"),
    ("https://www.animatout.fr/recherche?region=auvergne-rhone-alpes&type=animateur",   "animatout.fr"),
    ("https://www.fnacspectacles.com/recherche/?q=spectacle+savoie&localisation=Savoie", "fnacspectacles.com"),
    ("https://www.listminut.fr/annonces/animateur-evenement?localisation=savoie",        "listminut.fr"),
    ("https://www.alpesevents.fr/actualites/",                                           "alpesevents.fr"),
    ("https://www.eventbrite.fr/d/france--savoie/animation/",                           "eventbrite.fr"),
    ("https://www.eventbrite.fr/d/france--haute-savoie/spectacle/",                     "eventbrite.fr"),
    ("https://www.ouifete.com/prestataires/animateur/savoie",                            "ouifete.com"),
    ("https://www.ouifete.com/prestataires/magicien/rhone-alpes",                        "ouifete.com"),
    ("https://www.agenda-culturel.fr/spectacles/rhone-alpes",                           "agenda-culturel.fr"),
]

async def scraper_agences_evenementielles() -> list[dict]:
    """
    Scrape une liste de sites d'agences et annuaires événementiels
    ciblés sur la Savoie / Rhône-Alpes.
    """
    opportunites = []

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }

    async with httpx.AsyncClient(headers=headers, timeout=15, follow_redirects=True) as client:
        for i, (url, nom_site) in enumerate(SITES_AGENCES):
            if i > 0:
                await asyncio.sleep(1)
            count_site = 0
            try:
                resp = await client.get(url)
                if resp.status_code != 200:
                    print(f"✗ {nom_site}: statut {resp.status_code}")
                    continue

                domaine = url.split("/")[0] + "//" + url.split("/")[2]
                soup = BeautifulSoup(resp.text, "html.parser")

                cards = soup.find_all(
                    ["article", "section", "div", "li"],
                    class_=lambda x: x and any(
                        k in str(x).lower()
                        for k in ["card", "item", "result", "annonce", "prestataire",
                                  "event", "listing", "post", "actualite"]
                    )
                )

                for card in cards:
                    # Titre
                    titre_el = (
                        card.find(["h1", "h2", "h3", "h4"])
                        or card.find(class_=lambda x: x and any(k in str(x).lower() for k in ["title", "titre", "name"]))
                    )
                    if not titre_el:
                        continue
                    titre = titre_el.get_text(strip=True)
                    if len(titre) < 10:
                        continue
                    if any(mot in titre.lower() for mot in IGNORER_TITRES_AGENCE):
                        continue

                    # Filtre qualité : au moins un mot-clé spectacle
                    titre_desc = titre.lower()
                    desc_el = card.find(
                        ["p", "div"],
                        class_=lambda x: x and any(
                            k in str(x).lower() for k in ["description", "excerpt", "summary", "content"]
                        )
                    ) or card.find("p")
                    description = desc_el.get_text(strip=True)[:500] if desc_el else ""
                    titre_desc += " " + description.lower()

                    if not any(mot in titre_desc for mot in MOTS_CLES_SPECTACLE):
                        continue

                    # Lieu
                    lieu_el = card.find(
                        class_=lambda x: x and any(k in str(x).lower() for k in ["location", "lieu", "ville", "adresse"])
                    )
                    lieu = lieu_el.get_text(strip=True) if lieu_el else "Savoie / Rhône-Alpes"

                    # Date
                    date_el = card.find("time") or card.find(
                        class_=lambda x: x and any(k in str(x).lower() for k in ["date", "when", "quand"])
                    )
                    date_evt = date_el.get("datetime") or date_el.get_text(strip=True) if date_el else None

                    # Lien
                    lien_el = card.find("a", href=True) or card.find_parent("a", href=True)
                    lien = lien_el["href"] if lien_el else url
                    if lien and not lien.startswith("http"):
                        lien = f"{domaine}{lien}" if lien.startswith("/") else f"{domaine}/{lien}"

                    # Contact
                    contact_el = card.find("a", href=lambda h: h and (h.startswith("tel:") or h.startswith("mailto:")))
                    contact = contact_el["href"].replace("tel:", "").replace("mailto:", "") if contact_el else None

                    opportunites.append({
                        "source": "agence",
                        "titre": titre[:200],
                        "description": description,
                        "lieu": lieu or "Savoie / Rhône-Alpes",
                        "date_evenement": date_evt,
                        "contact": contact,
                        "lien": lien,
                    })
                    count_site += 1
                    if count_site >= 8:
                        break

                print(f"✓ {count_site} résultats sur {nom_site}")

            except Exception as e:
                print(f"✗ Erreur {nom_site}: {e}")

    print(f"✓ Agences événementielles : {len(opportunites)} trouvés au total")
    return opportunites


# ─── Orchestrateur principal ─────────────────────────────────────

async def lancer_tous_les_scrapers(db: AsyncSession, session_id: int | None = None) -> dict:
    """
    Lance tous les scrapers, filtre géographiquement, score avec Claude,
    sauvegarde en BDD en évitant les doublons.
    """
    from services.geo_filter import est_dans_zone
    from models import SessionScraping
    from sqlalchemy import select as sa_select

    toutes = []

    print("🔍 Scraping événements OpenAgenda...")
    toutes += await scraper_evenements_savoie()

    print("🔍 Scraping data.gouv.fr...")
    toutes += await scraper_boamp()

    print("🔍 Scraping annuaire entreprises...")
    toutes += await scraper_pages_jaunes()

    print("🔍 Scraping Le Bon Coin...")
    toutes += await scraper_leboncoin()

    print("🔍 Scraping Google Search...")
    toutes += await scraper_google_search()

    print("🔍 Scraping Mariages.net...")
    toutes += await scraper_mariages_net()

    print("🔍 Scraping agences événementielles...")
    toutes += await scraper_agences_evenementielles()

    print(f"📊 {len(toutes)} opportunités brutes, filtrage géographique...")

    count = 0
    rejetes = 0
    for opp_data in toutes:
        # Filtre géographique strict
        if not est_dans_zone(opp_data):
            nom = opp_data.get("titre", "?")[:60]
            lieu = opp_data.get("lieu", "?")
            print(f"❌ Rejeté (hors zone): {nom} - {lieu}")
            rejetes += 1
            continue

        # Éviter les doublons par titre
        existing = await db.execute(
            sa_select(Opportunite).where(Opportunite.titre == opp_data["titre"])
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

    # Mettre à jour la session
    if session_id:
        res = await db.execute(sa_select(SessionScraping).where(SessionScraping.id == session_id))
        session = res.scalar_one_or_none()
        if session:
            session.total_trouves = len(toutes)
            session.nouveaux = count
            session.rejetes_zone = rejetes
            session.statut = "termine"
            await db.commit()

    print(f"✅ {count} nouvelles opportunités sauvegardées ({rejetes} rejetées hors zone)")
    return {"nouveaux": count, "total": len(toutes), "rejetes": rejetes}
