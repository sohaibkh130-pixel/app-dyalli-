import { getUser } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/SettingsForm";

export const metadata = { title: "Paramètres" };

export default async function Settings() {
  const { supabase, user } = await getUser();
  if (!user) return null;
  const [{ data: p }, { data: pref }] = await Promise.all([
    supabase.from("profiles").select("first_name,last_name,timezone,currency").eq("id", user.id).single(),
    supabase.from("user_preferences").select("week_start").eq("user_id", user.id).single(),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>
      <SettingsForm first_name={p?.first_name ?? ""} last_name={p?.last_name ?? ""} timezone={p?.timezone ?? "Africa/Casablanca"} currency={p?.currency ?? "MAD"} week_start={pref?.week_start ?? 1} />
      <section className="card">
        <h2 className="font-semibold">Export et suppression du compte</h2>
        <p className="muted text-sm">L'export de données et la suppression de compte ne sont pas encore implémentés. La suppression nécessite une clé de service Supabase côté serveur.</p>
      </section>
    </div>
  );
}
