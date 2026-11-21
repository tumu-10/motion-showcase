import { afterEach, describe, expect, it } from "vitest";
import { runReminderJob } from "@/lib/notifications";
import { initialRentDemoState } from "@/lib/rent-demo";

afterEach(() => localStorage.clear());

function reminderState(dueDay: number) {
  const unit = initialRentDemoState.units.find((item) => item.id === "u1");
  if (!unit) throw new Error("Sample unit u1 is required for reminder tests.");
  return {
    ...initialRentDemoState,
    units: [{ ...unit, tenant: "Amina Namusoke", dueDay }],
    ledger: [],
    notifications: [],
    tenancies: [],
  };
}

describe("runReminderJob", () => {
  it("creates landlord and tenant reminders seven days before rent is due", () => {
    const result = runReminderJob(new Date("2026-11-18T12:00:00.000Z"), reminderState(25));

    expect(result.created).toHaveLength(2);
    expect(result.created.map((notification) => notification.eventType)).toEqual([
      "rent-due-soon",
      "rent-due-soon",
    ]);
    expect(result.created.map((notification) => notification.audience).sort()).toEqual([
      "landlord",
      "tenant",
    ]);
  });

  it("creates an overdue reminder one day after the rent due date", () => {
    const result = runReminderJob(new Date("2026-11-26T12:00:00.000Z"), reminderState(25));

    expect(result.created).toHaveLength(2);
    expect(result.created.every((notification) => notification.eventType === "rent-overdue")).toBe(
      true,
    );
  });

  it("skips reminders already recorded for the same date and unit", () => {
    const now = new Date("2026-11-18T12:00:00.000Z");
    const firstRun = runReminderJob(now, reminderState(25));
    const secondRun = runReminderJob(now, firstRun.state);

    expect(secondRun.created).toHaveLength(0);
    expect(secondRun.duplicatesSkipped).toBe(2);
  });
});
