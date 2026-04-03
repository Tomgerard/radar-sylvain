"use client";

import { useEffect, useState } from "react";
import { api, ScrapingSession } from "@/lib/api";

function formaterDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const hier = new Date(now);
  hier.setDate(hier.getDate() - 1);

  const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  if (d.toDateString() === now.toDateString()) return `Aujourd'hui ${heure}`;
  if (d.toDateString() === hier.toDateString()) return `Hier ${heure}`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + ` ${heure}`;
}

export default function HistoriqueScraping({ type }: { type?: "opportunites" | "prospects" }) {
  const [sessions, setSessions] = useState<ScrapingSession[]>([]);
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    api.getHistoriqueScraping().then((data) => {
      setSessions(type ? data.filter((s) => s.type === type) : data);
    }).catch(() => {});
  }, [type]);

  if (sessions.length === 0) return null;

  const affichees = ouvert ? sessions : sessions.slice(0, 10);

  return (
    <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-bold text-gray-700">Historique des scrapings</h3>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-5 py-2.5 text-gray-400 font-bold uppercase tracking-wide">Date & heure</th>
            <th className="text-left px-4 py-2.5 text-gray-400 font-bold uppercase tracking-wide">Type</th>
            <th className="text-right px-4 py-2.5 text-gray-400 font-bold uppercase tracking-wide">Nouveaux</th>
            <th className="text-right px-4 py-2.5 text-gray-400 font-bold uppercase tracking-wide">Emails</th>
            <th className="text-right px-4 py-2.5 text-gray-400 font-bold uppercase tracking-wide">Rejetés</th>
            <th className="text-center px-4 py-2.5 text-gray-400 font-bold uppercase tracking-wide">Statut</th>
          </tr>
        </thead>
        <tbody>
          {affichees.map((s) => (
            <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <td className="px-5 py-2.5 text-gray-600">{formaterDate(s.date_scraping)}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex px-2 py-0.5 rounded-full font-semibold text-xs ${
                  s.type === "prospects"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-purple-100 text-purple-700"
                }`}>
                  {s.type === "prospects" ? "Prospects" : "Opportunités"}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{s.nouveaux}</td>
              <td className="px-4 py-2.5 text-right text-gray-600">
                {s.emails_trouves > 0 ? (
                  <span className="text-green-700 font-semibold">{s.emails_trouves}</span>
                ) : "—"}
              </td>
              <td className="px-4 py-2.5 text-right text-gray-500">
                {s.rejetes_zone > 0 ? (
                  <span className="text-orange-600">{s.rejetes_zone} ❌</span>
                ) : "0"}
              </td>
              <td className="px-4 py-2.5 text-center">
                {s.statut === "en_cours" && (
                  <span className="inline-flex items-center gap-1 text-blue-600">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    En cours
                  </span>
                )}
                {s.statut === "termine" && (
                  <span className="text-green-600">✓ Terminé</span>
                )}
                {s.statut === "erreur" && (
                  <span className="text-red-500">✗ Erreur</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sessions.length > 10 && (
        <div className="px-5 py-3 text-center">
          <button
            onClick={() => setOuvert(!ouvert)}
            className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors"
          >
            {ouvert ? "Masquer" : `Voir tout l'historique (${sessions.length} sessions)`}
          </button>
        </div>
      )}
    </div>
  );
}
