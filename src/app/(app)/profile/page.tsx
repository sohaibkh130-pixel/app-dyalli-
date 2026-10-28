import Link from "next/link";
import { getUser } from "@/lib/supabase/server";

export const metadata = { title: "Profil" };

export default async function Profile() {
  const { supabase, user } = await getUser();
  if (!user) return null;
  const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Profil</h1>
      <dl className="card grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="muted">Nom</dt><dd>{p?.first_name} {p?.last_name}</dd></div>
        <div><dt className="muted">E-mail</dt><dd>{user.email}</dd></div>
        <div><dt className="muted">Fuseau horaire</dt><dd>{p?.timezone}</dd></div>
        <div><dt className="muted">Devise</dt><dd>{p?.currency}</dd></div>
      </dl>
      <Link href="/settings" className="btn">Modifier mes paramètres</Link>
    </div>
  );
}
