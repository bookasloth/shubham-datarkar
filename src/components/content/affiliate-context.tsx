"use client";

import * as React from "react";
import { DEFAULT_AFFILIATE_DOMAINS } from "@/lib/content/affiliate";

/**
 * Carries the affiliate-domain allowlist down to the client RichText renderer,
 * so links can be tagged affiliate without prop-drilling through every block.
 */
const AffiliateDomainsContext = React.createContext<string[]>(DEFAULT_AFFILIATE_DOMAINS);

export function AffiliateProvider({
  domains,
  children,
}: {
  domains?: string[];
  children: React.ReactNode;
}) {
  return (
    <AffiliateDomainsContext.Provider value={domains ?? DEFAULT_AFFILIATE_DOMAINS}>
      {children}
    </AffiliateDomainsContext.Provider>
  );
}

export function useAffiliateDomains(): string[] {
  return React.useContext(AffiliateDomainsContext);
}
