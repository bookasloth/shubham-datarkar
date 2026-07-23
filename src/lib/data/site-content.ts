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

// `text` is the one-line teaser shown on /about. `expanded` is the long-form
// version rendered only on /philosophy, so the two pages don't duplicate the
// same block — /about points to /philosophy as the deeper read.
export const principles = [
  {
    title: "Systems over hustle",
    text: "Build mechanisms that compound, then remove yourself from the loop.",
    expanded:
      "Effort that depends on you being present is a job, not a system. I'd rather spend a week building the mechanism that does the work forever than do the work by hand every week. The goal of every project is the same: get it running well enough that it no longer needs me. Hustle is a tax you pay when you skipped building the system.",
  },
  {
    title: "Compounding over campaigns",
    text: "Own assets that grow without linear effort. Campaigns end; systems don't.",
    expanded:
      "A campaign spikes and dies the day you stop funding it. An asset — a page that ranks, a piece of content that gets cited, a product that keeps selling — earns while you sleep and compounds every month it stays up. I optimise for the second curve almost every time, even when it's slower to start, because slow-and-compounding beats fast-and-flat within a year, and it isn't close after two.",
  },
  {
    title: "Ownership over employment",
    text: "Build things you control. Rented platforms are borrowed leverage.",
    expanded:
      "Reach you rent can be revoked by an algorithm change you didn't vote on. Reach you own — your domain, your list, your product — is leverage nobody can take back. I'll use the rented platforms to build the owned ones, never the other way around. Everything I build is designed to live on ground I control.",
  },
  {
    title: "Receipts over theories",
    text: "Every framework has a project behind it. Skin in the game changes everything.",
    expanded:
      "I don't trust marketing advice from people who've never had their own money on the line. Every framework I teach came out of a project where I could lose something if I was wrong. That's the filter: if I haven't shipped it, I don't sell it. The receipts are the credential — the theory is just the story that explains them afterward.",
  },
  {
    title: "Depth over breadth",
    text: "Become the best answer to one question before chasing the next.",
    expanded:
      "Being vaguely good at ten things gets you cited for none of them. Being the clear best answer to one question gets you recommended by name — by people and, increasingly, by AI. I go deep on a narrow surface until it's undeniable, then expand outward from a position of authority instead of spreading thin from the start.",
  },
  {
    title: "Judgement-led AI",
    text: "AI accelerates the work; it never replaces the thinking.",
    expanded:
      "AI is the fastest intern I've ever hired and the worst decision-maker. It multiplies output once the judgement is already there and multiplies mistakes when it isn't. I let it do the volume — drafts, variants, first passes — and keep the taste, the strategy, and the final call human. The leverage is real; the thinking is still the job.",
  },
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
    date: "2026-07-23",
    version: "v3.5",
    title: "The free tools actually work now",
    type: "Improved",
    notes: [
      "Every free tool is real. The SEO audit genuinely fetches and scores any URL, the readability checker runs real Flesch–Kincaid, and the copy analyzer, headline tester, and content-brief generator run on Claude — no more sample scores.",
      "New — embed the UTM builder, ROAS calculator, or schema generator on your own site with one line of HTML.",
      "New — share any tool result as a clean image card.",
      "The SEO audit shows your top issues free, then unlocks the full report for an email.",
      "Every page got a redesigned social-share card — dark, sharp, and properly branded.",
      "The daily games now say what they are: Alfazy (a Wordle-style word game), Hit and Blow (Bulls and Cows), and Integra (a Nerdle-style math puzzle).",
    ],
  },
  {
    date: "2026-07-23",
    version: "v3.4",
    title: "Built to be found — by Google and the AIs",
    type: "Improved",
    notes: [
      "Every project I'm building now has its own page — what it is, whether it's live, and a way to back it — instead of a 'coming soon' placeholder.",
      "The /me page is now the build-in-public side of things, kept separate from the hire-me home so the two stop competing.",
      "Booking a call is its own proper page now — clearly free, with the questions people actually ask, answered.",
      "Case studies show how the numbers were measured and link to related work.",
      "Faster pages — swapped the scroll-animation library for plain CSS, so less code loads everywhere.",
      "A big under-the-hood pass so Google, ChatGPT, Claude, Perplexity and Bing can read, understand, and cite the site properly: structured data on every page, honest ratings, a cleaner sitemap, and a share-preview card for each page.",
    ],
  },
  {
    date: "2026-07-23",
    version: "v3.3",
    title: "Everything I built, actually findable",
    type: "Improved",
    notes: [
      "The full site menu now sits on the bar on desktop — Work, Services, Content and Build, one click away — instead of hiding behind a hamburger on a wide empty header.",
      "The Join Community button opens the community feed now, not a pricing page.",
      "The homepage finally points at the parts that aren't a sales pitch: games, the community feed, and the free tools.",
      "Added a Support link to the footer, so you no longer have to already be a member to find the support page.",
      "The games, community and members areas wear the same header as the rest of the site — matching height, and a theme switch that logged-out visitors couldn't reach before.",
    ],
  },
  {
    date: "2026-07-17",
    version: "v3.2",
    title: "A feed worth landing on, and streaks that count right",
    type: "Improved",
    notes: [
      "Logged-out visitors now land on three real posts instead of a wall — engage with any of them and a join modal picks up where the dead end used to be.",
      "Every community surface scrolls forever, and profile pages finally show a post count that matches reality.",
      "Fixed the streak: one flame instead of one per day, revisiting a solved puzzle no longer resets it, and archive boards stop implying a win extends it.",
      "Games rework: sidebar nav, leaderboard tabs, archive grid and share card — with archive and membership solves counted and solve time measured on the server.",
      "The app sidebar now follows the route, with Account pinned to the bottom.",
    ],
  },
  {
    date: "2026-07-16",
    version: "v3.1",
    title: "Branded emails and an auth overhaul",
    type: "Shipped",
    notes: [
      "Rebuilt every email the site sends — a 34-template catalog wired to real events, from welcome and confirm-email through birthday greetings and games digests.",
      "Overhauled login, register and password reset end to end: 14 fixes from the UX audit.",
      "The nav CTA now greets you by name once you're signed in.",
      "Torch mode got a game — extinguish and relight the diya, with a mobile fallback and reduced-motion support.",
    ],
  },
  {
    date: "2026-07-15",
    version: "v3.0",
    title: "Two months of puzzles to play on day one",
    type: "Added",
    notes: [
      "Each game now numbers its puzzles from its own launch day — Alfazy from 1 May, Integra from 1 June, Hit and Blow from 1 July — so the archive opens with months of puzzles to play instead of an empty room.",
      "Alfazy serves a themed word on observance days — 96 of them, keyed to the date, recurring every year.",
      "Rebuilt the games rail: compact how-to-play, screenshot-style game switcher, hub icons and support-grade win confetti.",
    ],
  },
  {
    date: "2026-07-14",
    version: "v2.9",
    title: "A three-column shell",
    type: "Improved",
    notes: [
      "Centred the whole app on a 3-column geometry — sidebar, 600px main, optional right rail — so reading width stays honest on any monitor.",
      "Every section gets its own rail: per-game help and stats, LinkedIn-style suggestions on members.",
      "Redesigned the games archive and leaderboard — stat tiles, filter and search, medal podium, best-streak board.",
    ],
  },
  {
    date: "2026-07-13",
    version: "v2.8",
    title: "Posts you can take with you",
    type: "Added",
    notes: [
      "Any community post downloads as a 1080x1350 share card, built to match the feed it came from.",
      "Long URLs in posts now shorten to shubhamdatarkar.com/s/{code}.",
      "Image avatars for members and supporters — 12 icons, picked deterministically so yours never changes.",
      "Loading skeletons, optimistic replies and a global nav progress bar, so nothing feels dead while it works.",
    ],
  },
  {
    date: "2026-07-12",
    version: "v2.7",
    title: "One framework behind three games",
    type: "Improved",
    notes: [
      "Alfazy, Hit and Blow and Integra now run on one shared stage, header, tile and keyboard — each with its own accent colour.",
      "New games hub with per-game cards, streaks and stat tiles.",
      "Unified game chrome: help, stats and settings behave the same everywhere, plus a first-visit welcome and an end card for logged-out players.",
      "The community feed auto-posts from five sources — publishes, milestones, new supporters — with no cron anywhere.",
    ],
  },
  {
    date: "2026-07-11",
    version: "v2.6",
    title: "Security audit, closed out",
    type: "Fixed",
    notes: [
      "Ran a full red-team audit and remediated every finding: admin gate fails closed, RLS tightened on profiles and contacts, durable rate limiting, SSRF and payment-interval holes shut.",
      "Collapsed three separate logins into one entry point, and fixed the redirect dead-end that stranded you after sign-in.",
      "One app shell now spans members, community, games and account.",
      "Admin can read and reply to email over IMAP without leaving the dashboard.",
    ],
  },
  {
    date: "2026-07-10",
    version: "v2.5",
    title: "The community feed, and a third game",
    type: "Shipped",
    notes: [
      "/community went live — an X-style feed with Reddit-style ranking, polls, threaded replies and moderation.",
      "Integra: a daily maths equation puzzle, Nerdle-style.",
      "One verified account is now one identity — contact, newsletter, donations, games and membership all link by email.",
      "Split the front door: a buyer homepage on the AEO wedge, with the personal site moved to /me.",
    ],
  },
  {
    date: "2026-07-09",
    version: "v2.4",
    title: "Torch mode",
    type: "Added",
    notes: [
      "An extra-dark theme lit by a diya that follows your cursor.",
      "Memberships can now be gifted, with a congratulations email to the recipient.",
      "Retired the photo gallery — it crashed on publish in production and wasn't worth the fix.",
    ],
  },
  {
    date: "2026-07-08",
    version: "v2.3",
    title: "Capabilities, not tiers",
    type: "Added",
    notes: [
      "Access is now decided by named capabilities rather than hardcoded plan checks, so what a plan unlocks is editable from admin.",
      "The puzzle archive is gated on view_archive — today and yesterday stay free for everyone.",
      "Relabelled Premium to Member, with an honest Free vs Member comparison.",
    ],
  },
  {
    date: "2026-07-07",
    version: "v2.2",
    title: "The members platform",
    type: "Shipped",
    notes: [
      "/members went live: resource catalog with gated detail pages, bookmarks, reading progress, downloads and requests.",
      "Razorpay subscriptions end to end — checkout, webhook, upgrade flow and account management.",
      "A full admin CMS behind it: resources, taxonomy, announcements and member management.",
      "Tool registry with a UTM builder and usage analytics.",
    ],
  },
  {
    date: "2026-07-05",
    version: "v2.1",
    title: "Leaderboards, and an admin that looks the part",
    type: "Added",
    notes: [
      "Games got leaderboards with game and period tabs, plus player profiles with stats and renameable usernames.",
      "Redesigned the entire admin across seven passes — shell, dashboard, and every list page onto a real data table.",
      "SEO audit dashboard with an auto-updating sitemap.",
      "Alfazy now validates guesses against a real dictionary, with words managed from admin.",
    ],
  },
  {
    date: "2026-07-04",
    version: "v2.0",
    title: "Alfazy and Hit and Blow",
    type: "Shipped",
    notes: [
      "Two daily puzzle games, live: Alfazy (words) and Hit and Blow (digits).",
      "One deterministic daily engine behind both — same puzzle worldwide, IST reset, live countdown.",
      "Server-side anti-cheat validates every guess; archive replays never pollute your stats.",
      "Sign in to keep streaks, or play anonymously.",
    ],
  },
  {
    date: "2026-07-04",
    version: "v1.6",
    title: "Razorpay, and faster public pages",
    type: "Improved",
    notes: [
      "Replaced Zoho Payments with Razorpay across /support.",
      "Public pages are static again (ISR) instead of force-dynamic, with on-demand revalidation when content changes.",
      "Added /link — a Linktree-style page, managed from admin.",
    ],
  },
  {
    date: "2026-06-21",
    version: "v1.5",
    title: "Icons in, analytics out",
    type: "Fixed",
    notes: [
      "New favicons and PWA icons.",
      "Added a Google Tag Manager container, then reverted it the same day — it wasn't earning its weight on the page.",
    ],
  },
  {
    date: "2026-06-18",
    version: "v1.4",
    title: "Findable by machines",
    type: "Improved",
    notes: [
      "Per-post OG images, plus Service, Product, Review and speaking schema.",
      "GEO/AEO groundwork: RSS, llms-full.txt, IndexNow, ProfilePage and content freshness signals.",
      "Real social profiles in sameAs, so the entity actually disambiguates.",
      "Cleared every eslint error and warning.",
    ],
  },
  {
    date: "2026-06-17",
    version: "v1.3",
    title: "Updates, and a way to reply to them",
    type: "Added",
    notes: [
      "/support/updates became a real feed with reactions and threaded comments.",
      "Commenters verify by email OTP — no account required, and supporter tier resolves from the email itself.",
      "Successful payments auto-post a thank-you.",
      "Smart links in article bodies, with an affiliate-domain allowlist managed from admin.",
      "Brand orange now shows up on interaction only.",
    ],
  },
  {
    date: "2026-06-16",
    version: "v1.2",
    title: "The plumbing",
    type: "Added",
    notes: [
      "Branded email templates, welcome and unsubscribe flows.",
      "Contact submissions persist, with SMTP notify and auto-reply.",
      "Subscribers sync to Kit, and export as CSV.",
      "The real logo landed, with light and dark variants.",
    ],
  },
  {
    date: "2026-06-15",
    version: "v1.1",
    title: "The site runs on its own database",
    type: "Improved",
    notes: [
      "Case studies, products, services, testimonials and the homepage all read from the database instead of hardcoded files.",
      "Full block editors for the blog — 50 block types, grouped behind one add menu.",
      "Read-only payments dashboard over supports.",
    ],
  },
  {
    date: "2026-06-13",
    version: "v1.0",
    title: "The site goes up",
    type: "Shipped",
    notes: [
      "Built the founder site on Next.js with a monochrome design system, dark by default.",
      "Admin foundation: cookie-based auth, RLS gate, and a blog that runs end to end from the dashboard.",
      "/support shipped with a live Supabase backend.",
    ],
  },
];

export const roadmap: RoadmapItem[] = [
  { title: "Community", description: "A space for founders building distribution — feed, polls, replies, moderation.", status: "Shipped", quarter: "Q3 2026" },
  { title: "Daily games", description: "Alfazy, Integra and Hit and Blow — three daily puzzles on one engine.", status: "Shipped", quarter: "Q3 2026" },
  { title: "Members platform", description: "Gated resources, subscriptions, and a capability engine behind them.", status: "Shipped", quarter: "Q3 2026" },
  { title: "Component library", description: "A public, reusable design system.", status: "Shipped", quarter: "Q2 2026" },
  { title: "Command palette", description: "Keyboard-first navigation everywhere.", status: "Shipped", quarter: "Q2 2026" },
  { title: "KalamAI", description: "SEO, AEO and GEO research and writing, gated to members. Research engine live; writing engine next.", status: "In Progress", quarter: "Q3 2026" },
  { title: "Semantic search", description: "Intent-based search across articles and tools.", status: "Planned", quarter: "Q4 2026" },
  { title: "Glossary (200 terms)", description: "An interlinked marketing & SaaS glossary.", status: "Planned", quarter: "Q4 2026" },
  { title: "Frameworks library", description: "Named, original frameworks as standalone pages.", status: "Planned", quarter: "Q4 2026" },
  { title: "Ask Shubham (AI)", description: "A chatbot trained on all published content, answering with citations.", status: "Exploring", quarter: "TBD" },
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
