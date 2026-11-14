export interface Prediction {
  id: string;
  gold: Set<string>;
  predicted: Set<string>;
}

export interface CheckScore {
  checkId: string;
  tp: number;
  fp: number;
  fn: number;
  support: number;
  precision: number | null;
  recall: number | null;
}

export interface MetricReport {
  perCheck: CheckScore[];
  microPrecision: number | null;
  microRecall: number | null;
  macroPrecision: number | null;
  macroRecall: number | null;
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

export function scoreChecks(cases: Prediction[], checkIds: string[]): MetricReport {
  const perCheck = checkIds.map((checkId) => {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    for (const item of cases) {
      const gold = item.gold.has(checkId);
      const predicted = item.predicted.has(checkId);
      if (gold && predicted) tp += 1;
      else if (predicted) fp += 1;
      else if (gold) fn += 1;
    }
    return {
      checkId,
      tp,
      fp,
      fn,
      support: tp + fn,
      precision: ratio(tp, tp + fp),
      recall: ratio(tp, tp + fn),
    };
  });

  const tp = perCheck.reduce((sum, row) => sum + row.tp, 0);
  const fp = perCheck.reduce((sum, row) => sum + row.fp, 0);
  const fn = perCheck.reduce((sum, row) => sum + row.fn, 0);
  const supported = perCheck.filter((row) => row.support > 0);

  return {
    perCheck,
    microPrecision: ratio(tp, tp + fp),
    microRecall: ratio(tp, tp + fn),
    macroPrecision: average(supported.map((row) => row.precision)),
    macroRecall: average(supported.map((row) => row.recall)),
  };
}

function average(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  return present.reduce((sum, value) => sum + value, 0) / present.length;
}

export function formatMetric(value: number | null): string {
  if (value === null) return "  n/a";
  return value.toFixed(3).padStart(5, " ");
}

export function formatReport(report: MetricReport): string {
  const header = "check                      tp  fp  fn  precision  recall  support";
  const lines = report.perCheck.map((row) =>
    [
      row.checkId.padEnd(24, " "),
      String(row.tp).padStart(3, " "),
      String(row.fp).padStart(3, " "),
      String(row.fn).padStart(3, " "),
      formatMetric(row.precision).padStart(10, " "),
      formatMetric(row.recall).padStart(7, " "),
      String(row.support).padStart(8, " "),
    ].join(" "),
  );
  return [
    header,
    ...lines,
    "",
    `micro precision ${formatMetric(report.microPrecision).trim()}   recall ${formatMetric(report.microRecall).trim()}`,
    `macro precision ${formatMetric(report.macroPrecision).trim()}   recall ${formatMetric(report.macroRecall).trim()}  (checks with at least one expected hit)`,
  ].join("\n");
}
