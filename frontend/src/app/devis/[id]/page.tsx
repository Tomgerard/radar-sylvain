"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { api, Devis, DevisCreate, LignePrestation } from "@/lib/api";
import BentoCard from "@/components/ui/BentoCard";
import Badge from "@/components/ui/Badge";
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

export default function DevisDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [devis, setDevis] = useState<Devis | null>(null);
  const [form, setForm] = useState<DevisCreate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailDest, setEmailDest] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api.getDevisById(id).then((d) => {
      setDevis(d);
      setForm({
        nom_client: d.nom_client,
        adresse_client: d.adresse_client,
        type_prestation: d.type_prestation || "",
        description: d.description,
        nom_evenement: d.nom_evenement,
        date_evenement: d.date_evenement,
        duree: d.duree,
        horaires: d.horaires,
        lignes_prestations:
          d.lignes_prestations?.length
            ? d.lignes_prestations.map((l) => ({ ...l }))
            : [{ libelle: d.type_prestation || "Prestation", prix_ttc: d.prix_ttc }],
        raison_sociale: d.raison_sociale || "",
        siret: d.siret || "",
        numero_tva: d.numero_tva || "",
        representant_legal: d.representant_legal || "",
        telephone_client: d.telephone_client || "",
        email_client: d.email_client || "",
        code_postal_client: d.code_postal_client || "",
        ville_client: d.ville_client || "",
      });
      setLoading(false);
    }).catch(() => {
      setErreur("Devis introuvable.");
      setLoading(false);
    });
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    if (!form) return;
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev!, [name]: value }));
  };

  const updateLigne = (index: number, patch: Partial<LignePrestation>) => {
    if (!form) return;
    setForm((prev) => ({
      ...prev!,
      lignes_prestations: prev!.lignes_prestations.map((l, i) =>
        i === index ? { ...l, ...patch } : l
      ),
    }));
  };

  const addLigne = () => {
    if (!form) return;
    setForm((prev) => ({
      ...prev!,
      lignes_prestations: [...prev!.lignes_prestations, { libelle: "", prix_ttc: 0 }],
    }));
  };

  const removeLigne = (index: number) => {
    if (!form) return;
    setForm((prev) => {
      const next = prev!.lignes_prestations.filter((_, i) => i !== index);
      return {
        ...prev!,
        lignes_prestations: next.length ? next : [{ libelle: "", prix_ttc: 0 }],
      };
    });
  };

  const totalTtcForm = useMemo(() => {
    if (!form) return 0;
    return form.lignes_prestations.reduce((s, l) => s + (Number(l.prix_ttc) || 0), 0);
  }, [form]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setErreur("");
    try {
      const updated = await api.updateDevis(id, form);
      setDevis(updated);
      setForm({
        nom_client: updated.nom_client,
        adresse_client: updated.adresse_client,
        type_prestation: updated.type_prestation || "",
        description: updated.description,
        nom_evenement: updated.nom_evenement,
        date_evenement: updated.date_evenement,
        duree: updated.duree,
        horaires: updated.horaires,
        lignes_prestations: updated.lignes_prestations.map((l) => ({ ...l })),
        raison_sociale: updated.raison_sociale || "",
        siret: updated.siret || "",
        numero_tva: updated.numero_tva || "",
        representant_legal: updated.representant_legal || "",
        telephone_client: updated.telephone_client || "",
        email_client: updated.email_client || "",
        code_postal_client: updated.code_postal_client || "",
        ville_client: updated.ville_client || "",
      });
      setMessage("Devis mis à jour !");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setErreur("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleEnvoyer = async () => {
    if (!emailDest) return;
    setSending(true);
    setErreur("");
    try {
      await api.envoyerDevis(id, emailDest);
      setDevis((prev) => prev ? { ...prev, statut: "envoyé" } : prev);
      setMessage(`Devis envoyé à ${emailDest} !`);
      setShowEmail(false);
      setEmailDest("");
      setTimeout(() => setMessage(""), 4000);
    } catch {
      setErreur("Erreur lors de l'envoi.");
    } finally {
      setSending(false);
    }
  };

  const inputClass =
    "w-full bg-white border border-border rounded-xl px-4 py-2.5 text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400";
  const labelClass = "block text-xs text-muted font-semibold uppercase tracking-wider mb-1.5";

  if (loading) {
    return <p className="text-muted text-center py-20 text-sm">Chargement...</p>;
  }

  if (!devis || !form) {
    return (
      <div className="text-center py-20">
        <p className="text-muted mb-4">{erreur || "Devis introuvable."}</p>
        <Button variant="ghost" onClick={() => router.push("/devis")}>
          ← Retour aux devis
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => router.push("/devis")}
            className="text-muted text-xs hover:text-text mb-2 flex items-center gap-1 transition-colors"
          >
            ← Retour aux devis
          </button>
          <h1 className="text-2xl font-bold text-text">Devis N° {devis.numero}</h1>
          <p className="text-muted text-sm mt-0.5">
            Créé le {new Date(devis.created_at).toLocaleDateString("fr-FR")}
          </p>
        </div>
        <Badge variant={devis.statut === "envoyé" ? "success" : "default"}>
          {devis.statut}
        </Badge>
      </div>

      {/* ── Messages ── */}
      {message && (
        <div className="mb-5 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium">
          ✓ {message}
        </div>
      )}
      {erreur && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
          {erreur}
        </div>
      )}

      <div className="grid grid-cols-12 gap-5">
        {/* ── Colonne gauche : Formulaire ── */}
        <div className="col-span-7 space-y-5">
          <BentoCard title="Client">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nom / Organisateur</label>
                <input name="nom_client" value={form.nom_client} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Adresse</label>
                <input name="adresse_client" value={form.adresse_client} onChange={handleChange} className={inputClass} />
              </div>
            </div>
          </BentoCard>

          <BentoCard title="Informations légales client">
            <p className="text-xs text-muted mb-4">Ces informations apparaîtront sur le devis PDF. Tous les champs sont optionnels.</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Raison sociale</label><input name="raison_sociale" value={form.raison_sociale || ""} onChange={handleChange} placeholder="SAS Exemple" className={inputClass} /></div>
              <div><label className={labelClass}>SIRET</label><input name="siret" value={form.siret || ""} onChange={handleChange} placeholder="000 000 000 00000" className={inputClass} /></div>
              <div><label className={labelClass}>N° TVA</label><input name="numero_tva" value={form.numero_tva || ""} onChange={handleChange} placeholder="FR00000000000" className={inputClass} /></div>
              <div><label className={labelClass}>Représentant légal</label><input name="representant_legal" value={form.representant_legal || ""} onChange={handleChange} placeholder="Prénom Nom" className={inputClass} /></div>
              <div><label className={labelClass}>Téléphone client</label><input name="telephone_client" value={form.telephone_client || ""} onChange={handleChange} placeholder="06 00 00 00 00" className={inputClass} /></div>
              <div><label className={labelClass}>Email client</label><input name="email_client" type="email" value={form.email_client || ""} onChange={handleChange} placeholder="contact@client.fr" className={inputClass} /></div>
              <div><label className={labelClass}>Code postal</label><input name="code_postal_client" value={form.code_postal_client || ""} onChange={handleChange} placeholder="73700" className={inputClass} /></div>
              <div><label className={labelClass}>Ville</label><input name="ville_client" value={form.ville_client || ""} onChange={handleChange} placeholder="Bourg-Saint-Maurice" className={inputClass} /></div>
            </div>
          </BentoCard>

          <BentoCard title="Prestation">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Événement</label>
                <input name="nom_evenement" value={form.nom_evenement} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Type de prestation</label>
                <select name="type_prestation" value={form.type_prestation || ""} onChange={handleChange} className={inputClass}>
                  <option value="">-- Non défini --</option>
                  {TYPES_PRESTATION.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Date</label>
                <input type="date" name="date_evenement" value={form.date_evenement} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Durée</label>
                <input name="duree" value={form.duree} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Horaires</label>
                <input name="horaires" value={form.horaires} onChange={handleChange} className={inputClass} />
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-3">
                <label className={labelClass + " mb-0"}>Prestations facturées</label>
                <button
                  type="button"
                  onClick={addLigne}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  + Ajouter une ligne
                </button>
              </div>
              <div className="space-y-2">
                {form.lignes_prestations.map((ligne, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <input
                      value={ligne.libelle}
                      onChange={(e) => updateLigne(idx, { libelle: e.target.value })}
                      placeholder="Libellé de la prestation"
                      className={`${inputClass} flex-1 min-w-0`}
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={ligne.prix_ttc === 0 ? "" : ligne.prix_ttc}
                        onChange={(e) =>
                          updateLigne(idx, { prix_ttc: parseFloat(e.target.value) || 0 })
                        }
                        className={`${inputClass} w-28 text-right`}
                      />
                      <span className="text-sm text-muted w-6">€</span>
                      <button
                        type="button"
                        onClick={() => removeLigne(idx)}
                        disabled={form.lignes_prestations.length <= 1}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-30 transition-colors"
                        title="Supprimer la ligne"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <label className={labelClass}>Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={4} className={`${inputClass} resize-none`} />
            </div>
          </BentoCard>
        </div>

        {/* ── Colonne droite : Récapitulatif ── */}
        <div className="col-span-5">
          <div className="sticky top-8 space-y-5">
            <BentoCard title="Récapitulatif">
              <div className="space-y-5">
                <div className="text-center py-4 bg-background rounded-xl">
                  <p className="text-4xl font-extrabold text-primary">
                    {totalTtcForm.toFixed(2)} €
                  </p>
                  <p className="text-muted text-xs mt-1">Total TTC</p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">N° devis</span>
                    <span className="font-mono font-semibold text-text">{devis.numero}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Date</span>
                    <span className="font-semibold text-text">
                      {new Date(devis.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Statut</span>
                    <Badge variant={devis.statut === "envoyé" ? "success" : "default"}>
                      {devis.statut}
                    </Badge>
                  </div>
                </div>

                <div className="pt-2 space-y-2.5">
                  <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
                    {saving ? "Sauvegarde..." : "Sauvegarder"}
                  </Button>
                  <a
                    href={api.getPdfUrl(id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-full font-semibold text-sm px-7 py-3 bg-surface border border-border text-text hover:bg-background shadow-sm transition-colors"
                  >
                    📥 Générer PDF
                  </a>
                  <Button
                    variant="secondary"
                    onClick={() => setShowEmail(!showEmail)}
                    className="w-full"
                    size="lg"
                  >
                    ✉️ Envoyer par email
                  </Button>
                </div>
              </div>
            </BentoCard>

            {/* Email form */}
            {showEmail && (
              <BentoCard title="Envoyer par email">
                <div className="space-y-3">
                  <input
                    type="email"
                    value={emailDest}
                    onChange={(e) => setEmailDest(e.target.value)}
                    placeholder="email@client.fr"
                    className={inputClass}
                  />
                  <Button
                    onClick={handleEnvoyer}
                    disabled={sending || !emailDest}
                    className="w-full"
                  >
                    {sending ? "Envoi..." : "Envoyer maintenant"}
                  </Button>
                </div>
              </BentoCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
