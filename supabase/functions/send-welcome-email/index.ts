import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch("https://api.resend.com/emails/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "NeuroBro <noreply@send.neuro-bro.ru>",
        to: [email],
        subject: "Добро пожаловать в NeuroBro! 🤖",
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #7c3aed, #06b6d4); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; color: #fff;">🤖 NeuroBro</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Все нейросети в одном окне</p>
            </div>
            <div style="padding: 32px 24px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; color: #fff;">Добро пожаловать!</h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #a0a0b0;">
                Ваш аккаунт создан. Вот ваши данные для входа:
              </p>
              <div style="background: #16162a; border: 1px solid #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 12px; font-size: 13px; color: #888;">
                  📧 <strong style="color: #e0e0e0;">Email:</strong>
                </p>
                <p style="margin: 0 0 16px; font-size: 15px; color: #7c3aed; font-family: monospace; word-break: break-all;">
                  ${email}
                </p>
                <p style="margin: 0 0 12px; font-size: 13px; color: #888;">
                  🔑 <strong style="color: #e0e0e0;">Пароль:</strong>
                </p>
                <p style="margin: 0; font-size: 15px; color: #06b6d4; font-family: monospace;">
                  ${password}
                </p>
              </div>
              <a href="https://neuro-bro.ru/dashboard.html" style="display: block; text-align: center; background: #7c3aed; color: #fff; text-decoration: none; padding: 14px 24px; border-radius: 10px; font-weight: 600; font-size: 15px;">
                Войти в NeuroBro →
              </a>
              <p style="margin: 24px 0 0; font-size: 12px; color: #666; text-align: center;">
                Рекомендуем сменить пароль после первого входа.
              </p>
            </div>
          </div>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error sending email:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
