import { analyzeDocument, CHECK_IDS } from "@policylens/core";
import { cases } from "./corpus.ts";
import { formatReport, scoreChecks } from "./metrics.ts";

interface Mismatch {
  id: string;
  title: string;
  missing: string[];
  unexpected: string[];
  score?: string;
}

const mismatches: Mismatch[] = [];
const predictions = cases.map((item) => {
  const analysis = analyzeDocument(item.text, {
    template: item.templateId,
    referenceDate: item.referenceDate,
  });
  const predicted = new Set<string>(analysis.findings.map((finding) => finding.checkId));
  const gold = new Set<string>(item.checks);
  const missing = [...gold].filter((check) => !predicted.has(check)).sort();
  const unexpected = [...predicted].filter((check) => !gold.has(check)).sort();
  const score = analysis.score.total;
  const scoreOff = score < item.scoreMin || score > item.scoreMax;
  if (missing.length > 0 || unexpected.length > 0 || scoreOff) {
    mismatches.push({
      id: item.id,
      title: item.title,
      missing,
      unexpected,
      score: scoreOff ? `${score} outside ${item.scoreMin}–${item.scoreMax}` : undefined,
    });
  }
  return { id: item.id, gold, predicted };
});

const report = scoreChecks(predictions, [...CHECK_IDS]);
console.log(`PolicyLens evals — ${cases.length} synthetic documents\n`);
console.log(formatReport(report));

if (mismatches.length > 0) {
  console.error("\nMismatches:");
  for (const mismatch of mismatches) {
    console.error(`- ${mismatch.id}: ${mismatch.title}`);
    if (mismatch.missing.length > 0) console.error(`  missing: ${mismatch.missing.join(", ")}`);
    if (mismatch.unexpected.length > 0) console.error(`  unexpected: ${mismatch.unexpected.join(", ")}`);
    if (mismatch.score) console.error(`  score: ${mismatch.score}`);
  }
  process.exitCode = 1;
} else {
  console.log("\nAll expected checks matched.");
}
