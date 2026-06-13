import type { Platform } from "@/lib/data/types";

/**
 * Headline ventures / platforms shown on the homepage. Each card links out to
 * the original website. URLs are placeholders until the real domains are wired.
 */
export const platforms: Platform[] = [
  {
    name: "The Bogus Company",
    blurb: "Digital marketing agency for startups and small businesses",
    description: "A strategy-led practice focused on positioning, structured distribution, SEO, and measurable growth.",
    category: "Agency",
    url: "https://theboguscompany.com",
    initials: "BC",
  },
  {
    name: "Timewheel Internet",
    blurb: "Time-focused digital products",
    description: "Building membership software, booking systems, and event ticketing tools designed for simplicity and operational control.",
    category: "SaaS Studio",
    url: "https://timewheel.in",
    initials: "TW",
  },
  {
    name: "Marketing Bug",
    blurb: "Creator-focused newsletter",
    description: "Clear thinking on growth, distribution, and digital leverage.",
    category: "Newsletter",
    url: "https://marketingbug.in",
    initials: "MB",
  },
  {
    name: "ChaiPani",
    blurb: "Creator payment platform",
    description: "A simple way for audiences to support creators directly.",
    category: "Payments",
    url: "https://chaipani.app",
    initials: "CP",
  },
  {
    name: "Corporate Puppet",
    blurb: "Satire and growth commentary platform",
    description: "Short-form content and conversations exploring modern corporate culture and performance.",
    category: "Media",
    url: "https://corporatepuppet.com",
    initials: "CP",
  },
  {
    name: "JNV Connect",
    blurb: "Community infrastructure for JNV institutions",
    description: "Membership, messaging, events, and digital networking built for long-term connection.",
    category: "Community",
    url: "https://jnvconnect.in",
    initials: "JC",
  },
];
