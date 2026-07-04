# Admin UI Redesign — PR6: Contacts + Payments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. `- [ ]` checkboxes.

**Goal:** Convert the Contacts and Payments pages to the new design system — `PageHeader` + `DataTable` (Payments stats as a `KPIWidget` grid) — preserving all data and behavior.

**Constraints (global):** ADDITIVE/UI-only. Only `src/app/admin/contacts/page.tsx` and `src/app/admin/payments/page.tsx` modified among existing files. No queries/`src/lib`/route/schema/auth change. Keep `force-dynamic`. Admin tokens + PR1/PR3/PR4 components only; no public tokens. DataTable columns (render fns) live in `"use client"` modules; server passes plain arrays. Branch from `origin/main` (9377ca7). PR title: `feat(admin): contacts + payments on DataTable (redesign PR6)`.

Data shapes (already exist, unchanged):
- `getContacts(200)` → `Contact { id; name; email; createdAt; projectType?; budget?; message; status; notified }`.
- `getPaymentStats()` → `{ raised; thisMonth; supporters; paidCount; pendingCount; failedCount }`; `getRecentSupports(50)` → `SupportTxn { id; createdAt; name; email; coffees; toffees; total; currency; status }`.

---

## Task 1: Contacts → PageHeader + DataTable

**Files:** Create `src/app/admin/contacts/contacts-table.tsx`; Modify `src/app/admin/contacts/page.tsx`.

- [ ] **Step 1: `contacts-table.tsx`**

```tsx
"use client";

import { DataTable, type Column } from "@/components/admin/data";
import { StatusBadge } from "@/components/admin";
import { formatDate } from "@/lib/utils";

type Row = {
  id: string; name: string; email: string; createdAt: string;
  projectType?: string | null; budget?: string | null; message: string; notified: boolean;
};

const columns: Column<Row>[] = [
  { key: "name", header: "Name", sortValue: (r) => r.name, cell: (r) => <span className="font-medium text-admin-text">{r.name}</span> },
  {
    key: "email", header: "Email", sortValue: (r) => r.email,
    cell: (r) => <a href={`mailto:${r.email}`} className="text-admin-text-muted hover:text-admin-accent">{r.email}</a>,
  },
  { key: "type", header: "Type", sortValue: (r) => r.projectType ?? "", cell: (r) => r.projectType ?? "—", hideable: true },
  { key: "budget", header: "Budget", sortValue: (r) => r.budget ?? "", cell: (r) => r.budget ?? "—", hideable: true },
  {
    key: "message", header: "Message",
    cell: (r) => <span className="block max-w-xs truncate text-admin-text-muted" title={r.message}>{r.message}</span>,
  },
  { key: "received", header: "Received", sortValue: (r) => r.createdAt, cell: (r) => formatDate(r.createdAt), hideable: true },
  {
    key: "emailed", header: "Emailed", sortValue: (r) => (r.notified ? "yes" : "no"),
    cell: (r) => <StatusBadge tone={r.notified ? "success" : "warning"}>{r.notified ? "sent" : "not sent"}</StatusBadge>,
  },
];

export function ContactsTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchable={(r) => `${r.name} ${r.email} ${r.message} ${r.projectType ?? ""}`}
      searchPlaceholder="Search contacts…"
      initialSort={{ key: "received", dir: "desc" }}
      emptyTitle="No submissions yet"
      emptyDescription="Contact-form submissions will appear here."
    />
  );
}
```

- [ ] **Step 2: `page.tsx`**

```tsx
import { getContacts } from "@/lib/contact/queries";
import { PageHeader } from "@/components/admin";
import { ContactsTable } from "./contacts-table";

export const dynamic = "force-dynamic";

export default async function AdminContactsPage() {
  const contacts = await getContacts(200);
  return (
    <div>
      <PageHeader title="Contacts" description={`Submissions from the contact form. ${contacts.length} total.`} />
      <ContactsTable rows={contacts} />
    </div>
  );
}
```

- [ ] **Step 3:** `npx tsc --noEmit && npx vitest run`.
- [ ] **Step 4:** commit `feat(admin): convert contacts to DataTable` (both files).

---

## Task 2: Payments → PageHeader + KPIWidget grid + DataTable

**Files:** Create `src/app/admin/payments/payments-table.tsx`; Modify `src/app/admin/payments/page.tsx`.

- [ ] **Step 1: `payments-table.tsx`**

```tsx
"use client";

import { DataTable, type Column } from "@/components/admin/data";
import { StatusBadge } from "@/components/admin";
import { formatDate } from "@/lib/utils";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

type Row = {
  id: string; createdAt: string; name: string | null; email: string;
  coffees: number; toffees: number; total: number; status: "pending" | "paid" | "failed";
};

const tone = (s: string) => (s === "paid" ? "success" : s === "failed" ? "danger" : "warning");

const columns: Column<Row>[] = [
  { key: "date", header: "Date", sortValue: (r) => r.createdAt, cell: (r) => formatDate(r.createdAt) },
  {
    key: "supporter", header: "Supporter", sortValue: (r) => r.name ?? r.email,
    cell: (r) => (
      <div>
        <div className="font-medium text-admin-text">{r.name ?? "—"}</div>
        <div className="text-xs text-admin-text-muted">{r.email}</div>
      </div>
    ),
  },
  {
    key: "items", header: "Items", hideable: true,
    cell: (r) =>
      [r.coffees > 0 ? `${r.coffees} coffee` : null, r.toffees > 0 ? `${r.toffees} toffee` : null]
        .filter(Boolean).join(" · ") || "—",
  },
  { key: "amount", header: "Amount", sortValue: (r) => r.total, cell: (r) => <span className="font-medium text-admin-text">{inr(r.total)}</span> },
  { key: "status", header: "Status", sortValue: (r) => r.status, cell: (r) => <StatusBadge tone={tone(r.status)}>{r.status}</StatusBadge> },
];

export function PaymentsTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchable={(r) => `${r.name ?? ""} ${r.email} ${r.status}`}
      searchPlaceholder="Search transactions…"
      initialSort={{ key: "date", dir: "desc" }}
      emptyTitle="No transactions yet"
    />
  );
}
```

- [ ] **Step 2: `page.tsx`**

```tsx
import { getPaymentStats, getRecentSupports } from "@/lib/payments/queries";
import { PageHeader } from "@/components/admin";
import { KPIWidget } from "@/components/admin/widgets";
import { PaymentsTable } from "./payments-table";

export const dynamic = "force-dynamic";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default async function AdminPaymentsPage() {
  const [stats, txns] = await Promise.all([getPaymentStats(), getRecentSupports(50)]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Payments" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KPIWidget label="Raised" value={inr(stats.raised)} />
        <KPIWidget label="This month" value={inr(stats.thisMonth)} />
        <KPIWidget label="Supporters" value={stats.supporters} />
        <KPIWidget label="Paid" value={stats.paidCount} />
        <KPIWidget label="Pending" value={stats.pendingCount} />
        <KPIWidget label="Failed" value={stats.failedCount} />
      </div>
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-admin-text-muted">Recent transactions</h2>
        <PaymentsTable rows={txns} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3:** `npx tsc --noEmit && npx vitest run`.
- [ ] **Step 4:** commit `feat(admin): convert payments to DataTable + KPI widgets` (both files).

---

## Task 3: Build verification

- [ ] `npm run build` → exit 0, "Compiled successfully", `/admin/contacts` + `/admin/payments` present. Fix genuine issues; rebuild. Commit only if a fix was needed.

---

## Self-Review
- Contacts + Payments on DataTable; Payments stats as KPIWidget grid; long contact message truncated with `title` tooltip. ✓
- Only the two pages modified among existing files; `force-dynamic` + queries preserved; mailto links kept. ✓
- Admin tokens only; RSC boundary clean (columns in client modules). ✓
