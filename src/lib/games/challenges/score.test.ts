import { describe, expect, it } from "vitest";
import { nextAttemptState } from "./engine";

describe("nextAttemptState", () => {
  it("wins immediately on a correct guess", () => {
    expect(nextAttemptState(0, true, 6)).toEqual({ status: "won", finished: true });
  });
  it("loses when the last allowed guess is wrong", () => {
    expect(nextAttemptState(5, false, 6)).toEqual({ status: "lost", finished: true });
  });
  it("stays in progress with guesses left", () => {
    expect(nextAttemptState(2, false, 6)).toEqual({ status: "in_progress", finished: false });
  });
});
