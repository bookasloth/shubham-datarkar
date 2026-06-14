import { ArrowUpRight, BadgeCheck, Heart, MapPin } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supportProfile } from "@/lib/data/support-content";
import { initialsOf } from "@/lib/support/config";

/** Persistent identity sidebar. Pure monochrome, data from site content. */
export function ProfileCard() {
  const p = supportProfile;
  return (
    <div className="overflow-hidden rounded-card border border-border bg-card">
      <div className="h-24 border-b border-border bg-dots" />
      <div className="px-6 pb-6">
        <div className="relative -mt-10 w-fit">
          <Avatar className="size-20 rounded-full border-2 border-card">
            <AvatarFallback className="rounded-full bg-foreground text-lg font-bold text-background">
              {initialsOf(p.name)}
            </AvatarFallback>
          </Avatar>
          {p.isVerified && (
            <span
              className="absolute bottom-0 right-0 flex size-6 items-center justify-center rounded-full border-2 border-card bg-foreground text-background"
              title="Verified"
            >
              <BadgeCheck className="size-3.5" />
            </span>
          )}
        </div>

        <div className="mt-4">
          <h1 className="font-display text-xl font-bold tracking-tight">{p.name}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{p.role}</p>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.bio}</p>

        <div className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-4" />
          {p.location}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-input border border-border bg-muted/40 px-3 py-2.5 text-sm">
          <Heart className="size-4" />
          <span className="font-semibold text-foreground">{p.supporterCount}</span>
          <span className="text-muted-foreground">supporters and counting</span>
        </div>

        <ul className="mt-4 flex flex-col divide-y divide-border border-y border-border">
          {p.socials.map((s) => (
            <li key={s.label}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between py-2.5 text-sm transition-ui"
              >
                <span className="font-medium">{s.label}</span>
                <span className="flex items-center gap-1 text-muted-foreground transition-ui group-hover:text-foreground">
                  {s.handle}
                  <ArrowUpRight className="size-3.5" />
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {p.achievements.map((a) => (
            <Badge key={a} variant="outline">
              {a}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
