import type { Testimonial } from "@/lib/data/types";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function TestimonialCard({ testimonial, className }: { testimonial: Testimonial; className?: string }) {
  return (
    <Card className={className}>
      <figure className="flex h-full flex-col p-6">
        <blockquote className="flex-1 text-[15px] leading-relaxed text-foreground">
          &ldquo;{testimonial.quote}&rdquo;
        </blockquote>
        <figcaption className="mt-5 flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{testimonial.initials}</AvatarFallback>
          </Avatar>
          <div className="text-sm">
            <div className="font-medium">{testimonial.name}</div>
            <div className="text-muted-foreground">
              {testimonial.role}, {testimonial.company}
            </div>
          </div>
        </figcaption>
      </figure>
    </Card>
  );
}
