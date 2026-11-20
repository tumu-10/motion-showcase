export type ReceiptBranding = {
  versionId: string;
  landlordName: string;
  landlordAddress: string;
  landlordTin: string;
  logoChoice: "propatiz" | "custom";
  customLogoDataUrl: string | null;
  brandColor: string;
  watermarkEnabled: boolean;
};

export const defaultReceiptBranding: ReceiptBranding = {
  versionId: "propatiz-default",
  landlordName: "Kololo Heights Management",
  landlordAddress: "Kololo, Kampala, Uganda",
  landlordTin: "",
  logoChoice: "propatiz",
  customLogoDataUrl: null,
  brandColor: "#103b43",
  watermarkEnabled: true,
};

const archiveKey = "propatiz-demo-receipt-archive";

export type ReceiptKind = "rent" | "security-deposit" | "refund";

export type ReceiptContent = {
  kind: ReceiptKind;
  issuedAt: string;
  tenant: string;
  property: string;
  unit: string;
  periodCovered: string;
  coveredUntil: string | null;
  amount: number;
  method: string;
  reference: string;
  balanceAfter: number;
  efrisStatus: string;
  depositLabel?: string;
  notes?: string;
};

export type ReceiptRecord = {
  receiptNumber: string;
  status: "Valid" | "Cancelled";
  replacementReceiptNumber: string | null;
  cancellationReason: string | null;
  brandingVersionId: string;
  content: ReceiptContent;
};

export type ReceiptArchive = {
  currentBranding: ReceiptBranding;
  brandings: Record<string, ReceiptBranding>;
  receipts: ReceiptRecord[];
};

export type ReceiptBundle = {
  receipt: ReceiptRecord;
  branding: ReceiptBranding;
};

function readArchive(): ReceiptArchive {
  const saved = localStorage.getItem(archiveKey);
  if (!saved) {
    return {
      currentBranding: defaultReceiptBranding,
      brandings: { [defaultReceiptBranding.versionId]: defaultReceiptBranding },
      receipts: [],
    };
  }
  const parsed: unknown = JSON.parse(saved);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("receipts" in parsed) ||
    !Array.isArray(parsed.receipts) ||
    !("brandings" in parsed) ||
    typeof parsed.brandings !== "object" ||
    parsed.brandings === null ||
    !("currentBranding" in parsed)
  ) {
    throw new Error("Saved receipt archive has an invalid shape.");
  }
  return parsed as ReceiptArchive;
}

function writeArchive(archive: ReceiptArchive) {
  localStorage.setItem(archiveKey, JSON.stringify(archive));
}

export function getReceiptBranding() {
  return readArchive().currentBranding;
}

export function saveReceiptBranding(branding: Omit<ReceiptBranding, "versionId">): ReceiptBranding {
  const archive = readArchive();
  const saved: ReceiptBranding = {
    ...branding,
    versionId: `brand-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
  };
  archive.currentBranding = saved;
  archive.brandings[saved.versionId] = saved;
  writeArchive(archive);
  return saved;
}

export function issueReceipt(content: ReceiptContent): ReceiptBundle {
  const archive = readArchive();
  const existing = archive.receipts.find(
    (receipt) =>
      receipt.status === "Valid" &&
      receipt.content.reference === content.reference &&
      receipt.content.kind === content.kind,
  );
  if (existing) {
    const branding = archive.brandings[existing.brandingVersionId];
    if (!branding) throw new Error("The branding snapshot for this receipt is missing.");
    return { receipt: existing, branding };
  }
  const cancelled = archive.receipts.find(
    (receipt) =>
      receipt.status === "Cancelled" &&
      receipt.content.reference === content.reference &&
      receipt.content.kind === content.kind,
  );
  if (cancelled?.replacementReceiptNumber) {
    const replacement = archive.receipts.find(
      (receipt) => receipt.receiptNumber === cancelled.replacementReceiptNumber,
    );
    if (replacement) {
      const branding = archive.brandings[replacement.brandingVersionId];
      if (!branding) throw new Error("The branding snapshot for this receipt is missing.");
      return { receipt: replacement, branding };
    }
  }
  if (cancelled) throw new Error("This receipt was cancelled; it cannot be issued again.");

  const branding = archive.currentBranding;
  archive.brandings[branding.versionId] = branding;
  const receipt: ReceiptRecord = {
    receiptNumber: makeReceiptNumber(),
    status: "Valid",
    replacementReceiptNumber: null,
    cancellationReason: null,
    brandingVersionId: branding.versionId,
    content: structuredClone(content),
  };
  archive.receipts.unshift(receipt);
  writeArchive(archive);
  return { receipt, branding };
}

export function getReceiptBundle(receiptNumber: string): ReceiptBundle | null {
  const archive = readArchive();
  const receipt = archive.receipts.find((item) => item.receiptNumber === receiptNumber);
  if (!receipt) return null;
  const branding = archive.brandings[receipt.brandingVersionId];
  if (!branding) throw new Error("The branding snapshot for this receipt is missing.");
  return { receipt, branding };
}

export function findReceiptByReference(reference: string): ReceiptRecord | null {
  const archive = readArchive();
  return (
    archive.receipts.find((receipt) => receipt.receiptNumber === reference) ??
    archive.receipts.find((receipt) => receipt.content.reference === reference) ??
    null
  );
}

export function cancelAndReissueReceipt(receiptNumber: string, reason: string): ReceiptBundle {
  const archive = readArchive();
  const current = archive.receipts.find((receipt) => receipt.receiptNumber === receiptNumber);
  if (!current || current.status !== "Valid") {
    throw new Error("Only a valid receipt can be cancelled and reissued.");
  }
  const cleanReason = reason.trim();
  if (!cleanReason) throw new Error("Enter a reason for cancelling and reissuing this receipt.");

  const replacementNumber = makeReceiptNumber();
  const replacement: ReceiptRecord = {
    receiptNumber: replacementNumber,
    status: "Valid",
    replacementReceiptNumber: null,
    cancellationReason: null,
    brandingVersionId: current.brandingVersionId,
    content: {
      ...current.content,
      issuedAt: new Date().toISOString(),
    },
  };
  const cancelled: ReceiptRecord = {
    ...current,
    status: "Cancelled",
    replacementReceiptNumber: replacementNumber,
    cancellationReason: cleanReason,
  };
  archive.receipts = archive.receipts.map((receipt) =>
    receipt.receiptNumber === receiptNumber ? cancelled : receipt,
  );
  archive.receipts.unshift(replacement);
  writeArchive(archive);
  const branding = archive.brandings[replacement.brandingVersionId];
  if (!branding) throw new Error("The branding snapshot for this receipt is missing.");
  return { receipt: replacement, branding };
}

export async function resizeReceiptLogo(file: File): Promise<string> {
  if (file.size > 2 * 1024 * 1024) throw new Error("Choose a logo smaller than 2 MB.");
  if (!["image/png", "image/jpeg", "image/svg+xml"].includes(file.type)) {
    throw new Error("Upload a PNG, JPG, or SVG logo.");
  }

  let source: Blob = file;
  if (file.type === "image/svg+xml") {
    const svg = await file.text();
    if (
      /<script\b|<foreignObject\b|\bon[a-z]+\s*=|(?:href|src)\s*=\s*["']\s*(?:https?:|\/\/|javascript:)/i.test(
        svg,
      )
    ) {
      throw new Error("The SVG contains active or external content. Upload a static logo.");
    }
    source = new Blob([svg], { type: "image/svg+xml" });
  }

  const image = new Image();
  const objectUrl = URL.createObjectURL(source);
  try {
    image.src = objectUrl;
    await image.decode();
    const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot resize the logo image.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function makeReceiptNumber() {
  const date = new Date();
  const day = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate(),
  ).padStart(2, "0")}`;
  return `PTZ-R-${day}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}
