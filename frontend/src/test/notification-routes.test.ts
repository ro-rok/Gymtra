import { describe, expect, it } from "vitest";

import { normalizeNotificationPath } from "@/lib/notification-routes";

describe("normalizeNotificationPath", () => {
  it("prefixes bare member paths with the authenticated gym slug", () => {
    expect(normalizeNotificationPath("/member#water-log", "iron-paradise")).toBe(
      "/iron-paradise/member#water-log",
    );
  });

  it("keeps gym-scoped member paths unchanged", () => {
    expect(normalizeNotificationPath("/iron-paradise/member#water-log", "other-gym")).toBe(
      "/iron-paradise/member#water-log",
    );
  });

  it("leaves platform test home route unchanged", () => {
    expect(normalizeNotificationPath("/", "iron-paradise")).toBe("/");
  });

  it("parses absolute notification URLs", () => {
    expect(
      normalizeNotificationPath("https://gymtra.app/iron-paradise/member#water-log", "ignored"),
    ).toBe("/iron-paradise/member#water-log");
  });
});
