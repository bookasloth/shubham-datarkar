import { ArrowUpRight, TrendingUp } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = buildMetadata({
  title: "Dashboard",
  description: "Your private analytics dashboard.",
  path: "/dashboard",
  noIndex: true,
});

const kpis = [
  { label: "Organic visitors", value: "24,108", delta: "+18%" },
  { label: "Newsletter subs", value: "2,412", delta: "+6%" },
  { label: "Qualified leads", value: "38", delta: "+12%" },
  { label: "Tool runs", value: "1,940", delta: "+24%" },
];

const chart = [
  { m: "Jan", v: 42 },
  { m: "Feb", v: 55 },
  { m: "Mar", v: 61 },
  { m: "Apr", v: 70 },
  { m: "May", v: 82 },
  { m: "Jun", v: 100 },
];

const leads = [
  { name: "Aarav Shah", type: "Agency Work", value: "₹3L/mo", status: "New" },
  { name: "Neha Verma", type: "Consulting", value: "₹75K/mo", status: "Qualified" },
  { name: "Imran Q.", type: "Speaking", value: "—", status: "New" },
  { name: "Riya Kapoor", type: "Partnership", value: "—", status: "Nurturing" },
];

const statusVariant = { New: "default", Qualified: "success", Nurturing: "muted" } as const;

export default function DashboardPage() {
  return (
    <>
      <PageHero
        eyebrow="Dashboard"
        title="Your command center"
        description="A unified view of traffic, audience, and leads. A preview of what's coming for members."
        crumbs={[{ label: "Home", href: "/" }, { label: "Dashboard" }]}
        actions={<Badge variant="warning">Preview</Badge>}
      />
      <Section>
        <Container>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <Card key={k.label} className="p-5">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</div>
                <div className="mt-2 flex items-end justify-between">
                  <span className="font-display text-3xl font-extrabold tracking-tight">{k.value}</span>
                  <span className="inline-flex items-center gap-0.5 text-xs font-medium text-success">
                    <ArrowUpRight className="size-3" />
                    {k.delta}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Chart + summary */}
          <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Organic visitors
                </h2>
                <Badge variant="muted">Last 6 months</Badge>
              </div>
              <div className="mt-6 flex h-48 items-end gap-3">
                {chart.map((c) => (
                  <div key={c.m} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t bg-foreground/85 transition-all"
                      style={{ height: `${c.v}%` }}
                      aria-hidden
                    />
                    <span className="text-xs text-muted-foreground">{c.m}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="flex flex-col justify-center p-6">
              <TrendingUp className="size-6 text-muted-foreground" />
              <p className="mt-4 font-display text-3xl font-extrabold tracking-tight">+138%</p>
              <p className="mt-1 text-sm text-muted-foreground">organic growth over the period, compounding month over month.</p>
            </Card>
          </div>

          {/* Leads table */}
          <Card className="mt-4 p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Recent leads
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l) => (
                  <TableRow key={l.name}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-muted-foreground">{l.type}</TableCell>
                    <TableCell>{l.value}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[l.status as keyof typeof statusVariant]}>{l.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </Container>
      </Section>
    </>
  );
}
