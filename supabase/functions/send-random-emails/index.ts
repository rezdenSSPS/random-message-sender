// /supabase/functions/send-random-emails/index.ts

import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  email: string;
  message: string;
  count: number;
  fromEmail?: string;
  subject?: string;
  scheduleType: "now" | "scheduled";
  scheduleDate?: string; // YYYY-MM-DD
  startTime?: string;  // HH:mm
  endTime?: string;    // HH:mm
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, message, count, fromEmail, subject, scheduleType, scheduleDate, startTime, endTime }: EmailRequest = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: campaignData, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .insert({
        recipient_email: email,
        message_body: message,
        email_count: count,
        subject: subject,
        from_email: fromEmail
      })
      .select()
      .single();

    if (campaignError) throw campaignError;

    const scheduledTimestamps: Date[] = [];
    const now = new Date();

    if (scheduleType === "now") {
      for (let i = 0; i < count; i++) {
        const delay = Math.random() * 60 * 1000; // 0-60 seconds delay
        scheduledTimestamps.push(new Date(now.getTime() + delay));
      }
    } else if (scheduleType === "scheduled" && scheduleDate && startTime && endTime) {
      // --- FIX STARTS HERE ---
      // Reconstruct dates correctly to avoid timezone ambiguity
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      const startDate = new Date(scheduleDate);
      startDate.setHours(startHour, startMinute, 0, 0);

      const endDate = new Date(scheduleDate);
      endDate.setHours(endHour, endMinute, 0, 0);
      
      const startDateTime = startDate.getTime();
      const endDateTime = endDate.getTime();
      // --- FIX ENDS HERE ---

      if (endDateTime < startDateTime) {
        return new Response(JSON.stringify({ error: "End time cannot be before start time." }), { status: 400, headers: { ...corsHeaders } });
      }
      
      const interval = endDateTime - startDateTime;
      for (let i = 0; i < count; i++) {
        const randomOffset = Math.random() * interval;
        scheduledTimestamps.push(new Date(startDateTime + randomOffset));
      }
    } else {
        return new Response(JSON.stringify({ error: "Invalid schedule type or missing parameters" }), { status: 400, headers: { ...corsHeaders } });
    }
    
    const emailsToInsert = scheduledTimestamps.map(ts => ({
      campaign_id: campaignData.id,
      status: 'scheduled',
      scheduled_at: ts.toISOString(),
    }));

    const { error: emailsError } = await supabaseAdmin
      .from('scheduled_emails')
      .insert(emailsToInsert);
      
    if (emailsError) throw emailsError;
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Campaign scheduled successfully! ${count} emails are now in the queue.`,
        scheduledTimestamps: scheduledTimestamps.map(d => d.toISOString()),
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in scheduling function:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders } });
  }
};

serve(handler);