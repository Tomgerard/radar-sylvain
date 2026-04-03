import os
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

async def scorer_opportunite(titre: str, description: str, lieu: str) -> dict:
    """
    Envoie une opportunité à Claude qui retourne :
    - un score : haute / moyenne / faible
    - un résumé en 2 lignes pour Sylvain
    """
    prompt = f"""Tu es l'assistant de Sylvain Gérard, artiste de spectacle (magie, ventriloquie, sculpture sur ballons, piano) basé en Savoie.

Voici une opportunité détectée :
- Titre : {titre}
- Description : {description}
- Lieu : {lieu}

Évalue si cette opportunité est pertinente pour Sylvain.
Réponds UNIQUEMENT en JSON avec ce format exact :
{{
  "score": "haute" | "moyenne" | "faible",
  "resume": "2 lignes maximum expliquant pourquoi c'est pertinent ou non"
}}"""

    message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )

    import json
    try:
        return json.loads(message.content[0].text)
    except Exception:
        return {"score": "moyenne", "resume": "Analyse non disponible."}