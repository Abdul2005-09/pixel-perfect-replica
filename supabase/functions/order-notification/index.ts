import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("ORDER_EMAIL_FROM") ?? "ASTRA STYLIN <onboarding@resend.dev>";

    if (!supabaseUrl || !anonKey || !serviceKey || !adminEmail || !resendKey) {
      console.error("Order notification secrets are not fully configured.");
      return Response.json({ error: "Order email notification is not configured." }, { status: 503, headers: corsHeaders });
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Authentication required." }, { status: 401, headers: corsHeaders });
    }
    const token = authHeader.slice("Bearer ".length);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) {
      return Response.json({ error: "Invalid user session." }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json().catch(() => ({}));
    const orderId = typeof body.order_id === "string" ? body.order_id : "";
    if (!orderId) return Response.json({ error: "Order ID is required." }, { status: 400, headers: corsHeaders });

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("id, order_number, user_id, shipping_name, shipping_phone, line1, line2, city, state, postal_code, notes, subtotal, total, status, created_at, order_items(product_name, colour, size, quantity, unit_price)")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) return Response.json({ error: "Order not found." }, { status: 404, headers: corsHeaders });
    if (order.user_id !== authData.user.id) return Response.json({ error: "You cannot notify for this order." }, { status: 403, headers: corsHeaders });

    const money = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(amount));
    const itemRows = (order.order_items ?? []).map((item: Record<string, unknown>) =>
      `<tr><td style="padding:10px;border-bottom:1px solid #eee">${escapeHtml(item.product_name)}<br><small>${escapeHtml(item.colour || "—")} · Size ${escapeHtml(item.size)} × ${escapeHtml(item.quantity)}</small></td><td style="padding:10px;border-bottom:1px solid #eee;text-align:right">${money(Number(item.unit_price) * Number(item.quantity))}</td></tr>`
    ).join("");
    const address = [order.line1, order.line2, order.city, order.state, order.postal_code].filter(Boolean).map(escapeHtml).join(", ");

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: [adminEmail],
        subject: `New ASTRA STYLIN order · ${order.order_number}`,
        html: `
          <div style="font-family:Arial,sans-serif;color:#211b18;max-width:640px;margin:auto;padding:24px">
            <p style="letter-spacing:4px;color:#742b34;font-size:11px">ASTRA STYLIN · NEW ORDER</p>
            <h1 style="font-family:Georgia,serif;font-weight:400">A new order has arrived</h1>
            <p>Order <strong>${escapeHtml(order.order_number)}</strong> · ${escapeHtml(new Date(order.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))}</p>
            <h2 style="font-size:15px;margin-top:28px">Customer details</h2>
            <p><strong>${escapeHtml(order.shipping_name)}</strong><br>${escapeHtml(order.shipping_phone)}<br>${address}</p>
            <h2 style="font-size:15px;margin-top:28px">Order items</h2>
            <table style="width:100%;border-collapse:collapse">${itemRows}</table>
            <p style="text-align:right;font-size:18px;margin-top:18px"><strong>Total: ${money(Number(order.total))}</strong></p>
            <p style="color:#777;font-size:12px">Status: ${escapeHtml(order.status)} · Payment / delivery confirmation continues on WhatsApp.</p>
            ${order.notes ? `<p><strong>Customer note:</strong> ${escapeHtml(order.notes)}</p>` : ""}
          </div>`,
      }),
    });

    const emailResult = await emailResponse.json().catch(() => ({}));
    if (!emailResponse.ok) {
      console.error("Resend order notification failed:", emailResult);
      return Response.json({ error: "Email provider rejected the notification." }, { status: 502, headers: corsHeaders });
    }
    return Response.json({ success: true, email_id: emailResult.id }, { headers: corsHeaders });
  } catch (error) {
    console.error("Order notification error:", error);
    return Response.json({ error: "Unable to send order notification." }, { status: 500, headers: corsHeaders });
  }
});
