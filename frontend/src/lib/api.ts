const BASE_URL = "http://localhost:8000";

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
  prix_ttc: number;
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

  getOpportunites: async (): Promise<Opportunite[]> => {
    const res = await fetch(`${BASE_URL}/opportunites`);
    if (!res.ok) throw new Error("Erreur API");
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

  lancerScraper: async (): Promise<{ message: string }> => {
    const res = await fetch(`${BASE_URL}/opportunites/scraper/lancer`, { method: "POST" });
    if (!res.ok) throw new Error("Erreur scraper");
    return res.json();
  },
};
