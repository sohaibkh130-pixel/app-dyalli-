import { getUser } from "@/lib/supabase/server";
import { CoachPanel } from "@/components/CoachPanel";
import { aiConfigured } from "@/lib/ai";

export const metadata = { title: "Coach IA" };

export default async function Coach() {
  const { supabase, user } = await getUser();
  if (!user) return null;
  const { data: reports } = await supabase.from("ai_reports").select("id,period,period_start,created_at,content").order("created_at", { ascending: false }).limit(5);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Coach IA</h1>
      <p className="muted text-sm">Les chiffres sont calculés par l'application ; l'IA les explique et propose des suggestions. Elle peut se tromper.</p>
      <CoachPanel configured={aiConfigured()} />
      <h2 className="text-xl font-semibold">Analyses précédentes</h2>
      {!reports?.length && <p className="muted">Aucune analyse générée pour l'instant.</p>}
      <ul className="space-y-2">
        {(reports ?? []).map((r) => (
          <li key={r.id} className="card text-sm">
            <p className="font-medium">{{ day: "Jour", week: "Semaine", month: "Mois" }[r.period as "day"]} du {r.period_start}</p>
            <p className="muted">{(r.content as { summary?: string })?.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
