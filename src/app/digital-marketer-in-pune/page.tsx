import { buildMetadata } from "@/lib/seo";
import { digitalMarketerCities } from "@/lib/data/landing/digital-marketer-cities";
import { CityMarketerLanding } from "@/components/landing/city-marketer-landing";

const c = digitalMarketerCities.pune;

export const revalidate = 300; // ISR

export const metadata = buildMetadata({ title: c.metaTitle, description: c.metaDescription, path: c.path });

export default function DigitalMarketerInPunePage() {
  return <CityMarketerLanding c={c} />;
}
