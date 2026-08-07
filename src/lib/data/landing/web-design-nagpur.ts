/**
 * Content for the /web-developer-nagpur conversion landing page, targeting
 * "Web Developer and Design in Nagpur". Design + development, one person, end
 * to end. Copy is hand-written; the portfolio is the owner's real, live work
 * (links open the actual sites). No fabricated metrics — proof is the shipped
 * sites themselves.
 *
 * Keyword surface (woven into headings/body, never stuffed): Web Developer in
 * Nagpur, Web Designer in Nagpur, Website Design in Nagpur, Web Development
 * Company in Nagpur, Ecommerce Website, Web App Development, Landing Page Design,
 * UI/UX Design, Website Redesign.
 */

export type WorkItem = { name: string; tag: string; description: string; url?: string };
export type WorkGroup = { key: string; label: string; count: string; blurb: string; items: WorkItem[] };

export const webDesignNagpur = {
  path: "/web-developer-nagpur",
  metaTitle: "Web Developer & Design in Nagpur",
  metaDescription:
    "Web developer and designer in Nagpur building fast, modern, conversion-focused websites, stores, and web apps. 25+ sites shipped. Book a free design & build consultation.",

  hero: {
    h1: "Web Developer & Designer in Nagpur Who Builds Websites That Win Customers, Not Just Awards",
    bullets: ["Free design & build consultation", "Fixed scope, fixed price", "Live in weeks, not months"],
    paragraph:
      "Need a new website, a redesign, an online store, or a full web app? I design and build it end to end — fast, mobile-first, SEO-ready, and made to turn visitors into enquiries. One person, one point of contact, from first sketch to launch.",
    cta: "Book Your Free Consultation",
  },

  answer:
    "A web developer and designer in Nagpur plans, designs, and builds the website or web app a business runs on — and makes it fast, findable, and built to convert. I'm Shubham Datarkar, a Nagpur-based designer-developer who has shipped 25+ live websites and products for local businesses, brands, startups, and agencies across Nagpur and India.",

  trust: {
    heading: "25+ Sites Shipped. One Person, End to End.",
    paragraph:
      "Agencies, real estate, e-commerce, startups, restaurants, and non-profits — every site below is real, live, and built from design through development. Tap any of them to see the work.",
    stats: [
      { value: "25+", label: "Websites shipped" },
      { value: "8+", label: "Products built" },
      { value: "10+ yrs", label: "On the web" },
      { value: "1", label: "Designer + developer" },
    ],
  },

  /** The real, live portfolio — links open the actual sites. */
  portfolio: [
    {
      key: "agencies",
      label: "Agencies & studios",
      count: "4",
      blurb: "Brand-forward sites for agencies and creative studios.",
      items: [
        { name: "Zest Creative", tag: "Agency", description: "Creative and branding agency site.", url: "https://zestcreative.in/" },
        { name: "Zest Digital", tag: "Agency", description: "Performance-marketing agency site.", url: "https://zestdigital.in/" },
        { name: "The Grey Hawks", tag: "Agency", description: "Full-service agency brand site.", url: "https://thegreyhawks.com/" },
        { name: "Ashlar Studio", tag: "Studio · launching soon", description: "Design studio site, in build.", url: "https://ashlar-studio.vercel.app/" },
      ],
    },
    {
      key: "real-estate",
      label: "Real estate & spaces",
      count: "4",
      blurb: "Project showcases and lead capture for developers and spaces.",
      items: [
        { name: "Krishna Group", tag: "Real Estate", description: "Developer site to showcase projects and capture leads.", url: "https://www.krishnagrouppune.com/" },
        { name: "Sankalp Group", tag: "Real Estate", description: "Property developer site with projects and enquiries.", url: "https://www.sankalpgrouppune.com/" },
        { name: "Tarangan", tag: "Real Estate", description: "Residential project microsite.", url: "http://shubhamdtarangan.com/" },
        { name: "Eureka Coworking", tag: "Coworking", description: "Coworking brand site with space tours and enquiries.", url: "https://eurekacoworking.in/" },
      ],
    },
    {
      key: "commerce",
      label: "Commerce & brands",
      count: "6",
      blurb: "Storefronts and brand sites built to sell.",
      items: [
        { name: "Prenix Furniture", tag: "E-commerce", description: "Furniture brand storefront.", url: "https://prenixfurniture.com/" },
        { name: "Shree Ambica Touch", tag: "Brand", description: "Product brand website.", url: "https://shreeambicatouch.com/" },
        { name: "Sugar Spoon", tag: "Bakery", description: "Bakery site with menu and online ordering.", url: "https://sugarspoon.in/" },
        { name: "Occasions Cakes", tag: "Bakery", description: "Cake-shop storefront and ordering.", url: "https://occasionscakesindia.com/" },
        { name: "Everything Powerlifting", tag: "E-commerce", description: "Strength-gear store.", url: "https://everythingpowerlifting.com/" },
        { name: "Upsilon", tag: "Brand", description: "Brand and product site.", url: "https://upsilonofficial.com/" },
      ],
    },
    {
      key: "products",
      label: "Startups & products",
      count: "5",
      blurb: "SaaS and product sites built end to end.",
      items: [
        { name: "Book A Sloth", tag: "SaaS", description: "Booking platform and plugin for small businesses.", url: "https://bookasloth.com/" },
        { name: "Wecos", tag: "SaaS", description: "Internet product site.", url: "https://wecos.co/" },
        { name: "KalamAI", tag: "AI Tool", description: "AI content tool.", url: "https://shubhamdatarkar.com/tools/kalamai" },
        { name: "Crisp Minds", tag: "Startup", description: "Company and product site.", url: "https://crispminds.com/" },
        { name: "DigiGold", tag: "Fintech", description: "Digital-gold product site.", url: "https://digigold.com/" },
      ],
    },
    {
      key: "media-personal",
      label: "Media, personal & community",
      count: "6",
      blurb: "Creator, media, and non-profit sites with personality.",
      items: [
        { name: "Snoozz", tag: "Brand", description: "Brand and product site.", url: "https://snoozz.in/" },
        { name: "Raka Entertainment", tag: "Video / Media", description: "Video-production house site.", url: "https://rakaentertainment.com/" },
        { name: "Shubham Datarkar", tag: "Personal", description: "This site — personal brand, tools, and community.", url: "https://shubhamdatarkar.com/" },
        { name: "The Kalam Wala", tag: "Personal", description: "Writer and creator brand site.", url: "https://thekalamwala.com/" },
        { name: "DRU Foundation", tag: "Non-profit", description: "Women-empowerment NGO with donations and impact stories.", url: "https://drufoundation.org/" },
        { name: "NNAWCA", tag: "Community · launching soon", description: "Alumni community hub, in build.", url: "https://nnawca.vercel.app/" },
      ],
    },
  ] as WorkGroup[],

  whyHire: {
    heading: "Design and Development, Under One Roof.",
    paragraph:
      "Most projects stall in the handoff between a designer who can't code and a developer who can't design. I do both — so the site you approve is the site that ships, faster and without the telephone game.",
    points: [
      "Design + development by one person",
      "Conversion-first, not decoration",
      "SEO-ready and fast from day one",
      "Mobile-first, every screen",
      "Fixed scope, fixed price",
      "Support after launch",
    ],
  },

  services: {
    heading: "What I build",
    items: [
      { h3: "Business & brand websites", definition: "The site your customers judge you by — clear, fast, and structured so a first-time visitor gets it in seconds." },
      { h3: "Landing pages that convert", definition: "Single-purpose pages built around one action — an enquiry, a booking, a sale — tuned to turn ad and search traffic into leads." },
      { h3: "E-commerce stores", definition: "Storefronts that load fast, rank, and make it effortless to go from browsing to checkout." },
      { h3: "Web apps & SaaS", definition: "Custom tools, dashboards, and full products built end to end — the same way I build my own software ventures." },
      { h3: "Website redesigns", definition: "Rebuilding slow, dated, or half-finished sites into something that works — often the same week — without losing your SEO." },
      { h3: "UI/UX & design systems", definition: "Interfaces and reusable component systems that stay consistent as your product grows." },
    ],
  },

  problems: {
    heading: "Is Your Website Holding You Back?",
    paragraph:
      "Most sites don't fail because they're ugly. They fail because they're slow, invisible in search, off-brand, or don't turn a single visitor into an enquiry.",
    items: [
      "Outdated or slow website",
      "Doesn't bring any enquiries",
      "Looks nothing like your brand",
      "Breaks on mobile",
      "A half-finished project someone abandoned",
      "No one left to maintain it",
    ],
    cta: "Let's Fix That",
  },

  consultation: {
    heading: "A Real Plan for Your Website, Not a Sales Pitch.",
    paragraph: "You'll leave with a clear scope, a design direction, and a fixed quote — whether or not we work together.",
    covers: [
      "Review your current site or brand",
      "Define goals and scope",
      "Sitemap and page plan",
      "Design direction",
      "Tech and performance plan",
      "A fixed timeline and quote",
    ],
    duration: "30 Minutes",
    cost: "Absolutely Free",
    cta: "Reserve Your Slot",
  },

  process: {
    heading: "A Simple, Predictable Way to Ship",
    steps: [
      { step: "Discovery & scope", detail: "Understand the business, the goal, and who the site is for. You get a fixed scope and plan." },
      { step: "Design", detail: "Real pages designed around your brand and conversion goals — not stock mockups." },
      { step: "Build", detail: "I develop the approved design in one pass — responsive, fast, and clean under the hood." },
      { step: "SEO & performance", detail: "Clean markup, metadata, and Core Web Vitals sorted before launch." },
      { step: "Launch", detail: "Deploy, wire up analytics and forms, and hand you something you can run." },
      { step: "Support", detail: "On tap for changes and improvements after go-live." },
    ],
  },

  whyWork: {
    heading: "More Than a Freelancer. A Build Partner.",
    features: [
      "No long-term contracts",
      "Fixed scope, fixed price",
      "Direct communication",
      "Design + dev in one",
      "SEO-ready builds",
      "Fast turnaround",
      "25+ shipped sites",
      "Support after launch",
    ],
  },

  industries: {
    heading: "Websites Built for Every Kind of Business",
    items: [
      "Local Businesses",
      "Real Estate",
      "Ecommerce & D2C",
      "Restaurants & Cafes",
      "Startups & SaaS",
      "Agencies & Studios",
      "Coworking Spaces",
      "Non-profits",
      "Personal Brands",
      "Professional Services",
    ],
  },

  faqs: [
    {
      question: "How much does a website cost in Nagpur?",
      answer:
        "It depends on scope — a landing page, a full business site, and a web app are very different jobs. I quote a fixed price per project after a short brief call, so you know the number before anything starts.",
    },
    {
      question: "How long does it take to build a website?",
      answer:
        "A focused landing page can go live in days; a full business site typically takes one to three weeks depending on pages and content. Web apps are scoped case by case. Designing and building in one pass keeps it faster than the usual agency handoff.",
    },
    {
      question: "Do you handle both design and development?",
      answer:
        "Yes — that's the point. I design and develop every project end to end, so there's no handoff, no telephone game, and the site you approve is the site that ships.",
    },
    {
      question: "Will my website be fast and good for SEO?",
      answer:
        "Yes. Every build ships fast, mobile-first, and with clean, crawlable markup and metadata, so it's ready to rank from launch. I run SEO as a discipline too, so the build never fights the ranking.",
    },
    {
      question: "Can you redesign or fix my existing website?",
      answer:
        "Often, yes — whether it's slow, dated, or a half-finished project someone left behind. I'll tell you honestly whether a redesign or a rescue is the better call, and preserve the SEO and content you've already earned.",
    },
    {
      question: "Do you build web apps, not just websites?",
      answer:
        "Yes. Alongside client sites I build and run my own software products — booking systems, dashboards, and SaaS tools — so custom app work is core to what I do, not something I outsource.",
    },
    {
      question: "Do you provide maintenance after launch?",
      answer:
        "Yes. I stay on tap for changes, fixes, and improvements after go-live, so you're never left with a site and no one to run it.",
    },
  ],

  about: {
    heading: "Meet Your Designer & Developer",
    paragraph:
      "I'm Shubham Datarkar, a Nagpur-based designer and developer who has shipped 25+ websites and 8+ software products for agencies, brands, startups, and non-profits. I believe a website's job is to win business, not awards — so I design for clarity and build for speed, and I run my own ventures on the same standards I hold client work to.",
  },

  finalCta: {
    heading: "Ready for a Website That Works as Hard as You Do?",
    paragraph:
      "Tell me what you need and you'll get a clear scope, a design direction, and a fixed price before anything starts. Book a free consultation today.",
    cta: "Book Your Free Consultation",
  },

  updatedAt: "2026-08-07",
};
