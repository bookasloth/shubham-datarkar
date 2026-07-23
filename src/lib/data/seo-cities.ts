/**
 * Tier-2 city SEO landing pages. Each entry is hand-written and materially
 * different — real local industries, real buyer profile, city-specific FAQs —
 * so the generated pages are genuine local pages, not doorway duplicates.
 *
 * "Market" here is expressed through the actual business composition of each
 * city (industries, exporter base, who buys SEO), not fabricated statistics.
 */
export type SeoCity = {
  slug: string;
  city: string;
  state: string;
  /** One-line positioning for the H1/hero. */
  lead: string;
  /** The local business economy — who is here, what they sell, why they need search. */
  market: string;
  /** The local search opportunity / why tier-2 SEO pays. */
  angle: string;
  /** Typical local buyers we work with in this city. */
  buyers: string[];
  faqs: { question: string; answer: string }[];
};

export const seoCities: SeoCity[] = [
  {
    slug: "nagpur",
    city: "Nagpur",
    state: "Maharashtra",
    lead: "SEO built for central India's logistics and manufacturing hub",
    market:
      "Nagpur runs on logistics, MIHAN-driven IT and aviation, pharma, and a deep base of manufacturing and trading MSMEs sitting at the geographic centre of India. Most of these firms sell nationally but are nearly invisible in search — the buyers researching suppliers online never find them.",
    angle:
      "Nagpur's B2B and service businesses face far less SEO competition than Mumbai or Pune, so ranking for high-intent commercial terms is cheaper and faster here. The gap between how much business is done in the city and how little of it is captured online is the whole opportunity.",
    buyers: ["Logistics & warehousing firms", "MSME manufacturers", "Pharma & healthcare", "Education & coaching"],
    faqs: [
      {
        question: "Do you only rank Nagpur businesses for local searches?",
        answer:
          "No. Most Nagpur manufacturers and logistics firms sell across India, so the work targets national commercial keywords buyers actually search, alongside 'in Nagpur' local terms where they matter.",
      },
      {
        question: "Is SEO worth it for a Nagpur B2B supplier?",
        answer:
          "Usually more so than for a metro firm — competition for the terms your buyers search is thinner, so you rank for less spend and the leads that arrive are already looking to purchase.",
      },
    ],
  },
  {
    slug: "indore",
    city: "Indore",
    state: "Madhya Pradesh",
    lead: "SEO for the commercial capital of Madhya Pradesh",
    market:
      "Indore is Madhya Pradesh's business engine — a dense SME economy spanning food and namkeen brands, a fast-growing fintech and IT-startup scene, education, and trading. It is one of India's most entrepreneurial tier-2 cities, and most of that ambition is not yet showing up in search results.",
    angle:
      "Indore's founders move fast but under-invest in organic search, leaving room to own category keywords before competitors do. For D2C food brands and local startups, ranking is the difference between paying for every click and compounding free traffic.",
    buyers: ["D2C food & namkeen brands", "Fintech & SaaS startups", "Education & edtech", "Local service businesses"],
    faqs: [
      {
        question: "Can SEO help an Indore D2C food brand sell outside the city?",
        answer:
          "Yes — that is usually the point. The work targets national product and category keywords so buyers across India discover the brand, with local terms layered in for the home market.",
      },
      {
        question: "We're an early Indore startup — is SEO too early for us?",
        answer:
          "Early is the best time to claim category keywords cheaply. Ranking compounds, so the content you publish now keeps returning traffic long after a paid campaign would have stopped.",
      },
    ],
  },
  {
    slug: "bhopal",
    city: "Bhopal",
    state: "Madhya Pradesh",
    lead: "SEO for Bhopal's institutions, services, and growing tech base",
    market:
      "Bhopal's economy is anchored by government, a large education and healthcare sector, and an emerging IT presence around the state's tech parks. Institutions and service providers here compete on trust, and search is where that trust is now won or lost before anyone makes contact.",
    angle:
      "For Bhopal clinics, institutes, and professional services, the buyer researches privately and picks from whoever ranks. Being on page one for the handful of terms that matter locally is worth more than any brochure.",
    buyers: ["Hospitals & clinics", "Coaching & institutes", "Professional services", "Local government-adjacent firms"],
    faqs: [
      {
        question: "How does SEO work for a Bhopal clinic or institute?",
        answer:
          "It targets the specific service and location terms patients or students search, then earns the reviews and content that make you the obvious, trusted choice when they compare options.",
      },
      {
        question: "Is local SEO enough, or do we need more?",
        answer:
          "For a single-location Bhopal service business, strong local SEO plus a fast, trustworthy site usually captures the demand that already exists — no need to compete nationally.",
      },
    ],
  },
  {
    slug: "surat",
    city: "Surat",
    state: "Gujarat",
    lead: "SEO for Surat's textile and diamond export economy",
    market:
      "Surat polishes most of the world's diamonds and weaves a vast share of India's synthetic textiles, on top of one of the country's densest MSME exporter bases. These are global businesses run locally — and most of their international buyers now start on search, not at trade shows.",
    angle:
      "Surat's exporters compete for overseas buyers who Google their category before they ever email. Ranking for those international product terms puts a Surat manufacturer in front of demand its competitors are paying agencies abroad to reach.",
    buyers: ["Textile & saree manufacturers", "Diamond & jewellery exporters", "MSME exporters", "Trading houses"],
    faqs: [
      {
        question: "Can SEO reach international buyers for a Surat exporter?",
        answer:
          "Yes. The work targets the English product and category keywords overseas buyers search, so a Surat textile or diamond firm shows up in the research phase instead of relying only on agents and expos.",
      },
      {
        question: "Our products are B2B and niche — does SEO still apply?",
        answer:
          "Niche B2B is where SEO works best: search volume is lower but intent is extreme, and one ranked page can bring buyers who place large, repeat orders.",
      },
    ],
  },
  {
    slug: "jaipur",
    city: "Jaipur",
    state: "Rajasthan",
    lead: "SEO for Jaipur's tourism, gems, and handicraft exporters",
    market:
      "Jaipur blends a huge tourism and hospitality sector with a world-renowned gems, jewellery, and handicraft export trade, plus a rising IT and education base around Mahindra World City. Buyers — travellers and international importers alike — research Jaipur online long before they arrive or order.",
    angle:
      "Whether it's a boutique hotel or a jewellery exporter, Jaipur's businesses live or die on being found in that research window. Ranking for the exact terms tourists and importers search turns Jaipur's global reputation into measurable bookings and orders.",
    buyers: ["Hotels & travel operators", "Gems & jewellery exporters", "Handicraft & handloom brands", "Education & IT"],
    faqs: [
      {
        question: "How does SEO help a Jaipur hotel or travel business?",
        answer:
          "It targets the destination and experience terms travellers search while planning, so your property appears during research — the point where the booking decision is actually made.",
      },
      {
        question: "Can SEO bring international buyers to a Jaipur jewellery exporter?",
        answer:
          "Yes — importers search product and origin terms before sourcing. Ranking for those puts a Jaipur exporter in front of overseas buyers without depending solely on fairs and middlemen.",
      },
    ],
  },
  {
    slug: "coimbatore",
    city: "Coimbatore",
    state: "Tamil Nadu",
    lead: "SEO for the 'Manchester of South India' and its engineering base",
    market:
      "Coimbatore is an industrial powerhouse — textiles, pumps and motors, foundries, auto components, and a deep engineering MSME ecosystem, alongside a strong education sector. Its manufacturers supply buyers across India and abroad who now shortlist suppliers through search.",
    angle:
      "Coimbatore's engineering firms are known regionally but under-indexed online, so ranking for their product categories is unusually attainable. For a pump or component maker, one page ranking for a national buying term can outperform a year of cold outreach.",
    buyers: ["Pump & motor manufacturers", "Textile & foundry firms", "Auto-component makers", "Engineering MSMEs"],
    faqs: [
      {
        question: "Do buyers really search for industrial products like pumps or castings?",
        answer:
          "Constantly. Procurement teams research specs and suppliers on search before requesting quotes, so a Coimbatore manufacturer that ranks for its category enters the shortlist automatically.",
      },
      {
        question: "Is SEO slower for industrial B2B than consumer brands?",
        answer:
          "The keywords are lower-volume but far higher-intent, and competition is thin, so an industrial firm often sees qualified enquiries faster than a crowded consumer category would allow.",
      },
    ],
  },
  {
    slug: "nashik",
    city: "Nashik",
    state: "Maharashtra",
    lead: "SEO for Nashik's wine, agriculture, and engineering economy",
    market:
      "Nashik pairs India's wine capital and a large agri-export base — grapes, onions, produce — with a serious auto-component and engineering cluster and a steady pilgrimage-tourism flow. It's a diverse economy whose businesses sell far beyond the city but market mostly by word of mouth.",
    angle:
      "From wineries to component makers, Nashik firms have distinctive products and weak online visibility — a combination made for SEO. Ranking for the specific terms buyers and visitors search captures demand that is currently going to whoever shows up first elsewhere.",
    buyers: ["Wineries & agri exporters", "Auto & engineering components", "Tourism & hospitality", "Local D2C brands"],
    faqs: [
      {
        question: "Can SEO help a Nashik winery or agri exporter?",
        answer:
          "Yes — buyers and visitors search for wines, tours, and produce by type and origin. Ranking for those terms brings direct, high-intent traffic instead of relying on distributors alone.",
      },
      {
        question: "We sell components nationally from Nashik — will local SEO help?",
        answer:
          "The work isn't limited to local terms. It targets the national product keywords your buyers search, with Nashik-specific terms added where they bring qualified nearby demand.",
      },
    ],
  },
  {
    slug: "lucknow",
    city: "Lucknow",
    state: "Uttar Pradesh",
    lead: "SEO for Lucknow's services, crafts, and growing startup scene",
    market:
      "Lucknow's economy spans government and professional services, a famous chikankari handicraft-export trade, healthcare and education, and a fast-emerging startup and IT base. As UP's capital, it has scale and rising digital demand — but organic search here is still wide open.",
    angle:
      "Lucknow businesses that establish search visibility now will be hard to displace as the market matures. For service firms, exporters, and new startups alike, ranking early means owning the terms competitors will later have to pay heavily to reach.",
    buyers: ["Chikankari & handicraft exporters", "Healthcare & education", "Professional services", "Startups & IT"],
    faqs: [
      {
        question: "Is Lucknow's market big enough for SEO to pay off?",
        answer:
          "As UP's capital, yes — demand is large and growing, and because few competitors invest in organic search yet, ranking is cheaper now than it will be once the market catches up.",
      },
      {
        question: "Can SEO grow a Lucknow chikankari brand beyond the city?",
        answer:
          "That's the natural play. The work targets national and export product terms so buyers everywhere discover the craft, with local terms supporting the home market.",
      },
    ],
  },
];

export const seoCitySlugs = seoCities.map((c) => c.slug);
export const getSeoCity = (slug: string) => seoCities.find((c) => c.slug === slug);
