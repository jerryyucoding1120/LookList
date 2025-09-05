// Supabase Edge Function (Deno) — Stripe Webhook handler.
// - Verifies Stripe signature
// - On checkout.session.completed:
//     * Deduct redeemed LLD
//     * Award LLD = 1% of amount_total (if >= £10)
//     * Increment availability.booked_count
//
// Notes:
// - Requires secrets: STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import Stripe from "npm:stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors() });
  }

  const sig = req.headers.get("stripe-signature") || "";
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return new Response("Bad signature", { status: 400, headers: cors() });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = (session.metadata?.user_id as string) || (session.client_reference_id as string);
      const availabilityId = session.metadata?.availability_id as string | undefined;
      const lldRedeem = parseInt((session.metadata?.lld_to_redeem as string) || "0", 10);
      const amountTotal = session.amount_total ?? 0; // pence
      const award = amountTotal >= 1000 ? Math.floor(amountTotal * 0.01) : 0; // 1% if >= £10

      const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

      if (userId) {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("lld_balance")
          .eq("user_id", userId)
          .maybeSingle();

        const current = Math.max(0, Math.floor(Number(wallet?.lld_balance || 0)));
        const next = current - Math.max(0, lldRedeem) + Math.max(0, award);

        await supabase
          .from("wallets")
          .upsert({ user_id: userId, lld_balance: next, updated_at: new Date().toISOString() });

        if (lldRedeem > 0) {
          await supabase.from("lld_transactions").insert({
            user_id: userId, amount: -lldRedeem, source: "redeem_checkout"
          });
        }
        if (award > 0) {
          await supabase.from("lld_transactions").insert({
            user_id: userId, amount: award, source: "award_purchase"
          });
        }
      }

      if (availabilityId) {
        const { data: slot } = await supabase
          .from("availability")
          .select("booked_count")
          .eq("id", availabilityId)
          .single();

        if (slot) {
          await supabase
            .from("availability")
            .update({ booked_count: (Number(slot.booked_count || 0) + 1) })
            .eq("id", availabilityId);
        }
      }
    }

    return new Response("ok", { status: 200, headers: cors() });
  } catch (e) {
    console.error("[stripe-webhook] Handler error:", e);
    return new Response("error", { status: 500, headers: cors() });
  }
});

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  };
}