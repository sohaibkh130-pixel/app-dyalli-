import { dayBoundsUtc, localDateString } from "@/lib/calc/time";

export type PeriodKey = "day" | "week" | "month" | "year" | "custom";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  day: "Aujourd'hui", week: "Cette semaine", month: "Ce mois-ci", year: "Cette année", custom: "Période personnalisée",
};

const addDays = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

/** Bornes de période en dates locales (incluses) et en instants UTC (fin exclusive), selon le fuseau et le début de semaine de l'utilisateur. */
export function periodRange(key: PeriodKey, tz: string, weekStart = 1, custom?: { from?: string; to?: string }, now = new Date()) {
  const today = localDateString(now, tz);
  let from = today;
  let to = today;
  if (key === "week") {
    const dow = new Date(today + "T00:00:00Z").getUTCDay();
    from = addDays(today, -((dow - weekStart + 7) % 7));
    to = addDays(from, 6);
  } else if (key === "month") {
    from = today.slice(0, 8) + "01";
    const [y, m] = today.split("-").map(Number);
    to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  } else if (key === "year") {
    from = today.slice(0, 4) + "-01-01";
    to = today.slice(0, 4) + "-12-31";
  } else if (key === "custom" && custom?.from && custom?.to && custom.from <= custom.to) {
    from = custom.from;
    to = custom.to;
  }
  return { from, to, startUtc: dayBoundsUtc(from, tz).start, endUtc: dayBoundsUtc(to, tz).end };
}
