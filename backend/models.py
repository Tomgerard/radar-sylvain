from sqlalchemy import Column, Integer, String, Text, DateTime, Float
from sqlalchemy.sql import func
from database import Base

class Devis(Base):
    __tablename__ = "devis"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String, unique=True, index=True)
    date_devis = Column(DateTime, server_default=func.now())
    
    # Client
    nom_client = Column(String, nullable=False)
    adresse_client = Column(Text)
    
    # Prestation
    type_prestation = Column(String, nullable=False)
    description = Column(Text)
    nom_evenement = Column(String)
    date_evenement = Column(String)
    duree = Column(String)
    horaires = Column(String, default="À définir")
    prix_ttc = Column(Float, nullable=False)
    
    # Statut
    statut = Column(String, default="brouillon")  # brouillon / envoyé
    pdf_path = Column(String, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Opportunite(Base):
    __tablename__ = "opportunites"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String)           # pages_jaunes / evenement / boamp / facebook
    titre = Column(String)
    description = Column(Text)
    lieu = Column(String)
    date_evenement = Column(String, nullable=True)
    contact = Column(String, nullable=True)
    lien = Column(String, nullable=True)
    score = Column(String, default="moyenne")   # haute / moyenne / faible
    resume_ia = Column(Text, nullable=True)
    vue = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())