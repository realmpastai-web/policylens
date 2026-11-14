export function ScoreRing({ score }: { score: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100);
  const color = score >= 80 ? "#0e6b66" : score >= 60 ? "#8a5a12" : "#8f3d2b";

  return (
    <div className="relative h-28 w-28 shrink-0" aria-hidden="true">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e7e0d2" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-3xl leading-none text-ink">{score}</span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-soft">of 100</span>
      </div>
    </div>
  );
}
