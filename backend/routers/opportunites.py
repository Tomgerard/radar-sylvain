from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, delete, update
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, date
from database import get_db
from models import Opportunite, SessionScraping
import json
import os

router = APIRouter()

LAST_SCRAPE_FILE = "last_scrape.json"

# ─── Utilitaires scrape date ─────────────────────────────────────

def get_last_scrape_date() -> Optional[str]:
    if not os.path.exists(LAST_SCRAPE_FILE):
        return None
    with open(LAST_SCRAPE_FILE, "r") as f:
        data = json.load(f)
        return data.get("date")

def save_scrape_date():
    with open(LAST_SCRAPE_FILE, "w") as f:
        json.dump({"date": date.today().isoformat()}, f)

# ─── Schémas Pydantic ───────────────────────────────────────────

class OpportuniteCreate(BaseModel):
    source: str
    titre: str
    description: str
    lieu: str
    date_evenement: Optional[str] = None
    contact: Optional[str] = None
    lien: Optional[str] = None
    score: str = "moyenne"
    resume_ia: Optional[str] = None


class BulkOpportuniteAction(BaseModel):
    ids: list[int] = Field(default_factory=list)
    action: Literal["archiver", "desarchiver", "supprimer"]


# ─── Routes CRUD ────────────────────────────────────────────────

@router.get("/")
async def list_opportunites(
    archives: bool = False,
    db: AsyncSession = Depends(get_db),
):
    query = select(Opportunite).order_by(desc(Opportunite.created_at))
    if archives:
        query = query.where(Opportunite.archive == 1)
    else:
        query = query.where(
            (Opportunite.archive == 0) | (Opportunite.archive.is_(None))
        )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/bulk")
async def bulk_opportunites(body: BulkOpportuniteAction, db: AsyncSession = Depends(get_db)):
    ids = list(dict.fromkeys(body.ids))
    if not ids:
        return {"ok": True, "affectes": 0}
    if body.action == "supprimer":
        await db.execute(delete(Opportunite).where(Opportunite.id.in_(ids)))
    elif body.action == "archiver":
        await db.execute(update(Opportunite).where(Opportunite.id.in_(ids)).values(archive=1))
    else:
        await db.execute(update(Opportunite).where(Opportunite.id.in_(ids)).values(archive=0))
    await db.commit()
    return {"ok": True, "affectes": len(ids)}


@router.get("/{opp_id}")
async def get_opportunite(opp_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Opportunite).where(Opportunite.id == opp_id)
    )
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunité non trouvée")
    return opp

@router.post("/")
async def create_opportunite(
    data: OpportuniteCreate,
    db: AsyncSession = Depends(get_db)
):
    opp = Opportunite(**data.dict())
    db.add(opp)
    await db.commit()
    await db.refresh(opp)
    return opp

@router.put("/{opp_id}/vue")
async def marquer_vue(opp_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Opportunite).where(Opportunite.id == opp_id)
    )
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunité non trouvée")
    opp.vue = 1
    await db.commit()
    return {"ok": True}

@router.delete("/{opp_id}")
async def delete_opportunite(opp_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Opportunite).where(Opportunite.id == opp_id)
    )
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunité non trouvée")
    await db.delete(opp)
    await db.commit()
    return {"ok": True}

# ─── Routes Scraper ──────────────────────────────────────────────

@router.get("/scraper/status")
async def scraper_status():
    """Retourne si le scraper a déjà tourné aujourd'hui"""
    last_scrape = get_last_scrape_date()
    today = date.today().isoformat()
    already_done = last_scrape == today
    return {
        "already_done": already_done,
        "last_scrape": last_scrape,
        "message": "Radar déjà lancé aujourd'hui ✓" if already_done else "Prêt à lancer"
    }

@router.post("/scraper/lancer")
async def lancer_scraper(db: AsyncSession = Depends(get_db)):
    from services.scraper_service import lancer_tous_les_scrapers

    # Créer session en_cours
    session = SessionScraping(type="opportunites", statut="en_cours")
    db.add(session)
    await db.commit()
    await db.refresh(session)

    try:
        resultats = await lancer_tous_les_scrapers(db, session_id=session.id)
        save_scrape_date()
        return {
            "ok": True,
            "message": f"{resultats['nouveaux']} nouvelles opportunités trouvées",
            "already_done": False,
            "stats": resultats,
        }
    except Exception as e:
        session.statut = "erreur"
        await db.commit()
        raise