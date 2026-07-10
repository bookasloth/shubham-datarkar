import type { Tool } from "@/lib/data/types";

export const tools: Tool[] = [
  {
    slug: "seo-audit",
    name: "Instant SEO Audit",
    icon: "Gauge",
    category: "SEO",
    description: "Enter a URL and get a technical SEO audit in seconds. No signup for the core report.",
    status: "Live",
    uses: 9100,
    seo: {
      title: "Free Instant SEO Audit Tool",
      description:
        "Enter any URL and get a free technical SEO audit in seconds — no signup required for the core report. Find what's broken and what's winnable fast.",
    },
  },
  {
    slug: "roas-calculator",
    name: "ROAS & Budget Modeler",
    icon: "Calculator",
    category: "Performance",
    description: "Model projected returns across SEO, content, and paid before you spend a rupee.",
    status: "Live",
    uses: 5600,
    seo: {
      title: "Free ROAS & Budget Calculator",
      description:
        "Model projected returns across SEO, content, and paid media before you spend a rupee — a free budget calculator for planning marketing spend with confidence.",
    },
  },
  {
    slug: "copy-analyzer",
    name: "Copy Analyzer",
    icon: "PenLine",
    category: "Content",
    description: "Paste landing-page copy and get feedback on headline strength, clarity, and objections.",
    status: "Live",
    uses: 4200,
    seo: {
      title: "Free Landing Page Copy Analyzer",
      description:
        "Paste your landing-page copy and get free, instant feedback on headline strength, clarity, and unanswered objections before you ship the page.",
    },
  },
  {
    slug: "content-brief",
    name: "Content Brief Generator",
    icon: "FileText",
    category: "SEO",
    description: "Turn a target keyword into a full SEO brief: structure, word count, and angles.",
    status: "Beta",
    uses: 2800,
    seo: {
      title: "Free SEO Content Brief Tool",
      description:
        "Turn any target keyword into a full SEO content brief — structure, word count, and angles — free, in seconds, before your writer opens a blank page.",
    },
  },
  {
    slug: "kalamai",
    name: "KalamAI",
    icon: "Sparkles",
    category: "SEO",
    description: "Keyword + location in, a data-backed SEO/AEO/GEO brief and a drafted article out. For Kalamwala community members.",
    status: "Beta",
  },
  {
    slug: "headline-tester",
    name: "Headline Tester",
    icon: "Type",
    category: "Content",
    description: "Score and rewrite headlines for clarity, curiosity, and search intent.",
    status: "Live",
    uses: 3100,
    seo: {
      title: "Free Headline Tester Tool",
      description:
        "Score and rewrite your headlines for clarity, curiosity, and search intent with this free headline tester — built for marketers who need clicks, not guesses.",
    },
  },
  {
    slug: "schema-generator",
    name: "Schema Generator",
    icon: "Braces",
    category: "SEO",
    description: "Generate valid JSON-LD for articles, FAQs, and breadcrumbs in a click.",
    status: "Live",
    uses: 1900,
    seo: {
      title: "Free JSON-LD Schema Generator",
      description:
        "Generate valid JSON-LD schema markup for articles, FAQs, and breadcrumbs in one click — a free tool for structured data that search engines can trust.",
    },
  },
  {
    slug: "utm-builder",
    name: "UTM Builder",
    icon: "Link2",
    category: "Performance",
    description: "Build clean, consistent campaign URLs with a saved naming convention.",
    status: "Live",
    uses: 2400,
    seo: {
      title: "Free UTM Campaign URL Builder",
      description:
        "Build clean, consistent campaign URLs with a saved naming convention — a free UTM builder that keeps your analytics tidy across every channel you run.",
    },
  },
  {
    slug: "readability-checker",
    name: "Readability Checker",
    icon: "BookOpen",
    category: "Content",
    description: "Check reading level, sentence length, and rhythm before you publish.",
    status: "Soon",
    seo: {
      title: "Free Readability Checker Tool",
      description:
        "Check reading level, sentence length, and rhythm before you publish — a free readability checker that catches clunky copy before your readers do.",
    },
  },
];

export const getTool = (slug: string) => tools.find((t) => t.slug === slug);
