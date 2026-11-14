import { describe, expect, it } from "vitest";
import { scoreChecks } from "./metrics.ts";

describe("scoreChecks", () => {
  it("counts true positives, false positives, and false negatives per check", () => {
    const report = scoreChecks(
      [
        { id: "hit", gold: new Set(["missing_section"]), predicted: new Set(["missing_section"]) },
        { id: "miss", gold: new Set(["missing_section"]), predicted: new Set([]) },
        { id: "extra", gold: new Set([]), predicted: new Set(["missing_section"]) },
        { id: "quiet", gold: new Set([]), predicted: new Set([]) },
      ],
      ["missing_section", "stale_review"],
    );

    const missing = report.perCheck.find((row) => row.checkId === "missing_section");
    expect(missing).toMatchObject({ tp: 1, fp: 1, fn: 1, support: 2, precision: 0.5, recall: 0.5 });
    expect(report.perCheck.find((row) => row.checkId === "stale_review")?.support).toBe(0);
    expect(report.microPrecision).toBe(0.5);
    expect(report.microRecall).toBe(0.5);
    expect(report.macroPrecision).toBe(0.5);
    expect(report.macroRecall).toBe(0.5);
  });
});
