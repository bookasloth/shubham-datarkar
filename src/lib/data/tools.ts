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
    content: {
      appCategory: "BusinessApplication",
      overview: [
        "The Instant SEO Audit crawls any URL and returns a technical SEO report in seconds — no signup for the core checks. It looks at the things that actually move rankings: title and meta tags, headings, canonicals, indexability, structured data, Open Graph, and page basics.",
        "It's built for founders and marketers who want a straight answer to \"what's broken and what's winnable\" without paying for a heavy enterprise crawler or waiting on an agency audit.",
      ],
      features: [
        "Title, meta description, and heading structure checks",
        "Canonical, robots, and indexability signals",
        "Structured data (JSON-LD) and Open Graph detection",
        "Core on-page basics — no signup for the core report",
      ],
      howTo: [
        "Paste the full URL of the page you want to audit.",
        "Run the audit — the core technical report returns in seconds.",
        "Work down the findings, fixing the highest-impact issues first.",
      ],
      faq: [
        { question: "Is the SEO audit really free?", answer: "Yes. The core technical report is free and needs no signup. Paste a URL and you get the findings in seconds." },
        { question: "What does the audit check?", answer: "The on-page technical fundamentals: title and meta tags, heading structure, canonical and robots/indexability signals, structured data, Open Graph, and core page basics — the things that decide whether a page can rank at all." },
        { question: "Do I need to install anything?", answer: "No. It runs in the browser. Enter a URL and go — nothing to download or configure." },
      ],
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
    content: {
      appCategory: "FinanceApplication",
      overview: [
        "The ROAS & Budget Modeler projects the return on your marketing spend across SEO, content, and paid media before you commit a single rupee. Plug in your budget and assumptions and see the likely payback, so planning stops being a guess.",
        "It's for founders and marketers deciding where the next chunk of budget should go — and who need a number to defend it with.",
      ],
      features: [
        "Projected ROAS across SEO, content, and paid",
        "Budget-split modelling before you spend",
        "Payback and return estimates from your own inputs",
        "Free, instant, no signup",
      ],
      howTo: [
        "Enter your total budget and how you're thinking of splitting it.",
        "Add your assumptions (cost, conversion, and return inputs).",
        "Read the projected ROAS and adjust the split until the model makes sense.",
      ],
      faq: [
        { question: "Is the ROAS calculator free?", answer: "Yes — completely free, no signup. Enter your budget and assumptions and get projected returns instantly." },
        { question: "What is ROAS?", answer: "ROAS is Return On Ad Spend — how much revenue each rupee of marketing spend brings back. This tool projects it across SEO, content, and paid so you can compare channels before committing budget." },
        { question: "Can I model SEO and content, not just ads?", answer: "Yes. Unlike a pure ad-spend calculator, this models organic channels (SEO, content) alongside paid, so you can plan a full marketing mix." },
      ],
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
    content: {
      appCategory: "BusinessApplication",
      overview: [
        "The Copy Analyzer reads your landing-page copy and tells you where it's losing the reader — weak headline, unclear value, or objections you never answered. It's a second set of eyes before you ship, without waiting on a review.",
        "For founders and marketers who write their own pages and want them to convert, not just read nicely.",
      ],
      features: [
        "Headline strength assessment",
        "Clarity and value-proposition checks",
        "Unanswered-objection detection",
        "Free, instant, no signup",
      ],
      howTo: [
        "Paste your landing-page copy.",
        "Read the feedback on headline, clarity, and objections.",
        "Fix the gaps and re-run before you publish.",
      ],
      faq: [
        { question: "Is the copy analyzer free?", answer: "Yes — free and no signup. Paste your copy and get feedback instantly." },
        { question: "What does it analyze?", answer: "Headline strength, overall clarity and value proposition, and the objections your copy leaves unanswered — the things that quietly kill conversion." },
        { question: "Does it work for any page?", answer: "It's tuned for landing and sales pages, but the checks (clear headline, clear value, answered objections) apply to most conversion-focused copy." },
      ],
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
    content: {
      appCategory: "BusinessApplication",
      overview: [
        "The Content Brief Generator turns a target keyword into a full SEO brief — recommended structure, word count, and the angles worth covering — so a writer never starts from a blank page. It's the fastest way to go from \"we should rank for this\" to a plan someone can execute.",
        "For founders and content teams who want briefs that produce pages that actually rank, not just word counts.",
      ],
      features: [
        "Keyword-to-brief in seconds",
        "Recommended heading structure",
        "Target word count and angles to cover",
        "Free, no signup (beta)",
      ],
      howTo: [
        "Enter your target keyword.",
        "Review the generated structure, word count, and angles.",
        "Hand the brief to your writer — or write from it yourself.",
      ],
      faq: [
        { question: "Is the content brief tool free?", answer: "Yes — free to use (currently in beta). Enter a keyword and get a brief in seconds." },
        { question: "What's in an SEO content brief?", answer: "A recommended heading structure, a target word count, and the angles and subtopics worth covering — everything a writer needs to produce a page built to rank for the target keyword." },
        { question: "Who is it for?", answer: "Founders, content leads, and writers who want to brief SEO content quickly and consistently instead of starting every piece from a blank page." },
      ],
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
    content: {
      appCategory: "BusinessApplication",
      overview: [
        "The Headline Tester scores your headline on the things that decide whether people click — clarity, curiosity, and search intent — and rewrites it for you. It's the difference between a headline that guesses and one that earns the click.",
        "Built for marketers, founders, and writers polishing a title for an article, ad, landing page, or email subject line.",
      ],
      features: [
        "Clarity, curiosity, and intent scoring",
        "Instant rewrite suggestions",
        "Works for articles, ads, landing pages, and subject lines",
        "Free, no signup",
      ],
      howTo: [
        "Paste your headline.",
        "Read the score and where it's weak.",
        "Use the rewrites, or tweak yours and re-test until it lands.",
      ],
      faq: [
        { question: "Is the headline tester free?", answer: "Yes — free and no signup. Paste a headline and get a score plus rewrites instantly." },
        { question: "What makes a good headline?", answer: "Clarity (the reader instantly gets it), curiosity (a reason to click), and search intent (it matches what people are actually looking for). The tester scores all three and rewrites for them." },
        { question: "Can I use it for ads and email subject lines?", answer: "Yes. It works for any headline — blog titles, ad copy, landing-page hero lines, and email subject lines." },
      ],
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
    content: {
      appCategory: "DeveloperApplication",
      overview: [
        "The Schema Generator builds valid JSON-LD structured data — Article, FAQ, and Breadcrumb markup — in a click. Structured data is how you tell Google and AI answer engines exactly what a page is, and it's what unlocks rich results and citations.",
        "Fill in the fields, copy the output, and paste it into your page's <head>. No memorizing schema.org syntax, no hand-writing brackets.",
      ],
      features: [
        "Article / BlogPosting JSON-LD",
        "FAQPage JSON-LD for Q&A blocks",
        "BreadcrumbList JSON-LD",
        "Copy-paste ready, valid output",
      ],
      howTo: [
        "Pick the schema type you need (Article, FAQ, or Breadcrumb).",
        "Fill in the fields for your page.",
        "Copy the generated JSON-LD and paste it into your page's <head>.",
      ],
      faq: [
        { question: "Is the schema generator free?", answer: "Yes — free and no signup. Pick a type, fill the fields, copy the JSON-LD." },
        { question: "What is JSON-LD schema markup?", answer: "JSON-LD is the structured-data format Google recommends. It describes your page to search engines and AI answer engines, making it eligible for rich results and easier to cite accurately." },
        { question: "Where do I put the generated code?", answer: "Paste it inside a <script type=\"application/ld+json\"> tag in your page's <head> (or anywhere in the HTML). Then validate it with Google's Rich Results Test." },
      ],
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
    status: "Live",
    uses: 3400,
    seo: {
      title: "Free Readability Checker Tool",
      description:
        "Check reading level, sentence length, and rhythm before you publish — a free readability checker that scores your text with Flesch–Kincaid and flags clunky sentences.",
    },
    content: {
      appCategory: "BusinessApplication",
      overview: [
        "The Readability Checker scores your text on the Flesch Reading Ease and Flesch–Kincaid Grade scales — the same standards used to keep writing clear — and flags the long sentences dragging it down. Paste an article, email, or landing page and see exactly how hard it is to read.",
        "It runs entirely in your browser, so nothing you paste ever leaves your device. Aim for plain English (60+ reading ease) unless you're writing for a specialist audience.",
      ],
      features: [
        "Flesch Reading Ease + Flesch–Kincaid grade level",
        "Word, sentence, and syllable counts",
        "Average sentence length and syllables per word",
        "Flags sentences over 25 words to tighten",
      ],
      howTo: [
        "Paste your text into the box.",
        "Hit check — the score and metrics appear instantly.",
        "Shorten the flagged long sentences and simplify dense words, then re-check.",
      ],
      faq: [
        { question: "Is the readability checker free?", answer: "Yes — free, no signup, and it runs entirely in your browser, so your text never leaves your device." },
        { question: "What score should I aim for?", answer: "For general audiences, aim for a Flesch Reading Ease of 60 or higher (roughly 8th–9th grade). Specialist or technical writing can sit lower, but clarity almost always helps." },
        { question: "How is the score calculated?", answer: "It uses the Flesch Reading Ease and Flesch–Kincaid Grade formulas, based on your average sentence length and syllables per word — the long-standing standards for measuring readability." },
      ],
    },
  },
];

export const getTool = (slug: string) => tools.find((t) => t.slug === slug);
