"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api, Devis, DevisCreate } from "@/lib/api";
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
        type_prestation: d.type_prestation,
        description: d.description,
        nom_evenement: d.nom_evenement,
        date_evenement: d.date_evenement,
        duree: d.duree,
        horaires: d.horaires,
        prix_ttc: d.prix_ttc,
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
    setForm((prev) => ({
      ...prev!,
      [name]: name === "prix_ttc" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setErreur("");
    try {
      const updated = await api.updateDevis(id, form);
      setDevis(updated);
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

          <BentoCard title="Prestation">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Événement</label>
                <input name="nom_evenement" value={form.nom_evenement} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Type de prestation</label>
                <select name="type_prestation" value={form.type_prestation} onChange={handleChange} className={inputClass}>
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
              <div>
                <label className={labelClass}>Prix TTC (€)</label>
                <input type="number" name="prix_ttc" value={form.prix_ttc} onChange={handleChange} className={inputClass} />
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
                    {form.prix_ttc.toFixed(0)} €
                  </p>
                  <p className="text-muted text-xs mt-1">TTC</p>
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
