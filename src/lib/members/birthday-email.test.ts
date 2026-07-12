import { describe, expect, it } from "vitest";
import { birthdayEmail } from "./birthday-email";

describe("birthdayEmail", () => {
  it("uses the first name only", () => {
    const { subject, text } = birthdayEmail("Shubham Datarkar");
    expect(subject).toBe("Happy birthday, Shubham!");
    expect(text).toContain("Hi Shubham,");
  });

  it("falls back to 'there' when name is missing", () => {
    expect(birthdayEmail(null).subject).toBe("Happy birthday, there!");
    expect(birthdayEmail("   ").subject).toBe("Happy birthday, there!");
  });

  it("escapes HTML in the name so it can't inject into the email body", () => {
    const { html } = birthdayEmail('<script>x</script> Roy');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
