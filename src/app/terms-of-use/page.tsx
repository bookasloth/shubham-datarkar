import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/layout/page-hero";
import { Section } from "@/components/layout/container";
import { LegalDoc, type LegalBlock } from "@/components/sections/legal-doc";

export const metadata = buildMetadata({
  title: "Terms of Use",
  description: "The terms that govern your use of shubhamdatarkar.com.",
  path: "/terms-of-use",
});

const BLOCKS: LegalBlock[] = [
  {
    heading: "Acceptance",
    paras: [
      "By using shubhamdatarkar.com, operated by Timewheel Internet Pvt Ltd (Nagpur, India), you agree to these terms. If you don't agree, please don't use the site.",
    ],
  },
  {
    heading: "Use of the site",
    paras: [
      "You agree to use the site lawfully and not to disrupt it, attempt unauthorized access, or misuse any forms, tools, or content.",
    ],
  },
  {
    heading: "Intellectual property",
    paras: [
      "All content here — writing, designs, code, and brand assets — belongs to Shubham Datarkar / Timewheel Internet Pvt Ltd unless stated otherwise. Don't reproduce or redistribute it without permission.",
    ],
  },
  {
    heading: "Services and payments",
    list: [
      "Client engagements are governed by separate written agreements; nothing on this site is a binding offer.",
      "Support contributions are processed by Zoho Payments and are voluntary; they're generally non-refundable unless required by law.",
      "Free tools and resources are provided as-is, with no guarantee of availability.",
    ],
  },
  {
    heading: "Third-party links",
    paras: [
      "The site links to third-party services and sites. We're not responsible for their content, policies, or practices.",
    ],
  },
  {
    heading: "Disclaimer",
    paras: [
      "The site and its content are provided “as is,” without warranties of any kind. Advice and frameworks shared here are for general information and aren't a substitute for professional counsel.",
    ],
  },
  {
    heading: "Limitation of liability",
    paras: [
      "To the maximum extent permitted by law, Timewheel Internet Pvt Ltd is not liable for any indirect or consequential loss arising from your use of the site.",
    ],
  },
  {
    heading: "Governing law",
    paras: [
      "These terms are governed by the laws of India, and disputes are subject to the courts of Nagpur, Maharashtra.",
    ],
  },
  {
    heading: "Changes",
    paras: ["We may update these terms; the date above reflects the latest version."],
  },
  {
    heading: "Contact",
    paras: ["Questions? Email hello@shubhamdatarkar.com."],
  },
];

export default function TermsOfUsePage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Terms of Use"
        description="The ground rules for using this site."
        crumbs={[{ label: "Home", href: "/" }, { label: "Terms of Use" }]}
      />
      <Section>
        <LegalDoc updated="June 16, 2026" blocks={BLOCKS} />
      </Section>
    </>
  );
}
