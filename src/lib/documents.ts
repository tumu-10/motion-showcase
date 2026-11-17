export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

export function printPdf(title: string, rows: [string, string][], note?: string) {
  const popup = window.open("", "_blank", "width=720,height=850");
  if (!popup) throw new Error("Allow pop-ups to create a printable PDF.");
  const details = rows
    .map(
      ([label, value]) =>
        `<div class="row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`,
    )
    .join("");

  popup.document.write(`<!doctype html>
    <html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      body{font:15px/1.6 Arial,sans-serif;color:#213b30;margin:48px auto;max-width:680px;padding:0 28px}
      header{border-bottom:3px solid #244c3a;padding-bottom:20px;margin-bottom:26px}
      h1{font-size:27px;margin:0 0 6px}p{color:#5d6e63;margin:0}
      .row{display:flex;justify-content:space-between;gap:24px;padding:13px 0;border-bottom:1px solid #dfe7e1}
      .row span{color:#617067}.row strong{text-align:right}
      .note{margin-top:32px;padding:16px;background:#f3f6f2;border-radius:8px;white-space:pre-wrap}
      @media print{body{margin:0 auto;padding:24px}.note{break-inside:avoid}}
    </style></head><body>
    <header><h1>${escapeHtml(title)}</h1><p>Propatiz · Property records</p></header>
    <main>${details}${note ? `<p class="note">${escapeHtml(note)}</p>` : ""}</main>
    </body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
