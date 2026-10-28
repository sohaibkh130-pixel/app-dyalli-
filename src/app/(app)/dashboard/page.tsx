import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { Ring } from "@/components/Ring";
import { completionPercent } from "@/lib/calc/tasks";
import { financialTotals, goalProgress } from "@/lib/calc/goals";
import { formatMAD } from "@/lib/calc/time";
import { PERIOD_LABELS, periodRange, type PeriodKey } from "@/lib/period";

export const metadata = { title: "Vue d'ensemble" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ p?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await getUser();
  if (!user) return null;
  const key = (["day", "week", "month", "year", "custom"].includes(sp.p ?? "") ? sp.p : "day") as PeriodKey;

  const { data: profile } = await supabase.from("profiles").select("first_name,timezone,currency").eq("id", user.id).single();
  const { data: pref } = await supabase.from("user_preferences").select("week_start,active_categories").eq("user_id", user.id).single();
  const tz = profile?.timezone ?? "Africa/Casablanca";
  const currency = profile?.currency ?? "MAD";
  const range = periodRange(key, tz, pref?.week_start ?? 1, { from: sp.from, to: sp.to });
  const cats = pref?.active_categories ?? [];
  const has = (s: string) => cats.some((c: string) => c.startsWith(s));

  const [{ data: tasks }, { data: txs }, { data: goals }, { data: study }, { data: exercise }] = await Promise.all([
    supabase.from("tasks").select("status,start_at,end_at").gte("start_at", range.startUtc.toISOString()).lt("start_at", range.endUtc.toISOString()),
    supabase.from("financial_transactions").select("kind,amount,currency,occurred_on").gte("occurred_on", range.from).lte("occurred_on", range.to),
    supabase.from("goals").select("id,name,current_value,target_value,unit").eq("status", "active").limit(6),
    supabase.from("study_sessions").select("minutes").gte("started_at", range.startUtc.toISOString()).lt("started_at", range.endUtc.toISOString()),
    supabase.from("exercise_sessions").select("minutes,completed").eq("completed", true).gte("started_at", range.startUtc.toISOString()).lt("started_at", range.endUtc.toISOString()),
  ]);

  const comp = completionPercent(tasks ?? []);
  const fin = financialTotals((txs ?? []).map((t) => ({ ...t, amount: Number(t.amount) })), currency);
  const studyH = Math.round(((study ?? []).reduce((s, x) => s + x.minutes, 0) / 60) * 10) / 10;
  const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: tz }).format(new Date());

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Bonjour, {profile?.first_name || "bienvenue"}</h1>
        <p className="muted">Voici votre progression. {today}</p>
      </header>

      <nav aria-label="Période" className="flex flex-wrap gap-2">
        {(["day", "week", "month", "year"] as const).map((k) => (
          <Link key={k} href={`/dashboard?p=${k}`} aria-current={k === key ? "page" : undefined} className={`btn ${k === key ? "" : "btn-ghost"}`}>{PERIOD_LABELS[k]}</Link>
        ))}
        <form className="flex items-center gap-2" action="/dashboard">
          <input type="hidden" name="p" value="custom" />
          <input type="date" name="from" aria-label="Début" className="input !w-auto" defaultValue={sp.from} required />
          <input type="date" name="to" aria-label="Fin" className="input !w-auto" defaultValue={sp.to} required />
          <button className={`btn ${key === "custom" ? "" : "btn-ghost"}`}>Appliquer</button>
        </form>
      </nav>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Ring
          percent={comp.percent}
          label="Tâches"
          color="var(--color-ok)"
          sub={comp.percent === null ? "Aucune tâche planifiée" : `${comp.completed} terminée(s) sur ${comp.eligible}`}
        />
        {has("Études") && <Ring percent={null} label="Étude / travail" sub={`${studyH} h enregistrées`} />}
        {has("Sport") && <Ring percent={null} label="Sport" sub={`${exercise?.length ?? 0} séance(s)`} />}
        {(goals ?? []).map((g) => {
          const p = goalProgress(Number(g.current_value), Number(g.target_value));
          return <Ring key={g.id} percent={p.percent} label={g.name} sub={`${g.current_value} / ${g.target_value} ${g.unit}`} />;
        })}
      </section>

      {has("Finances") && (
        <section className="grid gap-4 sm:grid-cols-3" aria-label="Finances de la période">
          <div className="card"><p className="muted text-sm">Revenus</p><p className="text-xl font-bold text-ok">{formatMAD(fin.income, currency)}</p></div>
          <div className="card"><p className="muted text-sm">Dépenses</p><p className="text-xl font-bold">{formatMAD(fin.expenses, currency)}</p></div>
          <div className="card"><p className="muted text-sm">Flux net</p><p className={`text-xl font-bold ${fin.netCashFlow < 0 ? "text-late" : "text-ok"}`}>{formatMAD(fin.netCashFlow, currency)}</p></div>
        </section>
      )}
      {!tasks?.length && !goals?.length && <p className="muted">Rien à afficher pour l'instant. Planifiez une tâche ou créez un objectif pour commencer.</p>}
    </div>
  );
}
