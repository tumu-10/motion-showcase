import garbageImage from "@/assets/service-garbage.jpg";
import plumberImage from "@/assets/service-plumber.jpg";
import electricianImage from "@/assets/service-electrician.jpg";
import cleaningImage from "@/assets/service-cleaning.jpg";
import gasImage from "@/assets/service-gas.jpg";
import waterImage from "@/assets/service-water.jpg";
import internetImage from "@/assets/service-internet.jpg";
import painterImage from "@/assets/service-painter.jpg";
import carpenterImage from "@/assets/service-carpenter.jpg";
import securityImage from "@/assets/service-security.jpg";
import pestControlImage from "@/assets/service-pest-control.jpg";
import moversImage from "@/assets/service-movers.jpg";
import findHomeImage from "@/assets/listing-1.jpg";
import type { HomeServiceId } from "@/lib/home-services";

export const serviceImageById: Record<HomeServiceId, string> = {
  "garbage-collection": garbageImage,
  plumber: plumberImage,
  electrician: electricianImage,
  cleaning: cleaningImage,
  "cooking-gas": gasImage,
  "water-delivery": waterImage,
  internet: internetImage,
  painter: painterImage,
  carpenter: carpenterImage,
  security: securityImage,
  "pest-control": pestControlImage,
  movers: moversImage,
};

export const quickActionImages = {
  complaint: plumberImage,
  findHome: findHomeImage,
} as const;
