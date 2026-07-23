"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Fade-up-on-scroll, done with IntersectionObserver + CSS instead of
 * framer-motion — same API as before (Reveal / Stagger / StaggerItem), but no
 * animation-library JS ships to every marketing page. Reduced-motion is handled
 * in globals.css (`.reveal` rules), so it stays honest for those users.
 */
function useInViewOnce<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // Feature-detection fallback for environments without IO — show at once.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -80px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, inView };
}

/** Single element fade-up on scroll into view. Reduced-motion safe. */
export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn("reveal", inView && "is-visible", className)}
      style={
        {
          "--reveal-y": `${y}px`,
          transitionDelay: delay ? `${Math.round(delay * 1000)}ms` : undefined,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

/** Wrap a list to stagger children as the group scrolls into view. */
export function Stagger({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul" | "ol";
}) {
  const { ref, inView } = useInViewOnce<HTMLElement>();
  const Tag = as as React.ElementType;
  return (
    <Tag ref={ref} className={cn("reveal-group", inView && "is-visible", className)}>
      {children}
    </Tag>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li";
}) {
  const Tag = as as React.ElementType;
  return <Tag className={cn("reveal-item", className)}>{children}</Tag>;
}
