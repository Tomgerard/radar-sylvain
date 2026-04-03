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
    type_prestation = Column(String, nullable=True)
    description = Column(Text)
    nom_evenement = Column(String)
    date_evenement = Column(String)
    duree = Column(String)
    horaires = Column(String, default="À définir")
    prix_ttc = Column(Float, nullable=False)  # total TTC (= somme des lignes)
    lignes_prestations = Column(Text, nullable=True)  # JSON [{ "libelle", "prix_ttc" }, ...]

    # Informations légales client
    raison_sociale = Column(String, nullable=True)
    siret = Column(String, nullable=True)
    numero_tva = Column(String, nullable=True)
    representant_legal = Column(String, nullable=True)
    telephone_client = Column(String, nullable=True)
    email_client = Column(String, nullable=True)
    code_postal_client = Column(String, nullable=True)
    ville_client = Column(String, nullable=True)

    # Statut
    statut = Column(String, default="brouillon")  # brouillon / envoyé
    pdf_path = Column(String, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Prospect(Base):
    __tablename__ = "prospects"

    id = Column(Integer, primary_key=True, index=True)

    # Identité
    nom = Column(String, nullable=False)
    type_structure = Column(String)
    # "CE/CSE" | "mairie" | "ecole" | "restaurant" | "hotel"
    # | "camping" | "association" | "station_ski" | "autre"

    # Contact
    adresse = Column(String)
    ville = Column(String)
    departement = Column(String)
    telephone = Column(String)
    email = Column(String)
    site_web = Column(String)

    # Suivi commercial
    statut = Column(String, default="a_contacter")
    # "a_contacter" | "contacte" | "en_attente" | "interesse" | "refuse"
    archive = Column(Integer, default=0)  # 1 = masqué de la liste active
    note = Column(Text)
    email_envoye = Column(Text)

    # Source
    source = Column(String)
    lien_source = Column(String)

    # Enrichissement
    responsable_prenom = Column(String)
    responsable_nom = Column(String)
    responsable_titre = Column(String)
    description_structure = Column(Text)
    site_web_scrape = Column(Integer, default=0)
    email_trouve = Column(Integer, default=0)
    enrichissement_date = Column(DateTime)
    score_prospection = Column(Integer, default=0)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class SessionScraping(Base):
    __tablename__ = "sessions_scraping"

    id = Column(Integer, primary_key=True)
    type = Column(String)              # "opportunites" | "prospects"
    date_scraping = Column(DateTime, server_default=func.now())
    total_trouves = Column(Integer, default=0)
    nouveaux = Column(Integer, default=0)
    emails_trouves = Column(Integer, default=0)
    responsables_trouves = Column(Integer, default=0)
    rejetes_zone = Column(Integer, default=0)
    statut = Column(String, default="termine")  # "en_cours" | "termine" | "erreur"


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
    archive = Column(Integer, default=0)  # 1 = masqué de la liste active
    created_at = Column(DateTime, server_default=func.now())