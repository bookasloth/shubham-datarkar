import type { Platform } from "@/lib/data/types";

/**
 * Headline ventures / platforms shown on the homepage. Each card links out to
 * the original website. URLs are placeholders until the real domains are wired.
 * `icon` keys map to @/lib/icons; `accent` is the pastel icon-tile background.
 */
export const platforms: Platform[] = [
  {
    name: "The Bogus Company",
    blurb: "Digital marketing agency for startups and small businesses",
    description: "A strategy-led practice focused on positioning, structured distribution, SEO, and measurable growth.",
    category: "Agency",
    url: "https://theboguscompany.com",
    icon: "Asterisk",
    accent: "#C9EFD2",
  },
  {
    name: "Timewheel Internet",
    blurb: "Time-focused digital products",
    description: "Building membership software, booking systems, and event ticketing tools designed for simplicity and operational control.",
    category: "SaaS Studio",
    url: "https://timewheel.co.in",
    icon: "Clock",
    accent: "linear-gradient(135deg, #FBD0D5 0%, #FBEFC9 35%, #C9EFD2 70%, #CFE0FB 100%)",
  },
  {
    name: "Marketing Bug",
    blurb: "Creator-focused newsletter",
    description: "Clear thinking on growth, distribution, and digital leverage.",
    category: "Newsletter",
    url: "https://marketingbug.in",
    icon: "Bug",
    accent: "#FBC9D2",
  },
  {
    name: "Coffee and Toffee",
    blurb: "Creator payment platform",
    description: "A simple way for audiences to support creators directly.",
    category: "Payments",
    url: "https://coffeeandtoffee.com",
    icon: "Coffee",
    accent: "linear-gradient(135deg, #D9BE9A 0%, #F2DFAE 100%)",
  },
  {
    name: "Corporate Puppet",
    blurb: "Satire and growth commentary platform",
    description: "Short-form content and conversations exploring modern corporate culture and performance.",
    category: "Media",
    url: "https://corporatepuppet.com",
    icon: "Tie",
    accent: "#EAE2F8",
  },
  {
    name: "JNV Connect",
    blurb: "Community infrastructure for JNV institutions",
    description: "Membership, messaging, events, and digital networking built for long-term connection.",
    category: "Community",
    url: "https://jnvconnect.in",
    icon: "Users",
    accent: "#FBF0CE",
  },
];
