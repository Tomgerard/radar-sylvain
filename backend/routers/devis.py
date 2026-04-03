import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime
from database import get_db
from models import Devis
from services.pdf_service import generer_pdf
from services.email_service import envoyer_devis_email

router = APIRouter()

# ─── Schémas Pydantic ───────────────────────────────────────────

class LignePrestationIn(BaseModel):
    libelle: str
    prix_ttc: float = Field(ge=0)


class DevisCreate(BaseModel):
    nom_client: str
    adresse_client: str
    type_prestation: str
    description: str
    nom_evenement: str
    date_evenement: str
    duree: str
    horaires: str = "À définir"
    lignes_prestations: list[LignePrestationIn] = Field(min_length=1)


class DevisUpdate(DevisCreate):
    pass

class EmailRequest(BaseModel):
    destinataire: str

# ─── Utilitaire ─────────────────────────────────────────────────

def generer_numero(date: datetime, increment: int) -> str:
    return f"{date.strftime('%Y%m%d')}{increment:03d}"


def _normaliser_lignes(data: DevisCreate) -> tuple[str, float]:
    lignes: list[dict[str, Any]] = []
    for l in data.lignes_prestations:
        lib = (l.libelle or "").strip()
        if not lib:
            continue
        lignes.append({"libelle": lib, "prix_ttc": float(l.prix_ttc)})
    if not lignes:
        raise HTTPException(status_code=400, detail="Au moins une ligne de prestation avec un libellé")
    total = sum(x["prix_ttc"] for x in lignes)
    return json.dumps(lignes, ensure_ascii=False), total


def _dump_devis(devis: Devis) -> dict[str, Any]:
    lignes: list[dict] = []
    raw = getattr(devis, "lignes_prestations", None)
    if raw:
        try:
            lignes = json.loads(raw)
            if not isinstance(lignes, list):
                lignes = []
        except json.JSONDecodeError:
            lignes = []
    if not lignes:
        lignes = [
            {
                "libelle": devis.type_prestation or "Prestation",
                "prix_ttc": float(devis.prix_ttc or 0),
            }
        ]
    return {
        "id": devis.id,
        "numero": devis.numero,
        "date_devis": devis.date_devis.isoformat() if devis.date_devis else None,
        "nom_client": devis.nom_client,
        "adresse_client": devis.adresse_client,
        "type_prestation": devis.type_prestation,
        "description": devis.description,
        "nom_evenement": devis.nom_evenement,
        "date_evenement": devis.date_evenement,
        "duree": devis.duree,
        "horaires": devis.horaires,
        "prix_ttc": float(devis.prix_ttc or 0),
        "lignes_prestations": lignes,
        "statut": devis.statut,
        "pdf_path": devis.pdf_path,
        "created_at": devis.created_at.isoformat() if devis.created_at else None,
        "updated_at": devis.updated_at.isoformat() if devis.updated_at else None,
    }


# ─── Routes CRUD ────────────────────────────────────────────────

@router.get("/")
async def list_devis(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Devis).order_by(desc(Devis.created_at)))
    return [_dump_devis(d) for d in result.scalars().all()]

@router.get("/{devis_id}")
async def get_devis(devis_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Devis).where(Devis.id == devis_id))
    devis = result.scalar_one_or_none()
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    return _dump_devis(devis)

@router.post("/")
async def create_devis(data: DevisCreate, db: AsyncSession = Depends(get_db)):
    now = datetime.now()
    result = await db.execute(select(Devis).order_by(desc(Devis.id)))
    last = result.scalars().first()
    increment = (last.id + 1) if last else 1
    numero = generer_numero(now, increment)
    bulk_json, total = _normaliser_lignes(data)
    payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    payload.pop("lignes_prestations", None)
    devis = Devis(
        **payload,
        numero=numero,
        prix_ttc=total,
        lignes_prestations=bulk_json,
    )
    db.add(devis)
    await db.commit()
    await db.refresh(devis)
    return _dump_devis(devis)

@router.put("/{devis_id}")
async def update_devis(devis_id: int, data: DevisUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Devis).where(Devis.id == devis_id))
    devis = result.scalar_one_or_none()
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    bulk_json, total = _normaliser_lignes(data)
    payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    payload.pop("lignes_prestations", None)
    for key, value in payload.items():
        setattr(devis, key, value)
    devis.prix_ttc = total
    devis.lignes_prestations = bulk_json
    await db.commit()
    await db.refresh(devis)
    return _dump_devis(devis)

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