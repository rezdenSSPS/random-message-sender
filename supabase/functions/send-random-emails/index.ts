import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
  scheduleDate?: string;
  startTime?: string;
  endTime?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, message, count, fromEmail, subject, scheduleType, scheduleDate, startTime, endTime }: EmailRequest = await req.json();
    
    if (!email || !message || !count) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    if (count < 1 || count > 50) {
      return new Response(JSON.stringify({ error: "Count must be between 1 and 50" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const scheduledTimestamps: Date[] = [];
    const now = Date.now();

    if (scheduleType === "now") {
      for (let i = 0; i < count; i++) {
        const delay = Math.random() * 60 * 1000; // 0-60 seconds delay
        scheduledTimestamps.push(new Date(now + delay));
      }
    } else if (scheduleType === "scheduled" && scheduleDate && startTime && endTime) {
      const startDateTime = new Date(`${scheduleDate}T${startTime}`).getTime();
      const endDateTime = new Date(`${scheduleDate}T${endTime}`).getTime();

      if (startDateTime < now || endDateTime < startDateTime) {
        return new Response(JSON.stringify({ error: "Invalid start or end time" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      
      const interval = endDateTime - startDateTime;
      for (let i = 0; i < count; i++) {
        const randomOffset = Math.random() * interval;
        scheduledTimestamps.push(new Date(startDateTime + randomOffset));
      }
      scheduledTimestamps.sort((a, b) => a.getTime() - b.getTime());
    } else {
        return new Response(JSON.stringify({ error: "Invalid schedule type or missing time parameters" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    console.log(`Scheduled to send emails at:`, scheduledTimestamps.map(d => d.toISOString()));

    scheduledTimestamps.forEach((timestamp, i) => {
      const delay = timestamp.getTime() - now;
      const emailNumber = i + 1;
      
      EdgeRuntime.waitUntil(
        new Promise((resolve) => {
          setTimeout(async () => {
            try {
              const emailSubject = subject ? `${subject} #${emailNumber}` : `Random Message #${emailNumber}`;
              await resend.emails.send({
                from: fromEmail || "Email Sender <onboarding@resend.dev>",
                to: [email],
                subject: emailSubject,
                html: `<p>${message.replace(/\n/g, '<br>')}</p><br><p><small>This is email ${emailNumber} of ${count}.</small></p>`,
              });
              console.log(`Email ${emailNumber} sent successfully at ${new Date().toISOString()}`);
              resolve(true);
            } catch (error) {
              console.error(`Failed to send email ${emailNumber}:`, error);
              resolve(false);
            }
          }, delay);
        })
      );
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Campaign started! ${count} emails scheduled.`,
        scheduledTimestamps: scheduledTimestamps.map(d => d.toISOString()),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-random-emails function:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
