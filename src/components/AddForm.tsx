"use client";

import { useActionState } from "react";
import { addRow, type CrudState, type CrudTable } from "@/app/(app)/crud";

export type Field = { name: string; label: string; type?: string; options?: [string, string][]; defaultValue?: string | number; required?: boolean; min?: number; max?: number };

/** Formulaire d'ajout générique, lié à une table de la liste blanche côté serveur. */
export function AddForm({ table, fields, submit = "Ajouter", hidden }: { table: CrudTable; fields: Field[]; submit?: string; hidden?: Record<string, string> }) {
  const [s, action, pending] = useActionState<CrudState, FormData>(addRow.bind(null, table), {});
  return (
    <form action={action} className="card flex flex-wrap items-end gap-3">
      {Object.entries(hidden ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {fields.map((f) => (
        <label key={f.name} className="text-sm">{f.label}
          {f.options ? (
            <select name={f.name} className="input mt-1" defaultValue={f.defaultValue}>{f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          ) : (
            <input name={f.name} type={f.type ?? "text"} defaultValue={f.defaultValue} required={f.required ?? true} min={f.min} max={f.max} className="input mt-1" />
          )}
        </label>
      ))}
      <button className="btn" disabled={pending}>{submit}</button>
      {s.error && <p role="alert" className="w-full text-sm text-late">{s.error}</p>}
    </form>
  );
}
