from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Opportunite

router = APIRouter()

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

# ─── Routes ─────────────────────────────────────────────────────

@router.get("/")
async def list_opportunites(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Opportunite).order_by(desc(Opportunite.created_at))
    )
    return result.scalars().all()

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

@router.post("/scraper/lancer")
async def lancer_scraper(db: AsyncSession = Depends(get_db)):
    """
    Lance tous les scrapers et stocke les résultats en BDD.
    Appelé manuellement depuis le frontend ou automatiquement.
    """
    from services.scraper_service import lancer_tous_les_scrapers
    resultats = await lancer_tous_les_scrapers(db)
    return {
        "ok": True,
        "message": f"{resultats} nouvelles opportunités trouvées"
    }