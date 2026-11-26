export type CheckoutMethod = "visa" | "mastercard" | "bank";

export function isCheckoutConfigured(method: CheckoutMethod) {
  const endpoint =
    method === "bank"
      ? import.meta.env["VITE_BANK_CHECKOUT_URL"]
      : import.meta.env["VITE_CARD_CHECKOUT_URL"];
  return Boolean(endpoint?.trim());
}

export function createCheckout(invoiceId: string, method: CheckoutMethod) {
  const cleanInvoiceId = invoiceId.trim();
  if (!cleanInvoiceId) throw new Error("An invoice is required before starting checkout.");

  const endpoint = (
    method === "bank"
      ? import.meta.env["VITE_BANK_CHECKOUT_URL"]
      : import.meta.env["VITE_CARD_CHECKOUT_URL"]
  )?.trim();
  if (!endpoint)
    throw new Error(`${method === "bank" ? "Bank" : "Card"} checkout is not configured.`);

  const url = new URL(endpoint);
  if (url.protocol !== "https:") {
    throw new Error("Hosted checkout must use a secure HTTPS URL.");
  }
  url.searchParams.set("invoice_id", cleanInvoiceId);
  url.searchParams.set("method", method);
  return url.toString();
}
