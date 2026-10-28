"use client";

import { useActionState } from "react";
import { updateSettings, type CrudState } from "@/app/(app)/crud";

type Props = { first_name: string; last_name: string; timezone: string; currency: string; week_start: number };

export function SettingsForm(p: Props) {
  const [s, action, pending] = useActionState<CrudState, FormData>(updateSettings, {});
  return (
    <form action={action} className="card grid gap-3 md:grid-cols-2">
      <label className="text-sm">Prénom<input name="first_name" defaultValue={p.first_name} required className="input mt-1" /></label>
      <label className="text-sm">Nom<input name="last_name" defaultValue={p.last_name} className="input mt-1" /></label>
      <label className="text-sm">Fuseau horaire<input name="timezone" defaultValue={p.timezone} required className="input mt-1" /></label>
      <label className="text-sm">Devise
        <select name="currency" defaultValue={p.currency} className="input mt-1">{["MAD", "EUR", "USD", "GBP", "CAD", "CHF"].map((c) => <option key={c}>{c}</option>)}</select>
      </label>
      <label className="text-sm">Début de semaine
        <select name="week_start" defaultValue={p.week_start} className="input mt-1">{["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"].map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
      </label>
      <div className="md:col-span-2 flex items-center gap-3">
        <button className="btn" disabled={pending}>Enregistrer</button>
        {s.error && <p role="alert" className="text-sm text-late">{s.error}</p>}
        {s.ok && <p role="status" className="text-sm text-ok">Paramètres enregistrés.</p>}
      </div>
    </form>
  );
}
