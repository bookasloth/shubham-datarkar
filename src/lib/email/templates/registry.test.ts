import { describe, it, expect } from "vitest";
import { EMAIL_CATALOG } from "./index";
import { EMAIL_GIFS } from "../gifs";
import { accountWelcome } from "./auth";
import { newComment } from "./community";

describe("email catalog", () => {
  it("every entry renders a complete, non-empty email", () => {
    for (const e of EMAIL_CATALOG) {
      const email = e.render();
      expect(email.subject, `${e.key} subject`).toBeTruthy();
      expect(email.text, `${e.key} text`).toBeTruthy();
      expect(email.html, `${e.key} html`).toContain("<!DOCTYPE html>");
      expect(email.html, `${e.key} html closes`).toContain("</html>");
    }
  });

  it("every entry embeds exactly its configured GIF", () => {
    for (const e of EMAIL_CATALOG) {
      const url = EMAIL_GIFS[e.gifKey];
      expect(url, `${e.key} gifKey resolves`).toBeTruthy();
      expect(e.render().html, `${e.key} embeds gif`).toContain(url);
    }
  });

  it("has unique keys", () => {
    const keys = EMAIL_CATALOG.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("escapes user-supplied values (no HTML injection)", () => {
    const html = accountWelcome({ name: "<script>alert(1)</script>" }).html;
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");

    const commentHtml = newComment({
      author: "<script>alert(1)</script>",
      excerpt: "<b>x</b>",
      href: "https://x.com",
    }).html;
    expect(commentHtml).not.toContain("<script>alert(1)</script>");
    expect(commentHtml).toContain("&lt;script&gt;");
  });

  it("transactional emails do not claim a newsletter subscription", () => {
    const txnKeys = [
      "accountWelcome", "forgotPassword", "passwordChanged", "commentOtp",
      "membershipActivated", "renewalReminder", "membershipRenewed", "paymentFailed",
      "membershipGift", "requestReceived", "requestApproved", "requestDeclined",
      "contactConfirmation", "projectInquiry", "communityWelcome", "postPublished",
      "newComment", "birthday", "festival", "weMissYou", "inactiveAccount",
      "achievementUnlocked", "streakReminder", "newGame",
      "firstPostNudge", "newMemberResource", "introduction",
    ];
    for (const key of txnKeys) {
      const e = EMAIL_CATALOG.find((x) => x.key === key)!;
      expect(e.render().html, `${key} footer`).not.toContain("subscribed to Shubham Datarkar's Newsletter");
    }
  });
});
