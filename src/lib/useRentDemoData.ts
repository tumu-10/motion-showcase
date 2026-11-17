import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  initialRentDemoState,
  readRentDemoState,
  writeRentDemoState,
  type RentDemoState,
} from "@/lib/rent-demo";

export function useRentDemoData() {
  const [data, setData] = useState(initialRentDemoState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const result = readRentDemoState();
    setData(result.state);
    if (result.error) {
      console.error("Could not load saved rent demo data.", result.error);
      toast.error("Saved rent records could not be loaded.");
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      writeRentDemoState(data);
    } catch (error) {
      console.error("Could not save rent demo data.", error);
      toast.error("Rent changes could not be saved in this browser.");
    }
  }, [data, loaded]);

  return { data, setData, loaded };
}

export type RentDemoUpdater = (current: RentDemoState) => RentDemoState;
