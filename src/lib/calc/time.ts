// Dates, fuseaux horaires et sommeil. Utilise uniquement Intl (pas de dépendance).

/** Date locale YYYY-MM-DD d'un instant dans un fuseau donné. */
export function localDateString(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}

function tzOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(instant);
  const g = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Début (00:00 local) et fin exclusive (00:00 du lendemain) d'un jour local, en instants UTC. Gère l'heure d'été. */
export function dayBoundsUtc(dateYmd: string, timeZone: string): { start: Date; end: Date } {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const toUtc = (yy: number, mm: number, dd: number) => {
    const guess = new Date(Date.UTC(yy, mm - 1, dd, 0, 0, 0));
    let t = guess.getTime() - tzOffsetMs(guess, timeZone);
    t = guess.getTime() - tzOffsetMs(new Date(t), timeZone); // second passage près d'un changement d'heure
    return new Date(t);
  };
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return { start: toUtc(y, m, d), end: toUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()) };
}

/** Convertit une date locale + heure "HH:MM" dans un fuseau en instant UTC (ISO). */
export function zonedToUtcIso(dateYmd: string, hm: string, timeZone: string): string {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const [hh, mm] = hm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  let t = guess - tzOffsetMs(new Date(guess), timeZone);
  t = guess - tzOffsetMs(new Date(t), timeZone);
  return new Date(t).toISOString();
}

/** Durée de sommeil en minutes ; gère un coucher avant minuit et un réveil après minuit. */
export function sleepMinutes(bed: Date, wake: Date): number | null {
  const diff = (wake.getTime() - bed.getTime()) / 60000;
  return diff > 0 ? Math.round(diff) : null;
}

/** Idem à partir d'heures "HH:MM" (horaire visé) : si le réveil est « avant » le coucher, il a lieu le lendemain. */
export function intendedSleepMinutes(bedHm: string, wakeHm: string): number {
  const toMin = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + m;
  };
  const b = toMin(bedHm);
  const w = toMin(wakeHm);
  return w > b ? w - b : w + 1440 - b;
}

export function formatMAD(amount: number, currency = "MAD", locale = "fr-MA"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}
