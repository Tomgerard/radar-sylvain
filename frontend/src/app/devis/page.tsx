"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Devis } from "@/lib/api";
import StatCard from "@/components/ui/StatCard";
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

  const totalCA = devis.reduce((sum, d) => sum + d.prix_ttc, 0);
  const nbEnvoyes = devis.filter((d) => d.statut === "envoyé").length;

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
          <div className="col-span-4">
            <StatCard icon="\uD83D\uDCC4" value={devis.length} label="Devis créés" />
          </div>
          <div className="col-span-4">
            <StatCard
              icon="\uD83D\uDCB0"
              value={`${totalCA.toFixed(0)} €`}
              label="Chiffre d'affaires total"
            />
          </div>
          <div className="col-span-4">
            <StatCard icon="✉\uFE0F" value={nbEnvoyes} label="Devis envoyés" />
          </div>

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
