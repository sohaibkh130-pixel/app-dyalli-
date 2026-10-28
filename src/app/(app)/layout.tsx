import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

const NAV = [
  ["/dashboard", "Vue d'ensemble"], ["/planning", "Planning quotidien"], ["/goals", "Objectifs"], ["/finances", "Finances"],
  ["/habits", "Habitudes"], ["/skills", "Compétences"], ["/projects", "Projets"], ["/reports", "Rapports"],
  ["/coach", "Coach IA"], ["/notifications", "Notifications"], ["/settings", "Paramètres"], ["/profile", "Profil"],
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("onboarding_completed_at").eq("id", user.id).single();
  if (!profile?.onboarding_completed_at) redirect("/onboarding");

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b md:min-h-screen md:w-60 md:border-b-0 md:border-r" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="px-4 py-3 text-lg font-bold">LifeOS AI</div>
        <nav aria-label="Navigation de l'application" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm hover:bg-black/5">{label}</Link>
          ))}
          <form action="/auth/signout" method="post"><button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-black/5">Se déconnecter</button></form>
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
