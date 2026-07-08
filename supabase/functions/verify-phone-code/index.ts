// SitePass v23.7.351 - 휴대폰 인증번호 검증

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
  });
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret: ${name}`);
  return value;
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  try {
    const payload = await req.json();
    const verificationId = String(payload.verificationId ?? "").trim();
    const code = String(payload.code ?? "").replace(/[^0-9]/g, "");
    if (!verificationId) return json(400, { ok: false, error: "verification_id_required" });
    if (!/^\d{6}$/.test(code)) return json(400, { ok: false, error: "invalid_code" });

    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || requireEnv("SITEPASS_SERVICE_ROLE_KEY");
    const verifyPepper = requireEnv("SITEPASS_VERIFY_PEPPER");
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: row, error } = await supabase
      .from("sitepass_phone_verifications")
      .select("id,code_hash,attempts,max_attempts,expires_at,verified_at,name,birth_date,phone_last4,subject_type,subject_id,purpose")
      .eq("id", verificationId)
      .maybeSingle();

    if (error) throw error;
    if (!row) return json(404, { ok: false, error: "verification_not_found" });
    if (row.verified_at) return json(200, { ok: true, alreadyVerified: true, verifiedAt: row.verified_at });
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return json(400, { ok: false, error: "code_expired" });
    }
    if (row.attempts >= row.max_attempts) {
      return json(429, { ok: false, error: "too_many_attempts" });
    }

    const codeHash = await sha256Hex(`${code}.${verifyPepper}`);
    if (codeHash !== row.code_hash) {
      await supabase
        .from("sitepass_phone_verifications")
        .update({ attempts: row.attempts + 1 })
        .eq("id", verificationId);
      return json(400, {
        ok: false,
        error: "code_mismatch",
        remainingAttempts: Math.max(0, row.max_attempts - row.attempts - 1),
      });
    }

    const verifiedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("sitepass_phone_verifications")
      .update({ verified_at: verifiedAt })
      .eq("id", verificationId);

    if (updateError) throw updateError;

    return json(200, {
      ok: true,
      verifiedAt,
      phoneVerified: {
        subjectType: row.subject_type,
        subjectId: row.subject_id,
        purpose: row.purpose,
        name: row.name,
        birthDate: row.birth_date,
        phoneLast4: row.phone_last4,
      },
    });
  } catch (err) {
    console.error(err);
    return json(500, { ok: false, error: "verify_phone_code_failed" });
  }
});
