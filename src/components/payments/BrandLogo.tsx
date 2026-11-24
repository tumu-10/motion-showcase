import mtn from "@/assets/pay/mtn-momo.jpg";
import airtel from "@/assets/pay/airtel.svg";
import visa from "@/assets/pay/visa.svg";
import mastercard from "@/assets/pay/mastercard.svg";
import stanbic from "@/assets/pay/stanbic.png";
import centenary from "@/assets/pay/Centenary_bank_logo.jpg";
import dtb from "@/assets/pay/Dtb.jpeg";
import dfcu from "@/assets/pay/dfcubank-logo.jpg";
import equity from "@/assets/pay/equity bank.png";
import hfb from "@/assets/pay/housing finance.png";
import type { BankBrand } from "@/lib/payment-banks";
import { cn } from "@/lib/utils";

export type PayBrand = "mtn" | "airtel" | "visa" | "mastercard" | BankBrand;

const src: Record<PayBrand, string> = {
  mtn,
  airtel,
  visa,
  mastercard,
  stanbic,
  hfb,
  centenary,
  equity,
  dtb,
  dfcu,
};
const alt: Record<PayBrand, string> = {
  mtn: "MTN Mobile Money",
  airtel: "Airtel Money",
  visa: "Visa",
  mastercard: "Mastercard",
  stanbic: "Stanbic Bank",
  hfb: "Housing Finance Bank",
  centenary: "Centenary Bank",
  equity: "Equity Bank",
  dtb: "Diamond Trust Bank",
  dfcu: "dfcu Bank",
};

/** Real brand marks on a neutral tile so each keeps its own colours. */
export function BrandLogo({ brand, className }: { brand: PayBrand; className?: string }) {
  const url = src[brand];
  return (
    <span
      className={cn(
        "inline-flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card p-1 shadow-sm",
        brand === "mtn" && "p-0",
        className,
      )}
    >
      <img
        src={url}
        alt={alt[brand]}
        className={cn(
          "max-h-full max-w-full object-contain",
          brand === "mtn" && "h-full w-full object-cover",
        )}
        draggable={false}
        loading="lazy"
      />
    </span>
  );
}
