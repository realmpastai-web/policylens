import { isPro, useAppState } from "../lib/store.ts";

const LINKS = [
  { href: "#/review", label: "Review" },
  { href: "#/batch", label: "Batch" },
  { href: "#/templates", label: "Checklists" },
  { href: "#/pricing", label: "Pricing" },
];

export function Header({ path }: { path: string }) {
  const app = useAppState();
  const pro = isPro(app);

  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <a href="#/" className="mr-auto flex items-center gap-2 font-serif text-xl font-semibold tracking-tight">
          <LensMark />
          PolicyLens
        </a>
        <nav className="flex flex-wrap items-center gap-1" aria-label="Primary">
          {LINKS.map((link) => {
            const active = path === link.href.slice(1);
            return (
              <a key={link.href} href={link.href} className="nav-link" aria-current={active ? "page" : undefined}>
                {link.label}
              </a>
            );
          })}
        </nav>
        <a href="#/pricing" className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          {pro ? "Pro on this browser" : "Free"}
        </a>
      </div>
    </header>
  );
}

function LensMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0e6b66" />
      <rect x="7" y="6" width="12" height="16" rx="1.4" fill="#f4f0e6" />
      <circle cx="20.5" cy="19" r="4" fill="none" stroke="#f4f0e6" strokeWidth="1.7" />
      <path d="M23.4 22.1 26.4 25.2" stroke="#f4f0e6" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
