import { afterEach, describe, expect, it } from "vitest";
import {
  buildTenantRentDueNotification,
  runReminderJob,
  sendNotification,
} from "@/lib/notifications";
import { getInitialRentDemoState } from "@/lib/rent-demo";

const initialRentDemoState = getInitialRentDemoState();

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

describe("tenant notification delivery", () => {
  it("saves in-app notifications and clearly declines unwired channels", () => {
    const data = {
      audience: "tenant" as const,
      unit: "B4",
      kind: "update" as const,
      title: "Repair update",
      message: "Your repair request was updated.",
      createdAt: "2026-11-25T10:00:00.000Z",
      read: false,
    };

    expect(sendNotification("tenant-1", "in-app", "repair-update", data)).toMatchObject({
      channel: "in-app",
      status: "mocked",
    });
    expect(localStorage.getItem("propatiz-demo-rent-state")).toContain("Repair update");
    expect(sendNotification("tenant-1", "sms", "repair-update", data)).toMatchObject({
      channel: "sms",
      status: "disabled",
      note: expect.stringContaining("no message was sent"),
    });
  });
});

describe("tenant rent-due notices", () => {
  const sampleUnit = initialRentDemoState.units.find((item) => item.id === "u1");
  if (!sampleUnit) throw new Error("Sample unit u1 is required for due-date tests.");
  const unit = { ...sampleUnit, dueDay: 25 };

  it("creates seven-day, due-today, and overdue templates only when unpaid", () => {
    expect(
      buildTenantRentDueNotification(unit, 100_000, new Date("2026-11-18T12:00:00.000Z"))?.title,
    ).toBe("Rent due in 7 days");
    expect(
      buildTenantRentDueNotification(unit, 100_000, new Date("2026-11-25T12:00:00.000Z"))?.title,
    ).toBe("Rent due today");
    expect(
      buildTenantRentDueNotification(unit, 100_000, new Date("2026-11-26T12:00:00.000Z"))?.title,
    ).toBe("Rent overdue");
    expect(
      buildTenantRentDueNotification(unit, 0, new Date("2026-11-25T12:00:00.000Z")),
    ).toBeNull();
  });
});
