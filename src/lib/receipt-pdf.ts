import fontkit from "@pdf-lib/fontkit";
import { degrees, PDFDocument, rgb, type PDFFont, type PDFImage, type RGB } from "pdf-lib";
import QRCode from "qrcode";
import { formatUGX } from "@/lib/rent";
import type { ReceiptBranding, ReceiptBundle } from "@/lib/receipt-branding";
import { efrisStatusLabel } from "@/lib/receipt-branding";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

const smallNumbers = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const scales = ["", "thousand", "million", "billion", "trillion"];

export function amountInWords(amount: number) {
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 999_999_999_999_999) {
    throw new RangeError("Receipt amounts must be whole UGX values within the supported range.");
  }
  if (amount === 0) return "Zero Ugandan shillings only";
  const parts: string[] = [];
  let remainder = amount;
  let group = 0;
  while (remainder > 0) {
    const chunk = remainder % 1000;
    if (chunk) parts.unshift(`${underThousand(chunk)}${scales[group] ? ` ${scales[group]}` : ""}`);
    remainder = Math.floor(remainder / 1000);
    group += 1;
  }
  return `${parts.join(" ")} Ugandan shillings only`;
}

export async function buildReceiptPdf({ receipt, branding }: ReceiptBundle): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.setTitle(`${receipt.content.kind} receipt ${receipt.receiptNumber}`);
  document.setAuthor(branding.landlordName);
  document.setSubject(`Payment reference ${receipt.content.reference}`);

  const { body, display } = await embedReceiptFonts(document);
  const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const accent = parseBrandColor(branding.brandColor);
  const ink = rgb(0.08, 0.16, 0.17);
  const muted = rgb(0.36, 0.43, 0.44);
  const pale = rgb(0.95, 0.97, 0.96);
  const logo = await embedReceiptLogo(document, branding);

  const logoSize = fitPdfImage(logo, 180, 52);
  page.drawImage(logo, {
    x: 42,
    y: PAGE_HEIGHT - 92,
    width: logoSize.width,
    height: logoSize.height,
  });

  const verificationUrl = `${window.location.origin}/verify?ref=${encodeURIComponent(receipt.receiptNumber)}`;
  const hasMockFiscalQr = receipt.efris.status === "issued" && !!receipt.efris.qrPayload;
  const qrDataUrl = await QRCode.toDataURL(
    hasMockFiscalQr ? (receipt.efris.qrPayload ?? verificationUrl) : verificationUrl,
    {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 180,
    color: { dark: branding.brandColor, light: "#ffffff" },
    },
  );
  const qr = await document.embedPng(dataUrlBytes(qrDataUrl));
  const qrSize = 68;
  page.drawImage(qr, {
    x: PAGE_WIDTH - 42 - qrSize,
    y: PAGE_HEIGHT - 112,
    width: qrSize,
    height: qrSize,
  });

  page.drawText("RECEIPT NO.", {
    x: 360,
    y: PAGE_HEIGHT - 126,
    size: 7,
    font: body,
    color: muted,
  });
  page.drawText(receipt.receiptNumber, {
    x: 360,
    y: PAGE_HEIGHT - 141,
    size: 9,
    font: body,
    color: ink,
  });
  page.drawText(hasMockFiscalQr ? "MOCK EFRIS QR · DEMO" : "SCAN TO VERIFY", {
    x: PAGE_WIDTH - 42 - qrSize,
    y: PAGE_HEIGHT - 121,
    size: 6,
    font: body,
    color: muted,
  });
  const issuedAt = new Date(receipt.content.issuedAt).toLocaleString("en-UG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  page.drawText(issuedAt, {
    x: 360,
    y: PAGE_HEIGHT - 157,
    size: 8,
    font: body,
    color: muted,
  });

  const isDeposit = receipt.content.kind === "security-deposit";
  const title =
    receipt.content.kind === "refund"
      ? "Security deposit refund receipt"
      : isDeposit
        ? "Security Deposit Receipt (Refundable)"
        : "Rent payment receipt";
  const landlordLines = wrapPdfText(branding.landlordName, display, 10, 290);
  landlordLines.forEach((line, index) => {
    page.drawText(line, {
      x: 42,
      y: PAGE_HEIGHT - 108 - index * 12,
      size: 10,
      font: display,
      color: accent,
    });
  });
  page.drawText(branding.landlordAddress || "Address not provided", {
    x: 42,
    y: PAGE_HEIGHT - 122 - landlordLines.length * 12,
    size: 8,
    font: body,
    color: muted,
  });
  page.drawText(`TIN: ${branding.landlordTin || "Not provided"}`, {
    x: 42,
    y: PAGE_HEIGHT - 136 - landlordLines.length * 12,
    size: 8,
    font: body,
    color: muted,
  });

  const titleY = PAGE_HEIGHT - 205 - landlordLines.length * 12;
  page.drawText(title, { x: 42, y: titleY, size: 21, font: display, color: accent });
  page.drawLine({
    start: { x: 42, y: titleY - 17 },
    end: { x: PAGE_WIDTH - 42, y: titleY - 17 },
    thickness: 1.2,
    color: accent,
  });

  const rowX = 42;
  const rowRight = PAGE_WIDTH - 42;
  const labelX = rowX + 16;
  const valueX = 218;
  const rowWidth = rowRight - valueX - 16;
  let y = titleY - 29;
  const rows: [string, string][] = [
    ["Tenant", receipt.content.tenant],
    ["Property", receipt.content.property],
    ["Unit", receipt.content.unit],
    ...(isDeposit
      ? [["Deposit type", receipt.content.depositLabel ?? "Security deposit"] as [string, string]]
      : [
          ["Period covered", receipt.content.periodCovered] as [string, string],
          ...(receipt.content.coveredUntil
            ? [["Covered until", receipt.content.coveredUntil] as [string, string]]
            : []),
        ]),
    ["Amount", formatUGX(receipt.content.amount)],
    ["Amount in words", amountInWords(receipt.content.amount)],
    ["Payment method", receipt.content.method],
    ["Payment reference", receipt.content.reference],
    ["Balance after payment", formatUGX(receipt.content.balanceAfter)],
    ...(receipt.content.notes ? [["Notes", receipt.content.notes] as [string, string]] : []),
    ["EFRIS document type", receipt.efris.documentType],
    ["EFRIS status", efrisStatusLabel(receipt.efris.status)],
    ...(receipt.efris.fiscalDocumentNumber
      ? [["Mock fiscal document no.", receipt.efris.fiscalDocumentNumber] as [string, string]]
      : []),
    ...(receipt.efris.accountantNote
      ? [["EFRIS note", receipt.efris.accountantNote] as [string, string]]
      : []),
  ];

  for (const [label, value] of rows) {
    const lines = wrapPdfText(value, body, 9, rowWidth);
    const rowHeight = Math.max(29, lines.length * 12 + 14);
    const rowBottom = y - rowHeight;
    page.drawRectangle({
      x: rowX,
      y: rowBottom,
      width: rowRight - rowX,
      height: rowHeight,
      color: pale,
      borderColor: rgb(0.88, 0.91, 0.9),
      borderWidth: 0.5,
    });
    const textY = y - (rowHeight - lines.length * 12) / 2 - 9;
    page.drawText(label, { x: labelX, y: textY, size: 8, font: body, color: muted });
    lines.forEach((line, index) => {
      page.drawText(line, {
        x: valueX,
        y: textY - index * 12,
        size: 9,
        font: body,
        color: ink,
      });
    });
    y = rowBottom;
  }

  if (branding.watermarkEnabled) {
    const watermarkSize = fitPdfImage(logo, 350, 130);
    page.drawImage(logo, {
      x: (PAGE_WIDTH - watermarkSize.width) / 2 + 55,
      y: 310,
      width: watermarkSize.width,
      height: watermarkSize.height,
      rotate: degrees(-28),
      opacity: 0.06,
    });
  }

  if (receipt.status === "Cancelled") {
    page.drawText("CANCELLED", {
      x: 220,
      y: 396,
      size: 30,
      font: display,
      color: rgb(0.7, 0.13, 0.13),
      rotate: degrees(-18),
      opacity: 0.62,
    });
  }
  page.drawText(
    receipt.efris.status === "issued"
      ? "Mock EFRIS status · Nothing was submitted to URA"
      : "Computer-generated receipt · EFRIS not submitted",
    {
    x: 42,
    y: 39,
    size: 8,
    font: body,
    color: muted,
    },
  );
  page.drawText("Powered by Propatiz", {
    x: PAGE_WIDTH - 42 - body.widthOfTextAtSize("Powered by Propatiz", 8),
    y: 39,
    size: 8,
    font: body,
    color: accent,
  });
  return document.save();
}

export async function embedReceiptFonts(document: PDFDocument) {
  document.registerFontkit(fontkit);
  const [bodyFontBytes, displayFontBytes] = await Promise.all([
    fetchReceiptFont("/fonts/Inter-Variable.ttf"),
    fetchReceiptFont("/fonts/Fraunces-Variable.ttf"),
  ]);
  // Acrobat cannot reliably extract the subsetted forms of these variable fonts.
  const [body, display] = await Promise.all([
    document.embedFont(bodyFontBytes, { subset: false }),
    document.embedFont(displayFontBytes, { subset: false }),
  ]);
  return { body, display };
}

export async function fetchReceiptFont(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load the self-hosted receipt font: ${path}`);
  return response.arrayBuffer();
}

export async function embedReceiptLogo(pdf: PDFDocument, branding: ReceiptBranding) {
  const response =
    branding.logoChoice === "custom" && branding.customLogoDataUrl
      ? await fetch(branding.customLogoDataUrl)
      : await fetch("/propatiz-logo-transparent-dark-text.svg");
  if (!response.ok) throw new Error("Could not load the selected receipt logo.");
  const blob = await response.blob();
  const image = new Image();
  const objectUrl = URL.createObjectURL(blob);
  try {
    image.src = objectUrl;
    await image.decode();
    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot prepare the receipt logo.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Uint8Array>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (!result) {
          reject(new Error("Could not prepare the receipt logo image."));
          return;
        }
        result.arrayBuffer().then((bytes) => resolve(new Uint8Array(bytes)), reject);
      }, "image/png");
    });
    return pdf.embedPng(png);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function fitPdfImage(image: PDFImage, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  return { width: image.width * scale, height: image.height * scale };
}

export function parseBrandColor(value: string): RGB {
  if (!/^#[\da-f]{6}$/i.test(value)) {
    throw new TypeError("Receipt brand colour must be a six-digit hex value.");
  }
  return rgb(
    Number.parseInt(value.slice(1, 3), 16) / 255,
    Number.parseInt(value.slice(3, 5), 16) / 255,
    Number.parseInt(value.slice(5, 7), 16) / 255,
  );
}

function dataUrlBytes(dataUrl: string) {
  const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function wrapPdfText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const chunks = splitWord(word, font, size, maxWidth);
    for (const chunk of chunks) {
      const candidate = line ? `${line} ${chunk}` : chunk;
      if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(line);
        line = chunk;
      } else {
        line = candidate;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

function splitWord(word: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(word, size) <= maxWidth) return [word];
  const chunks: string[] = [];
  let chunk = "";
  for (const character of word) {
    const candidate = chunk + character;
    if (chunk && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      chunks.push(chunk);
      chunk = character;
    } else {
      chunk = candidate;
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

function underThousand(value: number): string {
  const words: string[] = [];
  if (value >= 100) {
    words.push(smallNumbers[Math.floor(value / 100)]!, "hundred");
    value %= 100;
  }
  if (value >= 20) {
    words.push(tens[Math.floor(value / 10)]!);
    if (value % 10) words.push(smallNumbers[value % 10]!);
  } else if (value > 0) {
    words.push(smallNumbers[value]!);
  }
  return words.join(" ");
}
