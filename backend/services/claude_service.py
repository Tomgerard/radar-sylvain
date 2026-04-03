import os
import re
import json
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

async def scorer_opportunite(titre: str, description: str, lieu: str) -> dict:
    prompt = f"""Tu es l'assistant de Sylvain Gérard, artiste de spectacle (magie, ventriloquie, sculpture sur ballons, piano) basé en Savoie.

Voici une opportunité détectée :
- Titre : {titre}
- Description : {description}
- Lieu : {lieu}

Évalue si cette opportunité est pertinente pour Sylvain.

PRIORITÉ HAUTE si :
- La personne cherche activement un animateur/magicien
- L'événement est dans les 3 prochains mois
- Le lieu est en Savoie, Haute-Savoie, Ain, Isère ou Suisse romande
- Il s'agit d'un mariage, anniversaire, kermesse, fête de village, CE, spectacle enfants
- La source est une agence événementielle avec un contact direct disponible
- L'annonce vient d'un organisateur professionnel cherchant un prestataire

PRIORITÉ FAIBLE si :
- C'est juste une liste d'entreprises sans demande active
- L'événement est passé ou trop loin géographiquement
- Pas de rapport avec le spectacle vivant

Réponds UNIQUEMENT en JSON avec ce format exact :
{{
  "score": "haute" | "moyenne" | "faible",
  "resume": "2 lignes maximum expliquant pourquoi c'est pertinent ou non"
}}"""

    message = await client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )

    try:
        return json.loads(message.content[0].text)
    except Exception:
        return {"score": "moyenne", "resume": "Analyse non disponible."}


async def scorer_prospect(prospect: dict) -> int:
    nom = prospect.get("nom", "")
    type_structure = prospect.get("type_structure", "")
    ville = prospect.get("ville", "")
    email_trouve = "oui" if prospect.get("email") else "non"
    responsable_connu = "oui" if prospect.get("responsable_prenom") else "non"

    prompt = f"""Tu es l'assistant commercial de Sylvain Gérard, artiste de spectacle en Savoie.

Évalue ce prospect sur 100 pour Sylvain :
- Nom : {nom}
- Type : {type_structure}
- Ville : {ville}
- Email disponible : {email_trouve}
- Responsable connu : {responsable_connu}

Critères de scoring :
+ 30 pts si email disponible
+ 20 pts si responsable identifié
+ 20 pts si CE/CSE (budget animation important)
+ 15 pts si mairie (fêtes village, Noël)
+ 15 pts si hôtel/camping/station ski
+ 10 pts si Savoie (73) ou Haute-Savoie (74)
+ 5 pts si Ain/Isère/Suisse

Réponds UNIQUEMENT avec un nombre entre 0 et 100."""

    try:
        message = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=10,
            messages=[{"role": "user", "content": prompt}]
        )
        return int(re.search(r'\d+', message.content[0].text).group())
    except Exception:
        return 0
