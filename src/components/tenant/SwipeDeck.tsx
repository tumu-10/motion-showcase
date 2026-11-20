import { Bed, Eye, Heart, MapPin, RotateCcw, X } from "lucide-react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatUGX } from "@/lib/rent";
import type { Listing } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

const SWIPE_DISTANCE = 110;

export function SwipeDeck({
  items,
  onDecide,
  onReset,
  onView,
}: {
  items: Listing[];
  onDecide: (item: Listing, interested: boolean) => void;
  onReset: () => void;
  onView: (item: Listing) => void;
}) {
  const visible = items.slice(0, 3);

  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex h-[25rem] flex-col items-center justify-center rounded-lg border-2 border-dashed border-input px-6 text-center"
      >
        <p className="text-lg font-bold">You have seen every match</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Change your filters or go through the homes again.
        </p>
        <Button variant="outline" className="mt-6" onClick={onReset}>
          <RotateCcw /> Start again
        </Button>
      </motion.div>
    );
  }

  return (
    <div>
      <div className="relative h-[25rem]">
        <AnimatePresence initial={false}>
          {visible
            .map((item, i) => (
              <SwipeCard
                key={item.id}
                item={item}
                depth={i}
                onDecide={(yes) => onDecide(item, yes)}
                onView={() => onView(item)}
              />
            ))
            .reverse()}
        </AnimatePresence>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Swipe right if interested, left to skip
      </p>
    </div>
  );
}

function SwipeCard({
  item,
  depth,
  onDecide,
  onView,
}: {
  item: Listing;
  depth: number;
  onDecide: (yes: boolean) => void;
  onView: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const yesOpacity = useTransform(x, [20, SWIPE_DISTANCE], [0, 1]);
  const noOpacity = useTransform(x, [-SWIPE_DISTANCE, -20], [1, 0]);
  const [exitX, setExitX] = useState(0);
  const isTop = depth === 0;

  const decide = useMemo(
    () => (yes: boolean) => {
      const to = yes ? 420 : -420;
      setExitX(to);
      animate(x, to, { duration: 0.35, ease: [0.16, 1, 0.3, 1] });
      window.setTimeout(() => onDecide(yes), 160);
    },
    [onDecide, x],
  );

  return (
    <motion.article
      className={cn(
        "absolute inset-0 overflow-hidden rounded-2xl bg-card shadow-lift",
        isTop ? "cursor-grab active:cursor-grabbing" : "pointer-events-none",
      )}
      style={{ x: isTop ? x : 0, rotate: isTop ? rotate : 0, zIndex: 10 - depth }}
      initial={{ scale: 0.9, y: 30, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.05, y: depth * 14, opacity: depth > 1 ? 0.6 : 1 }}
      exit={{ x: exitX || 420, opacity: 0, transition: { duration: 0.3 } }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      drag={isTop ? "x" : false}
      dragSnapToOrigin
      dragElastic={0.9}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > 700) decide(true);
        else if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -700) decide(false);
      }}
      aria-label={`${item.title} in ${item.area}, ${formatUGX(item.rent)} per month`}
    >
      <img
        src={item.image}
        alt=""
        draggable={false}
        className="h-full w-full select-none object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary-deep via-primary-deep/80 to-transparent p-5 pt-24 text-on-deep">
        <p className="flex items-center gap-1.5 text-sm text-on-deep-muted">
          <MapPin className="size-4" aria-hidden /> {item.area}
          <span aria-hidden>·</span>
          <Bed className="size-4" aria-hidden /> {item.bedrooms}{" "}
          {item.bedrooms === 1 ? "bedroom" : "bedrooms"}
        </p>
        <h3 className="mt-1 text-xl font-bold">{item.title}</h3>
        <p className="figure mt-1 text-lg font-bold text-accent">
          {formatUGX(item.rent)}{" "}
          <span className="text-sm font-medium text-on-deep-muted">/ month</span>
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {item.features.map((f) => (
            <li key={f} className="rounded-full bg-on-deep/15 px-2.5 py-1 text-xs font-medium">
              {f}
            </li>
          ))}
        </ul>
      </div>
      {isTop && (
        <>
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onView}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute left-4 top-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-card/95 px-3 text-sm font-semibold text-foreground shadow-soft backdrop-blur"
            aria-label={`View details for ${item.title}`}
          >
            <Eye className="size-4" aria-hidden />
            View
          </motion.button>
          <motion.span
            style={{ opacity: yesOpacity }}
            className="pointer-events-none absolute left-5 top-5 rotate-[-8deg] rounded-sm border-2 border-success bg-success-soft px-3 py-1 text-sm font-bold uppercase text-success-ink"
          >
            Interested
          </motion.span>
          <motion.span
            style={{ opacity: noOpacity }}
            className="pointer-events-none absolute right-5 top-5 rotate-[8deg] rounded-sm border-2 border-destructive bg-destructive-soft px-3 py-1 text-sm font-bold uppercase text-destructive-ink"
          >
            Skip
          </motion.span>
        </>
      )}
      {isTop && <DeckButtons onDecide={decide} />}
    </motion.article>
  );
}

function DeckButtons({ onDecide }: { onDecide: (yes: boolean) => void }) {
  return (
    <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-3">
      <button
        onClick={() => onDecide(false)}
        onPointerDown={(e) => e.stopPropagation()}
        className="press grid size-12 place-items-center rounded-full bg-card text-destructive shadow-soft"
        aria-label="Skip this home"
      >
        <X className="size-5" />
      </button>
      <button
        onClick={() => onDecide(true)}
        onPointerDown={(e) => e.stopPropagation()}
        className="press grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft"
        aria-label="Add to favorites"
      >
        <Heart className="size-5" />
      </button>
    </div>
  );
}
