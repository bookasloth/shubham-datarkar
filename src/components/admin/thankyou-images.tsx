"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { addThankyouImage, removeThankyouImage, type ActionState } from "@/lib/support/updates-actions";

export function ThankyouImages({ images }: { images: string[] }) {
  const [state, action] = useActionState<ActionState, FormData>(addThankyouImage, undefined);

  return (
    <section className="rounded-card border border-border p-5">
      <h2 className="font-semibold">Thank-you images</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Up to 5. One is attached to each auto thank-you post. ({images.length}/5)
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
        {images.map((url) => (
          <div key={url} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="aspect-square w-full rounded-img border border-border object-cover" />
            <form action={removeThankyouImage.bind(null, url) as (payload: FormData) => Promise<void>}>
              <button
                type="submit"
                className="absolute right-1 top-1 rounded-btn bg-foreground px-1.5 py-0.5 text-xs text-background"
              >
                Remove
              </button>
            </form>
          </div>
        ))}
      </div>

      {images.length < 5 && (
        <form action={action} className="mt-4 flex items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="ty-image">Add image</Label>
            <input id="ty-image" name="image" type="file" accept="image/*" className="text-sm" />
          </div>
          <Button type="submit" size="sm">Upload</Button>
        </form>
      )}

      {state && !state.ok && <p className="mt-2 text-sm text-destructive">{state.message}</p>}
    </section>
  );
}
