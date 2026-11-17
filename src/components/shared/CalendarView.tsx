import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  detail: string;
  kind: "rent" | "complaint" | "lease" | "payment" | "notice" | "general";
  amount?: number;
  coverage?: string;
};

const kindStyle: Record<CalendarEvent["kind"], string> = {
  rent: "bg-warning",
  complaint: "bg-destructive",
  lease: "bg-chart-4",
  payment: "bg-success",
  notice: "bg-primary",
  general: "bg-muted-foreground",
};

export function CalendarView({
  events,
  audience,
}: {
  events: CalendarEvent[];
  audience: "landlord" | "tenant";
}) {
  const [month, setMonth] = useState(new Date(2026, 10, 1));
  const [selected, setSelected] = useState(() => selectCalendarDate(events, new Date(2026, 10, 1)));
  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month],
  );
  const selectedEvents = events.filter((event) => isSameDay(event.date, selected));
  const monthEvents = events.filter((event) => isSameMonth(event.date, month));
  const paidEvents = monthEvents.filter((event) => event.kind === "payment");
  const dueEvents = monthEvents.filter((event) => event.kind === "rent");
  const paidTotal = paidEvents.reduce((total, event) => total + (event.amount ?? 0), 0);
  const dueTotal = dueEvents.reduce((total, event) => total + (event.amount ?? 0), 0);
  const moveMonth = (direction: -1 | 1) => {
    const nextMonth = direction === -1 ? subMonths(month, 1) : addMonths(month, 1);
    setMonth(nextMonth);
    setSelected(selectCalendarDate(events, nextMonth));
  };

  return (
    <section className="min-w-0 space-y-4 sm:space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {audience === "landlord" ? "Property schedule" : "Your schedule"}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary-deep">Calendar</h1>
        </div>
        <div className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card p-1.5 shadow-soft sm:w-auto">
          <Button
            variant="outline"
            size="iconSm"
            aria-label="Previous month"
            onClick={() => moveMonth(-1)}
          >
            <ChevronLeft />
          </Button>
          <p className="min-w-0 flex-1 text-center text-sm font-semibold sm:min-w-36 sm:text-base">
            {format(month, "MMMM yyyy")}
          </p>
          <Button
            variant="outline"
            size="iconSm"
            aria-label="Next month"
            onClick={() => moveMonth(1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-success/20 bg-success-soft p-3 sm:p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-success-ink">
            Paid this month
          </p>
          <p className="figure mt-1 text-lg font-bold text-success-ink sm:text-xl">
            {paidTotal ? formatAmount(paidTotal) : "—"}
          </p>
          <p className="mt-0.5 text-xs text-success-ink/80">
            {paidEvents.length} {paidEvents.length === 1 ? "payment" : "payments"}
          </p>
        </div>
        <div className="rounded-xl border border-warning/25 bg-warning-soft p-3 sm:p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-warning-ink">
            Due this month
          </p>
          <p className="figure mt-1 text-lg font-bold text-warning-ink sm:text-xl">
            {dueTotal ? formatAmount(dueTotal) : "—"}
          </p>
          <p className="mt-0.5 text-xs text-warning-ink/80">
            {dueEvents.length} {dueEvents.length === 1 ? "rent due" : "rents due"}
          </p>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
        <div className="surface min-w-0 overflow-hidden p-2.5 sm:p-5">
          <div className="grid grid-cols-7 border-b border-border">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) => (
              <span
                key={weekday}
                className="py-2 text-center text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs"
              >
                <span className="sm:hidden">{weekday.slice(0, 2)}</span>
                <span className="hidden sm:inline">{weekday}</span>
              </span>
            ))}
            {days.map((day) => {
              const dayEvents = events.filter((event) => isSameDay(event.date, day));
              const active = isSameDay(day, selected);
              return (
                <button
                  key={day.toISOString()}
                  aria-pressed={active}
                  aria-label={`${format(day, "EEEE, d MMMM")}${dayEvents.length ? `, ${dayEvents.map((event) => event.title).join(", ")}` : ""}`}
                  onClick={() => setSelected(day)}
                  className={cn(
                    "mx-0.5 my-1 flex min-h-12 min-w-0 flex-col items-center justify-start gap-1 rounded-lg px-0.5 py-1.5 text-xs transition-colors sm:min-h-20 sm:gap-1.5 sm:p-2 sm:text-sm",
                    active
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "hover:bg-secondary focus-visible:bg-secondary",
                    !isSameMonth(day, month) && !active && "text-muted-foreground/45",
                  )}
                >
                  <span
                    className={cn(
                      "figure grid size-6 place-items-center rounded-full sm:size-7",
                      active && "bg-primary-deep/30",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <span className="flex h-1.5 max-w-full items-center justify-center gap-0.5 sm:gap-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <span
                        key={event.id}
                        className={cn(
                          "size-1 rounded-full sm:size-1.5",
                          active ? "bg-primary-foreground" : kindStyle[event.kind],
                        )}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 border-t border-border pt-3 text-[0.6875rem] text-muted-foreground sm:mt-4 sm:gap-x-4 sm:pt-4 sm:text-xs">
            {[
              ["rent", "Rent due"],
              ["payment", "Payment"],
              ["complaint", "Complaint"],
              ["lease", "Lease"],
            ].map(([kind, label]) => (
              <span key={kind} className="flex items-center gap-1.5">
                <span
                  className={cn("size-2 rounded-full", kindStyle[kind as CalendarEvent["kind"]])}
                />
                {label}
              </span>
            ))}
          </div>
        </div>

        <aside className="surface min-w-0 p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDays className="size-5 text-primary" aria-hidden />
            <h2 className="min-w-0 font-bold">{format(selected, "EEEE, d MMMM")}</h2>
          </div>
          {selectedEvents.length ? (
            <ul className="mt-4 space-y-3">
              {selectedEvents.map((event) => (
                <li key={event.id} className="flex gap-3 rounded-lg bg-secondary/70 p-3">
                  <span
                    className={cn("mt-1 size-2.5 shrink-0 rounded-full", kindStyle[event.kind])}
                  />
                  <div className="min-w-0">
                    <p className="break-words font-semibold">{event.title}</p>
                    <p className="mt-0.5 break-words text-sm text-muted-foreground">
                      {event.detail}
                    </p>
                    {event.coverage && (
                      <p className="mt-1 text-xs font-medium text-primary-deep">{event.coverage}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-input px-4 py-8 text-center">
              <p className="font-semibold">Nothing scheduled</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose another date to see its events.
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function formatAmount(amount: number) {
  return `UGX ${new Intl.NumberFormat("en-UG", { notation: "compact", maximumFractionDigits: 1 }).format(amount)}`;
}

function selectCalendarDate(events: CalendarEvent[], month: Date) {
  const monthEvents = events
    .filter((event) => isSameMonth(event.date, month))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const anchor = new Date(2026, 10, 16);
  const upcoming = monthEvents.find((event) => event.date >= anchor);
  return (upcoming ?? monthEvents[0])?.date ?? month;
}
