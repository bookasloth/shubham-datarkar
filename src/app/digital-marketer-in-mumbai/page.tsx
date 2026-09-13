import { buildMetadata } from "@/lib/seo";
import { digitalMarketerCities } from "@/lib/data/landing/digital-marketer-cities";
import { CityMarketerLanding } from "@/components/landing/city-marketer-landing";

const c = digitalMarketerCities.mumbai;

export const revalidate = 300; // ISR

export const metadata = buildMetadata({ title: c.metaTitle, description: c.metaDescription, path: c.path });

export default function DigitalMarketerInMumbaiPage() {
  return <CityMarketerLanding c={c} />;
}
