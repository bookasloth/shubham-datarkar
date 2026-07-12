"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateMyAccount, type AccountFields } from "@/lib/members/account-actions";

type Props = {
  email: string;
  username: string;
  initial: AccountFields;
};

function fmtDob(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-right">{value || "—"}</dd>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-muted-foreground text-xs font-normal">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** Read/edit-in-place card for the member's own optional profile fields. */
export function PersonalDetailsCard({ email, username, initial }: Props) {
  const [editing, setEditing] = useState(false);
  const [vals, setVals] = useState<AccountFields>(initial);
  const [draft, setDraft] = useState<AccountFields>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    start(async () => {
      const res = await updateMyAccount(draft);
      if (res.ok) {
        setVals(draft);
        setEditing(false);
      } else {
        setError(res.error ?? "Could not save.");
      }
    });
  }

  return (
    <section className="rounded-card border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Personal details</h2>
        {!editing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDraft(vals);
              setError(null);
              setEditing(true);
            }}
          >
            Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className="mt-3 space-y-3">
          <Field id="fullName" label="Name" value={draft.fullName} placeholder="Your name" onChange={(v) => setDraft({ ...draft, fullName: v })} />
          <Field id="dob" label="Date of birth" type="date" value={draft.dob} onChange={(v) => setDraft({ ...draft, dob: v })} />
          <Field id="location" label="Location" value={draft.location} placeholder="City, Country" onChange={(v) => setDraft({ ...draft, location: v })} />
          <Field id="whatsapp" label="WhatsApp" type="tel" value={draft.whatsapp} placeholder="+91 98765 43210" onChange={(v) => setDraft({ ...draft, whatsapp: v })} />
          {error && <p className="text-danger text-xs">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={save} loading={pending}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setError(null); }} disabled={pending}>
              Cancel
            </Button>
          </div>
          <p className="text-muted-foreground pt-1 text-xs">All optional. Add your birthday to get a note from me.</p>
        </div>
      ) : (
        <dl className="mt-3 space-y-2 text-sm">
          <ReadRow label="Email" value={email} />
          <ReadRow label="Username" value={username} />
          <ReadRow label="Name" value={vals.fullName} />
          <ReadRow label="Date of birth" value={fmtDob(vals.dob)} />
          <ReadRow label="Location" value={vals.location} />
          <ReadRow label="WhatsApp" value={vals.whatsapp} />
        </dl>
      )}
    </section>
  );
}
