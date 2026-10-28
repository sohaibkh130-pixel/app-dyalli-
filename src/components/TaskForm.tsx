"use client";

import { useActionState } from "react";
import { createTask, type ActionState } from "@/app/(app)/planning/actions";

export function TaskForm({ date }: { date: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createTask, {});
  return (
    <form action={action} className="card grid gap-3 md:grid-cols-6">
      <input type="hidden" name="date" value={date} />
      <label className="md:col-span-2 text-sm">Titre<input name="title" className="input mt-1" required maxLength={200} /></label>
      <label className="text-sm">Début<input name="start" type="time" className="input mt-1" required /></label>
      <label className="text-sm">Fin<input name="end" type="time" className="input mt-1" required /></label>
      <label className="text-sm">Priorité
        <select name="priority" className="input mt-1" defaultValue="medium"><option value="low">Basse</option><option value="medium">Moyenne</option><option value="high">Haute</option></select>
      </label>
      <label className="text-sm">Catégorie<input name="category" className="input mt-1" /></label>
      <label className="md:col-span-5 text-sm">Description<input name="description" className="input mt-1" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="overnight" />Finit le lendemain</label>
      <div className="md:col-span-6 flex items-center gap-3">
        <button className="btn" disabled={pending}>{pending ? "Ajout…" : "Ajouter la tâche"}</button>
        {state.error && <p role="alert" className="text-sm text-late">{state.error}</p>}
        {state.warning && <p role="status" className="text-sm text-warn">{state.warning}</p>}
      </div>
    </form>
  );
}
