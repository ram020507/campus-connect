import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, doubtId } = await req.json();

    if (type === "new_doubt") {
      // Get the doubt
      const { data: doubt } = await supabase.from("doubts").select("*").eq("id", doubtId).single();
      if (!doubt) throw new Error("Doubt not found");

      // Find teachers of the same subject
      const { data: teachers } = await supabase
        .from("teachers")
        .select("*")
        .ilike("subject_name", doubt.subject_name);

      const emails = (teachers || [])
        .filter((t: any) => t.email)
        .map((t: any) => t.email);

      if (emails.length > 0) {
        // Avoid logging teacher emails or doubt text (info leakage in shared logs)
        console.log(`[notify-doubt] new_doubt notified=${emails.length} subject=${doubt.subject_name}`);
      }

      return new Response(JSON.stringify({ success: true, notifiedCount: emails.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "doubt_answered") {
      // Get the doubt
      const { data: doubt } = await supabase.from("doubts").select("*").eq("id", doubtId).single();
      if (!doubt) throw new Error("Doubt not found");

      // Find the student who asked the question
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
