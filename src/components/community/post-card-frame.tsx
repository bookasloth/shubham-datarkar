"use client";
import { createContext, useContext, useState } from "react";

/**
 * Optimistic-removal frame around a server-rendered PostCard. The card is an
 * async RSC and can't hold its own removal state, so this thin client wrapper
 * owns a `removed` flag and hands `remove()`/`restore()` down through context to
 * the (client) PostMenu nested inside the server-rendered children.
 *
 * Removal only toggles visibility — siblings never unmount and nothing reorders,
 * so `restore()` brings the card back in its original position on a failed
 * delete. `hidden` (not unmount) keeps the DOM node so restore is instant.
 */
type Frame = { remove: () => void; restore: () => void; removed: boolean };
const FrameContext = createContext<Frame | null>(null);

export function usePostCardFrame() {
  return useContext(FrameContext);
}

export function PostCardFrame({ children }: { children: React.ReactNode }) {
  const [removed, setRemoved] = useState(false);
  return (
    <FrameContext.Provider
      value={{ removed, remove: () => setRemoved(true), restore: () => setRemoved(false) }}
    >
      <div hidden={removed}>{children}</div>
    </FrameContext.Provider>
  );
}
