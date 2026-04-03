from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from database import get_db
from models import Devis
from services.pdf_service import generer_pdf
from services.email_service import envoyer_devis_email

router = APIRouter()

# ─── Schémas Pydantic ───────────────────────────────────────────

class DevisCreate(BaseModel):
    nom_client: str
    adresse_client: str
    type_prestation: str
    description: str
    nom_evenement: str
    date_evenement: str
    duree: str
    horaires: str = "À définir"
    prix_ttc: float

class DevisUpdate(DevisCreate):
    pass

class EmailRequest(BaseModel):
    destinataire: str

# ─── Utilitaire ─────────────────────────────────────────────────

def generer_numero(date: datetime, increment: int) -> str:
    return f"{date.strftime('%Y%m%d')}{increment:03d}"

# ─── Routes CRUD ────────────────────────────────────────────────

@router.get("/")
async def list_devis(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Devis).order_by(desc(Devis.created_at)))
    return result.scalars().all()

@router.get("/{devis_id}")
async def get_devis(devis_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Devis).where(Devis.id == devis_id))
    devis = result.scalar_one_or_none()
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    return devis

@router.post("/")
async def create_devis(data: DevisCreate, db: AsyncSession = Depends(get_db)):
    now = datetime.now()
    result = await db.execute(select(Devis).order_by(desc(Devis.id)))
    last = result.scalars().first()
    increment = (last.id + 1) if last else 1
    numero = generer_numero(now, increment)
    devis = Devis(**data.dict(), numero=numero)
    db.add(devis)
    await db.commit()
    await db.refresh(devis)
    return devis

@router.put("/{devis_id}")
async def update_devis(devis_id: int, data: DevisUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Devis).where(Devis.id == devis_id))
    devis = result.scalar_one_or_none()
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    for key, value in data.dict().items():
        setattr(devis, key, value)
    await db.commit()
    await db.refresh(devis)
    return devis

@router.delete("/{devis_id}")
async def delete_devis(devis_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Devis).where(Devis.id == devis_id))
    devis = result.scalar_one_or_none()
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    await db.delete(devis)
    await db.commit()
    return {"ok": True}

# ─── Routes PDF & Email ─────────────────────────────────────────

@router.get("/{devis_id}/pdf")
async def telecharger_pdf(devis_id: int, db: AsyncSession = Depends(get_db)):
    """Génère et retourne le PDF du devis"""
    result = await db.execute(select(Devis).where(Devis.id == devis_id))
    devis = result.scalar_one_or_none()
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    pdf_path = await generer_pdf(devis)
    devis.pdf_path = pdf_path
    await db.commit()
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"devis_{devis.numero}.pdf"
    )

@router.post("/{devis_id}/envoyer")
async def envoyer_devis(
    devis_id: int,
    email_data: EmailRequest,
    db: AsyncSession = Depends(get_db)
):
    """Génère le PDF et l'envoie par email au client"""
    result = await db.execute(select(Devis).where(Devis.id == devis_id))
    devis = result.scalar_one_or_none()
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    pdf_path = await generer_pdf(devis)
    await envoyer_devis_email(
        destinataire=email_data.destinataire,
        nom_client=devis.nom_client,
        numero_devis=devis.numero,
        pdf_path=pdf_path
    )
    devis.statut = "envoyé"
    devis.pdf_path = pdf_path
    await db.commit()
    return {"ok": True, "message": f"Devis envoyé à {email_data.destinataire}"}