/**
 * Content for the /web-developer-nagpur conversion landing page. Hand-written,
 * first-person, and grounded in the real body of work in src/lib/data/portfolio.ts
 * (20+ sites, 8+ SaaS products) — no fabricated stats. Mirrors the shape of the
 * SEO landing so both pages read as one system.
 *
 * Deliberately carries NO rupee pricing: web builds are scoped per project, so
 * the page converts to "book a call / send a brief" instead of quoting a figure
 * that would be wrong for half the visitors.
 */
export type WebDevLandingContent = {
  path: string;
  h1: string;
  metaTitle: string; // bare keyword phrase, brand appended by root template
  metaDescription: string; // ~150 chars
  subhead: string;
  answer: string; // 40-60 words, self-contained for answer engines
  /** Which portfolio group keys to surface as proof cards, in order. */
  portfolioKeys: string[];
  serviceBlocks: { h3: string; definition: string }[];
  process: { step: string; detail: string }[];
  differentiators: { label: string; value: string }[];
  buyers: string[];
  faqs: { question: string; answer: string }[];
  trustNames: string[];
  updatedAt: string;
};

export const webDeveloperNagpur: WebDevLandingContent = {
  path: "/web-developer-nagpur",
  h1: "Web Developer in Nagpur",
  metaTitle: "Web Developer in Nagpur: Websites & Web Apps",
  metaDescription:
    "Web developer in Nagpur building fast, SEO-ready websites and web apps that convert. 20+ sites and 8+ products shipped. Book a call.",
  subhead:
    "Fast, SEO-ready websites and web apps for Nagpur businesses — built to convert visitors into enquiries, not just to look good.",
  answer:
    "A web developer in Nagpur designs, builds, and ships the site or web app a business runs on. I build conversion-first websites and full products end to end — responsive, fast, and search-ready from day one — for Nagpur firms that need their website to bring in enquiries, not just exist.",
  portfolioKeys: ["web-hub", "app-box"],
  serviceBlocks: [
    {
      h3: "Business & brand websites",
      definition:
        "The site your customers judge you by — clear, fast, and structured so a first-time visitor knows what you do and how to reach you within seconds.",
    },
    {
      h3: "Landing pages that convert",
      definition:
        "Single-purpose pages built around one action — an enquiry, a booking, a signup. Written and structured to turn ad and search traffic into leads.",
    },
    {
      h3: "Web apps & SaaS products",
      definition:
        "Custom tools, dashboards, and full products built end to end — from booking systems to internal apps — the same way I build my own software ventures.",
    },
    {
      h3: "E-commerce & catalogues",
      definition:
        "Storefronts and product catalogues that load fast, rank, and make it effortless for a buyer to go from browsing to checkout or enquiry.",
    },
    {
      h3: "Performance & SEO-ready builds",
      definition:
        "Sites engineered for Core Web Vitals and clean, crawlable markup — so the pages are ready to rank the day they go live, not months later.",
    },
    {
      h3: "Redesigns & rescue jobs",
      definition:
        "Rebuilding slow, dated, or half-finished sites into something that actually works — often the same week — without losing the SEO you've already earned.",
    },
  ],
  process: [
    {
      step: "Brief & scope",
      detail: "A short call to understand the business, the goal, and who the site is for. You leave with a clear scope and a fixed plan — no vague retainers.",
    },
    {
      step: "Design & build",
      detail: "I design and develop in one pass — no handoff between a designer who can't code and a coder who can't design. You see real pages, not mockups.",
    },
    {
      step: "SEO & performance pass",
      detail: "Every build ships fast, mobile-first, and search-ready: clean markup, metadata, sitemaps, and Core Web Vitals sorted before launch.",
    },
    {
      step: "Launch & handover",
      detail: "I deploy, wire up analytics and forms, and hand you something you can actually run — with support on tap when you need a change.",
    },
  ],
  differentiators: [
    { label: "Websites shipped", value: "20+" },
    { label: "SaaS products built", value: "8+" },
    { label: "Years building for the web", value: "10+" },
    { label: "Designer + developer, one person", value: "1" },
  ],
  buyers: [
    "Local businesses & clinics",
    "MSME manufacturers & exporters",
    "Startups & SaaS founders",
    "Coaching & education brands",
  ],
  faqs: [
    {
      question: "How much does a website cost in Nagpur?",
      answer:
        "It depends on scope — a focused landing page, a full business site, and a custom web app are very different jobs. I quote a fixed price per project after a short brief call, so you know the number before anything starts. Book a call and I'll scope it honestly.",
    },
    {
      question: "How long does it take to build a website?",
      answer:
        "A focused landing page can go live in days; a full business site typically takes one to three weeks depending on pages and content. Web apps are scoped case by case. I design and build in one pass, which is why it's faster than the usual agency handoff.",
    },
    {
      question: "Do you only work with Nagpur businesses?",
      answer:
        "I'm based in Nagpur and happy to meet local clients in person, but most builds run remotely — the work is the same whether you're in Dharampeth or Delhi. Being local just makes the early conversations easier.",
    },
    {
      question: "Will the website be good for SEO?",
      answer:
        "Yes — that's the point of building them together. Every site ships fast, mobile-first, and with clean, crawlable markup and metadata, so it's ready to rank from launch. I run SEO as a discipline too, so the build never fights the ranking.",
    },
    {
      question: "Can you rebuild or fix my existing website?",
      answer:
        "Often, yes — whether it's slow, dated, or a half-finished project someone abandoned. I'll tell you honestly whether a rebuild or a rescue is the better call, and preserve the SEO and content you've already earned.",
    },
    {
      question: "Do you build web apps, not just websites?",
      answer:
        "Yes. Alongside client sites I build and run my own software products end to end — booking systems, dashboards, and SaaS tools — so custom app work is core to what I do, not something I outsource.",
    },
  ],
  trustNames: ["Krishna Group", "Rajmudra Media", "DRU Foundation", "Gayatri School", "NNAWCA", "Dhawade Vadewale"],
  updatedAt: "2026-08-07",
};
