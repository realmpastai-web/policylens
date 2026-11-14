import { GITHUB_URL } from "../config.ts";

export function Footer() {
  return (
    <footer className="mx-auto mt-16 max-w-6xl border-t border-line px-4 py-8 text-sm text-ink-soft sm:px-6">
      <p>
        PolicyLens is a personal project by Santhosh Madhava (SanFire). The source is{" "}
        <a className="underline decoration-line underline-offset-2 hover:text-ink" href={GITHUB_URL}>
          on GitHub
        </a>{" "}
        under the MIT license.
      </p>
    </footer>
  );
}
