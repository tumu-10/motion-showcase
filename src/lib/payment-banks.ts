export const bankOptions = [
  { brand: "stanbic", name: "Stanbic Bank" },
  { brand: "hfb", name: "Housing Finance Bank" },
  { brand: "centenary", name: "Centenary Bank" },
  { brand: "equity", name: "Equity Bank" },
  { brand: "dtb", name: "DTB" },
  { brand: "dfcu", name: "dfcu Bank" },
] as const;

export type BankBrand = (typeof bankOptions)[number]["brand"];

export function getBankBrand(bankName?: string): BankBrand | undefined {
  const name = bankName?.trim().toLowerCase();
  if (!name) return undefined;
  const bank = bankOptions.find(
    (bank) => name === bank.name.toLowerCase() || name.includes(bank.name.toLowerCase()),
  );
  if (bank) return bank.brand;
  return name.includes("diamond trust") ? "dtb" : undefined;
}
