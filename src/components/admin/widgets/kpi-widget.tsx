import Link from "next/link";
import { AdminCard } from "@/components/admin";

export function KPIWidget({
  label,
  value,
  hint,
  icon,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  href?: string;
}) {
  const card = (
    <AdminCard interactive={!!href} className="h-full">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-admin-text-muted">{label}</p>
        {icon && <span className="text-admin-text-muted [&_svg]:size-4">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold text-admin-text">{value}</p>
      {hint && <p className="mt-1 text-xs text-admin-text-muted">{hint}</p>}
    </AdminCard>
  );
  return href ? (
    <Link href={href} className="block outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent rounded-card">
      {card}
    </Link>
  ) : (
    card
  );
}
