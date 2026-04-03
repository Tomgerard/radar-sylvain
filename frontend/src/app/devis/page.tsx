"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Devis } from "@/lib/api";
import BentoCard from "@/components/ui/BentoCard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

export default function DevisPage() {
  const [devis, setDevis] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDevis().then(setDevis).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce devis ?")) return;
    await api.deleteDevis(id);
    setDevis(devis.filter((d) => d.id !== id));
  };

  const stats = {
    total: devis.length,
    ca: devis.reduce((sum, d) => sum + d.prix_ttc, 0),
    envoyes: devis.filter((d) => d.statut === "envoyé").length,
    brouillons: devis.filter((d) => d.statut === "brouillon").length,
  };

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text">Mes Devis</h1>
          <p className="text-muted text-sm mt-0.5">
            Gestion et suivi de vos devis clients
          </p>
        </div>
        <Link href="/devis/nouveau">
          <Button>+ Nouveau devis</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-muted text-center py-20 text-sm">Chargement...</p>
      ) : (
        <div className="grid grid-cols-12 gap-5">
          {/* ── Row 1 : Stats ── */}
          {[
            {
              value: String(stats.total),
              label: "Devis créés",
              color: "#08112c",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#08112c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
            },
            {
              value: stats.ca.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €",
              label: "Chiffre d'affaires total",
              color: "#059669",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
            },
            {
              value: String(stats.envoyes),
              label: "Devis envoyés",
              color: "#f90932",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f90932" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
            },
            {
              value: String(stats.brouillons),
              label: "En attente",
              color: "#d97706",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
            },
          ].map((s) => (
            <div key={s.label} className="col-span-3">
              <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm">
                <div className="mb-3">{s.icon}</div>
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-muted text-xs mt-1">{s.label}</p>
              </div>
            </div>
          ))}

          {/* ── Row 2 : Tableau ── */}
          <div className="col-span-8">
            <BentoCard title="Tous les devis">
              {devis.length === 0 ? (
                <p className="text-muted text-sm py-8 text-center">
                  Aucun devis pour l'instant.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted text-xs uppercase tracking-wider border-b border-border">
                        <th className="pb-3 font-semibold">N°</th>
                        <th className="pb-3 font-semibold">Client</th>
                        <th className="pb-3 font-semibold">Événement</th>
                        <th className="pb-3 font-semibold">Date</th>
                        <th className="pb-3 font-semibold text-right">Prix</th>
                        <th className="pb-3 font-semibold">Statut</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {devis.map((d) => (
                        <tr
                          key={d.id}
                          className="hover:bg-background transition-colors"
                        >
                          <td className="py-3 text-muted font-mono text-xs">
                            {d.numero}
                          </td>
                          <td className="py-3 font-semibold text-text">
                            {d.nom_client}
                          </td>
                          <td className="py-3 text-muted">{d.nom_evenement}</td>
                          <td className="py-3 text-muted">{d.date_evenement}</td>
                          <td className="py-3 text-right font-bold text-text">
                            {d.prix_ttc.toFixed(2)} €
                          </td>
                          <td className="py-3">
                            <Badge variant={d.statut === "envoyé" ? "success" : "default"}>
                              {d.statut}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <div className="flex gap-1.5 justify-end">
                              <a
                                href={api.getPdfUrl(d.id)}
                                target="_blank"
                                rel="noreferrer"
                                title="Télécharger PDF"
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-gray-100 hover:text-text transition-colors"
                              >
                                📥
                              </a>
                              <Link
                                href={`/devis/${d.id}`}
                                title="Modifier"
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-gray-100 hover:text-text transition-colors"
                              >
                                ✏️
                              </Link>
                              <button
                                onClick={() => handleDelete(d.id)}
                                title="Supprimer"
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600 transition-colors"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </BentoCard>
          </div>

          {/* ── Row 2 : Actions rapides ── */}
          <div className="col-span-4">
            <BentoCard title="Actions rapides">
              <div className="space-y-3">
                <Link href="/devis/nouveau" className="block">
                  <Button className="w-full">+ Nouveau devis</Button>
                </Link>
                <Button variant="secondary" className="w-full">
                  📄 Exporter tout en PDF
                </Button>
              </div>
            </BentoCard>
          </div>
        </div>
      )}
    </div>
  );
}
