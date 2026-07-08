// SitePass v23.7.351 - NICE/KCB/PASS 본인확인 준비용 함수
// 실제 본인확인기관 계약 전에는 provider_not_configured를 반환합니다.
// 계약 후 provider별 start/callback 구현을 이 함수에 연결합니다.

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  try {
    const payload = await req.json();
    const subjectType = String(payload.subjectType ?? "").trim();
    const subjectId = payload.subjectId ? String(payload.subjectId).trim() : null;
    const provider = (Deno.env.get("IDENTITY_PROVIDER") || "none").toLowerCase();

    if (!["member", "driver", "worker"].includes(subjectType)) {
      return json(400, { ok: false, error: "invalid_subject_type" });
    }

    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || requireEnv("SITEPASS_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const status = provider === "none" ? "not_configured" : "ready";
    const { data, error } = await supabase
      .from("sitepass_identity_verifications")
      .insert({
        subject_type: subjectType,
        subject_id: subjectId,
        provider,
        identity_status: status,
        result_meta: {
          message: provider === "none"
            ? "본인확인기관 계약 전입니다. 현재는 휴대폰 인증만 가능합니다."
            : "본인확인 provider 연결 준비 상태입니다.",
        },
      })
      .select("id,provider,identity_status,requested_at")
      .single();

    if (error) throw error;

    if (provider === "none") {
      return json(200, {
        ok: true,
        identityReady: false,
        provider: "none",
        identityVerificationId: data.id,
        status: data.identity_status,
        message: "NICE/KCB/PASS 계약 후 실제 본인확인 시작 URL을 연결합니다.",
      });
    }

    return json(200, {
      ok: true,
      identityReady: true,
      provider,
      identityVerificationId: data.id,
      status: data.identity_status,
      nextAction: "provider_start_not_implemented_yet",
    });
  } catch (err) {
    console.error(err);
    return json(500, { ok: false, error: "prepare_identity_check_failed" });
  }
});
