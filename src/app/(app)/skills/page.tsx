import { getUser } from "@/lib/supabase/server";
import { AddForm } from "@/components/AddForm";
import { removeRow } from "../crud";

export const metadata = { title: "Compétences" };

export default async function Skills() {
  const { supabase, user } = await getUser();
  if (!user) return null;
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: skills }, { data: acts }] = await Promise.all([
    supabase.from("skills").select("*").order("created_at"),
    supabase.from("skill_activities").select("skill_id,minutes"),
  ]);
  const level = Array.from({ length: 10 }, (_, i) => [String(i + 1), String(i + 1)] as [string, string]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Compétences</h1>
      <p className="muted text-sm">Les niveaux sont auto-évalués : ils ne constituent pas une certification de compétence.</p>
      <AddForm table="skills" fields={[
        { name: "name", label: "Compétence" },
        { name: "category", label: "Catégorie", required: false },
        { name: "current_level", label: "Niveau actuel (1-10)", options: level, defaultValue: "1" },
        { name: "target_level", label: "Niveau visé (1-10)", options: level, defaultValue: "5" },
      ]} />
      {!skills?.length && <p className="muted">Aucune compétence suivie pour l'instant.</p>}
      <ul className="grid gap-4 md:grid-cols-2">
        {(skills ?? []).map((s) => {
          const minutes = (acts ?? []).filter((a) => a.skill_id === s.id).reduce((t, a) => t + a.minutes, 0);
          return (
            <li key={s.id} className="card space-y-2">
              <p className="font-semibold">{s.name}{s.category ? ` · ${s.category}` : ""}</p>
              <p className="muted text-sm">Niveau auto-évalué {s.current_level}/10 · cible {s.target_level}/10 · {Math.round((minutes / 60) * 10) / 10} h de pratique enregistrées</p>
              <AddForm table="skill_activities" submit="Ajouter une pratique" hidden={{ skill_id: s.id, occurred_on: today }} fields={[{ name: "minutes", label: "Minutes", type: "number", min: 1, defaultValue: 30 }, { name: "notes", label: "Notes", required: false }]} />
              <form action={removeRow.bind(null, "skills", s.id)}><button className="btn btn-ghost">Supprimer</button></form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
