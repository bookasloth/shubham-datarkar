/**
 * Single source of truth for site-wide identity, navigation, and contact.
 * Swap these values (or back them with a CMS) without touching components.
 */

export const site = {
  name: "Shubham Datarkar",
  alias: "The Kalamwala",
  shortName: "SD",
  role: "Founder · Marketer · Copywriter",
  domain: "shubhamdatarkar.com",
  url: "https://shubhamdatarkar.com",
  altUrl: "https://shubhamdatarkar.in",
  email: "hello@shubhamdatarkar.com",
  location: "Nagpur, India",
  tagline: "Build what you market. Market what you build.",
  description:
    "Shubham Datarkar (The Kalamwala) builds things that make other things easier — ads, brands, and entire software. Copywriter, marketer, and founder behind The Bogus Company, Book A Sloth, and Timewheel Internet.",
  // External booking software — Book A Sloth, his own scheduling product.
  bookingUrl: "https://bookasloth.in",
  spotifyUrl: "https://open.spotify.com/playlist/1p5XuC8FEI1iYrBRZIxVSW",
} as const;

export const companies = [
  {
    name: "The Bogus Company",
    kind: "Creative & Ads Studio",
    since: "2021",
    status: "Active",
    blurb: "Where ideas dress up as ads and refuse to be ignored.",
  },
  {
    name: "Book A Sloth",
    kind: "Booking SaaS · CMO",
    since: "2026",
    status: "Building",
    blurb: "Replacing “appointment milega kya?” with “Booked.” India's calmest booking platform.",
  },
  {
    name: "Timewheel Internet",
    kind: "Internet & SaaS Studio · Founder",
    since: "2025",
    status: "Building",
    blurb: "Internet products that compound while you sleep.",
  },
] as const;

export type NavItem = {
  label: string;
  href: string;
  description?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/** Primary mega-menu groups (desktop dropdowns + mobile accordion). */
export const navGroups: NavGroup[] = [
  {
    label: "Work",
    items: [
      { label: "Projects", href: "/work", description: "Everything I've shipped" },
      { label: "Case Studies", href: "/case-studies", description: "Real outcomes, real numbers" },
      { label: "Companies", href: "/about#companies", description: "Three operating businesses" },
      { label: "Testimonials", href: "/testimonials", description: "What clients say" },
    ],
  },
  {
    label: "Services",
    items: [
      { label: "All Services", href: "/services", description: "How I can help" },
      { label: "SEO & Organic Growth", href: "/services/seo", description: "Compounding traffic systems" },
      { label: "Performance Marketing", href: "/services/performance", description: "Paid that pays back" },
      { label: "AI Automation", href: "/services/ai-workflows", description: "Leverage at every layer" },
      { label: "Speaking", href: "/speaking", description: "Talks & workshops" },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Blog", href: "/blog", description: "Essays, playbooks, teardowns" },
      { label: "Newsletter", href: "/newsletter", description: "One signal every Tuesday" },
      { label: "Resources", href: "/resources", description: "Frameworks & templates" },
      { label: "Changelog", href: "/changelog", description: "What changed, and when" },
    ],
  },
  {
    label: "Build",
    items: [
      { label: "Products", href: "/products", description: "Timewheel SaaS" },
      { label: "Free Tools", href: "/tools", description: "Use them, no signup" },
      { label: "AI Experiments", href: "/ai-experiments", description: "The lab" },
      { label: "Components", href: "/components", description: "The design system" },
    ],
  },
];

/** Flat top-level links shown directly in the bar. */
export const primaryNav: NavItem[] = [
  { label: "About", href: "/about" },
  { label: "Work", href: "/work" },
  { label: "Services", href: "/services" },
  { label: "Blog", href: "/blog" },
  { label: "Games", href: "/games" },
];

export const footerNav: NavGroup[] = [
  {
    label: "Explore",
    items: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "My Story", href: "/my-story" },
      { label: "Now", href: "/now" },
      { label: "Uses", href: "/uses" },
      { label: "Roadmap", href: "/roadmap" },
    ],
  },
  {
    label: "Work",
    items: [
      { label: "Projects", href: "/work" },
      { label: "Case Studies", href: "/case-studies" },
      { label: "Services", href: "/services" },
      { label: "Testimonials", href: "/testimonials" },
      { label: "Speaking", href: "/speaking" },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Blog", href: "/blog" },
      { label: "Newsletter", href: "/newsletter" },
      { label: "Resources", href: "/resources" },
      { label: "Tools", href: "/tools" },
      { label: "Products", href: "/products" },
      { label: "Games", href: "/games" },
    ],
  },
  {
    label: "More",
    items: [
      { label: "FAQ", href: "/faq" },
      { label: "Media Kit", href: "/media-kit" },
      { label: "Changelog", href: "/changelog" },
      { label: "Contact", href: "/contact" },
      { label: "Components", href: "/components" },
    ],
  },
];

export type SocialLink = { label: string; href: string; handle: string };

export const socials: SocialLink[] = [
  { label: "X / Twitter", href: "https://x.com/sndatarkar", handle: "@sndatarkar" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/sndatarkar", handle: "in/sndatarkar" },
  { label: "YouTube", href: "https://www.youtube.com/@sndatarkar", handle: "@sndatarkar" },
  { label: "Instagram", href: "https://www.instagram.com/sndatarkar", handle: "@sndatarkar" },
];

export const sameAs = socials.map((s) => s.href);
