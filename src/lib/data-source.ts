import { apiDataSource } from "./api-data-source";
import { isDemoMode } from "./demo-mode";
import type { RentDemoState } from "./rent-demo";
import type { Unit } from "./sample-data";
import type { DemoHomeServiceProvider } from "./home-services";
import type { ReceiptBranding } from "./receipt-branding";

type SampleData = typeof import("./sample-data");

export type DataSource = SampleData & {
  demoHomeServiceProviders: DemoHomeServiceProvider[];
  defaultReceiptBranding: ReceiptBranding;
  getInitialRentDemoState(units?: Unit[]): RentDemoState;
};

export { apiDataSource, isDemoMode };

export const dataSource: DataSource = isDemoMode
  ? (await import("./demo-data-source")).demoDataSource
  : apiDataSource;
