import { toBlob } from "html-to-image";
import QRCode from "qrcode";
import { escapeHtml } from "@/lib/documents";
import { formatUGX } from "@/lib/rent";
import { amountInWords } from "@/lib/receipt-pdf";
import type { ReceiptBundle } from "@/lib/receipt-branding";

export async function createReceiptImage({ receipt, branding }: ReceiptBundle) {
  const logo =
    branding.logoChoice === "custom" && branding.customLogoDataUrl
      ? branding.customLogoDataUrl
      : "/propatiz-logo.svg";
  const verifyUrl = `${window.location.origin}/verify?ref=${encodeURIComponent(receipt.receiptNumber)}`;
  const qr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 180 });
  const rows: [string, string][] = [
    ["Tenant", receipt.content.tenant],
    ["Property", receipt.content.property],
    ["Unit", receipt.content.unit],
    ["Period covered", receipt.content.periodCovered],
    ...(receipt.content.coveredUntil
      ? [["Covered until", receipt.content.coveredUntil] as [string, string]]
      : []),
    ["Amount", formatUGX(receipt.content.amount)],
    ["Amount in words", amountInWords(receipt.content.amount)],
    ["Method", receipt.content.method],
    ["Reference", receipt.content.reference],
    ["Balance after payment", formatUGX(receipt.content.balanceAfter)],
    ...(receipt.content.notes ? [["Notes", receipt.content.notes] as [string, string]] : []),
    ["EFRIS", receipt.content.efrisStatus],
  ];
  const watermark = branding.watermarkEnabled
    ? `<img src="${escapeHtml(logo)}" alt="" style="position:absolute;width:420px;left:160px;top:380px;opacity:.06;transform:rotate(-25deg);">`
    : "";
  const receiptTitle =
    receipt.content.kind === "security-deposit"
      ? "Security Deposit Receipt (Refundable)"
      : receipt.content.kind === "refund"
        ? "Security deposit refund receipt"
        : "Rent payment receipt";
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;left:-10000px;top:0;width:800px;background:#fff;z-index:-1;";
  container.innerHTML = `
    <article style="position:relative;overflow:hidden;padding:44px 52px;color:#152d31;font-family:Inter,Arial,sans-serif;background:#fff;">
      ${watermark}
      <header style="position:relative;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid ${escapeHtml(branding.brandColor)};padding-bottom:22px;">
        <div style="width:290px;">
          <img src="${escapeHtml(logo)}" alt="Landlord logo" style="width:220px;height:68px;object-fit:contain;object-position:left center;">
          <p style="margin:14px 0 0;font-size:17px;font-weight:700;">${escapeHtml(branding.landlordName)}</p>
          <p style="margin:5px 0;font-size:13px;color:#647476;">${escapeHtml(branding.landlordAddress || "Address not provided")}</p>
          <p style="margin:5px 0;font-size:13px;color:#647476;">TIN: ${escapeHtml(branding.landlordTin || "Not provided")}</p>
        </div>
        <div style="text-align:right;">
          <img src="${escapeHtml(qr)}" alt="Verification QR code" style="width:96px;height:96px;">
          <p style="margin:8px 0 0;font-size:11px;color:#647476;">SCAN TO VERIFY</p>
          <p style="margin:8px 0 0;font-size:12px;font-weight:700;">${escapeHtml(receipt.receiptNumber)}</p>
          <p style="margin:4px 0;font-size:11px;color:#647476;">${escapeHtml(new Date(receipt.content.issuedAt).toLocaleString("en-UG"))}</p>
        </div>
      </header>
      <h1 style="position:relative;margin:28px 0 18px;font-family:Fraunces,Georgia,serif;font-size:30px;color:${escapeHtml(branding.brandColor)};">${escapeHtml(receiptTitle)}</h1>
      <section style="position:relative;border:1px solid #dfe7e5;border-radius:12px;overflow:hidden;">
        ${rows
          .map(
            ([label, value], index) => `
              <div style="display:grid;grid-template-columns:210px 1fr;gap:14px;padding:13px 18px;border-bottom:${index === rows.length - 1 ? "0" : "1px solid #e8eeee"};">
                <span style="font-size:13px;color:#647476;">${escapeHtml(label)}</span>
                <strong style="font-size:14px;line-height:1.45;">${escapeHtml(value)}</strong>
              </div>`,
          )
          .join("")}
      </section>
      <footer style="position:relative;display:flex;justify-content:space-between;margin-top:28px;padding-top:16px;border-top:1px solid #dfe7e5;font-size:12px;color:#647476;">
        <span>Computer-generated receipt</span>
        <strong style="color:${escapeHtml(branding.brandColor)};">Powered by Propatiz</strong>
      </footer>
    </article>`;
  document.body.appendChild(container);

  try {
    await document.fonts.ready;
    await Promise.all(Array.from(container.querySelectorAll("img")).map((image) => image.decode()));
    const receiptElement = container.firstElementChild;
    if (!(receiptElement instanceof HTMLElement))
      throw new Error("Could not prepare receipt content.");
    const blob = await toBlob(receiptElement, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
      skipFonts: true,
    });
    if (!blob) throw new Error("Could not render the receipt image.");
    return blob;
  } finally {
    container.remove();
  }
}
