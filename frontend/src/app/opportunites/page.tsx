"use client";

import { useEffect, useState } from "react";
import { api, Opportunite } from "@/lib/api";
import StatCard from "@/components/ui/StatCard";
import Button from "@/components/ui/Button";

// ── Badge styles par source ──
const SOURCE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pages_jaunes: { bg: "bg-[#FEF3C7]", text: "text-[#92400E]", label: "Pages Jaunes" },
  evenement:    { bg: "bg-[#D1FAE5]", text: "text-[#065F46]", label: "Événement" },
  boamp:        { bg: "bg-[#DBEAFE]", text: "text-[#1E40AF]", label: "BOAMP" },
  facebook:     { bg: "bg-[#EDE9FE]", text: "text-[#5B21B6]", label: "Facebook" },
};

const SCORE_STYLES: Record<string, { bg: string; text: string }> = {
  haute:   { bg: "bg-[#FEE2E2]", text: "text-primary" },
  moyenne: { bg: "bg-[#FEF3C7]", text: "text-[#92400E]" },
  faible:  { bg: "bg-[#F3F4F6]", text: "text-muted" },
};

const FILTER_OPTIONS = [
  { value: "all", label: "Toutes" },
  { value: "haute", label: "🔴 Haute" },
  { value: "moyenne", label: "🟠 Moyenne" },
  { value: "faible", label: "⚪ Faible" },
  { value: "pages_jaunes", label: "Pages Jaunes" },
  { value: "evenement", label: "Événement" },
  { value: "boamp", label: "BOAMP" },
  { value: "facebook", label: "Facebook" },
];

export default function OpportunitesPage() {
  const [opps, setOpps] = useState<Opportunite[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    api.getOpportunites().then(setOpps).finally(() => setLoading(false));
  }, []);

  const handleScrape = async () => {
    setScraping(true);
    setScrapeMsg("");
    try {
      const res = await api.lancerScraper();
      setScrapeMsg(res.message);
      const fresh = await api.getOpportunites();
      setOpps(fresh);
    } catch {
      setScrapeMsg("Erreur lors du scan.");
    } finally {
      setScraping(false);
      setTimeout(() => setScrapeMsg(""), 5000);
    }
  };

  const handleVue = async (id: number) => {
    await api.marquerVue(id);
    setOpps((prev) => prev.map((o) => (o.id === id ? { ...o, vue: 1 } : o)));
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette opportunité ?")) return;
    await api.deleteOpportunite(id);
    setOpps((prev) => prev.filter((o) => o.id !== id));
  };

  // ── Filtrage ──
  const filtered = opps.filter((o) => {
    if (filter === "all") return true;
    if (["haute", "moyenne", "faible"].includes(filter)) return o.score === filter;
    return o.source === filter;
  });

  const nbHaute = opps.filter((o) => o.score === "haute").length;
  const nbNonVues = opps.filter((o) => o.vue === 0).length;
  const nbSources = new Set(opps.map((o) => o.source)).size || 0;

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text">Opportunités</h1>
          <p className="text-muted text-sm mt-0.5">
            Radar d'événements locaux — Savoie & Rhône-Alpes
          </p>
        </div>
        <div className="flex items-center gap-3">
          {scrapeMsg && (
            <span className="text-sm font-medium text-primary animate-fade-in">
              {scrapeMsg}
            </span>
          )}
          <Button onClick={handleScrape} disabled={scraping}>
            {scraping ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Scan en cours...
              </span>
            ) : (
              "🔍 Lancer le radar"
            )}
          </Button>
        </div>
      </div>

      {/* ── Loading skeleton ── */}
      {loading ? (
        <div className="grid grid-cols-12 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="col-span-3">
              <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            </div>
          ))}
          {[...Array(3)].map((_, i) => (
            <div key={i} className="col-span-12">
              <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* ── Stats ── */}
          <div className="grid grid-cols-12 gap-5 mb-6">
            <div className="col-span-3">
              <StatCard icon="🎯" value={opps.length} label="Total opportunités" />
            </div>
            <div className="col-span-3">
              <StatCard icon="🔴" value={nbHaute} label="Score haute" />
            </div>
            <div className="col-span-3">
              <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">👁️</span>
                  {nbNonVues > 0 && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-text">{nbNonVues}</p>
                <p className="text-muted text-sm mt-1">Non vues</p>
              </div>
            </div>
            <div className="col-span-3">
              <StatCard icon="📡" value={nbSources} label="Sources actives" />
            </div>
          </div>

          {/* ── Filtres ── */}
          <div className="flex flex-wrap gap-2 mb-6">
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  filter === f.value
                    ? "bg-primary text-white border-primary"
                    : "bg-surface text-muted border-border hover:border-gray-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* ── Liste ou état vide ── */}
          {filtered.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-border shadow-sm text-center py-20">
              <p className="text-4xl mb-4">🔭</p>
              <p className="text-text font-semibold text-lg mb-1">
                Aucune opportunité détectée
              </p>
              <p className="text-muted text-sm mb-6">
                Lancez le radar pour scanner les événements de votre région
              </p>
              <Button onClick={handleScrape} disabled={scraping}>
                🔍 Lancer le radar maintenant
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((o) => {
                const src = SOURCE_STYLES[o.source] || SOURCE_STYLES.evenement;
                const scr = SCORE_STYLES[o.score] || SCORE_STYLES.faible;

                return (
                  <div
                    key={o.id}
                    className={`bg-surface rounded-2xl border border-border shadow-sm p-5 transition-opacity ${
                      o.vue ? "opacity-60" : ""
                    }`}
                  >
                    {/* Ligne haute */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span
                          className={`shrink-0 text-xs font-bold px-2.5 py-0.5 rounded-full ${src.bg} ${src.text}`}
                        >
                          {src.label}
                        </span>
                        <h3 className="font-bold text-text truncate">{o.titre}</h3>
                      </div>
                      <span
                        className={`shrink-0 ml-3 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${scr.bg} ${scr.text}`}
                      >
                        {o.score}
                      </span>
                    </div>

                    {/* Ligne milieu */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted mb-2">
                      {o.lieu && <span>📍 {o.lieu}</span>}
                      {o.date_evenement && <span>📅 {o.date_evenement}</span>}
                      {o.contact && <span>📞 {o.contact}</span>}
                    </div>
                    {o.resume_ia && (
                      <p className="text-sm text-muted italic line-clamp-2 mb-3">
                        {o.resume_ia}
                      </p>
                    )}

                    {/* Ligne basse */}
                    <div className="flex items-center gap-2">
                      {o.lien && (
                        <a
                          href={o.lien}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary text-sm font-semibold hover:underline"
                        >
                          Voir la source →
                        </a>
                      )}
                      <div className="flex-1" />
                      <button
                        onClick={() => handleVue(o.id)}
                        disabled={o.vue === 1}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          o.vue
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-surface text-muted border-border hover:border-gray-300"
                        }`}
                      >
                        {o.vue ? "✓ Vue" : "Marquer vue"}
                      </button>
                      <button
                        onClick={() => handleDelete(o.id)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold border border-border text-muted hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
