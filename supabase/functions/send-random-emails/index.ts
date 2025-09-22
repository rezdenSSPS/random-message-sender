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
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, message, count }: EmailRequest = await req.json();
    
    console.log(`Starting email campaign: ${count} emails to ${email}`);
    
    // Validate input
    if (!email || !message || !count) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, message, count" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (count < 1 || count > 50) {
      return new Response(
        JSON.stringify({ error: "Count must be between 1 and 50" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate random delays for emails (spread over 24 hours = 86400 seconds)
    const delays: number[] = [];
    const maxDelay = 86400; // 24 hours in seconds
    
    for (let i = 0; i < count; i++) {
      // Generate random delay between 0 and 24 hours
      const randomDelay = Math.floor(Math.random() * maxDelay);
      delays.push(randomDelay);
    }
    
    // Sort delays to send emails in chronological order
    delays.sort((a, b) => a - b);
    
    console.log(`Generated delays (seconds):`, delays);

    // Schedule emails using background tasks
    for (let i = 0; i < delays.length; i++) {
      const delay = delays[i];
      const emailNumber = i + 1;
      
      // Use background task with setTimeout for scheduling
      EdgeRuntime.waitUntil(
        new Promise((resolve) => {
          setTimeout(async () => {
            try {
              const emailResponse = await resend.emails.send({
                from: "Email Sender <onboarding@resend.dev>",
                to: [email],
                subject: `Random Message #${emailNumber}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #6366f1;">Random Message #${emailNumber}</h2>
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #6366f1;">
                      <p style="margin: 0; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
                    </div>
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
                    <p style="color: #64748b; font-size: 14px;">
                      This is email ${emailNumber} of ${count} in your random email campaign.
                      <br>
                      Sent at: ${new Date().toLocaleString()}
                    </p>
                  </div>
                `,
              });
              
              console.log(`Email ${emailNumber} sent successfully:`, emailResponse);
              resolve(emailResponse);
            } catch (error) {
              console.error(`Failed to send email ${emailNumber}:`, error);
              resolve(null);
            }
          }, delay * 1000); // Convert seconds to milliseconds
        })
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Campaign started! ${count} emails scheduled with random delays.`,
        delays: delays.map(d => `${Math.floor(d / 3600)}h ${Math.floor((d % 3600) / 60)}m`)
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-random-emails function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);