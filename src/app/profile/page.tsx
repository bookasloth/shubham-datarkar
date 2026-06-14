import Link from "next/link";
import { MapPin, Settings } from "lucide-react";
import { site } from "@/lib/site";
import { buildMetadata } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Profile",
  description: "Your profile.",
  path: "/profile",
  noIndex: true,
});

const activity = [
  { action: "Subscribed to the newsletter", when: "2 days ago" },
  { action: "Ran the Instant SEO Audit", when: "5 days ago" },
  { action: "Downloaded the SEO Cluster Template", when: "1 week ago" },
  { action: "Booked a working session", when: "2 weeks ago" },
];

export default function ProfilePage() {
  return (
    <Section>
      <Container size="narrow" className="py-12">
        <Card className="p-6 md:p-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <Avatar className="size-20">
              <AvatarFallback className="text-xl">JF</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">Jane Founder</h1>
              <p className="text-sm text-muted-foreground">jane@company.com</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" /> {site.location}
                </span>
                <Badge variant="success">Pro member</Badge>
              </div>
            </div>
            <Link href="/settings" className={cn(buttonVariants({ variant: "outline" }))}>
              <Settings />
              Edit profile
            </Link>
          </div>
        </Card>

        <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-card border border-border bg-border">
          {[
            { v: "12", l: "Tools used" },
            { v: "8", l: "Resources" },
            { v: "47", l: "Newsletter issues" },
          ].map((s) => (
            <div key={s.l} className="bg-card p-5 text-center">
              <div className="font-display text-2xl font-extrabold tracking-tight">{s.v}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>

        <Card className="mt-6 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Recent activity</h2>
          <ul className="mt-4 divide-y divide-border">
            {activity.map((a) => (
              <li key={a.action} className="flex items-center justify-between py-3 text-sm">
                <span>{a.action}</span>
                <span className="text-muted-foreground">{a.when}</span>
              </li>
            ))}
          </ul>
        </Card>
      </Container>
    </Section>
  );
}
