import asyncio
import csv
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, delete, update
from pydantic import BaseModel, Field
from typing import Optional, Literal
from database import get_db
from models import Prospect, SessionScraping

router = APIRouter()


class StatutUpdate(BaseModel):
    statut: str

class NoteUpdate(BaseModel):
    note: str

class ProspectCreate(BaseModel):
    nom: str
    type_structure: Optional[str] = "autre"
    adresse: Optional[str] = ""
    ville: Optional[str] = ""
    departement: Optional[str] = ""
    telephone: Optional[str] = ""
    email: Optional[str] = ""
    site_web: Optional[str] = ""
    statut: Optional[str] = "a_contacter"
    note: Optional[str] = ""
    description_structure: Optional[str] = ""

class BulkProspectAction(BaseModel):
    ids: list[int] = Field(default_factory=list)
    action: Literal["archiver", "desarchiver", "supprimer"]


# ─── Liste ───────────────────────────────────────────────────────

@router.get("/")
async def list_prospects(
    statut: Optional[str] = None,
    type_structure: Optional[str] = None,
    departement: Optional[str] = None,
    archives: bool = False,
    db: AsyncSession = Depends(get_db),
):
    query = select(Prospect).order_by(desc(Prospect.score_prospection), desc(Prospect.created_at))
    if archives:
        query = query.where(Prospect.archive == 1)
    else:
        query = query.where((Prospect.archive == 0) | (Prospect.archive.is_(None)))

    result = await db.execute(query)
    prospects = result.scalars().all()

    if statut:
        prospects = [p for p in prospects if p.statut == statut]
    if type_structure:
        prospects = [p for p in prospects if p.type_structure == type_structure]
    if departement:
        prospects = [p for p in prospects if p.departement == departement]

    return prospects


# ─── Création manuelle ───────────────────────────────────────────

@router.post("/")
async def create_prospect(data: ProspectCreate, db: AsyncSession = Depends(get_db)):
    prospect = Prospect(
        nom=data.nom,
        type_structure=data.type_structure,
        adresse=data.adresse,
        ville=data.ville,
        departement=data.departement,
        telephone=data.telephone,
        email=data.email,
        site_web=data.site_web,
        statut=data.statut,
        note=data.note,
        description_structure=data.description_structure,
        source="manuel",
        score_prospection=0,
        site_web_scrape=0,
        email_trouve=1 if data.email else 0,
    )
    db.add(prospect)
    await db.commit()
    await db.refresh(prospect)
    return prospect


# ─── Actions groupées (avant /{prospect_id}) ─────────────────────

@router.post("/bulk")
async def bulk_prospects(body: BulkProspectAction, db: AsyncSession = Depends(get_db)):
    ids = list(dict.fromkeys(body.ids))
    if not ids:
        return {"ok": True, "affectes": 0}
    if body.action == "supprimer":
        await db.execute(delete(Prospect).where(Prospect.id.in_(ids)))
    elif body.action == "archiver":
        await db.execute(update(Prospect).where(Prospect.id.in_(ids)).values(archive=1))
    else:
        await db.execute(update(Prospect).where(Prospect.id.in_(ids)).values(archive=0))
    await db.commit()
    return {"ok": True, "affectes": len(ids)}


# ─── Détail ───────────────────────────────────────────────────────

@router.get("/{prospect_id}")
async def get_prospect(prospect_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Prospect).where(Prospect.id == prospect_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Prospect non trouvé")
    return p


# ─── Statut ───────────────────────────────────────────────────────

@router.put("/{prospect_id}/statut")
async def update_statut(
    prospect_id: int,
    body: StatutUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Prospect).where(Prospect.id == prospect_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Prospect non trouvé")
    p.statut = body.statut
    await db.commit()
    return {"ok": True}


# ─── Note ─────────────────────────────────────────────────────────

@router.put("/{prospect_id}/note")
async def update_note(
    prospect_id: int,
    body: NoteUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Prospect).where(Prospect.id == prospect_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Prospect non trouvé")
    p.note = body.note
    await db.commit()
    return {"ok": True}


# ─── Supprimer ────────────────────────────────────────────────────

@router.delete("/{prospect_id}")
async def delete_prospect(prospect_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Prospect).where(Prospect.id == prospect_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Prospect non trouvé")
    await db.delete(p)
    await db.commit()
    return {"ok": True}


# ─── Scraper + Enrichissement ─────────────────────────────────────

@router.post("/scraper/lancer")
async def lancer_scraper(db: AsyncSession = Depends(get_db)):
    from services.prospect_scraper import lancer_scraper_prospects, peut_lancer_scrape
    from services.prospect_enricher import enrichir_prospect
    from services.claude_service import scorer_prospect

    if not peut_lancer_scrape():
        result = await db.execute(select(Prospect))
        total = len(result.scalars().all())
        return {"ok": True, "message": "Scraping déjà effectué aujourd'hui", "total": total,
                "nouveaux": 0, "emails_trouves": 0, "responsables_trouves": 0}

    # Créer session en_cours
    session = SessionScraping(type="prospects", statut="en_cours")
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # 1 — Scraper
    nouveaux = await lancer_scraper_prospects(db, session_id=session.id)

    # 2 — Enrichir les prospects sans enrichissement (max 50)
    result = await db.execute(
        select(Prospect).where(Prospect.site_web_scrape == 0).limit(50)
    )
    a_enrichir = result.scalars().all()

    emails_trouves = 0
    responsables_trouves = 0

    for p in a_enrichir:
        try:
            data = {
                "nom": p.nom, "ville": p.ville, "type_structure": p.type_structure,
                "email": p.email or "", "telephone": p.telephone or "",
                "site_web": p.site_web or "",
                "responsable_prenom": p.responsable_prenom or "",
                "responsable_nom": p.responsable_nom or "",
            }
            enrichi = await enrichir_prospect(data)

            p.site_web = enrichi.get("site_web") or p.site_web
            p.email = enrichi.get("email") or p.email
            p.telephone = enrichi.get("telephone") or p.telephone
            p.responsable_prenom = enrichi.get("responsable_prenom") or p.responsable_prenom
            p.responsable_nom = enrichi.get("responsable_nom") or p.responsable_nom
            p.responsable_titre = enrichi.get("responsable_titre") or p.responsable_titre
            p.description_structure = enrichi.get("description_structure") or p.description_structure
            p.site_web_scrape = enrichi.get("site_web_scrape", 1)
            p.email_trouve = enrichi.get("email_trouve", 0)

            # Score
            score = await scorer_prospect({
                "nom": p.nom, "type_structure": p.type_structure, "ville": p.ville,
                "email": p.email, "responsable_prenom": p.responsable_prenom,
            })
            p.score_prospection = score

            await db.commit()

            if p.email:
                emails_trouves += 1
            if p.responsable_prenom:
                responsables_trouves += 1

            # Délai anti-blocage
            await asyncio.sleep(1)

        except Exception as e:
            print(f"Erreur enrichissement {p.nom}: {e}")
            p.site_web_scrape = 1  # Marquer comme tenté
            await db.commit()
            continue

    result2 = await db.execute(select(Prospect))
    total = len(result2.scalars().all())

    # Finaliser la session
    from sqlalchemy import select as sa_select
    res_s = await db.execute(sa_select(SessionScraping).where(SessionScraping.id == session.id))
    s = res_s.scalar_one_or_none()
    if s:
        s.total_trouves = total
        s.nouveaux = nouveaux
        s.emails_trouves = emails_trouves
        s.responsables_trouves = responsables_trouves
        s.statut = "termine"
        await db.commit()

    return {
        "ok": True,
        "total": total,
        "nouveaux": nouveaux,
        "emails_trouves": emails_trouves,
        "responsables_trouves": responsables_trouves,
    }


# ─── Enrichir un prospect spécifique ──────────────────────────────

@router.post("/{prospect_id}/enrichir")
async def enrichir_un_prospect(prospect_id: int, db: AsyncSession = Depends(get_db)):
    from services.prospect_enricher import enrichir_prospect
    from services.claude_service import scorer_prospect

    result = await db.execute(select(Prospect).where(Prospect.id == prospect_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Prospect non trouvé")

    data = {
        "nom": p.nom, "ville": p.ville or "", "type_structure": p.type_structure or "",
        "email": p.email or "", "telephone": p.telephone or "",
        "site_web": p.site_web or "",
        "responsable_prenom": "", "responsable_nom": "",
    }
    # Forcer le ré-enrichissement
    p.site_web_scrape = 0
    data["site_web"] = ""

    enrichi = await enrichir_prospect(data)

    p.site_web = enrichi.get("site_web") or p.site_web
    p.email = enrichi.get("email") or p.email
    p.telephone = enrichi.get("telephone") or p.telephone
    p.responsable_prenom = enrichi.get("responsable_prenom") or p.responsable_prenom
    p.responsable_nom = enrichi.get("responsable_nom") or p.responsable_nom
    p.responsable_titre = enrichi.get("responsable_titre") or p.responsable_titre
    p.description_structure = enrichi.get("description_structure") or p.description_structure
    p.site_web_scrape = 1
    p.email_trouve = 1 if p.email else 0

    score = await scorer_prospect({
        "nom": p.nom, "type_structure": p.type_structure, "ville": p.ville,
        "email": p.email, "responsable_prenom": p.responsable_prenom,
    })
    p.score_prospection = score
    await db.commit()

    return p


# ─── Générer email de prospection ────────────────────────────────

@router.post("/{prospect_id}/generer-email")
async def generer_email(prospect_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Prospect).where(Prospect.id == prospect_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Prospect non trouvé")

    TYPE_PRESTATION = {
        "CE/CSE":      "soirée magique ou animation de Noël pour vos salariés",
        "mairie":      "animation pour votre fête de village, kermesse ou événement communal",
        "ecole":       "spectacle pour enfants adapté à votre établissement scolaire",
        "restaurant":  "animation soirée cabaret ou magie pour vos clients",
        "hotel":       "animation soirée cabaret ou spectacle pour vos résidents",
        "camping":     "animation familiale pour vos vacanciers (spectacle, sculpture ballons)",
        "association": "spectacle ou animation pour votre événement associatif",
        "station_ski": "animation hivernale pour vos clients et leur famille",
        "autre":       "animation ou spectacle adapté à votre événement",
    }
    prestation = TYPE_PRESTATION.get(p.type_structure or "autre", TYPE_PRESTATION["autre"])

    responsable_info = ""
    if p.responsable_prenom:
        responsable_info = f"\n- Responsable : {p.responsable_prenom} {p.responsable_nom or ''} ({p.responsable_titre or 'Contact'})"

    description_info = ""
    if p.description_structure:
        description_info = f"\n- Description : {p.description_structure}"

    prompt = f"""Tu es Sylvain Gérard, artiste de spectacle (magie, ventriloquie, sculpture sur ballons, piano) basé à Bourg-Saint-Maurice en Savoie, 35 ans d'expérience.

Rédige un email de prospection pour :
- Structure : {p.nom} ({p.type_structure or "structure"})
- Ville : {p.ville or "Savoie"}{responsable_info}{description_info}

L'email doit :
- Commencer par "Objet: ..." (objet accrocheur)
- Adresser au responsable par son prénom si connu, sinon formule de politesse adaptée au type
- Corps de 120 mots maximum
- Proposer LA prestation la plus adaptée : {prestation}
- Mentionner la proximité géographique (Savoie)
- CTA clair : "Appelez-moi au 06 23 26 13 59"
- Signature : Sylvain Gérard / sylvaingerard.com

Ton : chaleureux, professionnel, jamais insistant.
Réponds UNIQUEMENT avec l'email complet."""

    from services.claude_service import client as claude_client

    message = await claude_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}]
    )
    email_texte = message.content[0].text

    p.email_envoye = email_texte
    await db.commit()

    return {"email": email_texte}


# ─── Export CSV ───────────────────────────────────────────────────

@router.get("/export/csv")
async def export_csv(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Prospect).order_by(desc(Prospect.score_prospection))
    )
    prospects = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Nom", "Type", "Ville", "Département", "Téléphone", "Email",
        "Site web", "Responsable prénom", "Responsable nom", "Responsable titre",
        "Description", "Score", "Statut", "Archivé", "Date enrichissement", "Date création"
    ])
    for p in prospects:
        writer.writerow([
            p.id, p.nom, p.type_structure, p.ville, p.departement,
            p.telephone, p.email, p.site_web,
            p.responsable_prenom, p.responsable_nom, p.responsable_titre,
            p.description_structure, p.score_prospection, p.statut,
            getattr(p, "archive", 0) or 0,
            p.enrichissement_date, p.created_at,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=prospects.csv"}
    )
