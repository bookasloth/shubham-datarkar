import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/layout/page-hero";
import { Section } from "@/components/layout/container";
import { LegalDoc, type LegalBlock } from "@/components/sections/legal-doc";

export const metadata = buildMetadata({
  title: "Privacy Policy & Your Data",
  description: "How shubhamdatarkar.com collects, uses, and protects your data — contact forms, newsletter, payments, cookies, analytics, and your rights.",
  ogTitle: "Privacy Policy — shubhamdatarkar.com",
  ogDescription: "What's collected, how it's used, and the control you have over it.",
  path: "/privacy-policy",
});

const BLOCKS: LegalBlock[] = [
  {
    heading: "Overview",
    paras: [
      "This site is operated by Timewheel Internet Pvt Ltd (Nagpur, India). This policy explains what information is collected when you use shubhamdatarkar.com, how it's used, and the choices you have.",
    ],
  },
  {
    heading: "Information we collect",
    list: [
      "Contact form: your name, email, project type, budget range, and message.",
      "Newsletter: your email address (and name, if provided).",
      "Support / payments: amounts and payment status. Card details are handled entirely by our payment processor and never touch our servers.",
      "Usage analytics: aggregate, non-identifying performance data (page load times, Core Web Vitals).",
    ],
  },
  {
    heading: "How we use it",
    list: [
      "To reply to your enquiries and provide requested services.",
      "To send the newsletter, where you've subscribed (you can opt out anytime).",
      "To process and confirm support contributions.",
      "To monitor and improve site performance.",
    ],
  },
  {
    heading: "Service providers",
    paras: ["We share data only with processors needed to run the site:"],
    list: [
      "Supabase — database and authentication.",
      "Kit (ConvertKit) — newsletter delivery.",
      "Razorpay — payment processing.",
      "Vercel — hosting and performance analytics.",
    ],
  },
  {
    heading: "Cookies",
    paras: [
      "We use minimal cookies/local storage — for example, to remember your light/dark theme preference and for aggregate analytics. We don't use advertising trackers.",
    ],
  },
  {
    heading: "Data retention",
    paras: [
      "We keep contact and subscriber records for as long as needed to respond to you and run the newsletter, then delete them on request.",
    ],
  },
  {
    heading: "Your rights",
    paras: [
      "You can request access to, correction of, or deletion of your data, and you can unsubscribe from emails at any time. Email hello@shubhamdatarkar.com or use the unsubscribe page.",
    ],
  },
  {
    heading: "Children",
    paras: ["This site is not directed at children under 16, and we don't knowingly collect their data."],
  },
  {
    heading: "Changes",
    paras: ["We may update this policy; material changes will be reflected by the date above."],
  },
  {
    heading: "Contact",
    paras: [
      "Timewheel Internet Pvt Ltd, 2nd Floor, Eureka Coworking, Mate Sqr, Nagpur 440030. Email: hello@shubhamdatarkar.com.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        description="What I collect, why, and the control you have over it."
        crumbs={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]}
      />
      <Section>
        <LegalDoc updated="June 16, 2026" blocks={BLOCKS} />
      </Section>
    </>
  );
}
