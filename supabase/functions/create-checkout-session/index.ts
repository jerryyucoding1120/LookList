// Supabase Edge Function (Deno) — Creates a Stripe Checkout Session.
// - Expects Authorization: Bearer <Supabase JWT> from the frontend
// - Body: { listing_id: string, availability_id: string, lld_to_redeem?: number }
// - Applies LLD redemption (1 LLD = £0.01), capped by wallet balance and slot price
// - Returns: { url } for Stripe-hosted checkout
//
// Notes:
// - Requires secrets: STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, SITE_URL
// - CORS enabled for static site usage

import Stripe from "npm:stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://jerryyucoding1120.github.io/LookList";

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("authorization") || "";
    const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!jwt) return json({ error: "Unauthorized (no token)" }, 401);

    const { listing_id, availability_id, lld_to_redeem } = await req.json().catch(() => ({}));
    if (!listing_id || !availability_id) {
      return json({ error: "listing_id and availability_id are required" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: userRes, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);
    const user = userRes.user;

    const { data: slot, error: slotErr } = await supabase
      .from("availability")
      .select("id, listing_id, label, date, start_time, end_time, price, capacity, booked_count")
      .eq("id", availability_id)
      .single();
    if (slotErr || !slot) return json({ error: "Slot not found" }, 404);
    if (slot.capacity && slot.booked_count >= slot.capacity) {
      return json({ error: "Slot is fully booked" }, 409);
    }

    const { data: listing } = await supabase
      .from("listings")
      .select("name")
      .eq("id", listing_id)
      .single();

    const pricePence = Math.max(0, Math.round(Number(slot.price) * 100));
    let redeem = Math.max(0, Math.floor(Number(lld_to_redeem || 0)));

    const { data: wallet } = await supabase
      .from("wallets")
      .select("lld_balance")
      .eq("user_id", user.id)
      .maybeSingle();
    const balance = Math.max(0, Math.floor(Number(wallet?.lld_balance || 0)));

    redeem = Math.min(redeem, pricePence, balance);

    const payAmount = Math.max(50, pricePence - redeem); // >= 50p

    const productName = `${listing?.name || "Service"}${slot.label ? " · " + slot.label : ""} (${slot.date} ${slot.start_time}–${slot.end_time})`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: payAmount,
            product_data: { name: productName },
          },
        },
      ],
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        listing_id,
        availability_id,
        price_pence: String(pricePence),
        lld_to_redeem: String(redeem),
      },
      success_url: `${SITE_URL}/profile.html?paid=1`,
      cancel_url: `${SITE_URL}/listing.html?id=${listing_id}&canceled=1`,
    });

    return json({ url: session.url }, 200);
  } catch (e) {
    console.error("[create-checkout-session] Error:", e);
    return json({ error: e?.message || "Unexpected error" }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}