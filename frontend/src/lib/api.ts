import { getToken, removeToken } from "./auth";

const BASE_URL = "http://localhost:8000";

const authHeaders = (json = true): Record<string, string> => {
  const h: Record<string, string> = {};
  if (json) h["Content-Type"] = "application/json";
  const token = getToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
};

const handleResponse = async (res: Response) => {
  if (res.status === 401) {
    removeToken();
    window.location.href = "/login";
    throw new Error("Session expirée");
  }
  if (!res.ok) throw new Error("Erreur API");
  return res.json();
};

export const logout = (): void => {
  removeToken();
  window.location.href = "/login";
};

export interface LignePrestation {
  libelle: string;
  prix_ttc: number;
}

export interface Devis {
  id: number;
  numero: string;
  date_devis: string;
  nom_client: string;
  adresse_client: string;
  type_prestation: string | null;
  description: string;
  nom_evenement: string;
  date_evenement: string;
  duree: string;
  horaires: string;
  prix_ttc: number;
  lignes_prestations: LignePrestation[];
  statut: string;
  pdf_path: string | null;
  raison_sociale?: string | null;
  siret?: string | null;
  numero_tva?: string | null;
  representant_legal?: string | null;
  telephone_client?: string | null;
  email_client?: string | null;
  code_postal_client?: string | null;
  ville_client?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DevisCreate {
  nom_client: string;
  adresse_client?: string;
  type_prestation?: string;
  description?: string;
  nom_evenement?: string;
  date_evenement?: string;
  duree?: string;
  horaires?: string;
  lignes_prestations: LignePrestation[];
  // Informations légales client
  raison_sociale?: string;
  siret?: string;
  numero_tva?: string;
  representant_legal?: string;
  telephone_client?: string;
  email_client?: string;
  code_postal_client?: string;
  ville_client?: string;
}

export interface Prospect {
  id: number;
  nom: string;
  type_structure: string;
  adresse: string;
  ville: string;
  departement: string;
  telephone: string;
  email: string;
  site_web: string;
  statut: string;
  note: string;
  email_envoye: string;
  source: string;
  lien_source: string;
  // Enrichissement
  responsable_prenom: string | null;
  responsable_nom: string | null;
  responsable_titre: string | null;
  description_structure: string | null;
  site_web_scrape: number;
  email_trouve: number;
  enrichissement_date: string | null;
  score_prospection: number;
  archive?: number;
  created_at: string;
  updated_at: string;
}

export interface ScrapingSession {
  id: number;
  type: "opportunites" | "prospects";
  date_scraping: string;
  total_trouves: number;
  nouveaux: number;
  emails_trouves: number;
  responsables_trouves: number;
  rejetes_zone: number;
  statut: "en_cours" | "termine" | "erreur";
}

export interface Opportunite {
  id: number;
  source: string;
  titre: string;
  description: string;
  lieu: string;
  date_evenement?: string;
  contact?: string;
  lien?: string;
  score: string;
  resume_ia?: string;
  vue: number;
  archive?: number;
  created_at: string;
}

export const api = {
  // ── Devis ──

  getDevis: async (): Promise<Devis[]> =>
    fetch(`${BASE_URL}/devis`, { headers: authHeaders(false) }).then(handleResponse),

  createDevis: async (data: DevisCreate): Promise<Devis> =>
    fetch(`${BASE_URL}/devis`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  deleteDevis: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/devis/${id}`, { method: "DELETE", headers: authHeaders(false) });
    if (res.status === 401) { removeToken(); window.location.href = "/login"; }
    if (!res.ok) throw new Error("Erreur API");
  },

  getDevisById: async (id: number): Promise<Devis> =>
    fetch(`${BASE_URL}/devis/${id}`, { headers: authHeaders(false) }).then(handleResponse),

  updateDevis: async (id: number, data: DevisCreate): Promise<Devis> =>
    fetch(`${BASE_URL}/devis/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  envoyerDevis: async (id: number, destinataire: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/devis/${id}/envoyer`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ destinataire }),
    });
    if (!res.ok) throw new Error("Erreur envoi email");
  },

  getPdfUrl: (id: number): string => {
    const token = getToken();
    return `${BASE_URL}/devis/${id}/pdf${token ? `?token=${token}` : ""}`;
  },

  // ── Opportunités ──

  getOpportunites: async (filters?: { archives?: boolean }): Promise<Opportunite[]> => {
    const params = new URLSearchParams();
    if (filters?.archives === true) params.set("archives", "true");
    const qs = params.toString();
    return fetch(
      qs ? `${BASE_URL}/opportunites/?${qs}` : `${BASE_URL}/opportunites/`,
      { headers: authHeaders(false) }
    ).then(handleResponse);
  },

  bulkOpportunites: async (
    ids: number[],
    action: "archiver" | "desarchiver" | "supprimer"
  ): Promise<{ ok: boolean; affectes: number }> =>
    fetch(`${BASE_URL}/opportunites/bulk`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ids, action }),
    }).then(handleResponse),

  marquerVue: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/opportunites/${id}/vue`, { method: "PUT", headers: authHeaders(false) });
    if (!res.ok) throw new Error("Erreur API");
  },

  deleteOpportunite: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/opportunites/${id}`, { method: "DELETE", headers: authHeaders(false) });
    if (!res.ok) throw new Error("Erreur API");
  },

  lancerScraper: async (): Promise<{ message: string }> =>
    fetch(`${BASE_URL}/opportunites/scraper/lancer`, { method: "POST", headers: authHeaders(false) }).then(handleResponse),

  // ── Prospects ──

  getProspects: async (filters?: {
    statut?: string;
    type_structure?: string;
    departement?: string;
    archives?: boolean;
  }): Promise<Prospect[]> => {
    const params = new URLSearchParams();
    if (filters?.statut) params.set("statut", filters.statut);
    if (filters?.type_structure) params.set("type_structure", filters.type_structure);
    if (filters?.departement) params.set("departement", filters.departement);
    if (filters?.archives === true) params.set("archives", "true");
    const qs = params.toString();
    return fetch(
      qs ? `${BASE_URL}/prospects/?${qs}` : `${BASE_URL}/prospects/`,
      { headers: authHeaders(false) }
    ).then(handleResponse);
  },

  bulkProspects: async (
    ids: number[],
    action: "archiver" | "desarchiver" | "supprimer"
  ): Promise<{ ok: boolean; affectes: number }> =>
    fetch(`${BASE_URL}/prospects/bulk`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ids, action }),
    }).then(handleResponse),

  updateStatutProspect: async (id: number, statut: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/prospects/${id}/statut`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ statut }),
    });
    if (!res.ok) throw new Error("Erreur API");
  },

  deleteProspect: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/prospects/${id}`, { method: "DELETE", headers: authHeaders(false) });
    if (!res.ok) throw new Error("Erreur API");
  },

  createProspect: async (data: {
    nom: string; type_structure?: string; adresse?: string; ville?: string;
    departement?: string; telephone?: string; email?: string; site_web?: string;
    statut?: string; note?: string; description_structure?: string;
  }): Promise<Prospect> =>
    fetch(`${BASE_URL}/prospects/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  lancerScraperProspects: async (): Promise<{ total: number; nouveaux: number; emails_trouves: number; responsables_trouves: number }> =>
    fetch(`${BASE_URL}/prospects/scraper/lancer`, { method: "POST", headers: authHeaders(false) }).then(handleResponse),

  enrichirProspect: async (id: number): Promise<Prospect> =>
    fetch(`${BASE_URL}/prospects/${id}/enrichir`, { method: "POST", headers: authHeaders(false) }).then(handleResponse),

  genererEmailProspect: async (id: number): Promise<{ email: string }> =>
    fetch(`${BASE_URL}/prospects/${id}/generer-email`, { method: "POST", headers: authHeaders(false) }).then(handleResponse),

  updateNoteProspect: async (id: number, note: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/prospects/${id}/note`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ note }),
    });
    if (!res.ok) throw new Error("Erreur API");
  },

  exportCsvProspects: async (): Promise<void> => {
    const res = await fetch(`${BASE_URL}/prospects/export/csv`, { headers: authHeaders(false) });
    if (!res.ok) throw new Error("Erreur export");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prospects.csv";
    a.click();
    URL.revokeObjectURL(url);
  },

  // ── Historique scraping ──

  getHistoriqueScraping: async (): Promise<ScrapingSession[]> =>
    fetch(`${BASE_URL}/scraping/historique`, { headers: authHeaders(false) }).then(handleResponse),
};
