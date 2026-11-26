export function getWhatsAppHref() {
  const configuredNumber = import.meta.env["VITE_WHATSAPP_NUMBER"]?.replace(/\D/g, "");
  const number = configuredNumber || "256774413516";
  return `https://wa.me/${number}`;
}
