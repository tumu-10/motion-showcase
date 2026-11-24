import mtn from "@/assets/pay/mtn-momo.jpg";
import airtel from "@/assets/pay/airtel.svg";
import visa from "@/assets/pay/visa.svg";
import mastercard from "@/assets/pay/mastercard.svg";
import stanbic from "@/assets/pay/stanbic.png";
import { cn } from "@/lib/utils";

export type PayBrand = "mtn" | "airtel" | "visa" | "mastercard" | "stanbic" | "hfb";

const src: Partial<Record<PayBrand, string>> = {
  mtn,
  airtel,
  visa,
  mastercard,
  stanbic,
};
const alt: Record<PayBrand, string> = {
  mtn: "MTN Mobile Money",
  airtel: "Airtel Money",
  visa: "Visa",
  mastercard: "Mastercard",
  stanbic: "Stanbic Bank",
  hfb: "Housing Finance Bank",
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
      {url ? (
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
      ) : (
        <span
          aria-label={alt[brand]}
          className="text-[10px] font-extrabold leading-none tracking-tight text-primary-deep"
        >
          HFB
        </span>
      )}
    </span>
  );
}
