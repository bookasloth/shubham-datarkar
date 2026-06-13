import { clients } from "@/lib/data/clients";
import { Marquee } from "@/components/sections/marquee";

function Logo({ name }: { name: string }) {
  return (
    <span className="flex h-12 items-center whitespace-nowrap rounded-card border border-border bg-card px-6 font-display text-base font-bold text-muted-foreground/80">
      {name}
    </span>
  );
}

/** Two rows of client brands, scrolling in opposite directions. */
export function ClientsMarquee() {
  const half = Math.ceil(clients.length / 2);
  const rowA = clients.slice(0, half);
  const rowB = clients.slice(half);
  return (
    <div className="flex flex-col gap-4">
      <Marquee duration={38}>
        {rowA.map((c) => (
          <Logo key={c.name} name={c.name} />
        ))}
      </Marquee>
      <Marquee duration={38} reverse>
        {rowB.map((c) => (
          <Logo key={c.name} name={c.name} />
        ))}
      </Marquee>
    </div>
  );
}
