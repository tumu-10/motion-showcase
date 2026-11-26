import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import type { ReceiptBranding } from "@/lib/receipt-branding";
import {
  embedReceiptFonts,
  embedReceiptLogo,
  fitPdfImage,
  parseBrandColor,
  wrapPdfText,
} from "@/lib/receipt-pdf";
import { formatUGX } from "@/lib/rent";
import { SMALL_CLAIMS_LIMIT_UGX } from "@/lib/legal";
import type { NoticeKind, TenantNotice } from "@/lib/tenant-demo";

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 42;
const ink = rgb(0.08, 0.16, 0.17);
const muted = rgb(0.36, 0.43, 0.44);
const pale = rgb(0.95, 0.97, 0.96);

const noticeTitles: Record<NoticeKind, string> = {
  "friendly-reminder": "Friendly rent reminder",
  "formal-rent-demand": "Formal rent demand",
  "notice-of-default": "Notice of default",
  "notice-to-vacate": "Notice to vacate",
  "rent-increase": "Rent-increase notice",
  "end-of-tenancy": "End-of-tenancy notice",
  repair: "Repair notice",
};

const lawfulSteps = [
  "Serve the notice first and allow the full notice period to expire.",
  "Do not use force, lock anyone out, or seize belongings.",
  "If the tenant stays after the notice, a court order is required. Do not remove a tenant yourself.",
  `Use court for arrears; small claims may apply up to ${formatUGX(SMALL_CLAIMS_LIMIT_UGX)}.`,
];

export async function buildNoticePdf(notice: TenantNotice, branding: ReceiptBranding) {
  const document = await PDFDocument.create();
  document.setTitle(`${noticeTitles[notice.kind]} - ${notice.unit}`);
  document.setAuthor(branding.landlordName);
  document.setSubject(`${notice.property} · Unit ${notice.unit}`);

  const { body, display } = await embedReceiptFonts(document);
  const logo = await embedReceiptLogo(document, branding);
  const accent = parseBrandColor(branding.brandColor);
  const pages: PDFPage[] = [];

  function addPage() {
    const page = document.addPage([pageWidth, pageHeight]);
    pages.push(page);
    const logoSize = fitPdfImage(logo, 135, 42);
    page.drawImage(logo, {
      x: margin,
      y: pageHeight - 69 - logoSize.height,
      width: logoSize.width,
      height: logoSize.height,
    });
    page.drawText(noticeTitles[notice.kind], {
      x: 208,
      y: pageHeight - 49,
      size: 13,
      font: display,
      color: accent,
    });
    page.drawText(`${notice.property} · Unit ${notice.unit}`, {
      x: 208,
      y: pageHeight - 69,
      size: 8,
      font: body,
      color: muted,
    });
    page.drawLine({
      start: { x: margin, y: pageHeight - 100 },
      end: { x: pageWidth - margin, y: pageHeight - 100 },
      thickness: 1.2,
      color: accent,
    });
    const watermark = fitPdfImage(logo, 300, 115);
    page.drawImage(logo, {
      x: (pageWidth - watermark.width) / 2,
      y: (pageHeight - watermark.height) / 2,
      width: watermark.width,
      height: watermark.height,
      opacity: 0.045,
    });
    return page;
  }

  let page = addPage();
  let y = pageHeight - 126;
  const fields: [string, string][] = [
    ["Tenant", notice.tenant],
    ["Property and unit", `${notice.property} · ${notice.unit}`],
    ["Notice date", notice.issuedOn],
    ...(notice.issuedBy ? [["Prepared by", notice.issuedBy] as [string, string]] : []),
    ...(notice.effectiveDate
      ? [["Effective / move-out date", notice.effectiveDate] as [string, string]]
      : []),
    ["Tenant phone", notice.phone],
    ...(notice.email ? [["Tenant email", notice.email] as [string, string]] : []),
    ...(notice.reason ? [["Reason", notice.reason] as [string, string]] : []),
    ...(notice.rentIncreasePct !== undefined
      ? [
          ["Annual increase", `${notice.rentIncreasePct}%`] as [string, string],
          ["Current rent", formatUGX(notice.oldRent ?? 0)] as [string, string],
          ["New monthly rent", formatUGX(notice.newRent ?? 0)] as [string, string],
        ]
      : []),
  ];

  page.drawText("Notice details", { x: margin, y, size: 12, font: display, color: accent });
  y -= 18;
  for (const [label, value] of fields) {
    const lines = wrapPdfText(value, body, 9, 320);
    const height = Math.max(24, lines.length * 11 + 8);
    if (y - height < 62) {
      page = addPage();
      y = pageHeight - 124;
    }
    page.drawRectangle({
      x: margin,
      y: y - height,
      width: pageWidth - margin * 2,
      height,
      color: pale,
      borderColor: rgb(0.88, 0.91, 0.9),
      borderWidth: 0.4,
    });
    page.drawText(label, { x: margin + 10, y: y - 15, size: 8, font: body, color: muted });
    lines.forEach((line, index) =>
      page.drawText(line, {
        x: 210,
        y: y - 15 - index * 11,
        size: 9,
        font: body,
        color: ink,
      }),
    );
    y -= height + 3;
  }

  if (notice.details?.trim()) {
    y = drawHeading(page, "Message", y - 8, display, accent);
    y = drawParagraph(page, notice.details, body, y, ink, () => {
      page = addPage();
      return page;
    });
  }

  if (notice.service) {
    if (y < 122) {
      page = addPage();
      y = pageHeight - 124;
    }
    y = drawHeading(page, "Proof of service", y - 8, display, accent);
    const serviceText = [
      `Method: ${notice.service.method}`,
      `Date and time: ${notice.service.servedAt}`,
      `Received by: ${notice.service.receivedBy}`,
      ...(notice.service.lc1Witness ? [`LC1 witness: ${notice.service.lc1Witness}`] : []),
    ];
    for (const line of serviceText) {
      y = drawParagraph(page, line, body, y, ink, () => {
        page = addPage();
        return page;
      });
    }
  }

  if (notice.arrearsStatement) {
    if (y < 150) {
      page = addPage();
      y = pageHeight - 124;
    }
    y = drawHeading(page, "Arrears statement", y - 8, display, accent);
    y = drawParagraph(
      page,
      `As of ${notice.arrearsStatement.asOf}. Rent arrears: ${formatUGX(notice.arrearsStatement.total)}.`,
      body,
      y,
      ink,
      () => {
        page = addPage();
        return page;
      },
    );
    if (notice.arrearsStatement.rows.length) {
      const columns = ["Rent period", "Rent due", "Paid", "Balance"];
      const widths = [120, 115, 115, 120];
      page.drawRectangle({
        x: margin,
        y: y - 22,
        width: pageWidth - margin * 2,
        height: 22,
        color: accent,
      });
      let x = margin;
      columns.forEach((label, index) => {
        page.drawText(label, {
          x: x + 5,
          y: y - 14,
          size: 7,
          font: body,
          color: rgb(1, 1, 1),
        });
        x += widths[index] ?? 0;
      });
      y -= 22;
      for (const row of notice.arrearsStatement.rows) {
        if (y < 70) {
          page = addPage();
          y = pageHeight - 124;
        }
        page.drawRectangle({
          x: margin,
          y: y - 22,
          width: pageWidth - margin * 2,
          height: 22,
          color: pale,
          borderColor: rgb(0.88, 0.91, 0.9),
          borderWidth: 0.35,
        });
        const values = [
          row.period,
          formatUGX(row.rentDue),
          formatUGX(row.paid),
          formatUGX(row.balance),
        ];
        x = margin;
        values.forEach((value, index) => {
          page.drawText(value, {
            x: x + 5,
            y: y - 14,
            size: 7,
            font: body,
            color: ink,
          });
          x += widths[index] ?? 0;
        });
        y -= 22;
      }
    }
  }

  if (notice.kind === "notice-to-vacate") {
    if (y < 200) {
      page = addPage();
      y = pageHeight - 124;
    }
    y = drawHeading(page, "Lawful next steps", y - 12, display, accent);
    for (const step of lawfulSteps) {
      y = drawParagraph(page, `• ${step}`, body, y, ink, () => {
        page = addPage();
        return page;
      });
    }
    page.drawRectangle({
      x: margin,
      y: y - 48,
      width: pageWidth - margin * 2,
      height: 42,
      color: pale,
    });
    drawParagraph(
      page,
      "This is a notice, not an eviction order. Have an advocate review before serving.",
      body,
      y - 15,
      ink,
      () => page,
    );
  }

  for (const attachment of notice.attachments) {
    if (attachment.mimeType === "application/pdf") {
      const attachedDocument = await PDFDocument.load(dataUrlBytes(attachment.dataUrl));
      const attachedPages = await document.copyPages(
        attachedDocument,
        attachedDocument.getPageIndices(),
      );
      pages.push(...attachedPages);
      attachedPages.forEach((attachedPage) => document.addPage(attachedPage));
      continue;
    }
    const page = addPage();
    const bytes = dataUrlBytes(attachment.dataUrl);
    const image =
      attachment.mimeType === "image/png"
        ? await document.embedPng(bytes)
        : await document.embedJpg(bytes);
    page.drawText(`Attachment: ${attachment.name}`, {
      x: margin,
      y: pageHeight - 124,
      size: 9,
      font: body,
      color: muted,
    });
    const size = fitPdfImage(image, pageWidth - margin * 2, pageHeight - 190);
    page.drawImage(image, {
      x: (pageWidth - size.width) / 2,
      y: (pageHeight - size.height - 155) / 2,
      width: size.width,
      height: size.height,
    });
  }

  pages.forEach((item, index) => {
    item.drawLine({
      start: { x: margin, y: 48 },
      end: { x: pageWidth - margin, y: 48 },
      thickness: 0.5,
      color: rgb(0.88, 0.91, 0.9),
    });
    item.drawText(branding.landlordName, {
      x: margin,
      y: 32,
      size: 7,
      font: body,
      color: muted,
    });
    const pageNumber = `Page ${index + 1} of ${pages.length}`;
    item.drawText(pageNumber, {
      x: pageWidth - margin - body.widthOfTextAtSize(pageNumber, 7),
      y: 32,
      size: 7,
      font: body,
      color: muted,
    });
  });
  return document.save();
}

function drawHeading(
  page: PDFPage,
  text: string,
  y: number,
  font: Awaited<ReturnType<typeof embedReceiptFonts>>["display"],
  accent: ReturnType<typeof rgb>,
) {
  page.drawText(text, { x: margin, y, size: 11, font, color: accent });
  return y - 17;
}

function drawParagraph(
  page: PDFPage,
  text: string,
  font: Awaited<ReturnType<typeof embedReceiptFonts>>["body"],
  y: number,
  color: ReturnType<typeof rgb>,
  nextPage: () => PDFPage,
) {
  let currentPage = page;
  const lines = wrapPdfText(text, font, 8, pageWidth - margin * 2);
  for (const line of lines) {
    if (y < 62) {
      currentPage = nextPage();
      y = pageHeight - 124;
    }
    currentPage.drawText(line, { x: margin, y, size: 8, font, color });
    y -= 11;
  }
  return y - 4;
}

function dataUrlBytes(dataUrl: string) {
  const separator = dataUrl.indexOf(",");
  if (separator < 0) throw new Error("An attachment has an invalid data URL.");
  const binary = atob(dataUrl.slice(separator + 1));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
