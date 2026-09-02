"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "warning" | "danger";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  /** Optional single action button (e.g. Undo). Clicking it dismisses the toast. */
  action?: { label: string; onClick: () => void };
};

type ToastRecord = ToastInput & { id: number };

type ToastContextValue = { toast: (input: ToastInput) => void };

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const icons: Record<ToastVariant, React.ReactNode> = {
  default: <Info className="size-4" />,
  success: <Check className="size-4 text-success" />,
  warning: <TriangleAlert className="size-4 text-warning" />,
  danger: <TriangleAlert className="size-4 text-danger" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);
  const counter = React.useRef(0);

  const remove = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (input: ToastInput) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { ...input, id }]);
      const duration = input.duration ?? 4000;
      window.setTimeout(() => remove(id), duration);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="pointer-events-auto flex items-start gap-3 rounded-card border border-border bg-popover p-4 text-popover-foreground shadow-lg"
              role="status"
            >
              <span className="mt-0.5 text-muted-foreground">{icons[t.variant ?? "default"]}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{t.title}</p>
                {t.description && <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>}
                {t.action && (
                  <button
                    onClick={() => {
                      t.action!.onClick();
                      remove(t.id);
                    }}
                    className="mt-1.5 rounded-btn text-sm font-medium text-brand transition-ui hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => remove(t.id)}
                aria-label="Dismiss notification"
                className={cn(
                  "rounded-btn p-1 text-muted-foreground transition-ui hover:bg-accent hover:text-foreground",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                )}
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
