import { getUser } from "@/lib/supabase/server";
import { AddForm } from "@/components/AddForm";
import { localDateString } from "@/lib/calc/time";
import { removeRow } from "../crud";

export const metadata = { title: "Habitudes" };

/** Série en cours : jours consécutifs jusqu'à aujourd'hui (ou hier si aujourd'hui n'est pas encore fait). Les jours manqués ne sont pas pénalisés ailleurs. */
function streak(dates: Set<string>, today: string) {
  let n = 0;
  const d = new Date(today + "T00:00:00Z");
  if (!dates.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  while (dates.has(d.toISOString().slice(0, 10))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}

export default async function Habits() {
  const { supabase, user } = await getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).single();
  const today = localDateString(new Date(), profile?.timezone ?? "Africa/Casablanca");
  const [{ data: habits }, { data: entries }] = await Promise.all([
    supabase.from("habits").select("*").eq("archived", false).order("created_at"),
    supabase.from("habit_entries").select("habit_id,done_on").order("done_on", { ascending: false }).limit(1000),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Habitudes</h1>
      <AddForm table="habits" fields={[
        { name: "name", label: "Nouvelle habitude" },
        { name: "frequency", label: "Fréquence", options: [["daily", "Quotidienne"], ["weekly", "Hebdomadaire"], ["custom", "Personnalisée"]] },
        { name: "target_per_period", label: "Objectif par période", type: "number", defaultValue: 1, min: 1 },
      ]} />
      {!habits?.length && <p className="muted">Aucune habitude pour l'instant.</p>}
      <ul className="space-y-3">
        {(habits ?? []).map((h) => {
          const dates = new Set((entries ?? []).filter((e) => e.habit_id === h.id).map((e) => e.done_on));
          return (
            <li key={h.id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <div><p className="font-semibold">{h.name}</p><p className="muted text-sm">Série actuelle : {streak(dates, today)} jour(s) · {dates.size} enregistrement(s)</p></div>
                <form action={removeRow.bind(null, "habits", h.id)}><button className="btn btn-ghost">Supprimer</button></form>
              </div>
              {dates.has(today) ? <p className="text-sm text-ok">✔ Fait aujourd'hui</p> : <AddForm table="habit_entries" submit="Marquer fait aujourd'hui" fields={[]} hidden={{ habit_id: h.id, done_on: today }} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
