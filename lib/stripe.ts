import Stripe from "stripe";

const globalForStripe = globalThis as unknown as { stripe?: Stripe };

function createClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // Allow the app to boot without a Stripe key configured yet; routes that
    // actually need Stripe will throw a clear error only when called.
    return null;
  }
  return new Stripe(key);
}

export const stripe = globalForStripe.stripe ?? createClient();

if (process.env.NODE_ENV !== "production" && stripe) {
  globalForStripe.stripe = stripe;
}

export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. Add it to .env and restart the server to enable billing."
    );
  }
  return stripe;
}
