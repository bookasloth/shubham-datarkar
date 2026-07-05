import type { Author, BlogCategory } from "@/lib/data/types";

export const author: Author = {
  name: "Shubham Datarkar",
  role: "The Kalamwala",
  initials: "SD",
};

export const blogCategories: { slug: BlogCategory; label: string; description: string }[] = [
  { slug: "seo", label: "SEO", description: "Audits, architecture, and compounding organic growth." },
  { slug: "performance", label: "Performance", description: "Paid acquisition, ad copy, ROAS, and creative testing." },
  { slug: "content", label: "Content", description: "Editorial systems, copywriting, and distribution." },
  { slug: "ai", label: "AI", description: "Workflows, prompting, and automation that ships." },
  { slug: "saas", label: "SaaS", description: "Building, pricing, and growing internet products." },
  { slug: "founder", label: "Founder", description: "Operating ventures, mental models, and lessons from the field." },
  { slug: "build-in-public", label: "Build in Public", description: "Rebuilding Book A Sloth in real time — daily field notes from shipping a SaaS." },
];
