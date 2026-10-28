import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { aiConfigured, generateReport } from "@/lib/ai";
import { completionPercent } from "@/lib/calc/tasks";
import { financialTotals } from "@/lib/calc/goals";
import { periodRange } from "@/lib/period";

const body = z.object({ period: z.enum(["day", "week", "month"]) });
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 20);

export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!aiConfigured()) return NextResponse.json({ error: "Le Coach IA n'est pas configuré (AI_API_KEY manquante)." }, { status: 503 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  const { period } = parsed.data;

  // Limite d'usage quotidienne par utilisateur.
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("used_on", today);
  if ((count ?? 0) >= DAILY_LIMIT) return NextResponse.json({ error: "Limite quotidienne atteinte. Réessayez demain." }, { status: 429 });

  const { data: profile } = await supabase.from("profiles").select("timezone,currency").eq("id", user.id).single();
  const { data: pref } = await supabase.from("user_preferences").select("week_start").eq("user_id", user.id).single();
  const tz = profile?.timezone ?? "Africa/Casablanca";
  const currency = profile?.currency ?? "MAD";
  const r = periodRange(period === "day" ? "day" : period === "week" ? "week" : "month", tz, pref?.week_start ?? 1);

  const [{ data: tasks }, { data: txs }, { data: goals }, { data: study }] = await Promise.all([
    supabase.from("tasks").select("title,status,start_at,end_at").gte("start_at", r.startUtc.toISOString()).lt("start_at", r.endUtc.toISOString()).limit(200),
    supabase.from("financial_transactions").select("kind,amount,currency,occurred_on").gte("occurred_on", r.from).lte("occurred_on", r.to),
    supabase.from("goals").select("name,current_value,target_value,unit,status").limit(30),
    supabase.from("study_sessions").select("minutes").gte("started_at", r.startUtc.toISOString()).lt("started_at", r.endUtc.toISOString()),
  ]);

  // Tous les chiffres sont calculés ici de façon déterministe ; l'IA ne fait que les expliquer.
  const stats = {
    periode: { du: r.from, au: r.to },
    taches: { ...completionPercent(tasks ?? []), titres_en_retard: (tasks ?? []).filter((t) => t.status === "planned" && new Date(t.end_at) < new Date()).map((t) => String(t.title).slice(0, 80)) },
    finances: { devise: currency, ...financialTotals((txs ?? []).map((t) => ({ ...t, amount: Number(t.amount) })), currency) },
    etude_minutes: (study ?? []).reduce((s, x) => s + x.minutes, 0),
    objectifs: goals ?? [],
  };

  try {
    const report = await generateReport(period, stats);
    await supabase.from("ai_usage").insert({ user_id: user.id });
    await supabase.from("ai_reports").insert({ user_id: user.id, period, period_start: r.from, content: report });
    return NextResponse.json({ report });
  } catch (e) {
    console.error("coach error", e instanceof Error ? e.message : "unknown"); // pas de données personnelles dans les logs
    return NextResponse.json({ error: "Le service d'IA est indisponible pour le moment. Réessayez plus tard." }, { status: 502 });
  }
}
