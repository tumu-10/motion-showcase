import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import { amountInWords, embedReceiptFonts } from "./receipt-pdf";

describe("receipt amounts in words", () => {
  it("writes UGX amounts across thousands and millions", () => {
    expect(amountInWords(0)).toBe("Zero Ugandan shillings only");
    expect(amountInWords(1_234_567)).toBe(
      "one million two hundred thirty four thousand five hundred sixty seven Ugandan shillings only",
    );
  });

  it("rejects amounts that cannot be represented as whole UGX", () => {
    expect(() => amountInWords(-1)).toThrow(RangeError);
    expect(() => amountInWords(1.5)).toThrow(RangeError);
    expect(() => amountInWords(Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
  });
});

describe("PDF font embedding", () => {
  it("embeds full font programs and produces a parseable PDF", async () => {
    const [inter, fraunces] = await Promise.all([
      readFile(resolve(process.cwd(), "public", "fonts", "Inter-Variable.ttf")),
      readFile(resolve(process.cwd(), "public", "fonts", "Fraunces-Variable.ttf")),
    ]);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      return new Response(String(input).includes("Inter-") ? inter : fraunces);
    });

    try {
      const document = await PDFDocument.create();
      const { body, display } = await embedReceiptFonts(document);
      const page = document.addPage();
      page.drawText("UGX 1,200,000 — report · receipt", { x: 40, y: 740, size: 12, font: body });
      page.drawText("Propatiz", { x: 40, y: 710, size: 20, font: display });
      const embeddedPdf = await document.save({ useObjectStreams: false });

      expect(embeddedPdf.byteLength).toBeGreaterThan(inter.byteLength / 3);
      const parsedPdf = await PDFDocument.load(embeddedPdf);
      expect(parsedPdf.getPageCount()).toBe(1);
    } finally {
      fetchMock.mockRestore();
    }
  });
});
