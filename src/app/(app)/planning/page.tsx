import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { TaskForm } from "@/components/TaskForm";
import { deleteTask, setTaskStatus } from "./actions";
import { effectiveStatus, STATUS_LABELS_FR, completionPercent, type EffectiveTaskStatus } from "@/lib/calc/tasks";
import { dayBoundsUtc, localDateString } from "@/lib/calc/time";

export const metadata = { title: "Planning quotidien" };

const STYLE: Record<EffectiveTaskStatus, { cls: string; icon: string }> = {
  completed: { cls: "border-ok text-ok", icon: "✔" },
  overdue: { cls: "border-late text-late", icon: "!" },
  upcoming: { cls: "border-gray-400 text-gray-500", icon: "○" },
  in_progress: { cls: "border-accent text-accent", icon: "▶" },
  postponed: { cls: "border-warn text-warn", icon: "↻" },
};

const shift = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

export default async function Planning({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).single();
  const tz = profile?.timezone ?? "Africa/Casablanca";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? "") ? sp.d! : localDateString(new Date(), tz);
  const { start, end } = dayBoundsUtc(date, tz);

  // Tâches qui touchent la journée (y compris celles qui commencent la veille et finissent après minuit).
  const { data: tasks } = await supabase.from("tasks").select("*").lt("start_at", end.toISOString()).gt("end_at", start.toISOString()).order("start_at");
  const now = new Date();
  const comp = completionPercent(tasks ?? [], now);
  const hm = (iso: string) => new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(iso));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Planning quotidien</h1>
        <div className="flex items-center gap-2">
          <Link className="btn btn-ghost" href={`/planning?d=${shift(date, -1)}`} aria-label="Jour précédent">←</Link>
          <span className="font-medium">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(date + "T12:00:00Z"))}</span>
          <Link className="btn btn-ghost" href={`/planning?d=${shift(date, 1)}`} aria-label="Jour suivant">→</Link>
        </div>
      </header>

      <p className="muted">
        {comp.percent === null ? "Aucune tâche planifiée" : `${comp.percent} % réalisé (${comp.completed} sur ${comp.eligible} tâches échues ou en cours)`}
      </p>

      <TaskForm date={date} />

      <section aria-label="Agenda du jour" className="space-y-2">
        {!tasks?.length && <p className="muted">Aucune tâche planifiée pour ce jour.</p>}
        {(tasks ?? []).map((t) => {
          const s = effectiveStatus(t, now);
          const st = STYLE[s];
          return (
            <article key={t.id} className={`card flex flex-wrap items-center justify-between gap-3 border-l-4 ${st.cls}`}>
              <div>
                <p className="font-semibold" style={{ color: "var(--text)" }}>{t.title}</p>
                <p className="muted text-sm">{hm(t.start_at)} – {hm(t.end_at)}{t.category ? ` · ${t.category}` : ""}</p>
                <p className="text-sm font-medium"><span aria-hidden="true">{st.icon} </span>{STATUS_LABELS_FR[s]}</p>
              </div>
              <div className="flex gap-2">
                {t.status !== "completed" ? (
                  <form action={setTaskStatus.bind(null, t.id, "completed")}><button className="btn">Terminer</button></form>
                ) : (
                  <form action={setTaskStatus.bind(null, t.id, "planned")}><button className="btn btn-ghost">Annuler</button></form>
                )}
                {t.status === "planned" && <form action={setTaskStatus.bind(null, t.id, "postponed")}><button className="btn btn-ghost">Reporter</button></form>}
                <form action={deleteTask.bind(null, t.id)}><button className="btn btn-ghost" aria-label={`Supprimer ${t.title}`}>Supprimer</button></form>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
