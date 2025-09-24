// /supabase/functions/process-email-queue/index.ts

import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Helper function to generate a random string for the email username
function generateRandomString(length: number): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch due emails that are still marked as 'scheduled'
    const { data: dueEmails, error } = await supabaseAdmin
      .from('scheduled_emails')
      .select(`
        id,
        scheduled_at,
        campaign:campaigns (
          recipient_email,
          message_body,
          subject,
          from_email,
          email_count
        )
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString());

    if (error) throw error;
    if (!dueEmails || dueEmails.length === 0) {
      return new Response(
        JSON.stringify({ message: "No emails to send at this time." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${dueEmails.length} email(s) to send.`);

    // 2. Process each email
    const processingPromises = dueEmails.map(async (email) => {
      try {
        const campaign = email.campaign;

        // Prefer a verified sender to satisfy Resend requirements
        const envFrom = Deno.env.get("RESEND_FROM"); // e.g. "Your App <no-reply@yourdomain.com>"
        const envDomain = Deno.env.get("RESEND_DOMAIN"); // e.g. "yourdomain.com"
        const randomUsername = generateRandomString(5);
        const fallbackDomain = envDomain || "resend.dev";
        const dynamicFromEmail = `${randomUsername}@${fallbackDomain}`;
        const finalFromAddress = envFrom
          ? envFrom
          : `${campaign.from_email || 'Campaign Sender'} <${dynamicFromEmail}>`;

        await resend.emails.send({
          from: finalFromAddress,
          to: [campaign.recipient_email],
          subject: `${campaign.subject || 'Random Message'}`,
          html: `<p>${campaign.message_body.replace(/\n/g, '<br>')}</p>`,
        });

        // 3a. Update status to 'sent' on success
        await supabaseAdmin
          .from('scheduled_emails')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', email.id);

        console.log(`Email ${email.id} sent successfully.`);
      } catch (sendError) {
        console.error(`Failed to send email ${email.id}:`, sendError);
        // 3b. Update status to 'failed' on error
        await supabaseAdmin
          .from('scheduled_emails')
          .update({ status: 'failed', error_message: sendError.message })
          .eq('id', email.id);
      }
    });

    await Promise.all(processingPromises);

    return new Response(
      JSON.stringify({ message: `Processed ${dueEmails.length} emails.` }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: (e as any).message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);