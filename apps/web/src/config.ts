/**
 * Stripe Payment Link for PolicyLens Pro.
 * Leave this empty until a real link exists. The Pro button then says
 * "Coming soon" and does not open a checkout.
 */
export const STRIPE_PRO_PAYMENT_LINK = "";

/** Free batches stop after this many files. Pro removes the cap. */
export const FREE_BATCH_LIMIT = 3;

/**
 * Version 1 only checks this shape in the browser. It is not verified with a server.
 * PL-PRO- followed by 16 hexadecimal characters.
 */
export const LICENSE_PATTERN = /^PL-PRO-[A-F0-9]{16}$/;

export const GITHUB_URL = "https://github.com/realmpastai-web/policylens";
export const LIVE_URL = "https://realmpastai-web.github.io/policylens/";
