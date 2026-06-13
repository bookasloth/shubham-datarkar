import type { Author, BlogCategory, ContentBlock, Post } from "@/lib/data/types";

export const author: Author = {
  name: "Shubham Datarkar",
  role: "The Kalamwala",
  initials: "SD",
};

export const blogCategories: { slug: BlogCategory; label: string; description: string }[] = [
  { slug: "seo", label: "SEO", description: "Audits, architecture, and compounding organic growth." },
  { slug: "performance", label: "Performance", description: "Paid acquisition, ad copy, ROAS, and creative testing." },
  { slug: "content", label: "Content", description: "Editorial systems, copywriting, and distribution." },
  { slug: "ai", label: "AI", description: "Workflows, prompting, and automation that ships." },
  { slug: "saas", label: "SaaS", description: "Building, pricing, and growing internet products." },
  { slug: "founder", label: "Founder", description: "Operating ventures, mental models, and lessons from the field." },
];

/** A realistic long-form body, reused so every article page reads complete. */
function body(intro: string): ContentBlock[] {
  return [
    { type: "p", text: intro },
    {
      type: "callout",
      variant: "accent",
      title: "The short answer",
      text: "Structure beats noise. Build one mechanism that compounds, instrument it, then remove yourself from the loop. Everything below is how to do that without fooling yourself with vanity metrics.",
    },
    { type: "h2", text: "Why the usual approach quietly fails" },
    {
      type: "p",
      text: "The default failure mode is effort without leverage — doing more of the same and hoping volume rescues a weak mechanism. It rarely does. The work that compounds shares three traits: it is owned, it is measurable, and it gets better the more it runs.",
    },
    {
      type: "ul",
      items: [
        "Owned: it lives on an asset you control, not a rented feed.",
        "Measurable: one north-star number you check weekly, not a dashboard you ignore.",
        "Self-improving: each cycle feeds the next with data, links, or distribution.",
      ],
    },
    { type: "h2", text: "The mechanism, step by step" },
    {
      type: "p",
      text: "Start narrow. Pick the one query, channel, or surface where you can plausibly become the best answer within ninety days. Depth before breadth — a complete cluster outranks a scattered library every time.",
    },
    {
      type: "ol",
      items: [
        "Map the real demand — the questions in the words people actually use.",
        "Build the spine: one pillar asset, deeply interlinked with supporting pieces.",
        "Instrument it: define the single metric that proves it's working.",
        "Compound it: refresh, expand, and redistribute on a fixed cadence.",
      ],
    },
    {
      type: "quote",
      text: "Growth is not forced. It is designed.",
      cite: "An operating principle from the farm",
    },
    { type: "h3", text: "What this looks like in practice" },
    {
      type: "p",
      text: "In production this means treating every asset — a page, a campaign, a product — as infrastructure. It has an owner, a job in the funnel, and a review date. When something stops doing its job, you fix it; you don't bury it under new work.",
    },
    {
      type: "callout",
      variant: "info",
      text: "A useful test: if you stopped publishing for a month, would this still produce results? If yes, you built a system. If no, you bought a campaign.",
    },
    { type: "h2", text: "Common mistakes to avoid" },
    {
      type: "ul",
      items: [
        "Chasing volume before the mechanism converts a single unit of attention.",
        "Optimising for clicks instead of qualified intent.",
        "Letting AI replace your judgement instead of accelerating it.",
      ],
    },
    {
      type: "p",
      text: "Do the unglamorous version well and the compounding takes care of itself. That is the entire game.",
    },
  ];
}

export const posts: Post[] = [
  {
    slug: "rank-uae-cake-shop-local-seo",
    title: "How I Ranked a UAE Cake Shop #1 for 40+ Local Searches",
    excerpt: "The exact local-SEO system that took Occasion Cakes from invisible to the first result — and cut its dependence on aggregators.",
    category: "seo",
    tags: ["SEO", "Local SEO", "Case Study"],
    date: "2026-06-04",
    words: 2200,
    featured: true,
    body: body(
      "Most local businesses think SEO is a mystery. It isn't. For Occasion Cakes in the UAE, it was a system: own local intent completely, treat the Google Business Profile as the storefront, and let occasion-based content do the qualifying. Here's the whole playbook.",
    ),
  },
  {
    slug: "selling-land-by-telling-stories",
    title: "Selling Land by Telling Stories: The Stone & Acres Playbook",
    excerpt: "Plots are a commodity until you sell the life they make possible. How narrative copy out-qualified every discount.",
    category: "content",
    tags: ["Copywriting", "Real Estate", "Campaigns"],
    date: "2026-05-20",
    words: 1900,
    featured: true,
    body: body(
      "Everyone selling plotted land competes on price — and drowns in junk leads. We did the opposite for Stone & Acres: we stopped selling land and started selling the future it unlocks. Story became the qualifier discounts never could be.",
    ),
  },
  {
    slug: "ad-copy-that-cut-gaming-cpi",
    title: "Ad Copy That Cut Our Gaming App's CPI by 34%",
    excerpt: "In a policy-restricted category, the hook beat the offer. How a copy system, not a guess, scaled installs.",
    category: "performance",
    tags: ["Performance", "Ad Copy", "Creative Testing"],
    date: "2026-05-06",
    words: 2000,
    featured: true,
    body: body(
      "Scaling a real-money gaming app means fighting two enemies at once: rising CPI and creative fatigue, inside strict ad policies. The fix wasn't a clever line — it was turning copy into a testing system that replaced winners before they burned out.",
    ),
  },
  {
    slug: "franchise-marketing-investors-come-to-you",
    title: "Franchise Marketing: How to Make Investors Come to You",
    excerpt: "Productise the franchise story. The inquiry-to-onboarding system that took Dhawade Vadewale from 7 outlets to 19.",
    category: "performance",
    tags: ["Franchise", "Strategy", "Brand"],
    date: "2026-04-22",
    words: 1800,
    body: body(
      "A beloved brand isn't a franchise system. Investors don't buy nostalgia — they buy a proven, repeatable machine. Here's how we productised that story for a regional vada brand and made expansion feel inevitable.",
    ),
  },
  {
    slug: "from-copywriter-to-system-builder",
    title: "From Copywriter to System Builder",
    excerpt: "The shift from selling hours to designing leverage — and why it changed everything about how I work.",
    category: "founder",
    tags: ["Founder", "Essay", "Leverage"],
    date: "2026-04-08",
    words: 1500,
    body: body(
      "I started by selling words by the hour. Today I build systems that work whether I show up or not. The distance between those two is the whole story — and it's the most important shift a creative person can make.",
    ),
  },
  {
    slug: "seo-is-infrastructure-not-traffic",
    title: "SEO Is Infrastructure, Not Traffic",
    excerpt: "How to design organic growth as a compounding asset instead of a publishing routine you can never stop.",
    category: "seo",
    tags: ["SEO", "Strategy", "Systems"],
    date: "2026-03-25",
    words: 2100,
    body: body(
      "Most teams treat SEO like a content treadmill — publish forever or rankings die. That's not infrastructure; that's a job. Real SEO is built like a system that keeps paying out long after the work is done.",
    ),
  },
  {
    slug: "why-most-marketing-fails-before-it-starts",
    title: "Why Most Marketing Fails Before It Starts",
    excerpt: "The structural mistakes startups make before running their first campaign — and a 5-layer growth system to avoid them.",
    category: "content",
    tags: ["Strategy", "Growth", "Frameworks"],
    date: "2026-03-11",
    words: 1700,
    body: body(
      "Most marketing fails before a single rupee is spent — in the structure, not the execution. Fix the foundation and average campaigns outperform brilliant ones built on sand. Here's the 5-layer system I use to check it.",
    ),
  },
  {
    slug: "what-farming-taught-me-about-business",
    title: "What Farming Taught Me About Building a Business",
    excerpt: "You prepare soil before you expect a harvest. A year in agriculture reshaped how I think about growth.",
    category: "founder",
    tags: ["Founder", "Essay", "Mental Models"],
    date: "2026-02-26",
    words: 1300,
    body: body(
      "For a while I stepped away from the internet and worked the land. Farming doesn't care about your launch date. You prepare soil, respect cycles, and earn the harvest. That patience changed how I build everything since.",
    ),
  },
  {
    slug: "ai-in-my-actual-workflow",
    title: "AI in My Actual Workflow: What Sticks, What Doesn't",
    excerpt: "Where AI genuinely earns its place in research, drafting, and analysis — and where judgement still has to lead.",
    category: "ai",
    tags: ["AI", "Workflow", "Productivity"],
    date: "2026-02-12",
    words: 1600,
    body: body(
      "I run multiple ventures with a small footprint, and AI is a big reason it's possible. But it's a multiplier, not a replacement. Here's exactly where it lives in my workflow — and the places I refuse to hand over.",
    ),
  },
  {
    slug: "why-a-marketer-started-building-software",
    title: "Why a Marketer Started Building Software",
    excerpt: "Marketing led me to SEO, SEO to websites, websites to products. Why I stopped waiting on engineers and started shipping.",
    category: "saas",
    tags: ["SaaS", "Building", "Founder"],
    date: "2026-01-29",
    words: 1500,
    body: body(
      "Writing led me to SEO. SEO led me to websites. Websites led me to funnels — and eventually to building the software itself. Here's why a marketer learning to ship products is the most natural progression there is.",
    ),
  },
];

export const getPostsByCategory = (category: BlogCategory) => posts.filter((p) => p.category === category);
export const getPost = (slug: string) => posts.find((p) => p.slug === slug);
export const featuredPosts = posts.filter((p) => p.featured);
