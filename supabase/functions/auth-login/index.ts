import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOKEN_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signToken(payload: Record<string, unknown>): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS };
  const payloadStr = JSON.stringify(body);
  const payloadB64 = b64urlEncode(new TextEncoder().encode(payloadStr));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${b64urlEncode(new Uint8Array(sig))}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, staffId, registrationNumber, dob, username, password } = await req.json();

    if (type === "teacher") {
      if (!staffId || !dob) {
        return new Response(JSON.stringify({ error: "Staff ID and date of birth are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data } = await supabase
        .from("teachers")
        .select("id, staff_id, name, college_name, subject_name")
        .eq("staff_id", staffId)
        .eq("dob", dob)
        .maybeSingle();

      if (!data) {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = await signToken({ role: "teacher", sub: data.staff_id });

      return new Response(JSON.stringify({
        success: true,
        token,
        user: {
          id: data.id,
          staffId: data.staff_id,
          name: data.name,
          collegeName: data.college_name,
          subjectName: data.subject_name,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "student") {
      if (!registrationNumber || !dob) {
        return new Response(JSON.stringify({ error: "Registration number and date of birth are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data } = await supabase
        .from("students")
        .select("id, registration_number, name, college_name, department, year")
        .eq("registration_number", registrationNumber)
        .eq("dob", dob)
        .maybeSingle();

      if (!data) {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = await signToken({ role: "student", sub: data.registration_number });

      return new Response(JSON.stringify({
        success: true,
        token,
        user: {
          id: data.id,
          registrationNumber: data.registration_number,
          name: data.name,
          collegeName: data.college_name,
          department: data.department,
          year: data.year,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "admin") {
      if (!username || !password) {
        return new Response(JSON.stringify({ error: "Username and password are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const adminUsername = Deno.env.get("ADMIN_USERNAME");
      const adminPassword = Deno.env.get("ADMIN_PASSWORD");

      if (!adminUsername || !adminPassword) {
        return new Response(JSON.stringify({ error: "Admin credentials not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (username !== adminUsername || password !== adminPassword) {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = await signToken({ role: "admin", sub: adminUsername });

      return new Response(JSON.stringify({ success: true, token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid login type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Authentication failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
