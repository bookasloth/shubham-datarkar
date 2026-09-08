"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deleteMovie } from "@/lib/movies/actions";

export function MovieDeleteButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const { toast } = useToast();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        if (!confirm(`Delete "${title}"? This removes the movie and its review.`)) return;
        const res = await deleteMovie(id);
        if ("error" in res) {
          toast({ title: res.error, variant: "danger" });
          return;
        }
        toast({ title: "Movie deleted", variant: "success" });
        router.push("/admin/movies");
        router.refresh();
      }}
    >
      Delete
    </Button>
  );
}
