"use client";

import * as React from "react";
import { BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/toast";
import { ConfettiBurst, type ConfettiHandle } from "./confetti-burst";
import { CoverDrift } from "./cover-drift";
import { ProjectsGrid } from "./projects-grid";
import { supportProfile } from "@/lib/data/support-content";
import { initialsOf } from "@/lib/support/config";

const COFFEE_TOFFEE_LOGO = "https://company-assets.bookasloth.in/images/sd/website/coffee-toffee-logo.webp";

/** Persistent identity sidebar. */
export function ProfileCard({ supporterCount }: { supporterCount?: number }) {
  const p = supportProfile;
  const count = supporterCount ?? p.supporterCount;
  const { toast } = useToast();
  const confettiRef = React.useRef<ConfettiHandle>(null);

  return (
    <div className="overflow-hidden rounded-card border border-border bg-card">
      <ConfettiBurst ref={confettiRef} />
      <div className="relative h-24 overflow-hidden border-b border-border bg-muted">
        <CoverDrift className="absolute inset-0" />
        {/* glass sheen */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/5" />
      </div>

      <div className="px-6 pb-6 text-center">
        <div className="relative -mt-10 mx-auto w-fit">
          <Avatar className="size-20 rounded-full border-2 border-card">
            <AvatarImage src={p.photo} alt={p.name} />
            <AvatarFallback className="rounded-full bg-foreground text-lg font-bold text-background">
              {initialsOf(p.name)}
            </AvatarFallback>
          </Avatar>
          {p.isVerified && (
            <button
              type="button"
              onClick={() =>
                toast({
                  title: "Verified founder",
                  description: "Real human, real coffees. Thanks for stopping by.",
                  variant: "success",
                })
              }
              aria-label="Verified — what's this?"
              className="absolute bottom-0 right-0 flex size-6 items-center justify-center rounded-full border-2 border-card bg-white text-brand transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              title="Verified"
            >
              <BadgeCheck className="size-3.5" />
            </button>
          )}
        </div>

        <div className="mt-4">
          <h1 className="font-display text-xl font-bold tracking-tight">{p.name}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{p.role}</p>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.bio}</p>

        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => confettiRef.current?.fire()}
            aria-label="Celebrate"
            className="rounded-btn transition-ui hover:scale-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={COFFEE_TOFFEE_LOGO} alt="" className="size-5" />
          </button>
          <span className="font-semibold text-foreground">{count}</span>
          <span className="text-muted-foreground">supporters and counting</span>
        </div>

        <Separator className="my-5" />

        <div className="text-left">
          <ProjectsGrid />
        </div>
      </div>
    </div>
  );
}
