// Calculs d'objectifs et de finances. Fonctions pures, déterministes : l'IA n'est jamais la source des chiffres.

export interface Progress {
  /** Valeur réelle, peut dépasser 100. */
  percent: number;
  /** Valeur plafonnée à 100 pour l'affichage des anneaux. */
  display: number;
  remaining: number;
}

export function goalProgress(current: number, target: number): Progress {
  if (!Number.isFinite(target) || target <= 0) throw new RangeError("L'objectif doit être strictement positif");
  if (!Number.isFinite(current) || current < 0) throw new RangeError("La valeur courante doit être positive ou nulle");
  const percent = Math.round((current / target) * 1000) / 10;
  return { percent, display: Math.min(percent, 100), remaining: Math.max(target - current, 0) };
}

export interface Tx {
  kind: "income" | "expense";
  amount: number;
  currency: string;
  occurred_on: string; // YYYY-MM-DD
  category?: string;
}

export interface Totals {
  income: number;
  expenses: number;
  netCashFlow: number;
}

/** Totaux pour une seule devise sur une période [from, to] inclusive. Refuse de mélanger les devises. */
export function financialTotals(txs: Tx[], currency: string, from?: string, to?: string): Totals {
  let income = 0;
  let expenses = 0;
  for (const t of txs) {
    if (t.currency !== currency) continue;
    if (from && t.occurred_on < from) continue;
    if (to && t.occurred_on > to) continue;
    if (t.kind === "income") income += t.amount;
    else expenses += t.amount;
  }
  income = round2(income);
  expenses = round2(expenses);
  return { income, expenses, netCashFlow: round2(income - expenses) };
}

export interface Contribution {
  amount: number; // négatif = retrait
}

/** Montant courant = montant de départ (compté une seule fois) + contributions éligibles. */
export function savingsGoalProgress(startingAmount: number, contributions: Contribution[], target: number) {
  const contributed = contributions.reduce((s, c) => s + c.amount, 0);
  const current = round2(Math.max(startingAmount + contributed, 0));
  return { current, target, ...goalProgress(current, target) };
}

export function budgetUtilization(spent: number, limit: number, threshold = 80) {
  if (limit <= 0) throw new RangeError("Le budget doit être strictement positif");
  const percent = Math.round((spent / limit) * 1000) / 10;
  return {
    percent,
    remaining: round2(Math.max(limit - spent, 0)),
    overThreshold: percent >= threshold,
    exceeded: spent > limit,
  };
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
