import Stripe from "stripe";
import { config } from "../config";
import { userQueries, pool } from "../models/index";

// ── Stripe Client ───────────────────────────────────────────────────

export const stripe: Stripe | null = config.stripeSecretKey
  ? new Stripe(config.stripeSecretKey, { apiVersion: "2023-10-16" })
  : null;

// ── Plan Definitions ────────────────────────────────────────────────

export interface PlanDefinition {
  id: string;
  name: string;
  scansPerMonth: number;
  requestsPerMinute: number;
  features: string[];
  price: number; // cents per month
  stripePriceId?: string;
}

export const PLANS: Record<string, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    scansPerMonth: 10,
    requestsPerMinute: 5,
    features: [
      "10 scans per month",
      "Basic accessibility checks",
      "7-day report retention",
    ],
    price: 0,
  },
  pro: {
    id: "pro",
    name: "Pro",
    scansPerMonth: 200,
    requestsPerMinute: 30,
    features: [
      "200 scans per month",
      "All check categories",
      "PDF reports",
      "AI fix suggestions",
      "90-day retention",
    ],
    price: 2900, // $29/month
    stripePriceId: process.env.STRIPE_PRICE_PRO,
  },
  team: {
    id: "team",
    name: "Team",
    scansPerMonth: 1000,
    requestsPerMinute: 100,
    features: [
      "1000 scans per month",
      "All Pro features",
      "Scheduled scans",
      "Priority support",
      "1-year retention",
    ],
    price: 7900, // $79/month
    stripePriceId: process.env.STRIPE_PRICE_TEAM,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    scansPerMonth: Infinity,
    requestsPerMinute: 300,
    features: [
      "Unlimited scans",
      "All Team features",
      "SSO / SAML",
      "Dedicated support",
      "Unlimited retention",
    ],
    price: 29900, // $299/month
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE,
  },
};

// ── Checkout Session ────────────────────────────────────────────────

export async function createCheckoutSession(
  userId: string,
  planId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  if (!stripe) throw new Error("Stripe is not configured");

  const plan = PLANS[planId];
  if (!plan?.stripePriceId) {
    throw new Error(`No Stripe price configured for plan: ${planId}`);
  }

  const user = await userQueries.findById(userId);
  if (!user) throw new Error("User not found");

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    metadata: { userId, planId },
  };

  // Reuse existing Stripe customer if available
  if (user.stripe_customer_id) {
    sessionParams.customer = user.stripe_customer_id;
  } else {
    sessionParams.customer_email = user.email;
  }

  return stripe.checkout.sessions.create(sessionParams);
}

// ── Customer Portal ─────────────────────────────────────────────────

export async function createPortalSession(
  userId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  if (!stripe) throw new Error("Stripe is not configured");

  const user = await userQueries.findById(userId);
  if (!user) throw new Error("User not found");

  if (!user.stripe_customer_id) {
    throw new Error("No Stripe customer associated with this account");
  }

  return stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: returnUrl,
  });
}

// ── Webhook Handler ─────────────────────────────────────────────────

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.userId;
      const planId = session.metadata?.planId;

      if (userId && planId) {
        await userQueries.updatePlan(
          userId,
          planId,
          session.customer as string
        );
        console.log(
          `[billing] User ${userId} upgraded to ${planId}`
        );
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      if (subscription.status === "active") {
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        const user = await userQueries.findByStripeCustomerId(customerId);
        if (user) {
          console.log(
            `[billing] Subscription updated for user ${user.id}`
          );
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      const user = await userQueries.findByStripeCustomerId(customerId);
      if (user) {
        await userQueries.updatePlan(user.id, "free");
        console.log(
          `[billing] User ${user.id} downgraded to free (subscription cancelled)`
        );
      }
      break;
    }

    default:
      console.log(`[billing] Unhandled webhook event: ${event.type}`);
  }
}

// ── Usage Stats ─────────────────────────────────────────────────────

export async function getUsageStats(
  userId: string
): Promise<{
  scansThisMonth: number;
  scanLimit: number;
  plan: string;
}> {
  const user = await userQueries.findById(userId);
  if (!user) throw new Error("User not found");

  const plan = PLANS[user.plan] ?? PLANS.free;

  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM scans
     WHERE user_id = $1
       AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
       AND status != 'failed'`,
    [userId]
  );
  const scansThisMonth = parseInt(rows[0].count, 10);

  return {
    scansThisMonth,
    scanLimit: plan.scansPerMonth,
    plan: user.plan,
  };
}
