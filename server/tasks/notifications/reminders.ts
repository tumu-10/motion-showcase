import { defineTask } from "nitro/task";
import { runReminderJob } from "../../../src/lib/notifications";
import { initialRentDemoState } from "../../../src/lib/rent-demo";
import type { TenantNotification } from "../../../src/lib/sample-data";

let scheduledDemoNotifications: TenantNotification[] = [];

export default defineTask({
  meta: {
    name: "notifications:reminders",
    description: "Run the daily reminder job against mock portfolio data.",
  },
  run({ payload }) {
    const scheduledTime =
      typeof payload["scheduledTime"] === "number" ? payload["scheduledTime"] : Date.now();
    const result = runReminderJob(new Date(scheduledTime), {
      ...initialRentDemoState,
      notifications: [...scheduledDemoNotifications, ...initialRentDemoState.notifications],
    });
    scheduledDemoNotifications = [...result.created, ...scheduledDemoNotifications];
    console.info("Mock reminder job completed.", {
      created: result.created.length,
      duplicatesSkipped: result.duplicatesSkipped,
      scheduledTime: new Date(scheduledTime).toISOString(),
    });
    return {
      result: {
        created: result.created.length,
        duplicatesSkipped: result.duplicatesSkipped,
        message: "Demo-only run; no SMS or WhatsApp messages were sent.",
      },
    };
  },
});
