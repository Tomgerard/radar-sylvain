"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, DevisCreate } from "@/lib/api";
import BentoCard from "@/components/ui/BentoCard";
import Button from "@/components/ui/Button";

const TYPES_PRESTATION = [
  "Sculpture sur ballons",
  "Magie",
  "Ventriloquie",
  "Piano & Chansons",
  "Spectacle enfant",
  "Spectacle cabaret",
  "Spectacle de Noël",
  "Animation de rue",
  "Animation CE",
  "Fête de village",
];

const defaultForm: DevisCreate = {
  nom_client: "",
  adresse_client: "",
  type_prestation: "Magie",
  description: "",
  nom_evenement: "",
  date_evenement: "",
  duree: "",
  horaires: "À définir",
  prix_ttc: 0,
};

export default function NouveauDevisPage() {
  const router = useRouter();
  const [form, setForm] = useState<DevisCreate>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "prix_ttc" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErreur("");
    try {
      const devis = await api.createDevis(form);
      router.push(`/devis/${devis.id}`);
    } catch {
      setErreur("Erreur lors de la création du devis.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full bg-white border border-border rounded-xl px-4 py-2.5 text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400";
  const labelClass = "block text-xs text-muted font-semibold uppercase tracking-wider mb-1.5";

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => router.back()}
            className="text-muted text-xs hover:text-text mb-2 flex items-center gap-1 transition-colors"
          >
            ← Retour
          </button>
          <h1 className="text-2xl font-bold text-text">Nouveau devis</h1>
          <p className="text-muted text-sm mt-0.5">Remplissez les informations de la prestation</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* ── Colonne gauche : Formulaire ── */}
        <div className="col-span-7 space-y-5">
          {/* Client */}
          <BentoCard title="Client">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nom / Organisateur *</label>
                <input
                  name="nom_client"
                  value={form.nom_client}
                  onChange={handleChange}
                  placeholder="Mairie de Bourg-Saint-Maurice"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Adresse</label>
                <input
                  name="adresse_client"
                  value={form.adresse_client}
                  onChange={handleChange}
                  placeholder="1 rue de la Mairie, 73700"
                  className={inputClass}
                />
              </div>
            </div>
          </BentoCard>

          {/* Prestation */}
          <BentoCard title="Prestation">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nom de l'événement *</label>
                <input
                  name="nom_evenement"
                  value={form.nom_evenement}
                  onChange={handleChange}
                  placeholder="Fête de la cerise"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Type de prestation *</label>
                <select
                  name="type_prestation"
                  value={form.type_prestation}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {TYPES_PRESTATION.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Date de l'événement *</label>
                <input
                  type="date"
                  name="date_evenement"
                  value={form.date_evenement}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Durée</label>
                <input
                  name="duree"
                  value={form.duree}
                  onChange={handleChange}
                  placeholder="2h"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Horaires</label>
                <input
                  name="horaires"
                  value={form.horaires}
                  onChange={handleChange}
                  placeholder="À définir"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Prix TTC (€) *</label>
                <input
                  type="number"
                  name="prix_ttc"
                  value={form.prix_ttc}
                  onChange={handleChange}
                  placeholder="500"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className={labelClass}>Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                placeholder="Décrivez le déroulé de la prestation..."
                className={`${inputClass} resize-none`}
              />
            </div>
          </BentoCard>
        </div>

        {/* ── Colonne droite : Récapitulatif ── */}
        <div className="col-span-5">
          <div className="sticky top-8">
            <BentoCard title="Récapitulatif">
              <div className="space-y-5">
                {/* Prix */}
                <div className="text-center py-4 bg-background rounded-xl">
                  <p className="text-4xl font-extrabold text-primary">
                    {form.prix_ttc.toFixed(0)} €
                  </p>
                  <p className="text-muted text-xs mt-1">TTC</p>
                </div>

                {/* Infos */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Client</span>
                    <span className="font-semibold text-text truncate ml-4">
                      {form.nom_client || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Événement</span>
                    <span className="font-semibold text-text truncate ml-4">
                      {form.nom_evenement || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Type</span>
                    <span className="font-semibold text-text">{form.type_prestation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Date</span>
                    <span className="font-semibold text-text">{form.date_evenement || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Statut</span>
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      brouillon
                    </span>
                  </div>
                </div>

                {/* Erreur */}
                {erreur && (
                  <p className="text-red-600 text-xs text-center bg-red-50 rounded-lg py-2">
                    {erreur}
                  </p>
                )}

                {/* Actions */}
                <div className="pt-2 space-y-2.5">
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !form.nom_client || !form.prix_ttc}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? "Création..." : "Créer le devis"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="w-full"
                    size="lg"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            </BentoCard>
          </div>
        </div>
      </div>
    </div>
  );
}
