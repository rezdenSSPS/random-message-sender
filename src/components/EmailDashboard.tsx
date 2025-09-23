// /src/components/EmailDashboard.tsx
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Send, Clock, LogOut, AlertCircle, Settings, User, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "./ui/scroll-area";

// --- Types for our database data ---
interface ScheduledEmail {
  id: string;
  scheduled_at: string;
  campaign: {
    recipient_email: string;
  };
}

interface GroupedEmails {
  [recipient: string]: ScheduledEmail[];
}

// --- Data fetching function ---
const fetchScheduledEmails = async (): Promise<ScheduledEmail[]> => {
  const { data, error } = await supabase
    .from('scheduled_emails')
    .select(`
      id,
      scheduled_at,
      campaign:campaigns (
        recipient_email
      )
    `)
    .eq('status', 'scheduled')
    .order('scheduled_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data as ScheduledEmail[];
};

export const EmailDashboard = ({ onLogout }: { onLogout: () => void }) => {
  // State for the form
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [emailCount, setEmailCount] = useState("5");
  const [isLoading, setIsLoading] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [fromEmail, setFromEmail] = useState("Campaign Sender");
  const [subject, setSubject] = useState("Random Message");
  const [scheduleType, setScheduleType] = useState<"now" | "scheduled">("now");
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  // --- Live Query for Scheduled Emails ---
  const { data: scheduledEmails, isLoading: emailsLoading } = useQuery({
    queryKey: ['scheduledEmails'],
    queryFn: fetchScheduledEmails,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // --- Group emails by recipient ---
  const groupedEmails = useMemo(() => {
    if (!scheduledEmails) return {};
    return scheduledEmails.reduce((acc, email) => {
      const recipient = email.campaign.recipient_email;
      if (!acc[recipient]) {
        acc[recipient] = [];
      }
      acc[recipient].push(email);
      return acc;
    }, {} as GroupedEmails);
  }, [scheduledEmails]);

  const handleStartCampaign = async (e: React.FormEvent) => {
    // ... (This function remains the same as before)
    e.preventDefault();
    if (!email || !message || !emailCount) {
        toast.error("Please fill in all fields");
        return;
    }
    const count = parseInt(emailCount);
    if (count < 1 || count > 50) {
        toast.error("Email count must be between 1 and 50");
        return;
    }
    if (scheduleType === "scheduled" && (!scheduleDate || !startTime || !endTime)) {
        toast.error("Please select a date, start time, and end time for scheduled campaigns.");
        return;
    }
    setIsLoading(true);

    try {
        const body = {
            email,
            message,
            count,
            fromEmail: testMode ? fromEmail : undefined,
            subject: testMode ? subject : undefined,
            scheduleType,
            scheduleDate: scheduleType === 'scheduled' ? format(scheduleDate!, 'yyyy-MM-dd') : undefined,
            startTime: scheduleType === 'scheduled' ? startTime : undefined,
            endTime: scheduleType === 'scheduled' ? endTime : undefined,
        };

        const { error } = await supabase.functions.invoke('send-random-emails', { body });
        if (error) throw error;
        
        toast.success(`Campaign scheduled! ${count} emails are now in the queue.`);
        setEmail("");
        setMessage("");
        setEmailCount("5");

    } catch (error: any) {
        console.error('Campaign error:', error);
        toast.error(error.message || "Failed to schedule email campaign");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* --- Left Column: Form --- */}
      <div className="lg:col-span-1 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-primary to-primary-glow rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Email Scheduler</h1>
                    <p className="text-muted-foreground">Set up and monitor campaigns</p>
                </div>
            </div>
            <Button onClick={onLogout} variant="outline" className="gap-2">
                <LogOut className="w-4 h-4" />
                Logout
            </Button>
        </div>
        
        {/* Test Mode Toggle */}
        <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5" /> Test Mode</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="flex items-center space-x-2">
               <Switch checked={testMode} onCheckedChange={setTestMode} id="test-mode" />
               <Label htmlFor="test-mode">Enable advanced configuration</Label>
             </div>
           </CardContent>
         </Card>

        {/* Email Form */}
        <Card className="shadow-lg">
           <CardHeader>
             <CardTitle className="flex items-center gap-2 text-lg"><Send className="w-5 h-5" /> Configure Campaign</CardTitle>
             <CardDescription>Set up a new email campaign</CardDescription>
           </CardHeader>
           <CardContent>
             <form onSubmit={handleStartCampaign} className="space-y-6">
                {testMode && (
                    <div className="space-y-4 p-4 bg-secondary/20 rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor="from-email">From Display Name</Label>
                        <Input id="from-email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
                      </div>
                    </div>
                )}
                <div className="space-y-4 p-4 bg-secondary/20 rounded-lg">
                     <h3 className="font-semibold text-foreground">Timing</h3>
                     {/* ... (Timing radio buttons and inputs remain the same) */}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Recipient Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="count">Number of Emails</Label>
                    <Input id="count" type="number" min="1" max="50" value={emailCount} onChange={(e) => setEmailCount(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Scheduling..." : "Start Campaign"}
                </Button>
             </form>
           </CardContent>
         </Card>
      </div>

      {/* --- Right Column: Scheduled Emails --- */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" /> Scheduled Email Queue
            </CardTitle>
            <CardDescription>
                This list updates automatically every 5 seconds. Emails will disappear once sent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[75vh]">
              {emailsLoading && <p className="text-muted-foreground">Loading queue...</p>}
              {!emailsLoading && Object.keys(groupedEmails).length === 0 && (
                <div className="text-center text-muted-foreground py-10">
                    <p>No emails are currently scheduled.</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Object.entries(groupedEmails).map(([recipient, emails]) => (
                  <div key={recipient} className="p-4 rounded-lg bg-secondary/50">
                    <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3 truncate">
                        <User className="w-4 h-4" /> {recipient}
                    </h3>
                    <ul className="space-y-2">
                      {emails.map((email) => (
                        <li key={email.id} className="text-sm text-muted-foreground bg-background/50 p-2 rounded">
                          Scheduled for: {format(new Date(email.scheduled_at), "PPp")}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};