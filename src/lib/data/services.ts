import type { Service } from "@/lib/data/types";

export const services: Service[] = [
  {
    slug: "seo",
    name: "SEO & Organic Growth",
    icon: "Search",
    tagline: "Compounding traffic systems",
    outcome: "Own your category in search — and in the LLMs that are quietly replacing it.",
    description:
      "I build SEO as infrastructure: topic clusters, programmatic surfaces, and an answer-first content system engineered to compound for years, not spike for a quarter.",
    deliverables: [
      "Technical SEO audit and remediation plan",
      "Topic cluster and information architecture",
      "Programmatic SEO build-out where it fits",
      "Schema, internal linking, and GEO/LLM optimisation",
    ],
    process: [
      { step: "Audit", detail: "Find what's broken and what's winnable in 30 days." },
      { step: "Architect", detail: "Design the cluster and the compounding mechanism." },
      { step: "Build", detail: "Ship the pillar, spokes, and programmatic layer." },
      { step: "Compound", detail: "Refresh, expand, and instrument on a fixed cadence." },
    ],
    startingAt: "₹1.5L / month",
    seo: {
      title: "SEO & Organic Growth Services",
      description:
        "Own your category in search and in AI answers with topic clusters, programmatic SEO, and an answer-first content system built to compound for years.",
    },
  },
  {
    slug: "performance",
    name: "Performance Marketing",
    icon: "Target",
    tagline: "Paid that pays back",
    outcome: "Profitable acquisition at scale, with a testing system that keeps it that way.",
    description:
      "Account structure, creative systems, and a post-click experience that converts. I treat paid as a system you can tune, not a slot machine you feed.",
    deliverables: [
      "Account restructure around intent tiers",
      "Creative testing system and production cadence",
      "Landing page rebuilds for message-match and speed",
      "Pragmatic attribution your team will actually trust",
    ],
    process: [
      { step: "Diagnose", detail: "Find the real bottleneck — usually post-click." },
      { step: "Restructure", detail: "Clean account, clean testing matrix." },
      { step: "Systematise", detail: "Make creative a pipeline, not a scramble." },
      { step: "Scale", detail: "Push spend only where the unit economics hold." },
    ],
    startingAt: "₹2L / month",
    seo: {
      title: "Performance Marketing Services",
      description:
        "Profitable paid acquisition at scale — account structure, creative testing systems, and post-click pages engineered to convert, not just to spend.",
    },
  },
  {
    slug: "content",
    name: "Content Strategy",
    icon: "PenLine",
    tagline: "Editorial that earns trust",
    outcome: "A content engine that demonstrates thinking and feeds every other channel.",
    description:
      "From editorial strategy to a repurposing pipeline that turns one serious idea into a month of distribution. Voice-led, data-anchored, never thin.",
    deliverables: [
      "Editorial strategy and content pillars",
      "Repurposing pipeline (one idea → twenty assets)",
      "Editorial QA rubric and brand-voice system",
      "Distribution calendar across owned channels",
    ],
    process: [
      { step: "Strategy", detail: "Pillars tied to business outcomes, not topics." },
      { step: "System", detail: "Stand up the production and QA pipeline." },
      { step: "Distribute", detail: "Repurpose and place across every surface." },
      { step: "Review", detail: "Kill what doesn't work, double the rest." },
    ],
    startingAt: "₹1.25L / month",
    seo: {
      title: "Content Strategy & Editorial Systems",
      description:
        "An editorial engine that demonstrates real thinking: content pillars, a repurposing pipeline, and a QA rubric that turns one idea into a month of distribution.",
    },
  },
  {
    slug: "ai-workflows",
    name: "AI Automation",
    icon: "Sparkles",
    tagline: "Leverage at every layer",
    outcome: "Compress time and expand output by wiring AI into the work that matters.",
    description:
      "Custom AI workflows for research, drafting, analysis, and ops — designed so judgement stays human and quality goes up, not down.",
    deliverables: [
      "Workflow audit and automation roadmap",
      "Prompt libraries trained on your brand and data",
      "Human-in-the-loop pipelines with QA gates",
      "Team enablement and documentation",
    ],
    process: [
      { step: "Map", detail: "Find the highest-leverage, lowest-risk automations." },
      { step: "Build", detail: "Wire the workflow with quality gates." },
      { step: "Validate", detail: "Prove quality holds before scaling." },
      { step: "Enable", detail: "Hand the team a system they can run." },
    ],
    startingAt: "₹1.75L / month",
    seo: {
      title: "AI Automation & Workflows",
      description:
        "Custom AI workflows for research, drafting, analysis, and ops — built with human-in-the-loop QA gates so quality goes up, not down, as output scales.",
    },
  },
  {
    slug: "advisory",
    name: "Startup Advisory",
    icon: "Compass",
    tagline: "Founder-to-founder",
    outcome: "Clear thinking on growth, distribution, and product from someone in the arena.",
    description:
      "Hands-on advisory for early and growth-stage founders. Distribution-first product thinking, positioning, and the unglamorous systems that compound.",
    deliverables: [
      "Bi-weekly working sessions",
      "Growth and distribution strategy",
      "Positioning and messaging review",
      "Async access for fast decisions",
    ],
    process: [
      { step: "Context", detail: "Understand the business and the real constraints." },
      { step: "Focus", detail: "Identify the one lever that matters this quarter." },
      { step: "Execute", detail: "Work the lever together, week over week." },
      { step: "Compound", detail: "Build the system so it outlasts the engagement." },
    ],
    startingAt: "₹75K / month",
    seo: {
      title: "Startup Advisory for Founders",
      description:
        "Founder-to-founder advisory on growth, distribution, and positioning — hands-on working sessions built for early and growth-stage startups.",
    },
  },
  {
    slug: "speaking",
    name: "Speaking & Workshops",
    icon: "Mic",
    tagline: "Talks with receipts",
    outcome: "Sessions that leave a room with systems they can use on Monday.",
    description:
      "Keynotes and workshops on SEO, AI workflows, and founder-led growth — built on real experiments and outcomes, not recycled theory.",
    deliverables: [
      "Keynote or workshop tailored to your audience",
      "Practical frameworks and takeaway templates",
      "Q&A and follow-up resources",
      "Optional recording and repurposing rights",
    ],
    process: [
      { step: "Brief", detail: "Understand the audience and the outcome." },
      { step: "Craft", detail: "Build a session around real receipts." },
      { step: "Deliver", detail: "Engage the room, leave them with systems." },
      { step: "Extend", detail: "Provide resources that outlast the talk." },
    ],
    startingAt: "On request",
    seo: {
      title: "SEO & AI Speaking, Workshops",
      description:
        "Keynotes and workshops on SEO, AI workflows, and founder-led growth — built on real experiments and outcomes, not recycled theory or borrowed slides.",
    },
  },
];

export const getService = (slug: string) => services.find((s) => s.slug === slug);
