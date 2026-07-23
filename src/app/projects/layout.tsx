import * as React from "react";

/**
 * Projects layout carries a parallel `@modal` slot so an intercepted
 * `(.)[slug]` route can overlay a project preview without leaving the list.
 */
export default function ProjectsLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
