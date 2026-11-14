import { Pricing } from "../components/Pricing.tsx";

export function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <p className="kicker">Pricing</p>
      <h1 className="mt-2 font-serif text-4xl">Free now. Pro when checkout exists.</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        The free checks are the product you can use today. Pro is described here so the limit is not a surprise. There
        is no customer list and no payment history, because checkout is not connected.
      </p>
      <div className="mt-6">
        <Pricing />
      </div>
    </div>
  );
}
