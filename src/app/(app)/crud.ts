"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { goalSchema } from "@/lib/validation";

export type CrudState = { error?: string; ok?: boolean };

const text = z.string().trim().min(1, "Champ requis.").max(200);
const opt = z.string().trim().max(500).optional().transform((v) => v || null);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.");
const minutes = z.coerce.number().int().positive("La durée doit être positive.").max(24 * 60);

// Liste blanche : seules ces tables et colonnes sont accessibles via ces actions.
const SCHEMAS = {
  goals: { path: "/goals", schema: goalSchema.transform((v) => ({ ...v, deadline: v.deadline || null })) },
  habits: { path: "/habits", schema: z.object({ name: text, frequency: z.enum(["daily", "weekly", "custom"]).default("daily"), target_per_period: z.coerce.number().int().positive().default(1) }) },
  projects: { path: "/projects", schema: z.object({ name: text, description: opt, deadline: opt }) },
  skills: { path: "/skills", schema: z.object({ name: text, category: opt, current_level: z.coerce.number().int().min(1).max(10), target_level: z.coerce.number().int().min(1).max(10) }) },
  study_sessions: { path: "/dashboard", schema: z.object({ subject: text, minutes, started_at: z.string().datetime({ offset: true }) }) },
  exercise_sessions: { path: "/dashboard", schema: z.object({ activity_type: text, minutes, started_at: z.string().datetime({ offset: true }) }) },
  skill_activities: { path: "/skills", schema: z.object({ skill_id: z.string().uuid(), minutes, occurred_on: date, notes: opt }) },
  habit_entries: { path: "/habits", schema: z.object({ habit_id: z.string().uuid(), done_on: date }) },
} as const;

export type CrudTable = keyof typeof SCHEMAS;

export async function addRow(table: CrudTable, _: CrudState, form: FormData): Promise<CrudState> {
  const cfg = SCHEMAS[table];
  if (!cfg) return { error: "Opération non autorisée." };
  const { supabase, user } = await getUser();
  if (!user) return { error: "Session expirée." };
  const parsed = cfg.schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await supabase.from(table).insert({ ...(parsed.data as object), user_id: user.id });
  if (error) return { error: error.code === "23505" ? "Cet enregistrement existe déjà." : "Enregistrement impossible." };
  revalidatePath(cfg.path);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function removeRow(table: "goals" | "habits" | "projects" | "skills", id: string) {
  const { supabase, user } = await getUser();
  if (!user) return;
  await supabase.from(table).delete().eq("id", id).eq("user_id", user.id);
  revalidatePath(SCHEMAS[table].path);
}

/** Met à jour la valeur mesurée d'un objectif (progression manuelle) et gère son statut. */
export async function updateGoalValue(id: string, form: FormData) {
  const { supabase, user } = await getUser();
  if (!user) return;
  const value = Number(form.get("value"));
  if (!Number.isFinite(value) || value < 0) return;
  const { data: g } = await supabase.from("goals").select("target_value").eq("id", id).eq("user_id", user.id).single();
  if (!g) return;
  const done = value >= Number(g.target_value);
  await supabase.from("goals").update({ current_value: value, status: done ? "completed" : "active", completed_at: done ? new Date().toISOString() : null }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function markNotificationsRead() {
  const { supabase, user } = await getUser();
  if (!user) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null).eq("user_id", user.id);
  revalidatePath("/notifications");
}

export async function updateSettings(_: CrudState, form: FormData): Promise<CrudState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Session expirée." };
  const parsed = z.object({
    first_name: text, last_name: z.string().trim().max(100).default(""), timezone: text, currency: z.string().length(3),
    week_start: z.coerce.number().int().min(0).max(6),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try { new Intl.DateTimeFormat("fr", { timeZone: parsed.data.timezone }); } catch { return { error: "Fuseau horaire invalide (ex. Africa/Casablanca)." }; }
  const { week_start, ...profile } = parsed.data;
  const r1 = await supabase.from("profiles").update(profile).eq("id", user.id);
  const r2 = await supabase.from("user_preferences").update({ week_start }).eq("user_id", user.id);
  if (r1.error || r2.error) return { error: "Enregistrement impossible." };
  revalidatePath("/", "layout");
  return { ok: true };
}
