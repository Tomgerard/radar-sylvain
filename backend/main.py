from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base
from routers import devis, opportunites, prospects, scraping

async def migrate_sessions(conn):
    """Crée la table sessions_scraping si elle n'existe pas (SQLite)."""
    from sqlalchemy import text
    await conn.execute(text("""
        CREATE TABLE IF NOT EXISTS sessions_scraping (
            id INTEGER PRIMARY KEY,
            type VARCHAR,
            date_scraping DATETIME DEFAULT (datetime('now')),
            total_trouves INTEGER DEFAULT 0,
            nouveaux INTEGER DEFAULT 0,
            emails_trouves INTEGER DEFAULT 0,
            responsables_trouves INTEGER DEFAULT 0,
            rejetes_zone INTEGER DEFAULT 0,
            statut VARCHAR DEFAULT 'termine'
        )
    """))


async def migrate_prospects(conn):
    """Ajoute les colonnes d'enrichissement si elles n'existent pas (SQLite)."""
    colonnes = {
        "responsable_prenom": "VARCHAR",
        "responsable_nom": "VARCHAR",
        "responsable_titre": "VARCHAR",
        "description_structure": "TEXT",
        "site_web_scrape": "INTEGER DEFAULT 0",
        "email_trouve": "INTEGER DEFAULT 0",
        "enrichissement_date": "DATETIME",
        "score_prospection": "INTEGER DEFAULT 0",
        "archive": "INTEGER DEFAULT 0",
    }
    from sqlalchemy import text
    result = await conn.execute(text("PRAGMA table_info(prospects)"))
    existing = {row[1] for row in result.fetchall()}
    for col, coltype in colonnes.items():
        if col not in existing:
            await conn.execute(text(f"ALTER TABLE prospects ADD COLUMN {col} {coltype}"))


async def migrate_devis_lignes(conn):
    """Ajoute lignes_prestations sur devis si absent (SQLite)."""
    from sqlalchemy import text
    result = await conn.execute(text("PRAGMA table_info(devis)"))
    existing = {row[1] for row in result.fetchall()}
    if "lignes_prestations" not in existing:
        await conn.execute(text("ALTER TABLE devis ADD COLUMN lignes_prestations TEXT"))


async def migrate_opportunites(conn):
    """Ajoute archive sur opportunites si absent (SQLite)."""
    from sqlalchemy import text
    result = await conn.execute(text("PRAGMA table_info(opportunites)"))
    existing = {row[1] for row in result.fetchall()}
    if "archive" not in existing:
        await conn.execute(text("ALTER TABLE opportunites ADD COLUMN archive INTEGER DEFAULT 0"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await migrate_sessions(conn)
        await migrate_prospects(conn)
        await migrate_devis_lignes(conn)
        await migrate_opportunites(conn)
    yield

app = FastAPI(
    title="Radar Sylvain API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(devis.router, prefix="/devis", tags=["devis"])
app.include_router(opportunites.router, prefix="/opportunites", tags=["opportunites"])
app.include_router(prospects.router, prefix="/prospects", tags=["prospects"])
app.include_router(scraping.router, prefix="/scraping", tags=["scraping"])

@app.get("/")
async def root():
    return {"status": "ok", "message": "Radar Sylvain API"}