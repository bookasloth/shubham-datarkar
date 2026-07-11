import type { SeoLandingContent } from "./types";

/**
 * National pillar copy for /seo-expert-india. Answer-first throughout: every
 * block leads with a direct definition or answer so it's extractable by both
 * classic search snippets and AI answer engines (AEO/GEO). The city template
 * (future work) reuses this shape with `areaServedType: "City"`.
 *
 * `differentiators` values are provider-specific claims still pending Shubham's
 * sign-off before merge (see the task report's "USER MUST VERIFY" list).
 * `trustNames` are real clients confirmed in case-studies.ts.
 */
export const seoExpertIndia: SeoLandingContent = {
  areaName: "India",
  areaServedType: "Country",
  path: "/seo-expert-india",
  h1: "SEO Expert in India",
  metaTitle: "SEO Expert in India: Services, Process & Pricing",
  metaDescription:
    "Hire an SEO expert in India for technical SEO, content, and AI answer-engine optimisation. Packages from ₹6,999/month — see pricing and book a call.",
  subhead:
    "I run SEO for Indian businesses that need organic search to produce revenue, not vanity rankings: technical audits, keyword-mapped content, local and national visibility, and the answer-first structure that gets pages cited by ChatGPT, Perplexity, and Google's AI Overviews. You get a fixed monthly scope, a single point of contact, and a report you can act on — built around the keywords that actually move your pipeline, not the ones that just look good on a slide.",
  answer:
    "An SEO expert in India audits your site, fixes technical issues, builds answer-first content, and earns authority links so you rank higher on Google and get cited by AI answer engines like ChatGPT and AI Overviews. Packages run ₹6,999 to ₹22,999 a month; sites typically see ranking movement within three to four months and compounding organic leads by month six.",
  serviceBlocks: [
    {
      h3: "Keyword Research",
      definition:
        "Keyword research is mapping the exact words your buyers type into Google and ask ChatGPT before they choose a vendor, then ranking those terms by commercial intent and realistic winnability. For a business in India this means separating high-volume vanity terms from the longer, question-shaped queries — \"best CRM for small business Mumbai,\" \"how much does X cost\" — that convert at a much higher rate and increasingly trigger AI Overviews. I build the keyword map first because every other deliverable, from page titles to the content calendar, is downstream of it. The output is a prioritised list, not a raw export: each term tagged by intent (informational, commercial, transactional), estimated difficulty against your current domain strength, and the existing or new page it belongs to, so nothing gets written without a clear home.",
    },
    {
      h3: "On-Page SEO",
      definition:
        "On-page SEO is optimising everything on a single page — the title tag, headings, body copy, internal links, and images — so it targets one clear intent and both search engines and AI models can extract a clean answer from it. I write titles and H1s around the exact query, structure the opening paragraph to answer the question directly, and interlink pages so authority flows to the ones that need to rank. Done well, the same page that ranks on Google page one is also the page ChatGPT and Perplexity quote back to a user. This also covers image alt text, descriptive internal anchor text, and page-level schema so the page is unambiguous about what it's about — small details that get missed even on otherwise well-designed sites.",
    },
    {
      h3: "Off-Page SEO",
      definition:
        "Off-page SEO is everything that builds a site's authority outside its own pages — backlinks from relevant sites, digital PR placements, and mentions search engines read as third-party trust signals. In competitive categories, on-page work alone rarely moves rankings; the sites outranking you usually have more, and better, sites linking to them. I run outreach and digital PR aimed at publications and sites your buyers already trust, not link farms that carry real penalty risk. Link quality is tracked by relevance and authority, not raw count — ten links from sites your buyers actually read outperform a hundred from directories no one visits and Google increasingly discounts.",
    },
    {
      h3: "Technical SEO",
      definition:
        "Technical SEO is making sure search engines can crawl, render, and index every page you want found — and that nothing on the site (broken redirects, blocked resources, slow load times, duplicate content) is quietly throttling how much of your work Google ever sees. I audit crawlability, fix indexation errors, improve Core Web Vitals, and implement schema markup so pages are fast for users and legible to search and AI crawlers alike. Technical debt compounds silently; most audits I run find rankings being left on the table here before a single new page gets written. The checklist also covers robots.txt and sitemap accuracy, canonical tags, mobile rendering, and structured-data validation — unglamorous work that decides whether everything else has a chance to work.",
    },
    {
      h3: "Local SEO",
      definition:
        "Local SEO is ranking in Google's map pack and city-level results for people searching near a specific location — \"electrician near me,\" \"SEO expert in Pune.\" I optimise your Google Business Profile, build consistent local citations, and build location-specific pages for each city or service area you operate in, so you show up for the searches that convert closest to a phone call or a walk-in. For multi-location businesses, this also means avoiding the duplicate-content trap between near-identical city pages by writing genuinely distinct local detail — service area, landmarks, local case studies — for each one.",
    },
    {
      h3: "Content Strategy",
      definition:
        "Content strategy is deciding which topics to cover, in what order, and in what structure, so content builds compounding organic traffic instead of a pile of disconnected blog posts. I group content into topic clusters — a pillar page like this one, supported by spoke pages that each answer one specific question — and write every piece answer-first, so the opening sentences alone are enough for a reader, or an AI model summarising the page, to get the full answer. Each cluster is built around one buyer question set, and the publishing cadence is set by what the audit shows is winnable, not an arbitrary posts-per-week target.",
    },
    {
      h3: "SEO Strategy & Reporting",
      definition:
        "SEO strategy and reporting is the roadmap and the accountability layer that ties the other work to business outcomes — rankings, organic traffic, and leads, not just tasks completed. I set the priority order each month based on what's winnable fastest, track it against a baseline set at the audit, and send a report that shows movement in the keywords, traffic, and leads that actually matter, so you always know what the engagement is producing. The roadmap gets revisited every month rather than set once and forgotten, because algorithm updates and competitor moves both change what's winnable next.",
    },
  ],
  process: [
    {
      step: "Audit",
      detail:
        "I start with a full technical, on-page, content, and competitor audit — crawl errors, Core Web Vitals, keyword gaps, and where competitors are beating you — to find what's broken and what's realistically winnable in the first 30 days, before any new work begins. You get the full findings document, not a summary slide, because it's the same one I work from.",
    },
    {
      step: "Strategy",
      detail:
        "I turn the audit into a prioritised roadmap tied to the keywords and pages most likely to produce qualified leads, not the ones that just look good in a rankings report, sequenced by effort against expected impact. The roadmap is shared and explained before execution starts, so you're agreeing to a plan, not discovering one after the invoice.",
    },
    {
      step: "Execution",
      detail:
        "Technical fixes, on-page optimisation, new content, and link building ship on a fixed monthly cadence agreed in advance, so you always know what's being delivered and when — no scope surprises mid-month. Each deliverable is logged against the roadmap so nothing gets quietly dropped when priorities shift.",
    },
    {
      step: "Reporting",
      detail:
        "Every month you get a report on keyword rankings, organic traffic, and leads generated, plus the priorities agreed for the next month, so the engagement stays accountable to outcomes rather than activity. If a month underperforms, the report says so plainly and the following month's plan changes in response.",
    },
  ],
  differentiators: [
    // Seeded from the task brief. Kept verbatim per instructions — flagged for
    // user sign-off in the task report rather than silently altered.
    { label: "Years in SEO & growth", value: "8+ years" },
    { label: "Answer-engine coverage", value: "Optimised for Google + 4 AI engines" },
    { label: "Reporting cadence", value: "Monthly, with live dashboards" },
    { label: "Typical first results", value: "3–4 months" },
  ],
  pricingTiers: [
    {
      name: "Silver SEO Package",
      price: "6999",
      currency: "INR",
      features: [
        "1–3 target keywords",
        "Full technical + on-page SEO audit",
        "On-page optimisation for existing pages",
        "Basic off-page outreach",
        "Keyword rank tracking",
        "Monthly ranking and traffic report",
      ],
    },
    {
      name: "Gold SEO Package",
      price: "13999",
      currency: "INR",
      features: [
        "5–10 target keywords",
        "Everything in Silver",
        "Technical SEO fixes and schema markup",
        "Content optimisation across existing pages",
        "Competitor gap analysis",
        "Expanded rank tracking across target markets",
        "Monthly strategy call",
      ],
    },
    {
      name: "Platinum SEO Package",
      price: "22999",
      currency: "INR",
      features: [
        "15+ target keywords",
        "Everything in Gold",
        "New answer-first content production",
        "Structured link building campaign",
        "Conversion-focused landing page recommendations",
        "Full rank tracking across all target keywords",
        "Quarterly strategy review",
      ],
    },
  ],
  faqs: [
    {
      question: "How much does an SEO expert cost in India?",
      answer:
        "SEO expert services in India typically run ₹6,999 to ₹22,999 per month, scaled by keyword count and scope. Every package includes an audit, on-page and off-page work, technical fixes, and a monthly report — the difference between tiers is how many keywords and how much content and link building are covered each month.",
    },
    {
      question: "How long does SEO take to show results?",
      answer:
        "As a general rule for SEO, most sites see measurable ranking movement in three to four months and meaningful organic traffic and lead growth by month six. Timelines vary with domain age, competition, and how much technical debt the audit uncovers — a brand-new site in a competitive category will move slower than an established one with a clean technical base. Lower-competition, question-shaped queries tend to rank first, which is why the roadmap usually front-loads those to produce early wins while the harder commercial terms build.",
    },
    {
      question: "Is hiring an SEO expert worth it for a small business?",
      answer:
        "Usually, yes — a focused SEO expert targets the specific local and commercial keywords your buyers already search, and because organic rankings keep earning clicks after the work is done, SEO tends to lower the long-term cost per lead compared with paid ads for many businesses. It's less worth it if you need leads this week; SEO is a medium-term investment, not a same-week channel.",
    },
    {
      question: "What's the difference between SEO and AEO/GEO?",
      answer:
        "SEO ranks your pages in Google's classic blue-link results; AEO (answer engine optimisation) and GEO (generative engine optimisation) get the same content quoted or cited inside AI answers from ChatGPT, Perplexity, and Google's AI Overviews. The underlying work overlaps heavily — answer-first structure, clear definitions, and technical crawlability help both — so I build for classic SEO and AI answer engines together rather than as separate projects.",
    },
    {
      question: "Do you guarantee first-page rankings?",
      answer:
        "No — no SEO expert can honestly guarantee a specific ranking, because Google, and every AI engine, controls its own algorithm and neither publishes it. What I do guarantee is the process: a documented audit, a prioritised roadmap, work executed on schedule, and transparent monthly reporting so you can see exactly what's been done and what it's producing.",
    },
    {
      question: "Which industries do you work with?",
      answer:
        "Local service businesses, e-commerce, and B2B/SaaS companies across India, though the approach adapts to whichever category you're in rather than following a fixed template. What matters more than industry is whether your buyers actually search before they choose — categories with real search demand are where SEO produces the most leverage, and categories that sell on referral or cold outbound alone will see less return from it.",
    },
    {
      question: "How do you report on SEO progress?",
      answer:
        "You get a monthly report covering keyword rankings, organic traffic, and leads generated, alongside the priorities agreed for the next month. The report is built to show movement against a baseline set at the audit, so it's clear whether the work is compounding, not just whether tasks got completed — written up plainly, not handed over as a raw data export you have to interpret yourself.",
    },
    {
      question: "Do I need separate SEO and AEO/GEO services, or is this one engagement?",
      answer:
        "One engagement covers both. Classic technical SEO — crawlability, site speed, schema — and answer-first content structure are the same foundation an AI answer engine needs to cite your page, so splitting them into separate retainers usually just duplicates the audit and content work without adding value. The pricing tiers on this page already include both, scaled by keyword count rather than by which engine you're optimising for.",
    },
    {
      question: "What do you need from me to get started?",
      answer:
        "Access to your website's analytics and search console, a short call to understand your target customer and current lead sources, and sign-off on the audit's priority list before execution starts. Engagements typically begin promptly after that first call, and the audit itself is what surfaces most of the detail I need — you don't have to arrive with a fully formed brief.",
    },
    {
      question: "Can you work alongside an existing marketing or content team?",
      answer:
        "Yes. I typically plug in by owning the SEO strategy, technical fixes, and keyword prioritisation while collaborating with an in-house team on content production, or by handing off a prioritised content calendar for a team to execute directly — whichever fits the resourcing you already have in place. Either way, the roadmap stays a single source of truth so writers, developers, and designers aren't working from conflicting priorities.",
    },
  ],
  caseStudySlugs: ["occasion-cakes-local-seo", "stone-and-acres-land-stories"],
  trustNames: ["Occasion Cakes", "Stone & Acres"],
  updatedAt: "2026-07-11",
};
