import type { SampleIssue, Testimonial } from "@/lib/data/types";

export const newsletterMeta = {
  name: "The Builders List",
  cadence: "One email per fortnight",
  promise: "Clear thinking for people building real things.",
  subscriberClaim: "Join 3,000+ builders",
};

export const whatYoullReceive = [
  "Marketing frameworks that simplify complexity",
  "Growth systems broken down step-by-step",
  "Lessons from building products and agencies",
  "Tools and workflows I actually use",
  "Mistakes and corrections from real execution",
];

export const issueQualities = ["Short enough to finish", "Deep enough to apply", "Structured enough to reuse"];

export const sampleIssues: SampleIssue[] = [
  {
    no: "42",
    title: "Why Most Marketing Fails Before It Starts",
    summary: "A breakdown of structural mistakes startups make before running their first campaign. Includes a 5-layer growth system.",
  },
  {
    no: "38",
    title: "SEO Is Infrastructure, Not Traffic",
    summary: "How to design organic growth as a compounding asset instead of a publishing routine.",
  },
  {
    no: "34",
    title: "From Freelancer to System Builder",
    summary: "The shift from selling hours to designing leverage.",
  },
  {
    no: "29",
    title: "The Discipline Behind Sustainable Growth",
    summary: "Why clarity beats intensity in long-term marketing.",
  },
];

export const whoFor = [
  "Founders building without large teams",
  "Marketers who prefer structure over shortcuts",
  "Creators who want leverage, not vanity",
  "Students who want practical systems",
];

export const whatItsNot = ["Daily spam", "Motivational noise", "“10 hacks” emails", "Surface-level summaries"];

export const readerQuotes: Testimonial[] = [
  { quote: "Clear, practical, and immediately usable. I forward it to my team.", name: "Ankit S.", role: "SaaS Founder", company: "", initials: "AS" },
  { quote: "It connects strategy with execution in a way most content doesn't.", name: "Riya M.", role: "Performance Marketer", company: "", initials: "RM" },
  { quote: "Structured. Measured. Useful.", name: "Arjun R.", role: "Agency Partner", company: "", initials: "AR" },
  { quote: "It helped me understand systems, not just tactics.", name: "Sneha P.", role: "Marketing Student", company: "", initials: "SP" },
];
