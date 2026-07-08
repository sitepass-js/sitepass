// SitePass v23.7.351 - 네이버 SENS 휴대폰 인증번호 발송
// Secrets는 Supabase Secrets에만 저장하고 GitHub/채팅창에 노출하지 않습니다.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SendPhoneCodeBody = {
  purpose?: string;
  subjectType?: "member" | "driver" | "worker";
  subjectId?: string;
  name?: string;
  birthDate?: string;
  phone?: string;
  termsAgreed?: boolean;
  privacyAgreed?: boolean;
  smsAgreed?: boolean;
  identityTermsAgreed?: boolean;
  termsVersion?: string;
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

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

function last4(phone: string): string {
  return phone.slice(-4);
}

function validBirthDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Base64(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  let binary = "";
  for (const byte of new Uint8Array(sig)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function generateCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1000000).padStart(6, "0");
}

async function sendSensSms(to: string, code: string) {
  const accessKey = requireEnv("SENS_ACCESS_KEY");
  const secretKey = requireEnv("SENS_SECRET_KEY");
  const serviceId = requireEnv("SENS_SERVICE_ID");
  const fromNumber = requireEnv("SENS_FROM_NUMBER").replace(/[^0-9]/g, "");

  const method = "POST";
  const uri = `/sms/v2/services/${serviceId}/messages`;
  const timestamp = Date.now().toString();
  const signature = await hmacSha256Base64(secretKey, `${method} ${uri}\n${timestamp}\n${accessKey}`);

  const body = {
    type: "SMS",
    contentType: "COMM",
    countryCode: "82",
    from: fromNumber,
    content: `[SitePass] 인증번호 ${code} 입니다. 5분 안에 입력해 주세요.`,
    messages: [{ to }],
  };

  const res = await fetch(`https://sens.apigw.ntruss.com${uri}`, {
    method,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-ncp-apigw-timestamp": timestamp,
      "x-ncp-iam-access-key": accessKey,
      "x-ncp-apigw-signature-v2": signature,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let result: Record<string, unknown> = {};
  try {
    result = JSON.parse(text);
  } catch {
    result = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`SENS send failed: ${res.status} ${text}`);
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  try {
    const payload = (await req.json()) as SendPhoneCodeBody;
    const subjectType = payload.subjectType;
    const name = String(payload.name ?? "").trim();
    const birthDate = String(payload.birthDate ?? "").trim();
    const phone = normalizePhone(String(payload.phone ?? ""));
    const purpose = String(payload.purpose ?? "signup").trim() || "signup";
    const termsVersion = String(payload.termsVersion ?? "v23.7.351").trim() || "v23.7.351";

    if (!subjectType || !["member", "driver", "worker"].includes(subjectType)) {
      return json(400, { ok: false, error: "invalid_subject_type" });
    }
    if (!name) return json(400, { ok: false, error: "name_required" });
    if (!validBirthDate(birthDate)) return json(400, { ok: false, error: "birth_date_required" });
    if (!/^01[016789]\d{7,8}$/.test(phone)) return json(400, { ok: false, error: "invalid_phone" });
    if (!payload.termsAgreed || !payload.privacyAgreed || !payload.smsAgreed) {
      return json(400, { ok: false, error: "required_terms_not_agreed" });
    }

    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || requireEnv("SITEPASS_SERVICE_ROLE_KEY");
    const verifyPepper = requireEnv("SITEPASS_VERIFY_PEPPER");
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const phoneHash = await sha256Hex(`${phone}.${verifyPepper}`);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    const ipHash = ip ? await sha256Hex(`${ip}.${verifyPepper}`) : null;

    const { data: recent, error: recentError } = await supabase
      .from("sitepass_phone_verifications")
      .select("id,resend_after,created_at")
      .eq("phone_hash", phoneHash)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentError) throw recentError;
    if (recent?.resend_after && new Date(recent.resend_after).getTime() > Date.now()) {
      return json(429, { ok: false, error: "resend_limited", resendAfter: recent.resend_after });
    }

    const { data: consent, error: consentError } = await supabase
      .from("sitepass_terms_consents")
      .insert({
        subject_type: subjectType,
        subject_id: payload.subjectId ?? null,
        purpose,
        name,
        birth_date: birthDate,
        phone_hash: phoneHash,
        phone_last4: last4(phone),
        terms_version: termsVersion,
        privacy_version: termsVersion,
        sms_terms_version: termsVersion,
        identity_terms_version: termsVersion,
        agreed_flags: {
          terms: !!payload.termsAgreed,
          privacy: !!payload.privacyAgreed,
          sms: !!payload.smsAgreed,
          identity: !!payload.identityTermsAgreed,
        },
      })
      .select("id")
      .single();

    if (consentError) throw consentError;

    const code = generateCode();
    const codeHash = await sha256Hex(`${code}.${verifyPepper}`);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const resendAfter = new Date(Date.now() + 60 * 1000).toISOString();

    const sensResult = await sendSensSms(phone, code);

    const { data: verification, error: insertError } = await supabase
      .from("sitepass_phone_verifications")
      .insert({
        subject_type: subjectType,
        subject_id: payload.subjectId ?? null,
        purpose,
        name,
        birth_date: birthDate,
        phone_hash: phoneHash,
        phone_last4: last4(phone),
        code_hash: codeHash,
        expires_at: expiresAt,
        resend_after: resendAfter,
        sens_request_id: typeof sensResult.requestId === "string" ? sensResult.requestId : null,
        send_result: sensResult,
        ip_hash: ipHash,
        user_agent: req.headers.get("user-agent") ?? null,
        consent_id: consent.id,
      })
      .select("id,expires_at,resend_after,phone_last4")
      .single();

    if (insertError) throw insertError;

    return json(200, {
      ok: true,
      verificationId: verification.id,
      expiresAt: verification.expires_at,
      resendAfter: verification.resend_after,
      phoneLast4: verification.phone_last4,
    });
  } catch (err) {
    console.error(err);
    return json(500, { ok: false, error: "send_phone_code_failed" });
  }
});
