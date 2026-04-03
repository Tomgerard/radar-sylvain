from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from database import get_db
from models import SessionScraping

router = APIRouter()


@router.get("/historique")
async def historique_scrapings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SessionScraping).order_by(desc(SessionScraping.date_scraping)).limit(30)
    )
    rows = result.scalars().all()
    return [
        {
            "id": s.id,
            "type": s.type,
            "date_scraping": s.date_scraping.isoformat() if s.date_scraping else "",
            "total_trouves": s.total_trouves or 0,
            "nouveaux": s.nouveaux or 0,
            "emails_trouves": s.emails_trouves or 0,
            "responsables_trouves": s.responsables_trouves or 0,
            "rejetes_zone": s.rejetes_zone or 0,
            "statut": s.statut or "termine",
        }
        for s in rows
    ]
