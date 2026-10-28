/** Anneau de progression. `percent` = valeur réelle (peut dépasser 100) ; l'arc est plafonné à 100 pour rester stable. */
export function Ring({ percent, label, sub, color = "var(--color-accent)" }: { percent: number | null; label: string; sub?: string; color?: string }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const shown = percent === null ? 0 : Math.min(Math.max(percent, 0), 100);
  return (
    <div className="card flex items-center gap-4" role="group" aria-label={label}>
      <svg width="92" height="92" viewBox="0 0 92 92" aria-hidden="true">
        <circle cx="46" cy="46" r={r} fill="none" stroke="var(--border)" strokeWidth="9" />
        <circle
          cx="46" cy="46" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)} transform="rotate(-90 46 46)" className="ring-progress"
        />
        <text x="46" y="51" textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor">{percent === null ? "—" : `${Math.round(percent)} %`}</text>
      </svg>
      <div>
        <p className="font-semibold">{label}</p>
        <p className="muted text-sm">{sub ?? (percent === null ? "Aucune donnée" : "")}</p>
      </div>
    </div>
  );
}
