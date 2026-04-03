const BASE_URL = "http://localhost:8000";

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
  type_prestation: string;
  description: string;
  nom_evenement: string;
  date_evenement: string;
  duree: string;
  horaires: string;
  prix_ttc: number;
  lignes_prestations: LignePrestation[];
  statut: string;
  pdf_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface DevisCreate {
  nom_client: string;
  adresse_client: string;
  type_prestation: string;
  description: string;
  nom_evenement: string;
  date_evenement: string;
  duree: string;
  horaires: string;
  lignes_prestations: LignePrestation[];
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
  getDevis: async (): Promise<Devis[]> => {
    const res = await fetch(`${BASE_URL}/devis`);
    if (!res.ok) throw new Error("Erreur API");
    return res.json();
  },

  createDevis: async (data: DevisCreate): Promise<Devis> => {
    const res = await fetch(`${BASE_URL}/devis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erreur API");
    return res.json();
  },

  deleteDevis: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/devis/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erreur API");
  },

  getDevisById: async (id: number): Promise<Devis> => {
    const res = await fetch(`${BASE_URL}/devis/${id}`);
    if (!res.ok) throw new Error("Devis introuvable");
    return res.json();
  },

  updateDevis: async (id: number, data: DevisCreate): Promise<Devis> => {
    const res = await fetch(`${BASE_URL}/devis/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erreur API");
    return res.json();
  },

  envoyerDevis: async (id: number, destinataire: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/devis/${id}/envoyer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destinataire }),
    });
    if (!res.ok) throw new Error("Erreur envoi email");
  },

  getPdfUrl: (id: number): string => `${BASE_URL}/devis/${id}/pdf`,

  // ── Opportunités ──

  getOpportunites: async (filters?: { archives?: boolean }): Promise<Opportunite[]> => {
    const params = new URLSearchParams();
    if (filters?.archives === true) params.set("archives", "true");
    const qs = params.toString();
    const res = await fetch(
      qs ? `${BASE_URL}/opportunites/?${qs}` : `${BASE_URL}/opportunites/`
    );
    if (!res.ok) throw new Error("Erreur API");
    return res.json();
  },

  bulkOpportunites: async (
    ids: number[],
    action: "archiver" | "desarchiver" | "supprimer"
  ): Promise<{ ok: boolean; affectes: number }> => {
    const res = await fetch(`${BASE_URL}/opportunites/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action }),
    });
    if (!res.ok) throw new Error("Erreur action groupée");
    return res.json();
  },

  marquerVue: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/opportunites/${id}/vue`, { method: "PUT" });
    if (!res.ok) throw new Error("Erreur API");
  },

  deleteOpportunite: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/opportunites/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erreur API");
  },

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
    const res = await fetch(qs ? `${BASE_URL}/prospects/?${qs}` : `${BASE_URL}/prospects/`);
    if (!res.ok) throw new Error("Erreur API");
    return res.json();
  },

  bulkProspects: async (
    ids: number[],
    action: "archiver" | "desarchiver" | "supprimer"
  ): Promise<{ ok: boolean; affectes: number }> => {
    const res = await fetch(`${BASE_URL}/prospects/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action }),
    });
    if (!res.ok) throw new Error("Erreur action groupée");
    return res.json();
  },

  updateStatutProspect: async (id: number, statut: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/prospects/${id}/statut`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
    if (!res.ok) throw new Error("Erreur API");
  },

  deleteProspect: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/prospects/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erreur API");
  },

  lancerScraperProspects: async (): Promise<{ total: number; nouveaux: number; emails_trouves: number; responsables_trouves: number }> => {
    const res = await fetch(`${BASE_URL}/prospects/scraper/lancer`, { method: "POST" });
    if (!res.ok) throw new Error("Erreur scraper");
    return res.json();
  },

  enrichirProspect: async (id: number): Promise<Prospect> => {
    const res = await fetch(`${BASE_URL}/prospects/${id}/enrichir`, { method: "POST" });
    if (!res.ok) throw new Error("Erreur enrichissement");
    return res.json();
  },

  genererEmailProspect: async (id: number): Promise<{ email: string }> => {
    const res = await fetch(`${BASE_URL}/prospects/${id}/generer-email`, { method: "POST" });
    if (!res.ok) throw new Error("Erreur génération email");
    return res.json();
  },

  updateNoteProspect: async (id: number, note: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/prospects/${id}/note`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) throw new Error("Erreur API");
  },

  exportCsvProspects: (): string => `${BASE_URL}/prospects/export/csv`,

  // ── Historique scraping ──

  getHistoriqueScraping: async (): Promise<ScrapingSession[]> => {
    const res = await fetch(`${BASE_URL}/scraping/historique`);
    if (!res.ok) throw new Error("Erreur API");
    return res.json();
  },

  lancerScraper: async (): Promise<{ message: string }> => {
    const res = await fetch(`${BASE_URL}/opportunites/scraper/lancer`, { method: "POST" });
    if (!res.ok) throw new Error("Erreur scraper");
    return res.json();
  },
};
