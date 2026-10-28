import { getUser } from "@/lib/supabase/server";
import { AddForm } from "@/components/AddForm";
import { removeRow } from "../crud";

export const metadata = { title: "Projets" };

export default async function Projects() {
  const { supabase, user } = await getUser();
  if (!user) return null;
  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supabase.from("projects").select("*").neq("status", "archived").order("created_at", { ascending: false }),
    supabase.from("tasks").select("project_id,status").not("project_id", "is", null),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Projets</h1>
      <AddForm table="projects" fields={[{ name: "name", label: "Nom du projet" }, { name: "description", label: "Description", required: false }, { name: "deadline", label: "Échéance", type: "date", required: false }]} />
      {!projects?.length && <p className="muted">Aucun projet pour l'instant.</p>}
      <ul className="space-y-3">
        {(projects ?? []).map((p) => {
          const t = (tasks ?? []).filter((x) => x.project_id === p.id);
          const done = t.filter((x) => x.status === "completed").length;
          return (
            <li key={p.id} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="muted text-sm">{p.deadline ? `Échéance : ${p.deadline} · ` : ""}{t.length ? `${done}/${t.length} tâches terminées` : "Aucune tâche liée"}</p>
              </div>
              <form action={removeRow.bind(null, "projects", p.id)}><button className="btn btn-ghost">Supprimer</button></form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
