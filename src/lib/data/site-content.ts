import type {
  ChangelogEntry,
  Faq,
  PressItem,
  Resource,
  RoadmapItem,
  Stat,
  TimelineItem,
  UsesItem,
} from "@/lib/data/types";

/** Headline credibility stats. */
export const stats: Stat[] = [
  { value: "9+", label: "Years in the trade", sub: "Copy, SEO & growth" },
  { value: "3", label: "Ventures", sub: "Studio · SaaS · brand" },
  { value: "10+", label: "Brands shipped for", sub: "Across India" },
  { value: "1", label: "IPL-era TVC", sub: "For Disney+ Hotstar" },
];

/** What I build — capability pillars for the homepage. */
export const capabilities = [
  {
    icon: "Search",
    title: "Growth Systems",
    text: "SEO architecture and content flywheels engineered to compound for years.",
  },
  {
    icon: "Target",
    title: "Performance Marketing",
    text: "Profitable paid acquisition with a testing system that keeps it profitable.",
  },
  {
    icon: "Sparkles",
    title: "AI Automation",
    text: "Workflows that compress time and expand output without lowering the bar.",
  },
  {
    icon: "Code2",
    title: "SaaS Products",
    text: "Internet products shipped end to end — design, code, distribution.",
  },
  {
    icon: "PenLine",
    title: "Content & Story",
    text: "Editorial systems that demonstrate thinking and feed every channel.",
  },
  {
    icon: "Compass",
    title: "Founder Advisory",
    text: "Distribution-first strategy from someone operating in the arena.",
  },
] as const;

export const timeline: TimelineItem[] = [
  { year: "2017", title: "Started in digital marketing", detail: "First roles writing ads, web copy, and blogs in Nagpur — the craft begins." },
  { year: "2018", title: "Content & SEO", detail: "Content Marketer at Nexon Mediatech — content, SEO strategy, and social." },
  { year: "2021", title: "Creative copywriter at 8Spades", detail: "Wrote an IPL 2021 animation TVC for Disney+ Hotstar and award-listed print work." },
  { year: "2022", title: "Started building", detail: "Began The Bogus Company and full-stack / WordPress work — the marketer who ships." },
  { year: "2024", title: "Strategy roles", detail: "Senior Copywriter, then Content Marketing Strategist across studios in Ahmedabad and Pune." },
  { year: "2025", title: "Marketing Lead", detail: "Leading marketing at Grey Hawks Media." },
  { year: "2026", title: "CMO & founder", detail: "CMO at Book A Sloth and founder & CEO of Timewheel Internet." },
];

export const principles = [
  { title: "Systems over hustle", text: "Build mechanisms that compound, then remove yourself from the loop." },
  { title: "Compounding over campaigns", text: "Own assets that grow without linear effort. Campaigns end; systems don't." },
  { title: "Ownership over employment", text: "Build things you control. Rented platforms are borrowed leverage." },
  { title: "Receipts over theories", text: "Every framework has a project behind it. Skin in the game changes everything." },
  { title: "Depth over breadth", text: "Become the best answer to one question before chasing the next." },
  { title: "Judgement-led AI", text: "AI accelerates the work; it never replaces the thinking." },
];

export const faqs: Faq[] = [
  { group: "Working together", question: "What kind of clients do you work with?", answer: "Mostly founders, operators, and growth teams at SaaS and D2C companies who want compounding systems, not one-off campaigns. I work best with people who value depth and are willing to play a long game." },
  { group: "Working together", question: "Do you work solo or with a team?", answer: "Both. For strategy and advisory it's me directly. For execution-heavy work I bring in a trusted team through The Bogus Company, but I stay hands-on throughout." },
  { group: "Working together", question: "What does a typical engagement look like?", answer: "Most engagements run three to six months, long enough to build a system and prove it compounds. We start with an audit, design the mechanism, build it, then instrument and hand it over." },
  { group: "Pricing", question: "How is pricing structured?", answer: "Monthly retainers for ongoing work, with starting points listed on each service page. Advisory is a lighter monthly commitment. Speaking is quoted per engagement." },
  { group: "Pricing", question: "Do you offer one-off audits?", answer: "Yes — a fixed-scope audit is a common entry point. You get a clear remediation plan whether or not we work together afterwards." },
  { group: "Process", question: "How involved do I need to be?", answer: "Enough to share context and make decisions, not enough to manage me. The whole point is to build a system that runs without constant input." },
  { group: "Process", question: "How do you use AI in your work?", answer: "Heavily, but always with a human in the loop. AI compresses research and drafting; judgement, voice, and quality control stay human. Quality goes up, not down." },
  { group: "General", question: "Why 'The Kalamwala'?", answer: "Kalam means pen; wala means one who works with. It's a nod to the craft of words and ideas — Indian heritage, global execution. The alias is for content; the name is for business." },
  { group: "General", question: "Do you take on speaking engagements?", answer: "Yes — keynotes and workshops on SEO, AI workflows, and founder-led growth. Sessions are built on real experiments, not recycled theory." },
];

export const changelog: ChangelogEntry[] = [
  {
    date: "2026-06-10",
    version: "v2.4",
    title: "Components system and command palette",
    type: "Shipped",
    notes: ["Published the full component library at /components.", "Added a global ⌘K command palette.", "Refined the monochrome design tokens."],
  },
  {
    date: "2026-05-22",
    version: "v2.3",
    title: "Free tools expansion",
    type: "Added",
    notes: ["Launched the Copy Analyzer and Headline Tester.", "Added usage counts to live tools."],
  },
  {
    date: "2026-05-04",
    version: "v2.2",
    title: "Faster everything",
    type: "Improved",
    notes: ["Cut JS bundle size on content pages.", "Improved Core Web Vitals across the board.", "Tightened image loading strategy."],
  },
  {
    date: "2026-04-18",
    version: "v2.1",
    title: "Case study template",
    type: "Added",
    notes: ["Shipped the universal case study layout.", "Published four new case studies."],
  },
  {
    date: "2026-04-01",
    version: "v2.0",
    title: "The Digital HQ rebuild",
    type: "Shipped",
    notes: ["Rebuilt the entire site on a founder-first system.", "Introduced dark mode and the monochrome language."],
  },
];

export const roadmap: RoadmapItem[] = [
  { title: "Component library", description: "A public, reusable design system.", status: "Shipped", quarter: "Q2 2026" },
  { title: "Command palette", description: "Keyboard-first navigation everywhere.", status: "Shipped", quarter: "Q2 2026" },
  { title: "Ask Shubham (AI)", description: "A chatbot trained on all published content.", status: "In Progress", quarter: "Q3 2026" },
  { title: "Semantic search", description: "Intent-based search across articles and tools.", status: "In Progress", quarter: "Q3 2026" },
  { title: "Glossary (200 terms)", description: "An interlinked marketing & SaaS glossary.", status: "Planned", quarter: "Q4 2026" },
  { title: "Frameworks library", description: "Named, original frameworks as standalone pages.", status: "Planned", quarter: "Q4 2026" },
  { title: "Community", description: "A space for founders building distribution.", status: "Exploring", quarter: "2027" },
  { title: "Cohort course", description: "A practical course on compounding growth systems.", status: "Exploring", quarter: "2027" },
];

export const resources: Resource[] = [
  { slug: "content-compounding-method", title: "The Kalamwala Content Compounding Method", type: "Framework", description: "The system for turning one idea into a month of compounding distribution.", format: "PDF + Notion" },
  { slug: "seo-cluster-template", title: "SEO Cluster Architecture Template", type: "Template", description: "A ready-to-use template for mapping pillar-and-spoke content clusters.", format: "Notion" },
  { slug: "90-day-experiment-framework", title: "The 90-Day Marketing Experiment Framework", type: "Framework", description: "A structured way to run marketing experiments that actually produce learning.", format: "PDF" },
  { slug: "technical-seo-checklist", title: "47-Point Technical SEO Checklist", type: "Checklist", description: "The exact checklist used in every audit, with tools for each item.", format: "PDF" },
  { slug: "brand-voice-prompt-kit", title: "Brand Voice Prompt Kit", type: "Template", description: "Prompts to train an AI on your brand voice without losing it.", format: "Text" },
  { slug: "roas-modeling-guide", title: "ROAS Modeling Guide", type: "Guide", description: "How to project returns across SEO, content, and paid before you spend.", format: "PDF" },
];

export const press: PressItem[] = [
  { outlet: "Disney+ Hotstar", title: "Animation TVC that ran during IPL 2021", date: "2021-04-15", kind: "TVC" },
  { outlet: "Ads of the World", title: "Stone & Acres: The Plot of Our Story — newspaper ad (Clio Network)", date: "2021-08-10", kind: "Feature" },
  { outlet: "8Spades Advertising", title: "Creative copywriting across national campaigns", date: "2023-06-01", kind: "Campaign" },
  { outlet: "Book A Sloth", title: "Building the operating system for India's booking economy", date: "2026-02-01", kind: "Launch" },
  { outlet: "The Kalamwala", title: "Literary & non-fiction writing", date: "2020-03-01", kind: "Writing" },
];

export const uses: UsesItem[] = [
  {
    category: "Workstation",
    items: [
      { name: "MacBook Pro 14\"", note: "The daily driver for everything." },
      { name: "LG UltraFine display", note: "One screen, kept deliberately minimal." },
      { name: "Keychron K3", note: "Low-profile mechanical, quiet switches." },
    ],
  },
  {
    category: "Software",
    items: [
      { name: "Claude", note: "Research, drafting, and analysis — the leverage layer." },
      { name: "Notion", note: "Second brain and content operating system." },
      { name: "Linear", note: "Product and project tracking across companies." },
      { name: "Figma", note: "Design and quick mockups." },
    ],
  },
  {
    category: "Marketing stack",
    items: [
      { name: "Ahrefs", note: "SEO research and rank tracking." },
      { name: "Plausible", note: "Honest, cookie-free analytics." },
      { name: "ConvertKit", note: "The newsletter engine." },
    ],
  },
  {
    category: "Everyday",
    items: [
      { name: "Field Notes", note: "Analog capture, always in a pocket." },
      { name: "Fountain pen", note: "The literal kalam — for thinking on paper." },
    ],
  },
];
