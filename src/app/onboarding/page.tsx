"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

const CATEGORIES = ["Études et apprentissage", "Travail et projets", "Finances personnelles", "Sport et activité physique", "Sommeil et récupération", "Habitudes quotidiennes", "Développement des compétences", "Vie personnelle"];
const CURRENCIES = ["MAD", "EUR", "USD", "GBP", "CAD", "CHF"];
const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type Template = { id: string; category: string; name: string; target_value: number; unit: string; period: string; calc_method: string };
type Chosen = Template & { selected: boolean };

export default function Onboarding() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState({ first_name: "", last_name: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Casablanca", currency: "MAD" });
  const [cats, setCats] = useState<string[]>([]);
  const [goals, setGoals] = useState<Chosen[]>([]);
  const [plan, setPlan] = useState({ wake_time: "07:00", bed_time: "23:00", work_start: "09:00", work_end: "17:00", days_off: [0] as number[] });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return router.replace("/login");
      const [{ data: p }, { data: pref }, { data: tpl }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).single(),
        supabase.from("user_preferences").select("*").eq("user_id", u.user.id).single(),
        supabase.from("goal_templates").select("*"),
      ]);
      if (p?.onboarding_completed_at) return router.replace("/dashboard");
      if (p) { setProfile({ first_name: p.first_name, last_name: p.last_name, timezone: p.timezone, currency: p.currency }); setStep(p.onboarding_step ?? 1); }
      if (pref) {
        setCats(pref.active_categories ?? []);
        setPlan((x) => ({ ...x, wake_time: pref.wake_time?.slice(0, 5) ?? x.wake_time, bed_time: pref.bed_time?.slice(0, 5) ?? x.bed_time, work_start: pref.work_start?.slice(0, 5) ?? x.work_start, work_end: pref.work_end?.slice(0, 5) ?? x.work_end, days_off: pref.days_off ?? x.days_off }));
      }
      setGoals((tpl ?? []).map((t) => ({ ...t, selected: false })));
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(nextStep: number) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setError(null);
    const r1 = await supabase.from("profiles").update({ ...profile, onboarding_step: Math.min(nextStep, 5) }).eq("id", u.user.id);
    const r2 = await supabase.from("user_preferences").update({ active_categories: cats, ...plan }).eq("user_id", u.user.id);
    if (r1.error || r2.error) { setError("Enregistrement impossible. Réessayez."); return false; }
    return true;
  }

  async function next() {
    if (step === 1 && !profile.first_name.trim()) return setError("Le prénom est requis.");
    if (step === 2 && cats.length === 0) return setError("Choisissez au moins une catégorie.");
    if (step === 4 && plan.wake_time === plan.bed_time) return setError("Le réveil et le coucher doivent être différents.");
    if (await save(step + 1)) setStep(step + 1);
  }

  async function finish() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (!(await save(5))) return;
    const rows = goals.filter((g) => g.selected).map((g) => ({
      user_id: u.user!.id, name: g.name, category: g.category, target_value: g.target_value, unit: g.unit, period: g.period, calc_method: g.calc_method,
    }));
    if (rows.length) {
      const { error } = await supabase.from("goals").insert(rows);
      if (error) return setError("Impossible de créer les objectifs.");
    }
    const { error } = await supabase.from("profiles").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", u.user.id);
    if (error) return setError("Impossible de terminer la configuration.");
    router.replace("/dashboard");
    router.refresh();
  }

  if (!ready) return <main className="p-8">Chargement…</main>;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <p className="muted text-sm">Étape {step} sur 5</p>
      <div className="card mt-2 space-y-4">
        {step === 1 && (
          <>
            <h1 className="text-xl font-bold">Profil personnel</h1>
            <label className="block text-sm">Prénom<input className="input mt-1" value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} /></label>
            <label className="block text-sm">Nom<input className="input mt-1" value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} /></label>
            <label className="block text-sm">Fuseau horaire<input className="input mt-1" value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} /></label>
            <label className="block text-sm">Devise
              <select className="input mt-1" value={profile.currency} onChange={(e) => setProfile({ ...profile, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="text-xl font-bold">Objectifs de vie</h1>
            <p className="muted text-sm">Choisissez uniquement ce que vous voulez gérer.</p>
            {CATEGORIES.map((c) => (
              <label key={c} className="flex items-center gap-2"><input type="checkbox" checked={cats.includes(c)} onChange={(e) => setCats(e.target.checked ? [...cats, c] : cats.filter((x) => x !== c))} />{c}</label>
            ))}
          </>
        )}
        {step === 3 && (
          <>
            <h1 className="text-xl font-bold">Choix des objectifs</h1>
            <p className="muted text-sm">Modifiez les valeurs avant activation. Vous pourrez aussi en créer plus tard.</p>
            {goals.map((g, i) => (
              <div key={g.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2" style={{ borderColor: "var(--border)" }}>
                <input type="checkbox" aria-label={`Activer ${g.name}`} checked={g.selected} onChange={(e) => setGoals(goals.map((x, j) => (j === i ? { ...x, selected: e.target.checked } : x)))} />
                <span className="flex-1 text-sm">{g.name}</span>
                <input type="number" min={1} className="input !w-24" aria-label="Valeur cible" value={g.target_value} onChange={(e) => setGoals(goals.map((x, j) => (j === i ? { ...x, target_value: Math.max(1, Number(e.target.value)) } : x)))} />
                <span className="muted text-xs">{g.unit}</span>
              </div>
            ))}
          </>
        )}
        {step === 4 && (
          <>
            <h1 className="text-xl font-bold">Planning personnel</h1>
            <div className="grid grid-cols-2 gap-3">
              {(["wake_time", "bed_time", "work_start", "work_end"] as const).map((k) => (
                <label key={k} className="block text-sm">{{ wake_time: "Réveil", bed_time: "Coucher", work_start: "Début travail/études", work_end: "Fin travail/études" }[k]}
                  <input type="time" className="input mt-1" value={plan[k]} onChange={(e) => setPlan({ ...plan, [k]: e.target.value })} />
                </label>
              ))}
            </div>
            <fieldset><legend className="text-sm">Jours de repos</legend>
              <div className="mt-1 flex flex-wrap gap-3">{DAYS.map((d, i) => (
                <label key={d} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={plan.days_off.includes(i)} onChange={(e) => setPlan({ ...plan, days_off: e.target.checked ? [...plan.days_off, i] : plan.days_off.filter((x) => x !== i) })} />{d}</label>
              ))}</div>
            </fieldset>
          </>
        )}
        {step === 5 && (
          <>
            <h1 className="text-xl font-bold">Récapitulatif</h1>
            <ul className="space-y-1 text-sm">
              <li>Nom : {profile.first_name} {profile.last_name}</li>
              <li>Fuseau : {profile.timezone} · Devise : {profile.currency}</li>
              <li>Catégories : {cats.join(", ") || "—"}</li>
              <li>Objectifs activés : {goals.filter((g) => g.selected).length}</li>
              <li>Réveil {plan.wake_time} · Coucher {plan.bed_time}</li>
            </ul>
          </>
        )}
        {error && <p role="alert" className="text-sm text-late">{error}</p>}
        <div className="flex justify-between">
          <button className="btn btn-ghost" disabled={step === 1} onClick={() => setStep(step - 1)}>Retour</button>
          {step < 5 ? <button className="btn" onClick={next}>Continuer</button> : <button className="btn" onClick={finish}>Confirmer et commencer</button>}
        </div>
      </div>
    </main>
  );
}
