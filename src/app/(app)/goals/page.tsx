import { getUser } from "@/lib/supabase/server";
import { AddForm } from "@/components/AddForm";
import { Ring } from "@/components/Ring";
import { goalProgress } from "@/lib/calc/goals";
import { removeRow, updateGoalValue } from "../crud";

export const metadata = { title: "Objectifs" };

const PERIODS: [string, string][] = [["day", "Jour"], ["week", "Semaine"], ["month", "Mois"], ["year", "Année"], ["custom", "Personnalisée"]];
const CATS = ["Finance", "Études", "Travail", "Sport", "Sommeil", "Habitudes", "Compétences", "Projets personnels"].map((c) => [c, c] as [string, string]);

export default async function Goals() {
  const { supabase, user } = await getUser();
  if (!user) return null;
  const { data: goals } = await supabase.from("goals").select("*").neq("status", "archived").order("created_at", { ascending: false });
  const { data: templates } = await supabase.from("goal_templates").select("*");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Objectifs</h1>
      <AddForm table="goals" submit="Créer l'objectif" fields={[
        { name: "name", label: "Nom" },
        { name: "category", label: "Catégorie", options: CATS },
        { name: "target_value", label: "Cible", type: "number", min: 1 },
        { name: "unit", label: "Unité", defaultValue: "unités" },
        { name: "period", label: "Période", options: PERIODS, defaultValue: "month" },
        { name: "calc_method", label: "Calcul", options: [["numeric", "Valeur"], ["count", "Occurrences"], ["duration", "Durée"], ["custom", "Personnalisé"]] },
        { name: "deadline", label: "Échéance", type: "date", required: false },
      ]} />

      <section className="grid gap-4 md:grid-cols-2">
        {!goals?.length && <p className="muted">Aucun objectif. Créez-en un ci-dessus ou partez d'un modèle ci-dessous.</p>}
        {(goals ?? []).map((g) => {
          const p = goalProgress(Number(g.current_value), Number(g.target_value));
          const expired = g.status === "active" && g.deadline && g.deadline < today;
          return (
            <div key={g.id} className="card space-y-2">
              <Ring percent={p.percent} label={g.name} sub={`${g.current_value} / ${g.target_value} ${g.unit}${expired ? " · échéance dépassée" : ""}`} color={g.status === "completed" ? "var(--color-ok)" : undefined} />
              <form action={updateGoalValue.bind(null, g.id)} className="flex items-end gap-2">
                <label className="text-sm">Valeur actuelle<input name="value" type="number" min="0" step="any" defaultValue={g.current_value} className="input mt-1 !w-32" /></label>
                <button className="btn">Mettre à jour</button>
              </form>
              <form action={removeRow.bind(null, "goals", g.id)}><button className="btn btn-ghost">Supprimer</button></form>
            </div>
          );
        })}
      </section>

      <h2 className="text-xl font-semibold">Modèles</h2>
      <p className="muted text-sm">Choisissez un modèle : toutes les valeurs restent modifiables avant la création.</p>
      <ul className="grid gap-3 md:grid-cols-2">
        {(templates ?? []).map((t) => (
          <li key={t.id}>
            <AddForm table="goals" submit="Activer" hidden={{ category: t.category, period: t.period, calc_method: t.calc_method }} fields={[
              { name: "name", label: "Nom", defaultValue: t.name },
              { name: "target_value", label: "Cible", type: "number", defaultValue: Number(t.target_value), min: 1 },
              { name: "unit", label: "Unité", defaultValue: t.unit },
            ]} />
          </li>
        ))}
      </ul>
    </div>
  );
}
