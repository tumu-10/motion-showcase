import type { DataSource } from "./data-source";

export const apiDataSource: DataSource = new Proxy({} as DataSource, {
  get() {
    throw new Error("Not connected yet");
  },
});
