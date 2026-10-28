import { getUser } from "@/lib/supabase/server";
import { markNotificationsRead } from "../crud";

export const metadata = { title: "Notifications" };

export default async function Notifications() {
  const { supabase, user } = await getUser();
  if (!user) return null;
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <form action={markNotificationsRead}><button className="btn btn-ghost">Tout marquer comme lu</button></form>
      </div>
      <p className="muted text-sm">Seules les notifications dans l'application sont actives pour l'instant. Les rappels par e-mail et navigateur ne sont pas encore disponibles.</p>
      {!data?.length && <p className="muted">Aucune notification.</p>}
      <ul className="space-y-2">
        {(data ?? []).map((n) => (
          <li key={n.id} className="card" style={{ opacity: n.read_at ? 0.6 : 1 }}>
            <p className="font-medium">{n.title}</p>
            {n.body && <p className="muted text-sm">{n.body}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
