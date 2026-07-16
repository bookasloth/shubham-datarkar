import { describe, it, expect } from "vitest";
import { MAIL_PROVIDERS, orderedProviders, providerForEmail } from "./mail-providers";

describe("providerForEmail", () => {
  it("matches the common consumer domains", () => {
    expect(providerForEmail("someone@gmail.com")?.key).toBe("gmail");
    expect(providerForEmail("someone@hotmail.com")?.key).toBe("outlook");
    expect(providerForEmail("someone@yahoo.co.in")?.key).toBe("yahoo");
    expect(providerForEmail("someone@pm.me")?.key).toBe("proton");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(providerForEmail("  Someone@GMAIL.com ")?.key).toBe("gmail");
  });

  it("returns null for a work domain or junk", () => {
    expect(providerForEmail("me@shubhamdatarkar.com")).toBeNull();
    expect(providerForEmail("not-an-email")).toBeNull();
    expect(providerForEmail("")).toBeNull();
  });
});

describe("orderedProviders", () => {
  it("always offers every provider — a domain guess is a guess", () => {
    // A custom domain often sits on Gmail, so no match must not mean no options.
    expect(orderedProviders("me@acme.dev")).toHaveLength(MAIL_PROVIDERS.length);
    expect(orderedProviders("me@yahoo.com")).toHaveLength(MAIL_PROVIDERS.length);
  });

  it("puts the likely mailbox first", () => {
    expect(orderedProviders("me@proton.me")[0].key).toBe("proton");
    expect(orderedProviders("me@outlook.com")[0].key).toBe("outlook");
  });

  it("keeps the default order when nothing matches", () => {
    expect(orderedProviders("me@acme.dev").map((p) => p.key)).toEqual(
      MAIL_PROVIDERS.map((p) => p.key),
    );
  });

  it("does not mutate the shared list", () => {
    const before = MAIL_PROVIDERS.map((p) => p.key);
    orderedProviders("me@proton.me");
    expect(MAIL_PROVIDERS.map((p) => p.key)).toEqual(before);
  });
});
