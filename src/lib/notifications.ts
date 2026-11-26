import { getAdvanceCoverage } from "@/lib/tenancy";
import { currentRentPeriod, getUnitPeriodCredit } from "@/lib/rent-accounting";
import { formatUGX } from "@/lib/rent";
import { readRentDemoState, writeRentDemoState, type RentDemoState } from "@/lib/rent-demo";
import type {
  NotificationAudience,
  NotificationChannel,
  NotificationDelivery,
  NotificationEventType,
  TenantNotification,
  Unit,
} from "@/lib/sample-data";

export type NotificationPreferences = Record<
  NotificationAudience,
  Record<NotificationChannel, boolean>
>;

export type NotificationInput = Omit<TenantNotification, "delivery">;

export type ReminderJobResult = {
  state: RentDemoState;
  created: TenantNotification[];
  duplicatesSkipped: number;
};

export const RENT_DUE_SOON_DAYS = [7, 3, 1] as const;
export const OVERDUE_REMINDER_DAYS = [1, 3, 7] as const;

export const defaultNotificationPreferences: NotificationPreferences = {
  landlord: { "in-app": true, sms: true, whatsapp: true },
  tenant: { "in-app": true, sms: true, whatsapp: true },
};

const preferencesStorageKey = "propatiz-demo-notification-preferences";
const channels: NotificationChannel[] = ["in-app", "sms", "whatsapp"];

export interface MockNotificationAdapter {
  channel: NotificationChannel;
  deliver(notification: NotificationInput): NotificationDelivery;
}

export const mockNotificationAdapters: Record<NotificationChannel, MockNotificationAdapter> = {
  "in-app": {
    channel: "in-app",
    deliver: () => ({
      channel: "in-app",
      status: "mocked",
      note: "Saved in the local demo notification centre.",
    }),
  },
  sms: {
    channel: "sms",
    deliver: () => ({
      channel: "sms",
      status: "disabled",
      note: "SMS delivery is not configured; no message was sent.",
    }),
  },
  whatsapp: {
    channel: "whatsapp",
    deliver: () => ({
      channel: "whatsapp",
      status: "disabled",
      note: "WhatsApp delivery is not configured; no message was sent.",
    }),
  },
};

export function readNotificationPreferences(): NotificationPreferences {
  if (typeof localStorage === "undefined") return clonePreferences(defaultNotificationPreferences);
  const saved = localStorage.getItem(preferencesStorageKey);
  if (!saved) return clonePreferences(defaultNotificationPreferences);

  const parsed: unknown = JSON.parse(saved);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Saved notification settings have an invalid shape.");
  }
  const settings = parsed as Partial<Record<NotificationAudience, unknown>>;
  return {
    landlord: normalizeChannelPreferences(settings["landlord"]),
    tenant: normalizeChannelPreferences(settings["tenant"]),
  };
}

export function saveNotificationPreferences(preferences: NotificationPreferences) {
  if (typeof localStorage === "undefined") {
    throw new Error("Notification settings can only be saved in the browser demo.");
  }
  localStorage.setItem(preferencesStorageKey, JSON.stringify(preferences));
  return preferences;
}

export function createNotification(
  notification: NotificationInput,
  preferences = readNotificationPreferences(),
): TenantNotification {
  const audience = notification.audience ?? "tenant";
  const selectedPreferences = preferences[audience];
  if (!selectedPreferences) {
    throw new Error(`Notification settings are missing for the ${audience} account.`);
  }
  const delivery = channels.map((channel) =>
    selectedPreferences[channel]
      ? mockNotificationAdapters[channel].deliver(notification)
      : {
          channel,
          status: "disabled" as const,
          note: "Disabled in this user's notification settings.",
        },
  );
  return { ...notification, audience, delivery };
}

export function sendNotification(
  userId: string,
  channel: NotificationChannel,
  template: string,
  data: Omit<NotificationInput, "id"> & { id?: string | undefined },
): NotificationDelivery {
  const cleanUserId = userId.trim();
  const cleanTemplate = template.trim();
  if (!cleanUserId) throw new Error("A recipient is required to send a notification.");
  if (!cleanTemplate) throw new Error("A notification template is required.");
  if (channel !== "in-app") {
    return mockNotificationAdapters[channel].deliver({
      ...data,
      id: data.id ?? `${cleanTemplate}:${cleanUserId}:${Date.now()}`,
    });
  }
  if (typeof localStorage === "undefined") {
    throw new Error("In-app notifications can only be saved in the browser demo.");
  }

  const result = readRentDemoState();
  if (result.error) throw result.error;
  const input: NotificationInput = {
    ...data,
    id: data.id ?? `${cleanTemplate}:${cleanUserId}:${Date.now()}`,
  };
  if (result.state.notifications.some((notification) => notification.id === input.id)) {
    return {
      channel: "in-app",
      status: "mocked",
      note: "This notification is already in the local notification centre.",
    };
  }
  const notification: TenantNotification = {
    ...input,
    audience: input.audience ?? "tenant",
    delivery: [mockNotificationAdapters["in-app"].deliver(input)],
  };
  writeRentDemoState({
    ...result.state,
    notifications: [notification, ...result.state.notifications],
  });
  return notification.delivery[0]!;
}

export function buildTenantRentDueNotification(
  unit: Unit,
  balance: number,
  now = new Date(),
): NotificationInput | null {
  if (!unit.tenant || balance <= 0) return null;
  const dueDay = unit.dueDay;
  if (!dueDay || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) return null;
  const daysUntilDue = getDaysUntilDue(now, dueDay);
  if (daysUntilDue !== 7 && daysUntilDue !== 0 && daysUntilDue >= 0) return null;

  const eventType: NotificationEventType = daysUntilDue < 0 ? "rent-overdue" : "rent-due-soon";
  const title =
    daysUntilDue < 0
      ? "Rent overdue"
      : daysUntilDue === 0
        ? "Rent due today"
        : "Rent due in 7 days";
  const period = currentRentPeriod(now);
  return {
    id: `tenant-rent-due:${unit.id}:${period}:${eventType}`,
    audience: "tenant",
    eventType,
    unitId: unit.id,
    unit: unit.unit,
    kind: "rent",
    title,
    message:
      daysUntilDue < 0
        ? `Rent of ${formatUGX(balance)} for ${unit.property} · Unit ${unit.unit} is overdue.`
        : `Rent of ${formatUGX(balance)} for ${unit.property} · Unit ${unit.unit} is ${
            daysUntilDue === 0 ? "due today." : "due in 7 days."
          }`,
    createdAt: now.toISOString(),
    read: false,
  };
}

export function runReminderJob(now = new Date(), suppliedState?: RentDemoState): ReminderJobResult {
  const storedState = suppliedState ? undefined : readRentDemoState();
  if (storedState?.error) throw storedState.error;
  const state = suppliedState ?? storedState?.state;
  if (!state) throw new Error("Rent demo state could not be loaded.");
  const period = currentRentPeriod(now);
  const knownDedupeKeys = new Set(
    state.notifications.flatMap((notification) =>
      notification.dedupeKey ? [notification.dedupeKey] : [],
    ),
  );
  const created: TenantNotification[] = [];
  let duplicatesSkipped = 0;

  const add = (notification: NotificationInput) => {
    const dedupeKey = notification.dedupeKey;
    if (dedupeKey && knownDedupeKeys.has(dedupeKey)) {
      duplicatesSkipped += 1;
      return;
    }
    if (dedupeKey) knownDedupeKeys.add(dedupeKey);
    created.push(createNotification(notification));
  };

  for (const unit of state.units) {
    if (!unit.tenant || unit.pendingMoveIn) continue;
    const tenancy = state.tenancies.find(
      (item) => item.unitId === unit.id && item.status !== "Ended",
    );
    const dueDay = tenancy?.dueDay ?? unit.dueDay;
    if (dueDay && Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 31) {
      const daysUntilDue = getDaysUntilDue(now, dueDay);
      const isPaid = getUnitPeriodCredit(unit, state.ledger, period) >= unit.rent;
      const isOverdue = daysUntilDue < 0 && !isPaid;
      const reminderDays = isOverdue ? OVERDUE_REMINDER_DAYS : RENT_DUE_SOON_DAYS;
      const daysToNotify = isOverdue ? Math.abs(daysUntilDue) : daysUntilDue;
      if (
        !isPaid &&
        (isOverdue ? daysToNotify <= 7 : true) &&
        reminderDays.some((day) => day === daysToNotify)
      ) {
        const eventType: NotificationEventType = isOverdue ? "rent-overdue" : "rent-due-soon";
        const dayLabel = daysToNotify === 1 ? "1 day" : `${daysToNotify} days`;
        for (const audience of ["landlord", "tenant"] as const) {
          add({
            id: `reminder:${audience}:${unit.id}:${eventType}:${now.toISOString().slice(0, 10)}`,
            dedupeKey: `reminder:${audience}:${unit.id}:${eventType}:${now.toISOString().slice(0, 10)}`,
            audience,
            eventType,
            unitId: unit.id,
            unit: unit.unit,
            kind: "rent",
            title: isOverdue ? `Rent is ${dayLabel} overdue` : `Rent is due in ${dayLabel}`,
            message: isOverdue
              ? `${unit.tenant}'s ${unit.property} · Unit ${unit.unit} rent of ${formatUGX(unit.rent)} is ${dayLabel} overdue.`
              : `Rent of ${formatUGX(unit.rent)} for ${unit.property} · Unit ${unit.unit} is due in ${dayLabel}.`,
            createdAt: now.toISOString(),
            read: false,
          });
        }
      }
    }

    const hasAdvance = state.ledger.some(
      (entry) =>
        entry.unitId === unit.id &&
        entry.tenant === unit.tenant &&
        entry.status === "Confirmed" &&
        entry.monthsCovered > 1,
    );
    const advanceCoverage = getAdvanceCoverage(unit, state.ledger, period);
    if (hasAdvance && advanceCoverage.monthsCovered === 1 && advanceCoverage.coveredUntil) {
      const dedupeKey = `advance-ending:landlord:${unit.id}:${advanceCoverage.coveredUntil}`;
      add({
        id: dedupeKey,
        dedupeKey,
        audience: "landlord",
        eventType: "advance-running-out",
        unitId: unit.id,
        unit: unit.unit,
        kind: "advance",
        title: "Rent advance is running out",
        message: `${unit.tenant}'s advance at ${unit.property} · Unit ${unit.unit} covers one more month.`,
        createdAt: now.toISOString(),
        read: false,
      });
    }
  }

  for (const tenancy of state.tenancies) {
    if (tenancy.status !== "Ending") continue;
    const unit = state.units.find((item) => item.id === tenancy.unitId);
    if (!unit) continue;
    for (const audience of ["landlord", "tenant"] as const) {
      const dedupeKey = `tenancy-ending:${audience}:${tenancy.id}`;
      add({
        id: dedupeKey,
        dedupeKey,
        audience,
        eventType: "tenancy-ending",
        unitId: unit.id,
        unit: unit.unit,
        kind: "update",
        title: "Tenancy ending",
        message: `${tenancy.tenantName}'s tenancy at ${unit.property} · Unit ${unit.unit} is marked as ending.`,
        createdAt: now.toISOString(),
        read: false,
      });
    }
  }

  const nextState = { ...state, notifications: [...created, ...state.notifications] };
  if (!suppliedState) writeRentDemoState(nextState);
  return { state: nextState, created, duplicatesSkipped };
}

function getDaysUntilDue(now: Date, dueDay: number) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayInMonth = Math.min(dueDay, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
  const dueDate = new Date(now.getFullYear(), now.getMonth(), dayInMonth);
  const delta = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);
  return delta;
}

function normalizeChannelPreferences(value: unknown): Record<NotificationChannel, boolean> {
  if (typeof value !== "object" || value === null) {
    throw new Error("Saved notification channel settings have an invalid shape.");
  }
  const preferences = value as Record<string, unknown>;
  const normalized = {} as Record<NotificationChannel, boolean>;
  for (const channel of channels) {
    const setting = preferences[channel];
    if (setting !== undefined && typeof setting !== "boolean") {
      throw new Error(`Saved ${channel} notification setting must be on or off.`);
    }
    normalized[channel] =
      typeof setting === "boolean" ? setting : defaultNotificationPreferences["tenant"][channel];
  }
  return normalized;
}

function clonePreferences(preferences: NotificationPreferences): NotificationPreferences {
  return {
    landlord: { ...preferences.landlord },
    tenant: { ...preferences.tenant },
  };
}
