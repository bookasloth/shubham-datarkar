"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

const STORAGE_KEY = "admin:sidebar-collapsed";

export function AdminShell({
  user,
  children,
}: {
  user: { email: string };
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  // Hydration-safe: read persisted state after mount (avoids SSR mismatch).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const toggle = React.useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  return (
    <div data-admin className="flex min-h-screen bg-admin-bg text-admin-text">
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header email={user.email} />
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
