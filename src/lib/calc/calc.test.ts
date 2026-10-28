import { describe, expect, it } from "vitest";
import { completionPercent, effectiveStatus, findOverlaps, isValidRange } from "./tasks";
import { budgetUtilization, financialTotals, goalProgress, savingsGoalProgress } from "./goals";
import { dayBoundsUtc, intendedSleepMinutes, localDateString, sleepMinutes } from "./time";

const t = (status: "planned" | "completed" | "postponed", s: string, e: string) => ({ status, start_at: s, end_at: e });

describe("statut des tâches", () => {
  const task = t("planned", "2026-10-28T10:00:00Z", "2026-10-28T11:00:00Z");
  it("À venir avant le début", () => expect(effectiveStatus(task, new Date("2026-10-28T09:59:00Z"))).toBe("upcoming"));
  it("En cours pendant la tâche", () => expect(effectiveStatus(task, new Date("2026-10-28T10:30:00Z"))).toBe("in_progress"));
  it("En retard à 11:01", () => expect(effectiveStatus(task, new Date("2026-10-28T11:01:00Z"))).toBe("overdue"));
  it("Une tâche en retard peut être terminée rétroactivement", () =>
    expect(effectiveStatus({ ...task, status: "completed" }, new Date("2026-10-28T12:00:00Z"))).toBe("completed"));
  it("Reportée reste reportée", () =>
    expect(effectiveStatus({ ...task, status: "postponed" }, new Date("2026-10-29T12:00:00Z"))).toBe("postponed"));
});

describe("pourcentage de complétion", () => {
  const now = new Date("2026-10-28T15:00:00Z");
  it("aucune tâche => percent null", () => expect(completionPercent([], now).percent).toBeNull());
  it("exclut les tâches futures du dénominateur", () => {
    const r = completionPercent(
      [
        t("completed", "2026-10-28T08:00:00Z", "2026-10-28T09:00:00Z"),
        t("planned", "2026-10-28T10:00:00Z", "2026-10-28T11:00:00Z"),
        t("planned", "2026-10-28T20:00:00Z", "2026-10-28T21:00:00Z"),
      ],
      now,
    );
    expect(r).toEqual({ completed: 1, eligible: 2, percent: 50 });
  });
  it("uniquement des tâches futures => null", () =>
    expect(completionPercent([t("planned", "2026-10-28T20:00:00Z", "2026-10-28T21:00:00Z")], now).percent).toBeNull());
  it("mode includeFuture", () =>
    expect(
      completionPercent([t("planned", "2026-10-28T20:00:00Z", "2026-10-28T21:00:00Z")], now, { includeFuture: true }).percent,
    ).toBe(0));
});

describe("plages horaires", () => {
  it("refuse fin <= début", () => expect(isValidRange("2026-10-28T11:00:00Z", "2026-10-28T10:00:00Z")).toBe(false));
  it("détecte un chevauchement", () => {
    const a = { id: "a", start_at: "2026-10-28T10:00:00Z", end_at: "2026-10-28T11:00:00Z" };
    const b = { id: "b", start_at: "2026-10-28T10:30:00Z", end_at: "2026-10-28T12:00:00Z" };
    const c = { id: "c", start_at: "2026-10-28T11:00:00Z", end_at: "2026-10-28T12:00:00Z" };
    expect(findOverlaps(a, [b, c]).map((x) => x.id)).toEqual(["b"]);
  });
});

describe("objectifs financiers (exemple du cahier des charges)", () => {
  it("5 000 / 10 000 = 50 %", () => expect(goalProgress(5000, 10000)).toMatchObject({ percent: 50, remaining: 5000 }));
  it("5 400 / 10 000 = 54 %, reste 4 600", () => expect(goalProgress(5400, 10000)).toMatchObject({ percent: 54, remaining: 4600 }));
  it("dépassement : valeur réelle > 100 mais affichage plafonné", () =>
    expect(goalProgress(12000, 10000)).toMatchObject({ percent: 120, display: 100, remaining: 0 }));
  it("refuse une cible nulle ou négative", () => {
    expect(() => goalProgress(1, 0)).toThrow();
    expect(() => goalProgress(1, -5)).toThrow();
  });
  it("épargne : montant de départ compté une seule fois", () => {
    const r = savingsGoalProgress(1000, [{ amount: 4000 }, { amount: 400 }], 10000);
    expect(r).toMatchObject({ current: 5400, percent: 54 });
  });
  it("retrait négatif ne descend pas sous zéro", () =>
    expect(savingsGoalProgress(0, [{ amount: 100 }, { amount: -500 }], 1000).current).toBe(0));
});

describe("totaux financiers", () => {
  const txs = [
    { kind: "income" as const, amount: 5000, currency: "MAD", occurred_on: "2026-10-01" },
    { kind: "income" as const, amount: 400, currency: "MAD", occurred_on: "2026-10-15" },
    { kind: "expense" as const, amount: 1200.5, currency: "MAD", occurred_on: "2026-10-03" },
    { kind: "income" as const, amount: 100, currency: "EUR", occurred_on: "2026-10-03" },
    { kind: "expense" as const, amount: 99, currency: "MAD", occurred_on: "2026-09-30" },
  ];
  it("revenus 5 400 DH, sans mélanger les devises", () =>
    expect(financialTotals(txs, "MAD", "2026-10-01", "2026-10-31")).toEqual({ income: 5400, expenses: 1200.5, netCashFlow: 4199.5 }));
  it("budget : 80 % déclenche l'alerte", () => expect(budgetUtilization(400, 500).overThreshold).toBe(true));
  it("budget dépassé", () => expect(budgetUtilization(600, 500)).toMatchObject({ exceeded: true, remaining: 0 }));
});

describe("temps et sommeil", () => {
  it("sommeil à cheval sur minuit", () =>
    expect(sleepMinutes(new Date("2026-10-27T23:30:00Z"), new Date("2026-10-28T06:30:00Z"))).toBe(420));
  it("horaire visé 23:30 → 06:30 = 7 h", () => expect(intendedSleepMinutes("23:30", "06:30")).toBe(420));
  it("date locale : 23:30 UTC le 27 = 28 en Asie/Tokyo", () =>
    expect(localDateString(new Date("2026-10-27T23:30:00Z"), "Asia/Tokyo")).toBe("2026-10-28"));
  it("limites d'un jour à Casablanca (UTC+1 en 2026) ", () => {
    const { start, end } = dayBoundsUtc("2026-10-28", "Africa/Casablanca");
    expect(end.getTime() - start.getTime()).toBe(24 * 3600 * 1000);
  });
  it("jour de 23 h lors du passage à l'heure d'été (Paris, 2026-03-29)", () => {
    const { start, end } = dayBoundsUtc("2026-03-29", "Europe/Paris");
    expect((end.getTime() - start.getTime()) / 3600000).toBe(23);
  });
});
