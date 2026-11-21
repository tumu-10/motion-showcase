import { defineNitroConfig } from "nitro/config";

export default defineNitroConfig({
  serverDir: "./server",
  experimental: { tasks: true },
  scheduledTasks: {
    "0 5 * * *": ["notifications:reminders"],
  },
});
