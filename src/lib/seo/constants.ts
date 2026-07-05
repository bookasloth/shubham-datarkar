export const PRIVATE_PREFIXES = ["/admin", "/dashboard", "/login", "/settings", "/profile", "/success", "/search"];

export const SCHEMA_FUNCTIONS = [
  "articleSchema",
  "breadcrumbSchema",
  "faqSchema",
  "serviceSchema",
  "productSchema",
  "reviewSchema",
  "profilePageSchema",
  "organizationSchema",
  "websiteSchema",
  "speakingServiceSchema",
] as const;

export const SCHEMA_DISPLAY_NAMES: Record<string, string> = {
  articleSchema: "Article",
  breadcrumbSchema: "Breadcrumb",
  faqSchema: "FAQ",
  serviceSchema: "Service",
  productSchema: "Product",
  reviewSchema: "Review",
  profilePageSchema: "ProfilePage",
  organizationSchema: "Organization",
  websiteSchema: "WebSite",
  speakingServiceSchema: "Speaking",
};

export function scoreColor(score: number): "red" | "orange" | "yellow" | "green" {
  if (score >= 85) return "green";
  if (score >= 70) return "yellow";
  if (score >= 50) return "orange";
  return "red";
}

export const SCORE_TONE = {
  red: "danger",
  orange: "warning",
  yellow: "warning",
  green: "success",
} as const;
