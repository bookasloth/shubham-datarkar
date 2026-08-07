/**
 * Content for the /seo-expert-in-nagpur Google-Ads conversion landing page.
 * High-intent paid traffic — every section answers one objection and pushes
 * toward the free consultation. Copy is hand-written and provided by the owner;
 * metrics mirror the real case studies in src/lib/data/case-studies.ts.
 *
 * Keyword surface (woven into headings/body, never stuffed): SEO Expert in
 * Nagpur, Best SEO Consultant in Nagpur, SEO Services in Nagpur, Local SEO
 * Expert, SEO Company in Nagpur, Technical SEO, Google Business Profile
 * Optimization, Organic Traffic Growth, AI Search Optimization, GEO.
 */

export type NagpurCaseStudy = { client: string; sector: string; result: string; slug?: string };

export const seoExpertNagpur = {
  path: "/seo-expert-in-nagpur",
  metaTitle: "SEO Expert in Nagpur",
  metaDescription:
    "SEO Expert in Nagpur helping local businesses, startups, and brands get more customers from Google. Book a free 30-minute SEO consultation and custom roadmap.",

  hero: {
    h1: "SEO Expert in Nagpur Who Helps Businesses Get More Customers, Not Just Higher Rankings",
    bullets: ["Free 30-min consultation", "Free website audit", "Custom growth roadmap"],
    paragraph:
      "Whether you're a local business, startup, ecommerce brand, or established company, I help you generate sustainable leads through search. Every strategy is tailored to your industry, competition, and business goals — so you're investing in growth that compounds month after month.",
    cta: "Book Your Free Consultation",
  },

  // AEO answer passage — self-contained, quotable by answer engines.
  answer:
    "An SEO expert in Nagpur helps a business get found by the customers already searching for it on Google — and turns that visibility into enquiries, calls, and sales. I'm Shubham Datarkar, a Nagpur-based SEO consultant who builds revenue-first search strategies for local businesses, startups, ecommerce brands, and service companies across Nagpur and India.",

  trust: {
    heading: "SEO Results Across Industries.",
    paragraph:
      "From local restaurants and real estate to ecommerce and gaming, every business has a different search challenge. Here's how SEO — technical, local, and content — translated into organic traffic, rankings, and revenue.",
    stats: [
      { value: "150+", label: "SEO campaigns" },
      { value: "7+ yrs", label: "Experience" },
      { value: "Millions", label: "Organic visits generated" },
      { value: "20+", label: "Industries served" },
    ],
    /** Real client names shown as a text trust strip (SEO clients only). */
    names: ["Everything Powerlifting", "Occasion Cakes", "Stone & Acres", "The Bogus Company", "Khiladi Adda", "Dhawade Vadewale"],
    /** SEO-only result cards. Every line talks about search, nothing else. */
    results: [
      { name: "Everything Powerlifting", tag: "Ecommerce SEO", description: "Technical SEO, content, and topical authority that tripled monthly organic traffic." },
      { name: "Occasion Cakes", tag: "Local SEO", description: "Google Business Profile and location pages that ranked #1 for 40+ local searches and lifted online orders 212%." },
      { name: "Stone & Acres", tag: "Local SEO", description: "Location-based SEO and optimized landing pages that grew qualified organic visits 2.6x." },
      { name: "The Bogus Company", tag: "Content SEO", description: "Search-first content that ranked pages and pulled sustained organic traffic." },
      { name: "Khiladi Adda", tag: "SEO Growth", description: "Search and content SEO that compounded organic acquisition for a gaming platform." },
      { name: "Dhawade Vadewale", tag: "Local SEO", description: "Local SEO for a restaurant franchise to capture nearby, high-intent search demand." },
    ],
  },

  whyHire: {
    heading: "SEO That Starts With Revenue, Not Rankings.",
    paragraph:
      "Ranking first means very little if it doesn't generate enquiries, sales, or appointments. Every SEO strategy I build begins with understanding your business model, customer journey, and revenue goals before touching keywords or content.",
    points: [
      "Local SEO for Nagpur businesses",
      "Technical SEO audits",
      "Content strategy & topical authority",
      "AI Search & GEO optimization",
      "Google Business Profile optimization",
      "Conversion-focused landing pages",
    ],
  },

  problems: {
    heading: "Your Website Should Be Bringing Customers Every Day.",
    paragraph:
      "Most websites don't fail because they're ugly. They fail because search engines can't understand them, customers can't find them, or visitors don't convert once they arrive.",
    items: [
      "Website isn't ranking",
      "Organic traffic is declining",
      "Competitors dominate Google",
      "Google Business Profile gets few calls",
      "Leads are inconsistent",
      "Previous SEO agency delivered no measurable results",
    ],
    cta: "Let's Fix That",
  },

  consultation: {
    heading: "A Practical SEO Strategy Session, Not a Sales Pitch.",
    paragraph:
      "You'll leave the consultation with actionable insights — whether or not we decide to work together.",
    covers: [
      "Complete website audit",
      "Keyword opportunity analysis",
      "Competitor review",
      "Technical SEO issues",
      "Content gaps",
      "Local SEO opportunities",
      "Quick wins",
      "Growth roadmap for the next 90 days",
    ],
    duration: "30 Minutes",
    cost: "Absolutely Free",
    cta: "Reserve Your Slot",
  },

  process: {
    heading: "A Proven Process Built Around Sustainable Growth",
    steps: [
      { step: "Business Discovery", detail: "Understand your products, customers, competitors, and goals." },
      { step: "Technical SEO Audit", detail: "Identify crawl, speed, indexing, and structural issues." },
      { step: "Keyword & Opportunity Research", detail: "Find keywords that actually generate business." },
      { step: "Content Strategy", detail: "Build authority through high-quality, search-focused content." },
      { step: "Authority Building", detail: "Strengthen your website with digital PR, backlinks, and brand signals." },
      { step: "Measure & Improve", detail: "Monthly reporting, insights, and continuous optimization." },
    ],
  },

  whyWork: {
    heading: "More Than an SEO Consultant. A Growth Partner.",
    features: [
      "No long-term contracts",
      "Transparent reporting",
      "Direct communication",
      "AI-powered SEO workflows",
      "Business-first strategies",
      "Experience across multiple industries",
      "Local SEO expertise",
      "Technical and content SEO under one roof",
    ],
  },

  industries: {
    heading: "SEO Strategies Built for Different Business Models",
    items: [
      "Local Businesses",
      "Healthcare",
      "Real Estate",
      "Restaurants",
      "Ecommerce",
      "SaaS",
      "Startups",
      "Professional Services",
      "Educational Institutes",
      "D2C Brands",
    ],
  },

  caseStudies: {
    heading: "Real Businesses. Measurable Growth.",
    items: [
      {
        client: "Occasion Cakes",
        sector: "Local SEO · Food & Beverage",
        result:
          "Ranked #1 for over 40 local search terms, resulting in a 212% increase in monthly online orders.",
        slug: "occasion-cakes-local-seo",
      },
      {
        client: "Everything Powerlifting",
        sector: "Ecommerce · D2C",
        result: "Tripled monthly organic traffic through technical SEO, content strategy, and topical authority.",
        slug: "everything-powerlifting-seo",
      },
      {
        client: "Stone & Acres",
        sector: "Real Estate",
        result: "Increased qualified organic visits by 2.6x through location-based SEO and optimized landing pages.",
        slug: "stone-and-acres-land-stories",
      },
    ] as NagpurCaseStudy[],
    cta: "View All Case Studies",
  },

  faqs: [
    {
      question: "How long does SEO take?",
      answer:
        "Most businesses begin seeing measurable improvements within 3 to 6 months, depending on competition and website health.",
    },
    {
      question: "Do you guarantee rankings?",
      answer:
        "No ethical SEO expert can guarantee rankings. I focus on improving visibility, traffic, and business outcomes using proven strategies.",
    },
    {
      question: "Do you work only with businesses in Nagpur?",
      answer: "No. While I'm based in Nagpur, I work with businesses across India and internationally.",
    },
    {
      question: "Do you provide Local SEO?",
      answer:
        "Yes. Local SEO, Google Business Profile optimization, citation management, and location landing pages are core services.",
    },
    {
      question: "Can you audit my current SEO agency?",
      answer: "Absolutely. I'll review their work, identify gaps, and recommend improvements.",
    },
    {
      question: "How much does SEO cost?",
      answer:
        "Every business has different requirements. Pricing depends on your goals, competition, and website size. We'll discuss this during the consultation.",
    },
  ],

  about: {
    heading: "Meet Your SEO Growth Partner",
    paragraph:
      "I'm Shubham Datarkar, an SEO consultant and digital marketer who believes SEO should drive business growth, not vanity metrics. Over the years, I've helped startups, local businesses, ecommerce brands, and established companies improve their search visibility, generate qualified leads, and build sustainable organic growth through data-driven strategies.",
  },

  finalCta: {
    heading: "Ready to Grow Your Business Through Google?",
    paragraph:
      "Let's uncover what's holding your website back and build an SEO strategy tailored to your business. Book a free consultation today and receive a practical roadmap you can start implementing immediately.",
    cta: "Book Your Free SEO Consultation",
  },

  updatedAt: "2026-08-07",
};
