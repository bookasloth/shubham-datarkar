import { buildMetadata } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { SettingsPanel } from "@/components/app/settings-panel";

export const metadata = buildMetadata({
  title: "Settings",
  description: "Manage your account, notifications, and appearance.",
  path: "/settings",
  noIndex: true,
});

export default function SettingsPage() {
  return (
    <>
      <PageHero
        eyebrow="Settings"
        title="Preferences"
        description="Manage your account, notifications, and how the site looks."
        crumbs={[{ label: "Home", href: "/" }, { label: "Settings" }]}
      />
      <Section>
        <Container size="narrow">
          <SettingsPanel />
        </Container>
      </Section>
    </>
  );
}
