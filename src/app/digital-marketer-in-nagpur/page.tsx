import { buildMetadata } from "@/lib/seo";
import { digitalMarketerCities } from "@/lib/data/landing/digital-marketer-cities";
import { CityMarketerLanding } from "@/components/landing/city-marketer-landing";

const c = digitalMarketerCities.nagpur;

export const revalidate = 300; // ISR

export const metadata = buildMetadata({ title: c.metaTitle, description: c.metaDescription, path: c.path });

export default function DigitalMarketerInNagpurPage() {
  return <CityMarketerLanding c={c} />;
}
