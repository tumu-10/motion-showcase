import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ReceiptBranding } from "@/lib/receipt-branding";
import {
  embedReceiptFonts,
  embedReceiptLogo,
  fitPdfImage,
  parseBrandColor,
  wrapPdfText,
} from "@/lib/receipt-pdf";
import type { ReportModel } from "@/lib/reports";

const margin = 42;
const footerY = 34;
const ink = rgb(0.08, 0.16, 0.17);
const muted = rgb(0.36, 0.43, 0.44);
const pale = rgb(0.95, 0.97, 0.96);
const warningFill = rgb(1, 0.89, 0.89);
const warningInk = rgb(0.72, 0.11, 0.11);

export async function buildReportPdf(model: ReportModel, branding: ReceiptBranding) {
  const document = await PDFDocument.create();
  document.setTitle(model.title);
  document.setAuthor(branding.landlordName);
  document.setSubject(`Property report · ${model.range}`);

  const { body, display } = await embedReceiptFonts(document);
  const logo = await embedReceiptLogo(document, branding);
  const accent = parseBrandColor(branding.brandColor);
  const isWide = model.headers.length >= 7;
  const pageWidth = isWide ? 841.89 : 595.28;
  const pageHeight = isWide ? 595.28 : 841.89;
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
    const titleLines = wrapPdfText(model.title, display, 14, pageWidth - 238);
    titleLines.slice(0, 2).forEach((line, index) => {
      page.drawText(line, {
        x: 208,
        y: pageHeight - 48 - index * 17,
        size: 14,
        font: display,
        color: accent,
      });
    });
    page.drawText(model.range, {
      x: 208,
      y: pageHeight - 84,
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
    if (branding.watermarkEnabled) {
      const watermark = fitPdfImage(logo, 300, 115);
      page.drawImage(logo, {
        x: (pageWidth - watermark.width) / 2,
        y: (pageHeight - watermark.height) / 2,
        width: watermark.width,
        height: watermark.height,
        opacity: 0.045,
      });
    }
    return page;
  }

  let page = addPage();
  let y = pageHeight - 124;
  const cardGap = 9;
  const cardWidth = (pageWidth - margin * 2 - cardGap * 2) / 3;
  model.metrics.forEach((metric, index) => {
    const x = margin + index * (cardWidth + cardGap);
    page.drawRectangle({
      x,
      y: y - 51,
      width: cardWidth,
      height: 51,
      color: pale,
      borderColor: rgb(0.88, 0.91, 0.9),
      borderWidth: 0.5,
    });
    page.drawText(metric.label, {
      x: x + 8,
      y: y - 15,
      size: 7,
      font: body,
      color: muted,
    });
    const value = wrapPdfText(metric.value, body, 10, cardWidth - 16)[0] ?? metric.value;
    page.drawText(value, {
      x: x + 8,
      y: y - 34,
      size: 10,
      font: body,
      color: ink,
    });
  });
  y -= 67;

  for (const sentence of model.summary) {
    y = drawParagraph(page, sentence, body, y, pageWidth - margin * 2, ink);
    y -= 3;
  }
  y -= 4;

  if (model.headers.length > 0) {
    page.drawText("Report details", {
      x: margin,
      y,
      size: 12,
      font: display,
      color: accent,
    });
    y -= 17;
    y = drawTableHeader(page, model.headers, body, accent, y, pageWidth);

    for (const row of model.rows) {
      const cells = model.headers.map((_, index) => row.cells[index] ?? "");
      const widths = columnWidths(model.headers.length, pageWidth);
      const wrapped = cells.map((cell, index) =>
        wrapPdfText(cell, body, 7, Math.max(26, widths[index]! - 8)),
      );
      const rowHeight = Math.max(22, ...wrapped.map((lines) => lines.length * 9 + 8));
      if (y - rowHeight < 62) {
        page = addPage();
        y = pageHeight - 118;
        y = drawTableHeader(page, model.headers, body, accent, y, pageWidth);
      }
      const fill = row.warning ? warningFill : pale;
      page.drawRectangle({
        x: margin,
        y: y - rowHeight,
        width: pageWidth - margin * 2,
        height: rowHeight,
        color: fill,
        borderColor: rgb(0.88, 0.91, 0.9),
        borderWidth: 0.35,
      });
      let x = margin;
      wrapped.forEach((lines, index) => {
        const textColor = row.warning ? warningInk : ink;
        lines.forEach((line, lineIndex) => {
          page.drawText(line, {
            x: x + 4,
            y: y - 12 - lineIndex * 9,
            size: 7,
            font: body,
            color: textColor,
          });
        });
        x += widths[index]!;
      });
      y -= rowHeight;
    }
  }

  if (y < 122) {
    page = addPage();
    y = pageHeight - 124;
  }
  y -= 12;
  page.drawText("Notes", { x: margin, y, size: 12, font: display, color: accent });
  y -= 18;
  for (const note of model.notes) {
    const lines = wrapPdfText(`- ${note}`, body, 8, pageWidth - margin * 2);
    const height = lines.length * 11 + 3;
    if (y - height < 58) {
      page = addPage();
      y = pageHeight - 124;
    }
    lines.forEach((line, index) => {
      page.drawText(line, {
        x: margin,
        y: y - index * 11,
        size: 8,
        font: body,
        color: muted,
      });
    });
    y -= height;
  }

  pages.forEach((item, index) =>
    drawFooter(item, body, accent, branding.landlordName, index + 1, pages.length, pageWidth),
  );
  return document.save();
}

function drawTableHeader(
  page: PDFPage,
  headers: string[],
  font: PDFFont,
  accent: ReturnType<typeof rgb>,
  y: number,
  pageWidth: number,
) {
  const widths = columnWidths(headers.length, pageWidth);
  const height = 22;
  page.drawRectangle({
    x: margin,
    y: y - height,
    width: pageWidth - margin * 2,
    height,
    color: accent,
  });
  let x = margin;
  headers.forEach((header, index) => {
    const text = wrapPdfText(header, font, 6, Math.max(26, widths[index]! - 8))[0] ?? header;
    page.drawText(text, {
      x: x + 4,
      y: y - 14,
      size: 6,
      font,
      color: rgb(1, 1, 1),
    });
    x += widths[index]!;
  });
  return y - height;
}

function columnWidths(columnCount: number, pageWidth: number) {
  const width = (pageWidth - margin * 2) / Math.max(1, columnCount);
  return Array.from({ length: columnCount }, () => width);
}

function drawParagraph(
  page: PDFPage,
  text: string,
  font: PDFFont,
  y: number,
  maxWidth: number,
  color: ReturnType<typeof rgb>,
) {
  const lines = wrapPdfText(text, font, 8, maxWidth);
  lines.forEach((line, index) => {
    page.drawText(line, { x: margin, y: y - index * 11, size: 8, font, color });
  });
  return y - lines.length * 11;
}

function drawFooter(
  page: PDFPage,
  font: PDFFont,
  accent: ReturnType<typeof rgb>,
  landlordName: string,
  pageNumber: number,
  pageCount: number,
  pageWidth: number,
) {
  page.drawLine({
    start: { x: margin, y: footerY + 13 },
    end: { x: pageWidth - margin, y: footerY + 13 },
    thickness: 0.6,
    color: rgb(0.86, 0.89, 0.88),
  });
  page.drawText(`${landlordName} · Property report`, {
    x: margin,
    y: footerY,
    size: 7,
    font,
    color: muted,
  });
  const pageLabel = `Page ${pageNumber} of ${pageCount}`;
  page.drawText(pageLabel, {
    x: pageWidth - margin - font.widthOfTextAtSize(pageLabel, 7),
    y: footerY,
    size: 7,
    font,
    color: accent,
  });
}
