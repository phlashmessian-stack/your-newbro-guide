import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase env vars are not configured");
    }

    const { subject, html, filter } = await req.json();
    if (!subject || !html) {
      return new Response(
        JSON.stringify({ error: "subject and html are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user emails from profiles
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let query = supabase.from("profiles").select("email");

    if (filter === "with_subscription") {
      query = query.not("subscription", "is", null);
    } else if (filter === "without_subscription") {
      query = query.is("subscription", null);
    }

    const { data: profiles, error: dbError } = await query;
    if (dbError) throw new Error(`DB error: ${dbError.message}`);
    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Нет пользователей для рассылки", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emails = profiles.map((p: { email: string }) => p.email).filter(Boolean);

    // Send via Resend (batch — up to 100 per call)
    const batchSize = 50;
    let totalSent = 0;
    const errors: string[] = [];

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(
          batch.map((email: string) => ({
            from: "NeuroBro <noreply@send.neuro-bro.ru>",
            to: [email],
            subject,
            html,
          }))
        ),
      });

      const data = await res.json();
      if (res.ok) {
        totalSent += batch.length;
      } else {
        console.error("Resend batch error:", data);
        errors.push(JSON.stringify(data));
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, total: emails.length, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Broadcast error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
