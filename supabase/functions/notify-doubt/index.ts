import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function b64urlDecode(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function verifyToken(token: string): Promise<{ role: string } | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) return null;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const expected = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const expectedB64 = b64urlEncode(new Uint8Array(expected));
  if (expectedB64.length !== sigB64.length) return null;
  let diff = 0;
  for (let i = 0; i < expectedB64.length; i++) diff |= expectedB64.charCodeAt(i) ^ sigB64.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.role !== "string") return null;
    return { role: payload.role };
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, doubtId, token, role } = await req.json();

    if (typeof token !== "string" || typeof role !== "string") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const claims = await verifyToken(token);
    if (!claims || claims.role !== role) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Restrict roles per notification type
    if (type === "new_doubt" && !["student", "admin"].includes(role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (type === "doubt_answered" && !["teacher", "admin"].includes(role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof doubtId !== "string" || doubtId.length === 0 || doubtId.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid doubtId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "new_doubt") {
      const { data: doubt } = await supabase.from("doubts").select("*").eq("id", doubtId).single();
      if (!doubt) {
        return new Response(JSON.stringify({ success: true, notifiedCount: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: teachers } = await supabase
        .from("teachers")
        .select("*")
        .ilike("subject_name", doubt.subject_name);

      const emails = (teachers || [])
        .filter((t: any) => t.email)
        .map((t: any) => t.email);

      if (emails.length > 0) {
        console.log(`[notify-doubt] new_doubt notified=${emails.length} subject=${doubt.subject_name}`);
      }

      return new Response(JSON.stringify({ success: true, notifiedCount: emails.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "doubt_answered") {
      const { data: doubt } = await supabase.from("doubts").select("*").eq("id", doubtId).single();
      if (!doubt) {
        return new Response(JSON.stringify({ success: true, notifiedCount: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: student } = await supabase
        .from("students")
        .select("*")
        .eq("registration_number", doubt.student_reg_no)
        .single();

      const email = student?.email;
      if (email) {
        console.log(`[notify-doubt] doubt_answered subject=${doubt.subject_name}`);
      }

      return new Response(JSON.stringify({ success: true, notifiedCount: email ? 1 : 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
