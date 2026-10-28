// Logique pure (sans dépendances) pour les tâches : statut effectif et pourcentage de complétion.

export type StoredTaskStatus = "planned" | "completed" | "postponed";
export type EffectiveTaskStatus = "completed" | "postponed" | "overdue" | "in_progress" | "upcoming";

export interface TaskLike {
  status: StoredTaskStatus;
  start_at: string | Date;
  end_at: string | Date;
}

const ms = (d: string | Date) => (d instanceof Date ? d.getTime() : new Date(d).getTime());

/** Statut affiché : « terminée » et « reportée » sont explicites ; « en retard » et « en cours » dépendent de l'heure. */
export function effectiveStatus(task: TaskLike, now: Date = new Date()): EffectiveTaskStatus {
  if (task.status === "completed") return "completed";
  if (task.status === "postponed") return "postponed";
  const n = now.getTime();
  if (n >= ms(task.end_at)) return "overdue";
  if (n >= ms(task.start_at)) return "in_progress";
  return "upcoming";
}

export const STATUS_LABELS_FR: Record<EffectiveTaskStatus, string> = {
  completed: "Terminée",
  postponed: "Reportée",
  overdue: "Non réalisée / En retard",
  in_progress: "En cours",
  upcoming: "À venir",
};

export interface Completion {
  completed: number;
  eligible: number;
  /** null quand aucune tâche éligible : afficher « Aucune tâche planifiée », jamais 0 % ou 100 %. */
  percent: number | null;
}

/**
 * Pourcentage = tâches terminées éligibles / tâches éligibles × 100.
 * Par défaut, les tâches futures (non commencées) sont exclues du dénominateur.
 */
export function completionPercent(
  tasks: TaskLike[],
  now: Date = new Date(),
  opts: { includeFuture?: boolean } = {},
): Completion {
  const eligibleTasks = tasks.filter((t) => {
    if (t.status === "completed") return true;
    const s = effectiveStatus(t, now);
    if (s === "upcoming" || s === "postponed") return !!opts.includeFuture && s === "upcoming";
    return true; // in_progress | overdue
  });
  const eligible = eligibleTasks.length;
  const completed = eligibleTasks.filter((t) => t.status === "completed").length;
  if (eligible === 0) return { completed, eligible, percent: null };
  return { completed, eligible, percent: Math.round((completed / eligible) * 1000) / 10 };
}

/** Détecte les chevauchements (avertissement, pas une interdiction). */
export function findOverlaps<T extends { id: string; start_at: string | Date; end_at: string | Date }>(
  candidate: T,
  others: T[],
): T[] {
  const s = ms(candidate.start_at);
  const e = ms(candidate.end_at);
  return others.filter((o) => o.id !== candidate.id && ms(o.start_at) < e && ms(o.end_at) > s);
}

export function isValidRange(start: string | Date, end: string | Date): boolean {
  const s = ms(start);
  const e = ms(end);
  return Number.isFinite(s) && Number.isFinite(e) && e > s;
}
