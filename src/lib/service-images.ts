import garbageImage from "@/assets/service-garbage.webp.asset.json";
import plumberImage from "@/assets/service-plumber.webp.asset.json";
import electricianImage from "@/assets/service-electrician.webp.asset.json";
import cleaningImage from "@/assets/service-cleaning.webp.asset.json";
import gasImage from "@/assets/service-gas.webp.asset.json";
import waterImage from "@/assets/service-water.webp.asset.json";
import internetImage from "@/assets/service-internet.webp.asset.json";
import painterImage from "@/assets/service-painter.webp.asset.json";
import carpenterImage from "@/assets/service-carpenter.webp.asset.json";
import securityImage from "@/assets/service-security.webp.asset.json";
import pestControlImage from "@/assets/service-pest-control.webp.asset.json";
import moversImage from "@/assets/service-movers.webp.asset.json";
import findHomeImage from "@/assets/listing-1.jpg";
import type { HomeServiceId } from "@/lib/home-services";

export const serviceImageById: Record<HomeServiceId, string> = {
  "garbage-collection": garbageImage.url,
  plumber: plumberImage.url,
  electrician: electricianImage.url,
  cleaning: cleaningImage.url,
  "cooking-gas": gasImage.url,
  "water-delivery": waterImage.url,
  internet: internetImage.url,
  painter: painterImage.url,
  carpenter: carpenterImage.url,
  security: securityImage.url,
  "pest-control": pestControlImage.url,
  movers: moversImage.url,
};

export const quickActionImages = {
  complaint: plumberImage.url,
  findHome: findHomeImage,
} as const;
