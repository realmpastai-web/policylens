import { useState } from "react";
import { STRIPE_PRO_PAYMENT_LINK } from "../config.ts";
import { isValidLicense, normalizeLicense } from "../lib/license.ts";
import { isPro, setLicense, updateState, useAppState } from "../lib/store.ts";

const FREE = [
  "Review one document at a time",
  "Batch up to 3 files",
  "Healthcare, IT security, and SOP checklists",
  "Edit those checklists on this device",
  "JSON download and a printable HTML report",
];

const PRO = [
  "Batches larger than 3 files",
  "Named custom checklists, kept on this device",
  "Organization name on the printed report",
];

export function Pricing() {
  const app = useAppState();
  const pro = isPro(app);
  const [draft, setDraft] = useState(app.license);
  const [message, setMessage] = useState("");
  const link = STRIPE_PRO_PAYMENT_LINK.trim();

  function saveKey() {
    const normalized = normalizeLicense(draft);
    if (!normalized) {
      setLicense("");
      setMessage("Key removed from this browser.");
      return;
    }
    if (!isValidLicense(normalized)) {
      setMessage("That key does not match the version 1 format: PL-PRO- and 16 hexadecimal characters.");
      return;
    }
    setLicense(normalized);
    setDraft(normalized);
    setMessage("Pro is unlocked in this browser. The key was not sent anywhere.");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <article className="panel p-6">
        <p className="kicker">Free</p>
        <h2 className="mt-2 font-serif text-3xl">Check documents here</h2>
        <ul className="mt-4 space-y-2 text-sm text-ink-soft">
          {FREE.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <a href="#/review" className="btn-primary mt-6">
          Open the reviewer
        </a>
      </article>
      <article className="panel border-teal/30 p-6">
        <p className="kicker">Pro</p>
        <h2 className="mt-2 font-serif text-3xl">{pro ? "Unlocked on this browser" : "Not for sale yet"}</h2>
        <ul className="mt-4 space-y-2 text-sm text-ink-soft">
          {PRO.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="mt-6">
          {link ? (
            <a className="btn-primary" href={link} target="_blank" rel="noreferrer">
              Continue to Stripe
            </a>
          ) : (
            <button type="button" className="btn-secondary" disabled>
              Coming soon
            </button>
          )}
          <p className="mt-3 text-sm text-ink-soft">
            {link
              ? "Payment is a Stripe Payment Link. PolicyLens does not see your card."
              : "There is no Stripe account for this project yet, so this button does not open a checkout."}
          </p>
        </div>
        <form
          className="mt-6 space-y-2 border-t border-line pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveKey();
          }}
        >
          <label className="block text-sm font-semibold" htmlFor="license-key">
            License key
          </label>
          <p className="text-sm text-ink-soft">
            Version 1 stores the key in this browser and checks the format only. It is not verified with a server.
            That is a limitation of this version, not a free trial.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="license-key"
              className="field font-mono"
              value={draft}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="PL-PRO-…"
            />
            <button type="submit" className="btn-primary">
              Save on this device
            </button>
          </div>
          {app.license ? (
            <button
              type="button"
              className="btn-quiet px-0"
              onClick={() => {
                setDraft("");
                setLicense("");
                setMessage("Key removed from this browser.");
              }}
            >
              Remove key
            </button>
          ) : null}
          {message ? <p className="text-sm">{message}</p> : null}
        </form>
        <label className="mt-4 block text-sm font-semibold" htmlFor="org-name">
          Organization name on reports
        </label>
        <input
          id="org-name"
          className="field mt-1"
          value={app.orgName}
          disabled={!pro}
          maxLength={80}
          placeholder={pro ? "Name printed on the report" : "Pro adds this line to the report"}
          onChange={(event) => updateState({ orgName: event.target.value })}
        />
      </article>
    </div>
  );
}
