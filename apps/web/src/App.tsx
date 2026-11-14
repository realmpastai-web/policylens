import { lazy, Suspense, useEffect, useState } from "react";
import { Footer } from "./components/Footer.tsx";
import { Header } from "./components/Header.tsx";

const HomePage = lazy(() => import("./pages/HomePage.tsx").then((mod) => ({ default: mod.HomePage })));
const ReviewPage = lazy(() => import("./pages/ReviewPage.tsx").then((mod) => ({ default: mod.ReviewPage })));
const BatchPage = lazy(() => import("./pages/BatchPage.tsx").then((mod) => ({ default: mod.BatchPage })));
const TemplatesPage = lazy(() => import("./pages/TemplatesPage.tsx").then((mod) => ({ default: mod.TemplatesPage })));
const PricingPage = lazy(() => import("./pages/PricingPage.tsx").then((mod) => ({ default: mod.PricingPage })));

function readPath(): string {
  const hash = window.location.hash.replace(/^#/, "");
  const path = hash.split("?")[0] || "/";
  if (path === "/review" || path === "/batch" || path === "/templates" || path === "/pricing") return path;
  return "/";
}

export function App() {
  const [path, setPath] = useState(readPath);

  useEffect(() => {
    const onHash = () => setPath(readPath());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "PolicyLens — policy document QA",
      "/review": "Review a document — PolicyLens",
      "/batch": "Batch — PolicyLens",
      "/templates": "Checklists — PolicyLens",
      "/pricing": "Pricing — PolicyLens",
    };
    document.title = titles[path] ?? "PolicyLens";
  }, [path]);

  return (
    <div className="min-h-screen">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-full focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Header path={path} />
      <main id="content">
        <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-10 text-sm text-ink-soft sm:px-6">Loading…</p>}>
          {path === "/" ? <HomePage /> : null}
          {path === "/review" ? <ReviewPage /> : null}
          {path === "/batch" ? <BatchPage /> : null}
          {path === "/templates" ? <TemplatesPage /> : null}
          {path === "/pricing" ? <PricingPage /> : null}
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
