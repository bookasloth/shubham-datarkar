export type WorkItem = { name: string; tag: string; description: string; url?: string };

export type PortfolioGroup = {
  key: string;
  label: string;
  count: string;
  blurb: string;
  items: WorkItem[];
};

/** The real body of work, grouped by craft. */
export const portfolio: PortfolioGroup[] = [
  {
    key: "web-hub",
    label: "Websites crafted",
    count: "20+",
    blurb: "Web Hub — sites built to showcase, capture, and convert.",
    items: [
      { name: "Krishna Group", tag: "Real Estate", description: "Crafted their digital space to showcase properties and capture leads." },
      { name: "Rajmudra Media", tag: "Media Agency", description: "Built their agency site to display work and attract clients." },
      { name: "DRU Foundation", tag: "Non-profit", description: "Gave a women-empowerment mission a strong digital presence for support and donations." },
      { name: "Gayatri School", tag: "Education", description: "A site to share admissions, updates, and community initiatives." },
      { name: "NNAWCA", tag: "Community", description: "A social hub for alumni to stay engaged.", url: "https://www.nnawca.org" },
      { name: "Dhawade Vadewale", tag: "Restaurant", description: "A site to showcase authentic Maharashtrian menus and drive online orders." },
    ],
  },
  {
    key: "app-box",
    label: "SaaS solutions rolled out",
    count: "8+",
    blurb: "App Box — software products shipped end to end.",
    items: [
      { name: "Book A Sloth", tag: "Scheduling", description: "A booking tool and plugin to help small businesses manage appointments.", url: "https://bookasloth.com" },
      { name: "Roast Me Now", tag: "Entertainment", description: "Turns a single input into witty roasts for entertainment." },
      { name: "Rank Snap", tag: "SEO", description: "An SEO audit tool that generates instant reports from a URL." },
      { name: "Ad Scribe", tag: "AI Copy", description: "An AI copywriter for high-converting ad headlines and CTAs." },
      { name: "Lead Loom", tag: "Productivity", description: "Track clients, payments, and deadlines — built for freelancers and solopreneurs." },
      { name: "Post Pilot", tag: "Content", description: "Auto-creates and schedules content calendars for brands." },
    ],
  },
  {
    key: "ink-pad",
    label: "Content pieces penned",
    count: "200+",
    blurb: "Ink Pad — words that rank, sell, and stick.",
    items: [
      { name: "The Bogus Company", tag: "SEO Writing", description: "SEO writing that ranked pages and pulled organic traffic." },
      { name: "Khiladi Adda", tag: "Ad Copy", description: "Google and social ad copy that drove user acquisition for a gaming platform." },
      { name: "Banarasee", tag: "Email", description: "Email marketing campaigns that drove e-commerce sales." },
      { name: "SEM Consultant Profile", tag: "Social", description: "Social posts that built a community around marketing insights." },
      { name: "Stone & Acres", tag: "Campaign", description: "Scripts that sold land by turning plots into life stories." },
      { name: "Game Plan", tag: "Book", description: "A book on the journey of two real-money gaming startups." },
    ],
  },
  {
    key: "mark-eating",
    label: "Marketing campaigns launched",
    count: "30+",
    blurb: "Mark-Eating — campaigns engineered for measurable growth.",
    items: [
      { name: "Occasion Cakes (UAE)", tag: "Local SEO", description: "An SEO strategy to rank the cake shop at the top for local searches." },
      { name: "Dhawade Vadewale", tag: "Franchise", description: "Franchise marketing systems to attract investors and expand locations." },
      { name: "Corart", tag: "Lead Gen", description: "Meta lead-gen campaigns turning clicks into customers for a custom-art brand." },
      { name: "The Grey Hawks", tag: "Agency", description: "Digital marketing strategies proving the agency's performance to clients." },
      { name: "Ashlar", tag: "Content", description: "A content strategy making an architecture-training platform a go-to resource." },
      { name: "Homso", tag: "Elderly Care", description: "Content marketing to build trust with families and generate inquiries." },
    ],
  },
  {
    key: "solo-lab",
    label: "Personal projects deployed",
    count: "6+",
    blurb: "Solo Lab — experiments, challenges, and things built for the joy of it.",
    items: [
      { name: "Four Fox Lab", tag: "Education", description: "A skill-training platform where I teach digital marketing." },
      { name: "NNAWCA Alumni Games", tag: "Community", description: "Created and moderated alumni games to keep the community engaged." },
      { name: "Corporate Puppets", tag: "Media", description: "An Instagram puppet show delivering witty commentary on corporate life." },
      { name: "The Parliament", tag: "Software", description: "After-sales support for an educational institute's networking platform." },
      { name: "30 Sites in 30 Days", tag: "Challenge", description: "Built one working single-page website daily for a month." },
      { name: "100 Days, 100 Ads", tag: "Challenge", description: "One spec ad a day for 100 brands to refine copywriting and design." },
    ],
  },
];

/** Flattened items for search indexing. */
export const portfolioItems = portfolio.flatMap((g) =>
  g.items.map((i) => ({ ...i, group: g.label })),
);

export const portfolioCounts = portfolio.map((g) => ({ count: g.count, label: g.label }));
