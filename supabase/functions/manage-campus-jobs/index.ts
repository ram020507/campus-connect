import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function decodeBase64Url(input: string): Uint8Array {
  const padding = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const raw = atob(input.replace(/-/g, "+").replace(/_/g, "/") + padding);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function encodeBase64Url(input: Uint8Array): string {
  let raw = "";
  for (const byte of input) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

async function verifyAdminToken(token: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  const signingKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!signingKey) return false;

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(signingKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  if (!constantTimeEqual(encodeBase64Url(new Uint8Array(expected)), signature)) return false;

  try {
    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)));
    return claims.role === "admin" && typeof claims.exp === "number" && claims.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function text(value: unknown, label: string, max: number, optional = false): string | null {
  if (optional && (value === null || value === undefined || value === "")) return null;
  if (typeof value !== "string") throw new Error(`${label} is required.`);
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > max) throw new Error(`${label} must be between 1 and ${max} characters.`);
  return cleaned;
}

function uuid(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

function responseError(error: { code?: string; message?: string } | null): never | void {
  if (!error) return;
  if (error.code === "23505") throw new Error("That company, role, or skill already exists.");
  if (error.code === "23503") throw new Error("This record is linked to data that no longer exists. Refresh and try again.");
  console.error("manage-campus-jobs database error:", error.code || "unknown");
  throw new Error("The change could not be saved. Please try again.");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Only POST requests are supported." }, 405);

  try {
    const body = await req.json();
    if (typeof body?.token !== "string" || body.token.length > 4096 || !(await verifyAdminToken(body.token))) {
      return json({ success: false, error: "Admin sign-in is required." }, 401);
    }
    if (typeof body.action !== "string" || typeof body.payload !== "object" || body.payload === null || Array.isArray(body.payload)) {
      return json({ success: false, error: "The request is incomplete." }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !secret) return json({ success: false, error: "Campus Jobs is temporarily unavailable." }, 500);
    const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const input = body.payload as Record<string, unknown>;
    let result: unknown = null;

    switch (body.action) {
      case "company.create": {
        const { data, error } = await db.from("campus_job_companies").insert({ company_name: text(input.company_name, "Company name", 120) as string, college_id: uuid(input.college_id, "College") }).select("*").single();
        responseError(error); result = data; break;
      }
      case "company.update": {
        const id = uuid(input.id, "Company");
        const { data, error } = await db.from("campus_job_companies").update({ company_name: text(input.company_name, "Company name", 120), updated_at: new Date().toISOString() }).eq("id", id).select("*").maybeSingle();
        responseError(error); if (!data) throw new Error("Company not found."); result = data; break;
      }
      case "company.delete": {
        const { error, count } = await db.from("campus_job_companies").delete({ count: "exact" }).eq("id", uuid(input.id, "Company"));
        responseError(error); if (count === 0) throw new Error("Company not found."); break;
      }
      case "eligibility.save": {
        const company_id = uuid(input.company_id, "Company");
        const criteria = text(input.criteria, "Eligibility criteria", 10000) as string;
        const { data, error } = await db.from("campus_job_eligibility").upsert({ company_id, criteria, updated_at: new Date().toISOString() }, { onConflict: "company_id" }).select("*").single();
        responseError(error); result = data; break;
      }
      case "eligibility.delete": {
        const { error } = await db.from("campus_job_eligibility").delete().eq("company_id", uuid(input.company_id, "Company")); responseError(error); break;
      }
      case "role.create": {
        const { data, error } = await db.from("campus_job_roles").insert({ company_id: uuid(input.company_id, "Company"), role_name: text(input.role_name, "Job role", 160) as string }).select("*").single();
        responseError(error); result = data; break;
      }
      case "role.update": {
        const { data, error } = await db.from("campus_job_roles").update({ role_name: text(input.role_name, "Job role", 160), updated_at: new Date().toISOString() }).eq("id", uuid(input.id, "Job role")).select("*").maybeSingle();
        responseError(error); if (!data) throw new Error("Job role not found."); result = data; break;
      }
      case "role.delete": {
        const { error, count } = await db.from("campus_job_roles").delete({ count: "exact" }).eq("id", uuid(input.id, "Job role"));
        responseError(error); if (count === 0) throw new Error("Job role not found."); break;
      }
      case "skills.save": {
        const role_id = uuid(input.role_id, "Job role");
        if (!Array.isArray(input.skills) || input.skills.length > 50) throw new Error("Add no more than 50 skills at a time.");
        const skillNames = input.skills.map((item) => text(item, "Skill", 160) as string);
        if (new Set(skillNames.map((item) => item.toLocaleLowerCase())).size !== skillNames.length) throw new Error("Remove duplicate skills before saving.");
        const { error: deleteError } = await db.from("campus_job_skills").delete().eq("role_id", role_id); responseError(deleteError);
        if (skillNames.length) {
          const { data, error } = await db.from("campus_job_skills").insert(skillNames.map((skill_name) => ({ role_id, skill_name }))).select("*");
          responseError(error); result = data;
        }
        break;
      }
      case "selected_student.create":
      case "selected_student.update": {
        const row = {
          company_id: uuid(input.company_id, "Company"),
          job_role_id: input.job_role_id ? uuid(input.job_role_id, "Job role") : null,
          student_name: text(input.student_name, "Student name", 160),
          academic_batch: text(input.academic_batch, "Academic batch", 80),
          department: text(input.department, "Department", 160),
          linkedin_url: text(input.linkedin_url, "LinkedIn URL", 2048, true),
          linkedin_approved: input.linkedin_approved === true,
          updated_at: new Date().toISOString(),
        };
        if (row.linkedin_url) {
          let linkedIn: URL;
          try { linkedIn = new URL(row.linkedin_url); } catch { throw new Error("Enter a valid LinkedIn profile link."); }
          if (linkedIn.protocol !== "https:" || !/(^|\.)linkedin\.com$/i.test(linkedIn.hostname)) throw new Error("LinkedIn links must use a secure linkedin.com address.");
        }
        if (body.action === "selected_student.create") {
          const { data, error } = await db.from("campus_job_selected_students").insert(row).select("*").single(); responseError(error); result = data;
        } else {
          const { data, error } = await db.from("campus_job_selected_students").update(row).eq("id", uuid(input.id, "Selected-student record")).select("*").maybeSingle();
          responseError(error); if (!data) throw new Error("Selected-student record not found."); result = data;
        }
        break;
      }
      case "selected_student.delete": {
        const { error, count } = await db.from("campus_job_selected_students").delete({ count: "exact" }).eq("id", uuid(input.id, "Selected-student record"));
        responseError(error); if (count === 0) throw new Error("Selected-student record not found."); break;
      }
      default:
        return json({ success: false, error: "That Campus Jobs action is not supported." }, 400);
    }

    return json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The change could not be saved.";
    return json({ success: false, error: message }, 400);
  }
});