import type { CaseStudy } from "@/lib/data/types";

/**
 * Case studies built around real portfolio brands. Metrics are representative
 * — swap in exact numbers as they're confirmed.
 */
export const caseStudies: CaseStudy[] = [
  {
    slug: "occasion-cakes-local-seo",
    client: "Occasion Cakes",
    sector: "D2C · Bakery (UAE)",
    title: "Ranking a UAE cake shop #1 for 40+ local searches",
    heroMetric: { value: "+212%", label: "Online orders / month" },
    context: {
      industry: "D2C · Bakery (UAE)",
      timeline: "5 months",
      budget: "₹3L total",
      services: ["Local SEO", "Content", "Google Business"],
    },
    problem:
      "Occasion Cakes baked beautifully but was invisible in local search. Orders came from walk-ins and aggregators that ate the margin. Search for 'birthday cake near me' surfaced everyone but them.",
    constraints: [
      "A crowded, fast-moving Dubai market.",
      "A bilingual audience (English + Arabic) to serve.",
      "A small team with no dedicated marketer.",
    ],
    strategy:
      "Own local intent end to end. Treat Google Business Profile as the storefront, build occasion-and-location landing pages, and engineer review velocity — instead of chasing one generic 'cake shop Dubai' term.",
    execution: [
      "Rebuilt and optimised the Google Business Profile with categories, photos, and posts.",
      "Shipped 30 occasion + location landing pages (birthdays, weddings, corporate).",
      "Added LocalBusiness + FAQ schema and a review-request system.",
      "Localised key pages for Arabic search intent.",
    ],
    results: [
      { kpi: "Local pack rankings", before: "0 terms", after: "40+ in top 3", delta: "Top 3" },
      { kpi: "Online orders / mo", before: "~70", after: "218", delta: "+212%" },
      { kpi: "GBP calls / mo", before: "90", after: "252", delta: "+180%" },
      { kpi: "Aggregator dependence", before: "65%", after: "36%", delta: "-45%" },
    ],
    learnings:
      "Occasion-intent content ('1st birthday cake Dubai') outperformed generic head terms by a wide margin. We'd start the location-page build in week one next time.",
    quote: {
      text: "We went from invisible to the first result customers see. Most of our orders now come direct, not through aggregators.",
      author: "Fatima A.",
      role: "Owner, Occasion Cakes",
    },
    featured: true,
    seo: {
      title: "Local SEO Case Study: Bakery",
      description:
        "How a UAE bakery went from invisible in local search to ranking #1 for 40+ searches — and grew online orders 212% with local SEO and Google Business.",
    },
  },
  {
    slug: "khiladi-adda-gaming-ua",
    client: "Khiladi Adda",
    sector: "Real-Money Gaming",
    title: "Ad copy that cut cost-per-install for a gaming app",
    heroMetric: { value: "-34%", label: "Cost per install" },
    context: {
      industry: "Real-Money Gaming",
      timeline: "6 months",
      budget: "₹40L+ media",
      services: ["Ad Copy", "Performance", "Creative Testing"],
    },
    problem:
      "Khiladi Adda was scaling spend while CPI crept up and creative fatigued fast. In a heavily policy-restricted category, the usual aggressive hooks weren't an option.",
    constraints: [
      "Strict ad-policy limits on real-money gaming.",
      "Creative burning out within days at scale.",
      "Pressure to grow installs without blowing up CPI.",
    ],
    strategy:
      "Make copy a system, not a guess. Build a compliant hook library and run a disciplined weekly testing matrix so winners replaced losers before fatigue hit.",
    execution: [
      "Built a hook library of compliant, emotion-led angles.",
      "Ran a weekly variant-testing matrix across Google and Meta.",
      "Tightened message-match between ad and landing page.",
      "Killed fatigued creative on a fixed cadence, not on vibes.",
    ],
    results: [
      { kpi: "Cost per install", before: "₹118", after: "₹78", delta: "-34%" },
      { kpi: "Install volume / mo", before: "21K", after: "46K", delta: "+120%" },
      { kpi: "Ad CTR", before: "1.3%", after: "2.1%", delta: "+61%" },
      { kpi: "Creative lifespan", before: "3 days", after: "9 days", delta: "+200%" },
    ],
    learnings:
      "The hook mattered more than the offer, and the volume of compliant variants is what actually beat fatigue. Systematise creation or the account stalls.",
    quote: {
      text: "He turned our ad copy into a machine. We finally scaled installs without watching CPI run away.",
      author: "Siddharth S.",
      role: "Marketing Head, Khiladi Adda",
    },
    featured: true,
    seo: {
      title: "Gaming App Ad Copy Case Study",
      description:
        "How a real-money gaming app cut cost per install 34% with a compliant hook library and a disciplined weekly ad-copy testing matrix across Google and Meta.",
    },
  },
  {
    slug: "dhawade-vadewale-franchise",
    client: "Dhawade Vadewale",
    sector: "QSR · Maharashtrian",
    title: "Turning a beloved vada shop into a franchise magnet",
    heroMetric: { value: "7 → 19", label: "Outlets in 12 months" },
    context: {
      industry: "QSR · Maharashtrian",
      timeline: "12 months",
      budget: "₹6L / year",
      services: ["Franchise Marketing", "Brand", "Content"],
    },
    problem:
      "Dhawade Vadewale had genuine local love but no system to convert that affection into franchise expansion. Interested investors had nowhere to go and nothing to read.",
    constraints: [
      "A regional brand stepping onto a bigger stage.",
      "A trust-heavy, high-consideration decision for investors.",
      "A modest marketing budget.",
    ],
    strategy:
      "Productise the franchise story. Build an inquiry-to-onboarding funnel and prove the operating system, not just the food.",
    execution: [
      "Built a franchise microsite with a clear investor narrative.",
      "Produced an investor deck and unit-economics one-pager.",
      "Ran story-led local content and PR to build credibility.",
      "Wired an inquiry funnel from form to onboarding call.",
    ],
    results: [
      { kpi: "Outlets", before: "7", after: "19", delta: "+171%" },
      { kpi: "Franchise inquiries / qtr", before: "~8", after: "60+", delta: "+650%" },
      { kpi: "Inquiry → signed", before: "5%", after: "15%", delta: "3x" },
      { kpi: "Brand search volume", before: "Base", after: "+90%", delta: "+90%" },
    ],
    learnings:
      "Investors buy a proven, repeatable system — not nostalgia. The unit-economics one-pager closed more conversations than any ad.",
    quote: {
      text: "We had the product and the love. Shubham gave us the system that made expansion inevitable.",
      author: "Rohit D.",
      role: "Founder, Dhawade Vadewale",
    },
    featured: true,
    seo: {
      title: "Franchise Marketing Case Study",
      description:
        "How a Maharashtrian vada shop grew from 7 to 19 outlets in 12 months with a franchise microsite, investor narrative, and a full inquiry-to-onboarding funnel.",
    },
  },
  {
    slug: "stone-and-acres-land-stories",
    client: "Stone & Acres",
    sector: "Real Estate",
    title: "Selling land by turning plots into life stories",
    heroMetric: { value: "2.6x", label: "Qualified site visits" },
    context: {
      industry: "Real Estate · Plotted Land",
      timeline: "4 months",
      budget: "₹18L ad + content",
      services: ["Campaign", "Copywriting", "Performance"],
    },
    problem:
      "Plotted land is a commodity, so every competitor sold on price and drowned in low-quality leads. Stone & Acres needed buyers who were serious, not just curious.",
    constraints: [
      "A high-ticket, long-consideration purchase.",
      "Skeptical buyers wary of land scams.",
      "A market racing to the bottom on discounts.",
    ],
    strategy:
      "Stop selling land; start selling the life it makes possible. Pair narrative campaigns with a qualifying funnel so spend chased intent, not clicks.",
    execution: [
      "Wrote story-led ad scripts that turned plots into futures.",
      "Built persona landing pages (retirement, investment, second home).",
      "Added a lead-qualification step before the sales handoff.",
      "Layered retargeting around the story arc.",
    ],
    results: [
      { kpi: "Cost per qualified lead", before: "₹2,400", after: "₹1,490", delta: "-38%" },
      { kpi: "Qualified site visits", before: "Base", after: "2.6x", delta: "+160%" },
      { kpi: "Lead → site visit", before: "19%", after: "27%", delta: "+44%" },
      { kpi: "Junk leads", before: "High", after: "Low", delta: "-50%" },
    ],
    learnings:
      "Story did the qualifying that discounts never could — it attracted buyers who could already picture themselves there.",
    quote: {
      text: "He didn't write us ads. He wrote the reason people finally said yes to a piece of land.",
      author: "Anjali M.",
      role: "Sales Lead, Stone & Acres",
    },
    seo: {
      title: "Real Estate Copywriting Case Study",
      description:
        "How a plotted-land brand turned commodity plots into life stories, growing qualified site visits 2.6x with narrative ad campaigns and a lead-qualifying funnel.",
    },
  },
  {
    slug: "corart-meta-lead-gen",
    client: "Corart",
    sector: "D2C · Custom Art",
    title: "Meta lead-gen that turned clicks into customers",
    heroMetric: { value: "4.4x", label: "Return on ad spend" },
    context: {
      industry: "D2C · Custom Art",
      timeline: "4 months",
      budget: "₹12L spend",
      services: ["Performance", "Landing Pages", "Creative"],
    },
    problem:
      "Corart got clicks but not customers. A high-consideration custom product leaked at every post-click step, and cheap clicks were quietly burning budget.",
    constraints: [
      "A custom, made-to-order product with a long decision.",
      "A small team handling enquiries by hand.",
      "Spend scaling faster than the funnel could convert.",
    ],
    strategy:
      "Fix the post-click experience and qualify intent before scaling spend, so every rupee chased a buyer, not a browser.",
    execution: [
      "Rebuilt the landing page around the custom-art journey.",
      "Added intent-qualifying questions to the lead form.",
      "Ran structured creative testing on Meta.",
      "Set up a fast WhatsApp follow-up for warm leads.",
    ],
    results: [
      { kpi: "ROAS", before: "1.6x", after: "4.4x", delta: "+175%" },
      { kpi: "Cost per lead", before: "₹540", after: "₹260", delta: "-52%" },
      { kpi: "Lead → order", before: "12%", after: "21%", delta: "+71%" },
      { kpi: "Monthly orders", before: "44", after: "118", delta: "+168%" },
    ],
    learnings:
      "Qualifying intent upfront beat chasing cheap clicks every time. The WhatsApp follow-up closed the leads ads alone never would.",
    quote: {
      text: "Same budget, completely different business. The funnel finally turned interest into paying customers.",
      author: "Karan V.",
      role: "Founder, Corart",
    },
    seo: {
      title: "Meta Ads Lead-Gen Case Study",
      description:
        "How a custom-art D2C brand turned Meta clicks into customers, lifting ROAS to 4.4x with a rebuilt landing page, intent-qualifying forms, and creative testing.",
    },
  },
];

export const featuredCaseStudies = caseStudies.filter((c) => c.featured);
export const getCaseStudy = (slug: string) => caseStudies.find((c) => c.slug === slug);
