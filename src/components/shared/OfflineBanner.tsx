import { AnimatePresence, motion } from "motion/react";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

/** Shows when the device loses connection. Uses the browser's real online status. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          role="status"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden bg-foreground text-background"
        >
          <p className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium">
            <WifiOff className="size-4" aria-hidden />
            You are offline. We will sync your changes when you reconnect.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
