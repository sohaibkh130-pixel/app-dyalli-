"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { contributionSchema, savingsGoalSchema, transactionSchema } from "@/lib/validation";

export type FinState = { error?: string; ok?: boolean };

const isDup = (e: { code?: string } | null) => e?.code === "23505"; // clé d'idempotence déjà utilisée = opération déjà traitée

export async function addTransaction(_: FinState, form: FormData): Promise<FinState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Session expirée." };
  const parsed = transactionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await supabase.from("financial_transactions").insert({ ...parsed.data, user_id: user.id });
  if (error && !isDup(error)) return { error: "Impossible d'enregistrer la transaction." };
  revalidatePath("/finances");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteTransaction(id: string) {
  const { supabase, user } = await getUser();
  if (!user) return;
  await supabase.from("financial_transactions").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/finances");
}

export async function createSavingsGoal(_: FinState, form: FormData): Promise<FinState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Session expirée." };
  const parsed = savingsGoalSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { deadline, ...rest } = parsed.data;
  const { error } = await supabase.from("savings_goals").insert({ ...rest, deadline: deadline || null, user_id: user.id });
  if (error) return { error: "Impossible de créer l'objectif." };
  revalidatePath("/finances");
  return { ok: true };
}

export async function addContribution(_: FinState, form: FormData): Promise<FinState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Session expirée." };
  const parsed = contributionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await supabase.from("savings_contributions").insert({ ...parsed.data, user_id: user.id });
  if (error && !isDup(error)) return { error: "Impossible d'enregistrer la contribution." };
  revalidatePath("/finances");
  return { ok: true };
}
