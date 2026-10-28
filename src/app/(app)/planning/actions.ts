"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { taskSchema } from "@/lib/validation";
import { zonedToUtcIso } from "@/lib/calc/time";

export type ActionState = { error?: string; warning?: string; ok?: boolean };

export async function createTask(_: ActionState, form: FormData): Promise<ActionState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Session expirée. Reconnectez-vous." };
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).single();
  const tz = profile?.timezone ?? "Africa/Casablanca";

  const date = String(form.get("date") ?? "");
  const startHm = String(form.get("start") ?? "");
  const endHm = String(form.get("end") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !startHm || !endHm) return { error: "Date et horaires requis." };

  const start_at = zonedToUtcIso(date, startHm, tz);
  // Une fin <= début signifie que la tâche se termine le lendemain (tâche à cheval sur minuit).
  let end_at = zonedToUtcIso(date, endHm, tz);
  if (new Date(end_at) <= new Date(start_at) && form.get("overnight") === "on") {
    end_at = new Date(new Date(end_at).getTime() + 86400000).toISOString();
  }

  const parsed = taskSchema.safeParse({
    title: form.get("title"), description: form.get("description") || undefined,
    category: form.get("category") || undefined, priority: form.get("priority") || "medium", start_at, end_at,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data: overlaps } = await supabase.from("tasks").select("id").lt("start_at", end_at).gt("end_at", start_at);
  const { data: row, error } = await supabase.from("tasks").insert({ ...parsed.data, user_id: user.id }).select("id").single();
  if (error || !row) return { error: "Impossible d'enregistrer la tâche." };
  await supabase.from("task_history").insert({ task_id: row.id, user_id: user.id, event: "created" });

  revalidatePath("/planning");
  return { ok: true, warning: overlaps?.length ? `Cette tâche chevauche ${overlaps.length} autre(s) tâche(s). Elle a bien été enregistrée.` : undefined };
}

export async function setTaskStatus(id: string, status: "planned" | "completed" | "postponed") {
  const { supabase, user } = await getUser();
  if (!user) return;
  const { error } = await supabase.from("tasks").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", id).eq("user_id", user.id);
  if (!error) {
    await supabase.from("task_history").insert({ task_id: id, user_id: user.id, event: status === "completed" ? "completed" : status === "postponed" ? "postponed" : "uncompleted" });
  }
  revalidatePath("/planning");
  revalidatePath("/dashboard");
}

export async function deleteTask(id: string) {
  const { supabase, user } = await getUser();
  if (!user) return;
  await supabase.from("tasks").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/planning");
}
