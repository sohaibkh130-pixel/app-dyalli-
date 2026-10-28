"use client";

import { useState } from "react";
import type { AiReport } from "@/lib/ai";

const LABELS = { day: "Analyse du jour", week: "Analyse de la semaine", month: "Analyse du mois" } as const;

export function CoachPanel({ configured }: { configured: boolean }) {
  const [report, setReport] = useState<AiReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function run(period: keyof typeof LABELS) {
    setLoading(period); setError(null);
    const res = await fetch("/api/coach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ period }) });
    const json = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) return setError(json.error ?? "Erreur inattendue.");
    setReport(json.report);
  }

  if (!configured) return <div className="card" role="status">Le Coach IA nécessite une clé d'API (variable <code>AI_API_KEY</code>). Les autres fonctionnalités restent disponibles.</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((p) => <button key={p} className="btn" disabled={!!loading} onClick={() => run(p)}>{loading === p ? "Analyse…" : LABELS[p]}</button>)}
      </div>
      {error && <p role="alert" className="text-sm text-late">{error}</p>}
      {report && (
        <article className="card space-y-3" style={{ borderColor: "var(--color-ai)" }}>
          <p>{report.summary}</p>
          {report.facts.length > 0 && <><h3 className="font-semibold">Constats (d'après vos données)</h3><ul className="list-disc pl-5 text-sm">{report.facts.map((f, i) => <li key={i}>{f}</li>)}</ul></>}
          {report.suggestions.length > 0 && <><h3 className="font-semibold text-ai">Suggestions</h3><ul className="list-disc pl-5 text-sm">{report.suggestions.map((f, i) => <li key={i}>{f}</li>)}</ul></>}
          {report.limits.length > 0 && <><h3 className="font-semibold">Limites</h3><ul className="list-disc pl-5 text-sm muted">{report.limits.map((f, i) => <li key={i}>{f}</li>)}</ul></>}
        </article>
      )}
    </div>
  );
}
