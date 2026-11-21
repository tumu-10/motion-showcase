import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CalendarClock,
  CheckCheck,
  CircleCheck,
  MessageSquareText,
  ReceiptText,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import type {
  NotificationAudience,
  NotificationChannel,
  NotificationEventType,
  TenantNotification,
} from "@/lib/sample-data";
import {
  defaultNotificationPreferences,
  readNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EventFilter = "all" | "legacy" | NotificationEventType;

const eventLabels: Record<NotificationEventType, string> = {
  "rent-due-soon": "Rent due soon",
  "rent-overdue": "Rent overdue",
  "payment-received": "Payment received",
  "advance-received": "Advance received",
  "deposit-received": "Deposit received",
  "advance-running-out": "Advance running out",
  "new-complaint": "New complaint",
  "notice-response": "Notice response",
  "efris-failure": "EFRIS failure",
  "tenancy-ending": "Tenancy ending",
  receipt: "Receipt",
  "notice-received": "Notice received",
  "repair-update": "Repair update",
  "refund-update": "Refund update",
};

const eventTypes = Object.keys(eventLabels) as NotificationEventType[];
const channelLabels: Record<NotificationChannel, string> = {
  "in-app": "In-app",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

export function NotificationCenter({
  audience,
  notifications,
  onRead,
  onMarkAllRead,
  onBack,
}: {
  audience: NotificationAudience;
  notifications: TenantNotification[];
  onRead: (id: string) => void;
  onMarkAllRead: () => void;
  onBack?: () => void;
}) {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    defaultNotificationPreferences,
  );
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  const visible = useMemo(
    () =>
      notifications.filter((notification) => {
        if (unreadOnly && notification.read) return false;
        if (eventFilter === "all") return true;
        if (eventFilter === "legacy") return !notification.eventType;
        return notification.eventType === eventFilter;
      }),
    [notifications, unreadOnly, eventFilter],
  );
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    try {
      setPreferences(readNotificationPreferences());
    } catch (error) {
      console.error("Could not load notification preferences.", error);
      toast.error("Notification settings could not be loaded.");
    } finally {
      setPreferencesLoaded(true);
    }
  }, []);

  const updatePreference = (channel: NotificationChannel, enabled: boolean) => {
    const updated = {
      ...preferences,
      [audience]: { ...preferences[audience], [channel]: enabled },
    };
    try {
      saveNotificationPreferences(updated);
      setPreferences(updated);
      toast.success("Notification settings saved");
    } catch (error) {
      console.error("Could not save notification preferences.", error);
      toast.error("Notification settings could not be saved.", {
        description: error instanceof Error ? error.message : "Check browser storage and retry.",
      });
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <Button
              type="button"
              variant="outline"
              size="iconSm"
              className="min-h-11 min-w-11 shrink-0"
              onClick={onBack}
              aria-label="Back"
            >
              <span aria-hidden>←</span>
            </Button>
          )}
          <div>
            <p className="text-eyebrow text-primary">Alerts and preferences</p>
            <h1 className="mt-1 text-2xl font-bold text-primary-deep sm:text-3xl">Notifications</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {unreadCount} unread {unreadCount === 1 ? "notification" : "notifications"}.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          disabled={unreadCount === 0}
          onClick={onMarkAllRead}
        >
          <CheckCheck className="size-4" aria-hidden />
          Mark all read
        </Button>
      </header>

      <section
        className="surface space-y-4 p-4 sm:p-5"
        aria-labelledby="notification-settings-title"
      >
        <div>
          <h2 id="notification-settings-title" className="font-bold text-primary-deep">
            {audience === "landlord" ? "Landlord" : "Tenant"} delivery settings
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose which mock channels this demo records for your account.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["in-app", "sms", "whatsapp"] as const).map((channel) => (
            <label
              key={channel}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2"
            >
              <Checkbox
                checked={preferences[audience]?.[channel] ?? false}
                disabled={!preferencesLoaded}
                onCheckedChange={(checked) => updatePreference(channel, checked === true)}
              />
              <span className="font-medium">{channelLabels[channel]}</span>
            </label>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Demo only. SMS and WhatsApp are mock adapters; no messages are sent to phone numbers or
          external services.
        </p>
      </section>

      <section className="surface space-y-4 p-4 sm:p-5" aria-labelledby="notification-list-title">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.65fr)]">
          <div>
            <h2 id="notification-list-title" className="font-bold text-primary-deep">
              Notification centre
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {notifications.length} total · {visible.length} shown
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={unreadOnly ? "unread" : "all"}
              onValueChange={(value) => setUnreadOnly(value === "unread")}
            >
              <SelectTrigger aria-label="Filter notifications by read status" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All notifications</SelectItem>
                <SelectItem value="unread">Unread only</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={eventFilter}
              onValueChange={(value) => setEventFilter(value as EventFilter)}
            >
              <SelectTrigger aria-label="Filter notifications by category" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="legacy">General updates</SelectItem>
                {eventTypes.map((eventType) => (
                  <SelectItem key={eventType} value={eventType}>
                    {eventLabels[eventType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-5 py-10 text-center">
            <BellRing className="mx-auto size-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-semibold">No matching notifications</p>
            <p className="mt-1 text-sm text-muted-foreground">
              New alerts will appear here when an event occurs.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((notification) => (
              <li key={notification.id}>
                <NotificationCard notification={notification} onRead={onRead} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function NotificationCard({
  notification,
  onRead,
}: {
  notification: TenantNotification;
  onRead: (id: string) => void;
}) {
  const Icon =
    notification.eventType === "receipt" || notification.kind === "payment"
      ? ReceiptText
      : notification.eventType === "rent-overdue" || notification.eventType === "efris-failure"
        ? TriangleAlert
        : notification.eventType === "rent-due-soon" ||
            notification.eventType === "advance-running-out"
          ? CalendarClock
          : notification.eventType === "new-complaint" || notification.eventType === "repair-update"
            ? MessageSquareText
            : notification.read
              ? CircleCheck
              : BellRing;
  const date = new Date(notification.createdAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? "Recently"
    : new Intl.DateTimeFormat("en-UG", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
  const mockedChannels = notification.delivery
    ?.filter((delivery) => delivery.status === "mocked")
    .map((delivery) => channelLabels[delivery.channel]);

  return (
    <button
      type="button"
      onClick={() => !notification.read && onRead(notification.id)}
      aria-label={`${notification.read ? "" : "Unread: "}${notification.title}. ${notification.message}`}
      className={`surface flex min-h-20 w-full items-start gap-3 p-4 text-left transition-colors hover:bg-secondary/50 ${
        notification.read ? "" : "border-primary/30 bg-primary-soft/35"
      }`}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-primary-deep">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-start justify-between gap-2">
          <span className="font-bold">{notification.title}</span>
          {!notification.read && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[0.625rem] font-bold text-primary-foreground">
              New
            </span>
          )}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">{notification.message}</span>
        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <time dateTime={notification.createdAt}>{dateLabel}</time>
          {notification.eventType && <span>{eventLabels[notification.eventType]}</span>}
          {mockedChannels && mockedChannels.length > 0 && (
            <span>Mocked via {mockedChannels.join(", ")}</span>
          )}
        </span>
      </span>
    </button>
  );
}
