"""
Filtre géographique strict — Zones autorisées pour Sylvain Gérard.
Départements : 73 (Savoie), 74 (Haute-Savoie), 01 (Ain), 38 (Isère), 69 (Rhône)
"""

VILLES_AUTORISEES = [
    # Savoie 73
    "chambery", "chambéry", "bourg-saint-maurice", "albertville",
    "moutiers", "moûtiers", "aix-les-bains", "saint-jean-de-maurienne",
    "modane", "la thuile", "ugine", "moûtiers", "la motte-servolex",
    "saint-alban-leysse", "cognin", "jacob-bellecombette",
    "bourg-saint-maurice", "landry", "les arcs", "courchevel",
    "méribel", "meribel", "val d'isère", "val-d-isere", "tignes",
    "pralognan", "les menuires", "val thorens",
    # Haute-Savoie 74
    "annecy", "annemasse", "thonon", "thonon-les-bains",
    "evian", "évian", "evian-les-bains", "cluses", "bonneville",
    "saint-julien", "chamonix", "megeve", "mégève", "sallanches",
    "rumilly", "cran-gevrier", "seynod", "pringy", "argonay",
    "la roche-sur-foron", "gaillard", "douvaine", "sciez",
    "morzine", "les gets", "chatel", "châtel", "saint-gervais",
    # Ain 01
    "bourg-en-bresse", "oyonnax", "bellegarde", "ferney-voltaire",
    "gex", "saint-genis-pouilly", "ambérieu", "ambérieu-en-bugey",
    # Isère 38
    "grenoble", "voiron", "bourgoin", "bourgoin-jallieu",
    "vienne", "villefontaine", "crolles", "échirolles", "echirolles",
    # Rhône 69
    "lyon", "villeurbanne", "vénissieux", "venissieux", "bron",
    "saint-priest", "meyzieu", "décines", "decines",
    # Suisse frontalière
    "geneve", "genève", "lausanne", "nyon", "gland", "rolle", "morges",
    "yvoire", "hermance",
]

DEPARTEMENTS_AUTORISES = [
    "73", "74", "01", "38", "69",
    "savoie", "haute-savoie", "ain", "isère", "isere", "rhône", "rhone",
    "auvergne-rhône-alpes", "auvergne-rhone-alpes",
]


def est_dans_zone(item: dict) -> bool:
    """
    Retourne True si le prospect ou l'opportunité est dans la zone géographique autorisée.
    Fonctionne pour les prospects (champs ville/departement) et les opportunités (champ lieu).
    """
    ville = (item.get("ville") or "").lower().strip()
    dept = (item.get("departement") or "").lower().strip()
    lieu = (item.get("lieu") or "").lower().strip()
    adresse = (item.get("adresse") or "").lower().strip()

    # Vérifier département (chiffre ou libellé)
    for d in DEPARTEMENTS_AUTORISES:
        if d in dept:
            return True

    # Vérifier dans le lieu (opportunités) et adresse
    texte = " ".join([ville, lieu, adresse])
    for v in VILLES_AUTORISEES:
        if v in texte:
            return True
    for d in DEPARTEMENTS_AUTORISES:
        if d in texte:
            return True

    return False
