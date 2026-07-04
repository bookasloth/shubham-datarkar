import { getContacts } from "@/lib/contact/queries";
import { PageHeader } from "@/components/admin";
import { ContactsTable } from "./contacts-table";

export const dynamic = "force-dynamic";

export default async function AdminContactsPage() {
  const contacts = await getContacts(200);
  return (
    <div>
      <PageHeader title="Contacts" description={`Submissions from the contact form. ${contacts.length} total.`} />
      <ContactsTable rows={contacts} />
    </div>
  );
}
