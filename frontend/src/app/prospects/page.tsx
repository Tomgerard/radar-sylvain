"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api, Prospect } from "@/lib/api";
import HistoriqueScraping from "@/components/ui/HistoriqueScraping";

// ── Styles ────────────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  "CE/CSE":    { bg: "bg-blue-100",   text: "text-blue-800",   label: "CE / CSE" },
  mairie:      { bg: "bg-sky-100",    text: "text-sky-800",    label: "Mairie" },
  ecole:       { bg: "bg-green-100",  text: "text-green-800",  label: "École" },
  restaurant:  { bg: "bg-amber-100",  text: "text-amber-800",  label: "Restaurant" },
  hotel:       { bg: "bg-orange-100", text: "text-orange-800", label: "Hôtel" },
  camping:     { bg: "bg-emerald-100",text: "text-emerald-800",label: "Camping" },
  association: { bg: "bg-purple-100", text: "text-purple-800", label: "Association" },
  station_ski: { bg: "bg-cyan-100",   text: "text-cyan-800",   label: "Station ski" },
  autre:       { bg: "bg-gray-100",   text: "text-gray-700",   label: "Autre" },
};

const STATUT_OPTIONS = [
  { value: "a_contacter", label: "À contacter", color: "text-red-600" },
  { value: "contacte",    label: "Contacté",    color: "text-amber-700" },
  { value: "en_attente",  label: "En attente",  color: "text-orange-700" },
  { value: "interesse",   label: "Intéressé",   color: "text-green-700" },
  { value: "refuse",      label: "Refusé",      color: "text-gray-500" },
];

const TYPE_FILTERS = [
  { value: "all",       label: "Tous" },
  { value: "CE/CSE",    label: "CE / CSE" },
  { value: "mairie",    label: "Mairies" },
  { value: "hotel",     label: "Hôtels" },
  { value: "camping",   label: "Campings" },
  { value: "association", label: "Associations" },
  { value: "station_ski", label: "Stations ski" },
];

const STATUT_FILTERS = [
  { value: "all",        label: "Tous statuts" },
  { value: "a_contacter",label: "À contacter" },
  { value: "contacte",   label: "Contacté" },
  { value: "interesse",  label: "Intéressé" },
];

const SORT_OPTIONS = [
  { value: "score",   label: "Par score ↓" },
  { value: "date",    label: "Par date" },
  { value: "ville",   label: "Par ville" },
  { value: "type",    label: "Par type" },
];

// ── Score badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? "bg-green-100 text-green-800"
              : score >= 40 ? "bg-amber-100 text-amber-800"
              : "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center justify-center w-10 h-6 rounded-full text-xs font-bold ${color}`}>
      {score}
    </span>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-400" : "bg-gray-300";
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
    </div>
  );
}

// ── Panneau détail ────────────────────────────────────────────────────────────

function PanneauDetail({
  prospect,
  onClose,
  onStatut,
  onNote,
  onEnrichir,
  onGenererEmail,
  enrichissant,
  generatingEmail,
}: {
  prospect: Prospect;
  onClose: () => void;
  onStatut: (id: number, s: string) => void;
  onNote: (id: number, note: string) => void;
  onEnrichir: (id: number) => void;
  onGenererEmail: (id: number) => void;
  enrichissant: boolean;
  generatingEmail: boolean;
}) {
  const [note, setNote] = useState(prospect.note || "");
  const [email, setEmail] = useState(prospect.email_envoye || "");
  const [copied, setCopied] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setNote(prospect.note || ""); }, [prospect.note]);
  useEffect(() => { setEmail(prospect.email_envoye || ""); }, [prospect.email_envoye]);

  const handleNoteChange = (v: string) => {
    setNote(v);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => onNote(prospect.id, v), 800);
  };

  const handleCopier = async () => {
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOuvrirMail = () => {
    const lines = email.split("\n");
    const objetLine = lines.find((l) => l.toLowerCase().startsWith("objet:"));
    const objet = objetLine ? objetLine.replace(/^objet:\s*/i, "") : "Proposition de spectacle";
    const corps = lines.filter((l) => !l.toLowerCase().startsWith("objet:")).join("\n").trim();
    window.location.href = `mailto:${prospect.email || ""}?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(corps)}`;
  };

  const type = TYPE_STYLES[prospect.type_structure] || TYPE_STYLES.autre;
  const statutInfo = STATUT_OPTIONS.find((s) => s.value === prospect.statut) || STATUT_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[420px] bg-white shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h2 className="font-bold text-gray-900 text-base truncate">{prospect.nom}</h2>
            {prospect.archive === 1 && (
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                Archivé
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none shrink-0">✕</button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Identité */}
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Identité</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${type.bg} ${type.text}`}>
                  {type.label}
                </span>
                <ScoreBadge score={prospect.score_prospection || 0} />
              </div>
              {prospect.description_structure && (
                <p className="text-sm text-gray-600 leading-relaxed">{prospect.description_structure}</p>
              )}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Score de prospection</span>
                  <span className="font-bold">{prospect.score_prospection || 0}/100</span>
                </div>
                <ScoreBar score={prospect.score_prospection || 0} />
              </div>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact</h3>
            <div className="space-y-2 text-sm">
              {(prospect.responsable_prenom || prospect.responsable_nom) && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-24 shrink-0">Responsable</span>
                  <span className="text-gray-900 font-medium">
                    {[prospect.responsable_prenom, prospect.responsable_nom].filter(Boolean).join(" ")}
                    {prospect.responsable_titre && (
                      <span className="text-gray-500 font-normal"> — {prospect.responsable_titre}</span>
                    )}
                  </span>
                </div>
              )}
              {prospect.email && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-24 shrink-0">Email</span>
                  <a href={`mailto:${prospect.email}`} className="text-[#E63946] hover:underline truncate">
                    {prospect.email}
                  </a>
                </div>
              )}
              {prospect.telephone && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-24 shrink-0">Téléphone</span>
                  <a href={`tel:${prospect.telephone}`} className="text-gray-900 hover:text-[#E63946]">
                    {prospect.telephone}
                  </a>
                </div>
              )}
              {prospect.site_web && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-24 shrink-0">Site web</span>
                  <a href={prospect.site_web} target="_blank" rel="noreferrer"
                    className="text-blue-600 hover:underline truncate">
                    {prospect.site_web.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
              {prospect.adresse && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-24 shrink-0">Adresse</span>
                  <span className="text-gray-700">{prospect.adresse}, {prospect.ville}</span>
                </div>
              )}
              {!prospect.adresse && prospect.ville && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-24 shrink-0">Ville</span>
                  <span className="text-gray-700">{prospect.ville} ({prospect.departement})</span>
                </div>
              )}
            </div>
          </section>

          {/* Email de prospection */}
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Email de prospection</h3>
            {!email ? (
              <button
                onClick={() => onGenererEmail(prospect.id)}
                disabled={generatingEmail}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-500 hover:border-[#E63946] hover:text-[#E63946] transition-colors disabled:opacity-40"
              >
                {generatingEmail ? (
                  <>
                    <span className="w-4 h-4 border-2 border-gray-300 border-t-[#E63946] rounded-full animate-spin" />
                    Génération en cours...
                  </>
                ) : "✨ Générer avec Claude"}
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  rows={10}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-800 focus:outline-none focus:border-gray-400 resize-none font-mono"
                />
                <div className="flex gap-2">
                  <button onClick={handleCopier}
                    className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                    {copied ? "✓ Copié !" : "📋 Copier"}
                  </button>
                  <button onClick={handleOuvrirMail}
                    className="flex-1 py-2 rounded-xl bg-[#E63946] text-white text-xs font-semibold hover:bg-red-700 transition-colors">
                    ✉️ Ouvrir dans Mail
                  </button>
                </div>
                <button
                  onClick={() => onGenererEmail(prospect.id)}
                  disabled={generatingEmail}
                  className="w-full py-1.5 rounded-xl border border-dashed border-gray-200 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
                >
                  {generatingEmail ? "Régénération..." : "↺ Régénérer"}
                </button>
              </div>
            )}
          </section>

          {/* Historique */}
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Historique & Suivi</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Statut</label>
                <select
                  value={prospect.statut}
                  onChange={(e) => onStatut(prospect.id, e.target.value)}
                  className={`text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-gray-300 cursor-pointer font-medium ${statutInfo.color}`}
                >
                  {STATUT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-gray-400 space-y-1">
                <p>Ajouté le {new Date(prospect.created_at).toLocaleDateString("fr-FR")}</p>
                {prospect.enrichissement_date && (
                  <p>Enrichi le {new Date(prospect.enrichissement_date).toLocaleDateString("fr-FR")}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                <textarea
                  value={note}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  rows={3}
                  placeholder="Ajouter une note..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-gray-400 resize-none"
                />
              </div>
              <button
                onClick={() => onEnrichir(prospect.id)}
                disabled={enrichissant}
                className="w-full py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {enrichissant ? (
                  <><span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />Enrichissement...</>
                ) : "🔄 Ré-enrichir"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapePhase, setScrapePhase] = useState("");
  const [scrapeStats, setScrapeStats] = useState<{ nouveaux: number; emails: number; responsables: number } | null>(null);

  const [typeFilter, setTypeFilter] = useState("all");
  const [statutFilter, setStatutFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("score");

  const [selected, setSelected] = useState<Prospect | null>(null);
  const [enrichissant, setEnrichissant] = useState<number | null>(null);
  const [generatingEmail, setGeneratingEmail] = useState<number | null>(null);
  const [histKey, setHistKey] = useState(0);
  const [voirArchives, setVoirArchives] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState("");
  const selectAllRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const data = await api.getProspects({ archives: voirArchives });
    setProspects(data);
  }, [voirArchives]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  useEffect(() => {
    setSelectedIds([]);
  }, [voirArchives]);

  // ── Actions ──────────────────────────────────────────────────────

  const handleScrape = async () => {
    setScraping(true);
    setScrapeStats(null);
    try {
      setScrapePhase("Scraping...");
      await new Promise((r) => setTimeout(r, 500));
      setScrapePhase("Enrichissement...");
      const res = await api.lancerScraperProspects();
      setScrapePhase("Scoring...");
      await new Promise((r) => setTimeout(r, 300));
      setScrapePhase("Terminé !");
      setScrapeStats({ nouveaux: res.nouveaux, emails: res.emails_trouves, responsables: res.responsables_trouves });
      await load();
      setHistKey((k) => k + 1);
    } catch {
      setScrapePhase("Erreur lors du scan.");
    } finally {
      setScraping(false);
      setTimeout(() => { setScrapePhase(""); setScrapeStats(null); }, 6000);
    }
  };

  const handleStatut = async (id: number, statut: string) => {
    await api.updateStatutProspect(id, statut);
    setProspects((prev) => prev.map((p) => p.id === id ? { ...p, statut } : p));
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, statut } : null);
  };

  const handleNote = async (id: number, note: string) => {
    await api.updateNoteProspect(id, note);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce prospect ?")) return;
    await api.deleteProspect(id);
    setProspects((prev) => prev.filter((p) => p.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const handleEnrichir = async (id: number) => {
    setEnrichissant(id);
    try {
      const updated = await api.enrichirProspect(id);
      setProspects((prev) => prev.map((p) => p.id === id ? updated : p));
      if (selected?.id === id) setSelected(updated);
    } catch {
      alert("Erreur lors de l'enrichissement.");
    } finally {
      setEnrichissant(null);
    }
  };

  const handleGenererEmail = async (id: number) => {
    setGeneratingEmail(id);
    try {
      const { email } = await api.genererEmailProspect(id);
      setProspects((prev) => prev.map((p) => p.id === id ? { ...p, email_envoye: email } : p));
      if (selected?.id === id) setSelected((prev) => prev ? { ...prev, email_envoye: email } : null);
    } catch {
      alert("Erreur lors de la génération.");
    } finally {
      setGeneratingEmail(null);
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkArchiver = async () => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      await api.bulkProspects(selectedIds, "archiver");
      if (selected && selectedIds.includes(selected.id)) setSelected(null);
      setSelectedIds([]);
      await load();
    } catch {
      alert("Erreur lors de l'archivage.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkRestaurer = async () => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      await api.bulkProspects(selectedIds, "desarchiver");
      if (selected && selectedIds.includes(selected.id)) setSelected(null);
      setSelectedIds([]);
      await load();
    } catch {
      alert("Erreur lors de la restauration.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkSupprimer = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Supprimer définitivement ${selectedIds.length} prospect(s) ? Cette action est irréversible.`)) return;
    setBulkLoading(true);
    try {
      await api.bulkProspects(selectedIds, "supprimer");
      if (selected && selectedIds.includes(selected.id)) setSelected(null);
      setSelectedIds([]);
      await load();
    } catch {
      alert("Erreur lors de la suppression.");
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Stats ────────────────────────────────────────────────────────

  const scoreMoyen = prospects.length
    ? Math.round(prospects.reduce((s, p) => s + (p.score_prospection || 0), 0) / prospects.length)
    : 0;
  const nbEmails = prospects.filter((p) => p.email_trouve === 1 || p.email).length;
  const nbResponsables = prospects.filter((p) => p.responsable_prenom).length;
  const nbPriorite = prospects.filter((p) => (p.score_prospection || 0) >= 70).length;

  // ── Filtres + tri ────────────────────────────────────────────────

  const filtered = prospects
    .filter((p) => {
      const matchType = typeFilter === "all" || p.type_structure === typeFilter;
      const matchStatut = statutFilter === "all" || p.statut === statutFilter;
      const matchSearch = !search ||
        p.nom.toLowerCase().includes(search.toLowerCase()) ||
        (p.ville || "").toLowerCase().includes(search.toLowerCase());
      return matchType && matchStatut && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === "score") return (b.score_prospection || 0) - (a.score_prospection || 0);
      if (sortBy === "date") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "ville") return (a.ville || "").localeCompare(b.ville || "");
      if (sortBy === "type") return (a.type_structure || "").localeCompare(b.type_structure || "");
      return 0;
    });

  const filteredIds = filtered.map((p) => p.id);
  const allFilteredSelected =
    filtered.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
  const someFilteredSelected = filteredIds.some((id) => selectedIds.includes(id));

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected;
  }, [someFilteredSelected, allFilteredSelected]);

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...filteredIds])]);
    }
  };

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">CRM Prospects</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {prospects.length} prospects &bull; {nbEmails} emails &bull; {nbPriorite} à contacter en priorité
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setVoirArchives((v) => !v)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              voirArchives
                ? "bg-[#1B2A4A] text-white border-[#1B2A4A]"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {voirArchives ? "← Liste active" : "📦 Archives"}
          </button>
          <button
            onClick={() => api.exportCsvProspects().catch(() => alert("Erreur export"))}
            className="px-4 py-2 rounded-full text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ⬇️ Exporter CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2 rounded-full text-sm font-bold border-2 border-[#E63946] text-[#E63946] hover:bg-red-50 transition-colors"
          >
            + Ajouter un prospect
          </button>
          <button
            onClick={handleScrape}
            disabled={scraping}
            className="px-5 py-2 rounded-full text-sm font-bold bg-[#E63946] text-white hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {scraping ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{scrapePhase}</>
            ) : "🔍 Scanner & Enrichir"}
          </button>
        </div>
      </div>

      {/* Progress bar scraping */}
      {scraping && (
        <div className="mb-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex justify-between text-xs font-medium text-gray-600 mb-2">
            <span>{scrapePhase}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#E63946] rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {/* Stats terminé */}
      {scrapeStats && !scraping && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-800">
          ✅ Terminé — {scrapeStats.nouveaux} nouveaux · {scrapeStats.emails} emails trouvés · {scrapeStats.responsables} responsables identifiés
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats Bento */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { icon: "⭐", value: scoreMoyen, label: "Score moyen", suffix: "/ 100" },
              { icon: "✉️", value: nbEmails, label: "Emails trouvés", suffix: `/ ${prospects.length}` },
              { icon: "👤", value: nbResponsables, label: "Responsables", suffix: `/ ${prospects.length}` },
              { icon: "🎯", value: nbPriorite, label: "Score > 70", suffix: "prioritaires" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="text-2xl font-bold text-[#1B2A4A]">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label} <span className="text-gray-400">{s.suffix}</span></div>
              </div>
            ))}
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-2 mb-2">
            {TYPE_FILTERS.map((f) => (
              <button key={f.value} onClick={() => setTypeFilter(f.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  typeFilter === f.value ? "bg-[#1B2A4A] text-white border-[#1B2A4A]"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {STATUT_FILTERS.map((f) => (
              <button key={f.value} onClick={() => setStatutFilter(f.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  statutFilter === f.value ? "bg-[#E63946] text-white border-[#E63946]"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Barre de recherche + tri */}
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou ville..."
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-300"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 focus:outline-none focus:border-gray-300 cursor-pointer"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4 px-4 py-3 rounded-xl border border-[#1B2A4A]/15 bg-[#1B2A4A]/[0.06]">
              <span className="text-sm font-bold text-[#1B2A4A] mr-1">
                {selectedIds.length} sélectionné{selectedIds.length > 1 ? "s" : ""}
              </span>
              {!voirArchives && (
                <button
                  type="button"
                  disabled={bulkLoading}
                  onClick={handleBulkArchiver}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  📦 Archiver
                </button>
              )}
              {voirArchives && (
                <button
                  type="button"
                  disabled={bulkLoading}
                  onClick={handleBulkRestaurer}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  ↩️ Restaurer
                </button>
              )}
              <button
                type="button"
                disabled={bulkLoading}
                onClick={handleBulkSupprimer}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#E63946] text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                🗑️ Supprimer
              </button>
              <button
                type="button"
                disabled={bulkLoading}
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-white/80 transition-colors"
              >
                Annuler
              </button>
            </div>
          )}

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
              <p className="text-4xl mb-4">📭</p>
              <p className="font-semibold text-gray-800 text-lg mb-1">
                {voirArchives ? "Aucun prospect archivé" : "Aucun prospect trouvé"}
              </p>
              <p className="text-gray-500 text-sm mb-6">
                {voirArchives
                  ? "Les prospects archivés apparaîtront ici"
                  : "Lancez le scanner pour alimenter votre base"}
              </p>
              {!voirArchives && (
                <button onClick={handleScrape} disabled={scraping}
                  className="px-6 py-2.5 rounded-full text-sm font-bold bg-[#E63946] text-white hover:bg-red-700 transition-colors disabled:opacity-60">
                  🔍 Scanner & Enrichir
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="w-10 px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAllFiltered}
                        className="rounded border-gray-300 text-[#1B2A4A] focus:ring-[#1B2A4A]"
                        aria-label="Tout sélectionner dans la liste filtrée"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-12">Score</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Nom</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Ville</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Responsable</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Email</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Tél</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Statut</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const type = TYPE_STYLES[p.type_structure] || TYPE_STYLES.autre;
                    return (
                      <tr
                        key={p.id}
                        className={`border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${selected?.id === p.id ? "bg-blue-50" : ""}`}
                        onClick={() => setSelected(p)}
                      >
                        <td
                          className="w-10 px-2 py-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(p.id)}
                            onChange={() => toggleSelectOne(p.id)}
                            className="rounded border-gray-300 text-[#1B2A4A] focus:ring-[#1B2A4A]"
                            aria-label={`Sélectionner ${p.nom}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <ScoreBadge score={p.score_prospection || 0} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-900">{p.nom}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${type.bg} ${type.text}`}>
                            {type.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{p.ville || "—"}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {p.responsable_prenom
                            ? `${p.responsable_prenom} ${p.responsable_nom || ""}`
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {p.email
                            ? <a href={`mailto:${p.email}`} className="text-blue-500 hover:text-blue-700 text-base">✉️</a>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {p.telephone
                            ? <a href={`tel:${p.telephone}`} className="text-green-500 hover:text-green-700 text-base">📞</a>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={p.statut}
                            onChange={(e) => handleStatut(p.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600 focus:outline-none cursor-pointer"
                          >
                            {STATUT_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setSelected(p); handleGenererEmail(p.id); }}
                              disabled={generatingEmail === p.id}
                              title="Générer email"
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40"
                            >
                              {generatingEmail === p.id
                                ? <span className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                : "✉️"}
                            </button>
                            <button
                              onClick={() => handleEnrichir(p.id)}
                              disabled={enrichissant === p.id}
                              title="Ré-enrichir"
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40"
                            >
                              {enrichissant === p.id
                                ? <span className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                : "🔄"}
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              title="Supprimer"
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!loading && <HistoriqueScraping key={histKey} type="prospects" />}

      {/* Panneau détail */}
      {selected && (
        <PanneauDetail
          prospect={selected}
          onClose={() => setSelected(null)}
          onStatut={handleStatut}
          onNote={handleNote}
          onEnrichir={handleEnrichir}
          onGenererEmail={handleGenererEmail}
          enrichissant={enrichissant === selected.id}
          generatingEmail={generatingEmail === selected.id}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Modal ajout manuel */}
      {showModal && (
        <ModalAjoutProspect
          onClose={() => setShowModal(false)}
          onAdded={(p) => {
            setProspects((prev) => [p, ...prev]);
            setShowModal(false);
            setToast("Prospect ajouté ✓");
            setTimeout(() => setToast(""), 3000);
          }}
        />
      )}
    </div>
  );
}

// ── Modal ajout manuel ────────────────────────────────────────────────────────

const TYPES_STRUCTURE = [
  { value: "CE/CSE", label: "CE / CSE" },
  { value: "mairie", label: "Mairie" },
  { value: "ecole", label: "École" },
  { value: "restaurant", label: "Restaurant / Hôtel" },
  { value: "camping", label: "Camping" },
  { value: "association", label: "Association" },
  { value: "station_ski", label: "Station ski" },
  { value: "autre", label: "Autre" },
];

const DEPTS = [
  { value: "73", label: "73 — Savoie" },
  { value: "74", label: "74 — Haute-Savoie" },
  { value: "01", label: "01 — Ain" },
  { value: "38", label: "38 — Isère" },
  { value: "69", label: "69 — Rhône" },
  { value: "suisse", label: "Suisse" },
];

function ModalAjoutProspect({ onClose, onAdded }: { onClose: () => void; onAdded: (p: Prospect) => void }) {
  const [form, setForm] = useState({
    nom: "", type_structure: "autre", adresse: "", ville: "", departement: "73",
    telephone: "", email: "", site_web: "", statut: "a_contacter",
    note: "", description_structure: "",
  });
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState("");

  const inp = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-gray-400";
  const lbl = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

  const handleSubmit = async () => {
    if (!form.nom.trim() || !form.ville.trim()) { setErreur("Le nom et la ville sont obligatoires."); return; }
    setSaving(true); setErreur("");
    try {
      const p = await api.createProspect(form);
      onAdded(p);
    } catch { setErreur("Erreur lors de l'ajout."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-900">Ajouter un prospect manuellement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>
        <div className="p-6 space-y-5">
          {/* Identité */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Identité</p>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Nom / Raison sociale *</label>
                <input className={inp} value={form.nom} onChange={e => setForm(f => ({...f, nom: e.target.value}))} placeholder="Mairie de Tignes" />
              </div>
              <div>
                <label className={lbl}>Type de structure</label>
                <select className={inp} value={form.type_structure} onChange={e => setForm(f => ({...f, type_structure: e.target.value}))}>
                  {TYPES_STRUCTURE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Description</label>
                <textarea className={`${inp} resize-none`} rows={2} value={form.description_structure} onChange={e => setForm(f => ({...f, description_structure: e.target.value}))} placeholder="Optionnel..." />
              </div>
            </div>
          </div>
          {/* Localisation */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Localisation</p>
            <div className="space-y-3">
              <div><label className={lbl}>Adresse</label><input className={inp} value={form.adresse} onChange={e => setForm(f => ({...f, adresse: e.target.value}))} placeholder="1 rue de la Mairie" /></div>
              <div><label className={lbl}>Ville *</label><input className={inp} value={form.ville} onChange={e => setForm(f => ({...f, ville: e.target.value}))} placeholder="Tignes" /></div>
              <div>
                <label className={lbl}>Département</label>
                <select className={inp} value={form.departement} onChange={e => setForm(f => ({...f, departement: e.target.value}))}>
                  {DEPTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
            </div>
          </div>
          {/* Contact */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Téléphone</label><input className={inp} value={form.telephone} onChange={e => setForm(f => ({...f, telephone: e.target.value}))} placeholder="04 79 00 00 00" /></div>
              <div><label className={lbl}>Email</label><input className={inp} type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="contact@..." /></div>
              <div className="col-span-2"><label className={lbl}>Site web</label><input className={inp} value={form.site_web} onChange={e => setForm(f => ({...f, site_web: e.target.value}))} placeholder="https://..." /></div>
            </div>
          </div>
          {/* Prospection */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Prospection</p>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Statut initial</label>
                <select className={inp} value={form.statut} onChange={e => setForm(f => ({...f, statut: e.target.value}))}>
                  <option value="a_contacter">À contacter</option>
                  <option value="contacte">Contacté</option>
                  <option value="en_attente">En attente</option>
                </select>
              </div>
              <div><label className={lbl}>Notes</label><textarea className={`${inp} resize-none`} rows={2} value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} placeholder="Optionnel..." /></div>
            </div>
          </div>
          {erreur && <p className="text-sm text-red-600 font-medium">{erreur}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-full border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Annuler</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 rounded-full bg-[#E63946] text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-60">
            {saving ? "Ajout..." : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}
