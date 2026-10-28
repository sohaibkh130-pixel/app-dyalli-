"use client";

import { useActionState, useEffect, useState } from "react";
import { addContribution, addTransaction, createSavingsGoal, type FinState } from "@/app/(app)/finances/actions";

const EXPENSE_CATS = ["Alimentation", "Transport", "Études", "Logement", "Abonnements", "Loisirs", "Santé", "Autres dépenses"];
const today = () => new Date().toISOString().slice(0, 10);

/** Clé d'idempotence générée côté client après le montage (évite l'écart d'hydratation) et renouvelée après chaque succès. */
function useIdemKey(prefix: string, resetOn: unknown) {
  const [key, setKey] = useState("");
  useEffect(() => setKey(`${prefix}-${crypto.randomUUID()}`), [prefix, resetOn]);
  return key;
}

function Msg({ s }: { s: FinState }) {
  return s.error ? <p role="alert" className="text-sm text-late">{s.error}</p> : null;
}

export function TransactionForm({ currency }: { currency: string }) {
  const [s, action, pending] = useActionState<FinState, FormData>(addTransaction, {});
  const key = useIdemKey("tx", s); // un double clic ne crée pas deux transactions
  return (
    <form action={action} className="card grid gap-3 md:grid-cols-6">
      <input type="hidden" name="idempotency_key" value={key} />
      <input type="hidden" name="currency" value={currency} />
      <label className="text-sm">Type
        <select name="kind" className="input mt-1"><option value="income">Revenu</option><option value="expense">Dépense</option></select>
      </label>
      <label className="text-sm">Montant ({currency})<input name="amount" type="number" step="0.01" min="0.01" required className="input mt-1" /></label>
      <label className="text-sm">Date<input name="occurred_on" type="date" defaultValue={today()} required className="input mt-1" /></label>
      <label className="text-sm">Catégorie<input name="category" list="cats" required className="input mt-1" /></label>
      <datalist id="cats">{EXPENSE_CATS.map((c) => <option key={c} value={c} />)}<option value="Salaire" /><option value="Freelance" /></datalist>
      <label className="md:col-span-2 text-sm">Description<input name="description" className="input mt-1" /></label>
      <div className="md:col-span-6 flex items-center gap-3"><button className="btn" disabled={pending}>Ajouter</button><Msg s={s} /></div>
    </form>
  );
}

export function SavingsGoalForm({ currency }: { currency: string }) {
  const [s, action, pending] = useActionState<FinState, FormData>(createSavingsGoal, {});
  return (
    <form action={action} className="card grid gap-3 md:grid-cols-5">
      <input type="hidden" name="currency" value={currency} />
      <label className="md:col-span-2 text-sm">Nom de l'objectif<input name="name" required className="input mt-1" placeholder="Atteindre 10 000 DH" /></label>
      <label className="text-sm">Cible<input name="target_amount" type="number" min="1" step="0.01" required className="input mt-1" /></label>
      <label className="text-sm">Montant de départ<input name="starting_amount" type="number" min="0" step="0.01" defaultValue={0} className="input mt-1" /></label>
      <label className="text-sm">Échéance<input name="deadline" type="date" className="input mt-1" /></label>
      <div className="md:col-span-5 flex items-center gap-3"><button className="btn" disabled={pending}>Créer l'objectif</button><Msg s={s} /></div>
    </form>
  );
}

export function ContributionForm({ goalId }: { goalId: string }) {
  const [s, action, pending] = useActionState<FinState, FormData>(addContribution, {});
  const key = useIdemKey("c", s);
  return (
    <form action={action} className="mt-3 flex flex-wrap items-end gap-2">
      <input type="hidden" name="savings_goal_id" value={goalId} />
      <input type="hidden" name="idempotency_key" value={key} />
      <label className="text-sm">Contribution<input name="amount" type="number" step="0.01" required className="input mt-1 !w-32" /></label>
      <label className="text-sm">Date<input name="occurred_on" type="date" defaultValue={today()} required className="input mt-1 !w-auto" /></label>
      <button className="btn" disabled={pending}>Enregistrer</button><Msg s={s} />
    </form>
  );
}
