import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to generate a random string for the email username
function generateRandomString(length: number): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

interface EmailRequest {
  email: string;
  message: string;
  count: number;
  fromEmail?: string; // This will now primarily be used for the "Display Name"
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
              // --- DYNAMIC FROM ADDRESS LOGIC ---
              const randomUsername = generateRandomString(5);
              const fromDomain = "tvojemamasmrdi.fun"; // Your verified domain
              const dynamicFromEmail = `${randomUsername}@${fromDomain}`;

              let fromDisplayName = "Campaign Sender"; // Default display name
              // Use display name from test mode if provided
              if (fromEmail) {
                  const match = fromEmail.match(/^(.*)<.*>$/);
                  if (match && match[1]) {
                      fromDisplayName = match[1].trim();
                  }
              }

              const finalFromAddress = `${fromDisplayName} <${dynamicFromEmail}>`;
              // --- END DYNAMIC LOGIC ---

              const emailSubject = subject ? `${subject} #${emailNumber}` : `Random Message #${emailNumber}`;
              
              await resend.emails.send({
                from: finalFromAddress,
                to: [email],
                subject: emailSubject,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #6366f1;">${emailSubject}</h2>
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #6366f1;">
                      <p style="margin: 0; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
                    </div>
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
                    <p style="color: #64748b; font-size: 14px;">
                      This is email ${emailNumber} of ${count} in your email campaign.
                      <br>
                      Sent at: ${new Date().toLocaleString()}
                    </p>
                  </div>
                `,
              });
              
              console.log(`Email ${emailNumber} sent successfully from ${finalFromAddress} at ${new Date().toISOString()}`);
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
