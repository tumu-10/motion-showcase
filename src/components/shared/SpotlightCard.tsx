import { forwardRef, type ComponentPropsWithoutRef, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

type SpotlightCardProps = ComponentPropsWithoutRef<"article"> & {
  image?: string | undefined;
  dark?: boolean;
};

export const SpotlightCard = forwardRef<HTMLElement, SpotlightCardProps>(function SpotlightCard(
  { children, className, dark = false, image, onPointerLeave, onPointerMove, ...props },
  ref,
) {
  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    onPointerMove?.(event);
    if (event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
  };

  const handlePointerLeave = (event: PointerEvent<HTMLElement>) => {
    onPointerLeave?.(event);
    event.currentTarget.style.setProperty("--spot-x", "50%");
    event.currentTarget.style.setProperty("--spot-y", "50%");
  };

  return (
    <article
      ref={ref}
      {...props}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn("spotlight-card", dark && "spotlight-card-dark", className)}
    >
      {image && (
        <>
          <img
            src={image}
            alt=""
            aria-hidden="true"
            className="spotlight-card__image"
            loading="lazy"
            draggable={false}
          />
          <span className="spotlight-card__scrim" aria-hidden="true" />
        </>
      )}
      <div className="spotlight-card__content">{children}</div>
    </article>
  );
});
