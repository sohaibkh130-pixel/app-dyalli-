import { getUser } from "@/lib/supabase/server";
import { BarChartCard } from "@/components/BarChartCard";
import { completionPercent } from "@/lib/calc/tasks";
import { financialTotals } from "@/lib/calc/goals";
import { dayBoundsUtc, localDateString } from "@/lib/calc/time";

export const metadata = { title: "Rapports" };

export default async function Reports() {
  const { supabase, user } = await getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("timezone,currency").eq("id", user.id).single();
  const tz = profile?.timezone ?? "Africa/Casablanca";
  const currency = profile?.currency ?? "MAD";
  const now = new Date();
  const today = localDateString(now, tz);
  const year = today.slice(0, 4);

  // 14 derniers jours : complétion des tâches, chaque jour avec ses propres bornes locales.
  const days = Array.from({ length: 14 }, (_, i) => new Date(new Date(today + "T12:00:00Z").getTime() - (13 - i) * 86400000).toISOString().slice(0, 10));
  const first = dayBoundsUtc(days[0], tz).start;
  const last = dayBoundsUtc(days[13], tz).end;
  const [{ data: tasks }, { data: txs }, { data: study }] = await Promise.all([
    supabase.from("tasks").select("status,start_at,end_at").gte("start_at", first.toISOString()).lt("start_at", last.toISOString()),
    supabase.from("financial_transactions").select("kind,amount,currency,occurred_on").gte("occurred_on", `${year}-01-01`).lte("occurred_on", `${year}-12-31`),
    supabase.from("study_sessions").select("minutes,started_at").gte("started_at", first.toISOString()).lt("started_at", last.toISOString()),
  ]);

  const taskData = days.map((d) => {
    const { start, end } = dayBoundsUtc(d, tz);
    const c = completionPercent((tasks ?? []).filter((t) => new Date(t.start_at) >= start && new Date(t.start_at) < end), now);
    return { name: d.slice(5), pourcentage: c.percent ?? 0 };
  });
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const norm = (txs ?? []).map((t) => ({ ...t, amount: Number(t.amount) }));
  const finData = months.map((m) => {
    const t = financialTotals(norm, currency, `${m}-01`, `${m}-31`);
    return { name: m.slice(5), revenus: t.income, depenses: t.expenses };
  });
  const studyData = days.map((d) => {
    const { start, end } = dayBoundsUtc(d, tz);
    const min = (study ?? []).filter((s) => new Date(s.started_at) >= start && new Date(s.started_at) < end).reduce((a, s) => a + s.minutes, 0);
    return { name: d.slice(5), heures: Math.round((min / 60) * 10) / 10 };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Rapports</h1>
      <p className="muted text-sm">Tous les graphiques sont calculés à partir de vos enregistrements. Un jour sans tâche éligible apparaît à 0 sur le graphique, mais est affiché « Aucune tâche planifiée » dans le planning.</p>
      <BarChartCard title="Complétion des tâches (14 derniers jours, %)" data={taskData} series={[{ key: "pourcentage", label: "% réalisé", color: "#2f9e44" }]} empty="Aucune tâche sur cette période." />
      <BarChartCard title="Heures d'étude (14 derniers jours)" data={studyData} series={[{ key: "heures", label: "Heures", color: "#3b5bdb" }]} empty="Aucune séance d'étude enregistrée." />
      <BarChartCard title={`Revenus et dépenses ${year} (${currency})`} data={finData} series={[{ key: "revenus", label: "Revenus", color: "#2f9e44" }, { key: "depenses", label: "Dépenses", color: "#e03131" }]} empty="Aucune transaction enregistrée cette année." />
    </div>
  );
}
