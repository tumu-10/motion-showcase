export type ProviderMethod = "mobile" | "bank" | "card";
export type ProviderStatus = "success" | "failed" | "pending";

export type ProviderRequest = {
  amount: number;
  reference: string;
  method: ProviderMethod;
  simulateFailure?: boolean;
};

export type ProviderResult = {
  status: ProviderStatus;
  reference: string;
  token?: string;
};

export interface PaymentProvider {
  process(request: ProviderRequest): Promise<ProviderResult>;
}

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export const mockPaymentProviders: Record<ProviderMethod, PaymentProvider> = {
  mobile: {
    async process(request) {
      await wait(350);
      return {
        status: request.simulateFailure ? "failed" : "success",
        reference: request.reference,
      };
    },
  },
  bank: {
    async process(request) {
      await wait(250);
      return { status: "pending", reference: request.reference };
    },
  },
  card: {
    async process(request) {
      await wait(350);
      if (request.simulateFailure) return { status: "failed", reference: request.reference };
      return {
        status: "success",
        reference: request.reference,
        token: `MOCK-${crypto.randomUUID().slice(0, 12).toUpperCase()}`,
      };
    },
  },
};
