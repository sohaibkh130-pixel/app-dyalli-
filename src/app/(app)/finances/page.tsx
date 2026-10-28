import { getUser } from "@/lib/supabase/server";
import { ContributionForm, SavingsGoalForm, TransactionForm } from "@/components/FinanceForms";
import { Ring } from "@/components/Ring";
import { deleteTransaction } from "./actions";
import { budgetUtilization, financialTotals, savingsGoalProgress } from "@/lib/calc/goals";
import { formatMAD, localDateString } from "@/lib/calc/time";

export const metadata = { title: "Finances" };

export default async function Finances() {
  const { supabase, user } = await getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("currency,timezone").eq("id", user.id).single();
  const currency = profile?.currency ?? "MAD";
  const month = localDateString(new Date(), profile?.timezone ?? "Africa/Casablanca").slice(0, 7);
  const from = `${month}-01`;
  const to = `${month}-31`;

  const [{ data: txs }, { data: goals }, { data: contribs }, { data: budgets }] = await Promise.all([
    supabase.from("financial_transactions").select("*").gte("occurred_on", from).lte("occurred_on", to).order("occurred_on", { ascending: false }).limit(100),
    supabase.from("savings_goals").select("*").order("created_at"),
    supabase.from("savings_contributions").select("savings_goal_id,amount"),
    supabase.from("budgets").select("*"),
  ]);

  const norm = (txs ?? []).map((t) => ({ ...t, amount: Number(t.amount) }));
  const totals = financialTotals(norm, currency, from, to);
  const mixed = norm.some((t) => t.currency !== currency);
  const spentBy = (cat: string | null) => norm.filter((t) => t.kind === "expense" && t.currency === currency && (cat === null || t.category === cat)).reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Finances</h1>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Résumé du mois">
        <div className="card"><p className="muted text-sm">Revenus du mois</p><p className="text-xl font-bold text-ok">{formatMAD(totals.income, currency)}</p></div>
        <div className="card"><p className="muted text-sm">Dépenses du mois</p><p className="text-xl font-bold">{formatMAD(totals.expenses, currency)}</p></div>
        <div className="card"><p className="muted text-sm">Flux net (revenus − dépenses)</p><p className={`text-xl font-bold ${totals.netCashFlow < 0 ? "text-late" : "text-ok"}`}>{formatMAD(totals.netCashFlow, currency)}</p></div>
      </section>
      {mixed && <p className="text-sm text-warn" role="status">Certaines transactions sont dans une autre devise que {currency} : elles ne sont pas additionnées (aucun taux de conversion configuré).</p>}
      <p className="muted text-sm">Le flux net n'est pas de l'épargne confirmée : seules les contributions enregistrées sur un objectif comptent comme épargne.</p>

      <TransactionForm currency={currency} />

      <section aria-label="Budgets" className="space-y-2">
        {(budgets ?? []).map((b) => {
          const u = budgetUtilization(spentBy(b.category), Number(b.monthly_limit), b.alert_threshold);
          return <div key={b.id} className="card"><p className="font-medium">{b.category ?? "Budget mensuel"} : {u.percent} % utilisé</p><p className="muted text-sm">Il reste {formatMAD(u.remaining, b.currency)}.{u.overThreshold ? " Seuil d'alerte atteint." : ""}</p></div>;
        })}
      </section>

      <h2 className="text-xl font-semibold">Objectifs d'épargne</h2>
      <SavingsGoalForm currency={currency} />
      <section className="grid gap-4 md:grid-cols-2">
        {!goals?.length && <p className="muted">Aucun objectif d'épargne pour l'instant.</p>}
        {(goals ?? []).map((g) => {
          const p = savingsGoalProgress(Number(g.starting_amount), (contribs ?? []).filter((c) => c.savings_goal_id === g.id).map((c) => ({ amount: Number(c.amount) })), Number(g.target_amount));
          return (
            <div key={g.id} className="card">
              <Ring percent={p.percent} label={g.name} sub={`${formatMAD(p.current, g.currency)} sur ${formatMAD(p.target, g.currency)} · reste ${formatMAD(p.remaining, g.currency)}`} color="var(--color-ok)" />
              <ContributionForm goalId={g.id} />
            </div>
          );
        })}
      </section>

      <h2 className="text-xl font-semibold">Transactions du mois</h2>
      <ul className="space-y-1">
        {!txs?.length && <li className="muted">Aucune transaction ce mois-ci.</li>}
        {(txs ?? []).map((t) => (
          <li key={t.id} className="card flex items-center justify-between !py-2">
            <span>{t.occurred_on} · {t.category}{t.description ? ` — ${t.description}` : ""}</span>
            <span className="flex items-center gap-3">
              <strong className={t.kind === "income" ? "text-ok" : ""}>{t.kind === "income" ? "+" : "−"}{formatMAD(Number(t.amount), t.currency)}</strong>
              <form action={deleteTransaction.bind(null, t.id)}><button className="btn btn-ghost" aria-label="Supprimer la transaction">Supprimer</button></form>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
