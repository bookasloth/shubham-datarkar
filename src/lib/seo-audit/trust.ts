// Deterministic E-E-A-T / trust-signal detection across the crawled page set.
// These are TRUST and source-quality signals, not guaranteed ranking factors
// (spec §8) — the report frames them that way. Pure over persisted PageSignals.
import type { PageSignals } from "./signals";

export type TrustSignals = {
  hasAbout: boolean;
  hasContactPage: boolean;
  hasContactDetails: boolean; // tel: or mailto: anywhere
  hasOrganizationSchema: boolean;
  hasPersonSchema: boolean; // author / person identity
  hasLocalBusiness: boolean; // physical location entity
  hasTestimonials: boolean;
  hasDatedContent: boolean; // at least one article-class page carries a date
  /** 0-1 fraction of the seven signals present — the trust category input. */
  coverage: number;
};

const ORG_TYPES = ["Organization", "Corporation", "LocalBusiness"];
const LOCAL_TYPES = ["LocalBusiness", "Dentist", "MedicalBusiness", "Store", "Restaurant", "ProfessionalService"];
const PERSON_TYPES = ["Person", "ProfilePage"];

export function detectTrust(pages: PageSignals[]): TrustSignals {
  const anySchema = (types: string[]) => pages.some((p) => p.schemas.some((s) => types.includes(s)));

  const t = {
    hasAbout: pages.some((p) => p.class === "about"),
    hasContactPage: pages.some((p) => p.class === "contact"),
    hasContactDetails: pages.some((p) => p.hasTelLink || p.hasMailtoLink),
    hasOrganizationSchema: anySchema(ORG_TYPES),
    hasPersonSchema: anySchema(PERSON_TYPES) || pages.some((p) => p.class === "author"),
    hasLocalBusiness: anySchema(LOCAL_TYPES),
    hasTestimonials: pages.some((p) => p.mentionsTestimonials),
    hasDatedContent: pages.some((p) => (p.class === "article" || p.class === "other") && p.hasDates),
  };

  const signals = [
    t.hasAbout,
    t.hasContactPage || t.hasContactDetails,
    t.hasOrganizationSchema,
    t.hasPersonSchema,
    t.hasLocalBusiness,
    t.hasTestimonials,
    t.hasDatedContent,
  ];
  const coverage = signals.filter(Boolean).length / signals.length;

  return { ...t, coverage };
}
