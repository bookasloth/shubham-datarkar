"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deleteBook } from "@/lib/books/actions";

export function BookDeleteButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const { toast } = useToast();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        if (!confirm(`Delete "${title}"? This removes the book and its review.`)) return;
        const res = await deleteBook(id);
        if ("error" in res) {
          toast({ title: res.error, variant: "danger" });
          return;
        }
        toast({ title: "Book deleted", variant: "success" });
        router.push("/admin/books");
        router.refresh();
      }}
    >
      Delete
    </Button>
  );
}
