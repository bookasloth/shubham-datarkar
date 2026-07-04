import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { ENTITY_LIST } from "@/lib/content/registry";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/updates", label: "Updates" },
  { href: "/admin/links", label: "Links" },
  ...ENTITY_LIST.map((e) => ({ href: `/admin/content/${e.key}`, label: e.label })),
  { href: "/admin/subscribers", label: "Subscribers" },
  { href: "/admin/contacts", label: "Contacts" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/affiliate", label: "Affiliate" },
  { href: "/admin/integrations", label: "Integrations" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl gap-8 px-4 py-8">
      <aside className="w-48 shrink-0 border-r pr-4">
        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Admin
        </p>
        <nav className="grid gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-btn px-2 py-1.5 text-sm hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="mb-6 flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <SignOutButton />
        </header>
        {children}
      </main>
    </div>
  );
}
