import { getBookings, instagramBookingCount } from "@/lib/booking/queries";
import { PageHeader } from "@/components/admin";
import { BookingsTable } from "./bookings-table";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const bookings = await getBookings(200);
  const fromInstagram = instagramBookingCount(bookings);
  return (
    <div>
      <PageHeader
        title="Bookings"
        description={`Consultation calls booked via the scheduler. ${bookings.length} total${fromInstagram ? ` · ${fromInstagram} from Instagram` : ""}.`}
      />
      <BookingsTable rows={bookings} />
    </div>
  );
}
