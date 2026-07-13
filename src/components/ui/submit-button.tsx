"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Submit button that shows the shared spinner while its parent `<form>`'s action
 * is pending — the missing feedback on server-action forms. Drop-in replacement
 * for `<Button type="submit">` inside any `<form action={…}>`; no props needed.
 */
export function SubmitButton({ children, loading, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending || loading} {...props}>
      {children}
    </Button>
  );
}
