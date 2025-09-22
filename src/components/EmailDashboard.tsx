import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Send, Clock, LogOut, CheckCircle, AlertCircle } from "lucide-react";

interface EmailDashboardProps {
  onLogout: () => void;
}

export const EmailDashboard = ({ onLogout }: EmailDashboardProps) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [emailCount, setEmailCount] = useState("5");
  const [isLoading, setIsLoading] = useState(false);
  const [campaignStatus, setCampaignStatus] = useState<"idle" | "running" | "completed">("idle");

  const handleStartCampaign = async (e: React.FormEvent) => {
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

    setIsLoading(true);
    setCampaignStatus("running");

    try {
      const { data, error } = await supabase.functions.invoke('send-random-emails', {
        body: {
          email,
          message,
          count: count
        }
      });

      if (error) {
        throw error;
      }

      toast.success(`Campaign started! Will send ${count} emails randomly throughout the day`);
      setCampaignStatus("completed");
      
      // Reset form
      setEmail("");
      setMessage("");
      setEmailCount("5");
      
    } catch (error: any) {
      console.error('Campaign error:', error);
      toast.error(error.message || "Failed to start email campaign");
      setCampaignStatus("idle");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-primary to-primary-glow rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Email Campaign Dashboard</h1>
              <p className="text-muted-foreground">Send random emails throughout the day</p>
            </div>
          </div>
          
          <Button 
            onClick={onLogout}
            variant="outline"
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Status Card */}
        <Card className="bg-gradient-to-r from-card to-secondary/20 border border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Campaign Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {campaignStatus === "idle" && (
                <>
                  <Badge variant="secondary" className="gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                    Ready to start
                  </Badge>
                  <span className="text-muted-foreground">No active campaigns</span>
                </>
              )}
              {campaignStatus === "running" && (
                <>
                  <Badge className="gap-1 bg-warning text-black">
                    <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
                    Running
                  </Badge>
                  <span className="text-muted-foreground">Campaign is active and sending emails randomly</span>
                </>
              )}
              {campaignStatus === "completed" && (
                <>
                  <Badge className="gap-1 bg-success text-white">
                    <CheckCircle className="w-3 h-3" />
                    Completed
                  </Badge>
                  <span className="text-muted-foreground">Campaign started successfully</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email Configuration */}
        <Card className="bg-gradient-to-br from-card via-card to-secondary/20 border border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Configure Email Campaign
            </CardTitle>
            <CardDescription>
              Set up your email campaign with recipient, message, and frequency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStartCampaign} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Recipient Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background/50 border-border focus:ring-primary"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="count" className="text-foreground">Number of Emails</Label>
                  <Input
                    id="count"
                    type="number"
                    min="1"
                    max="50"
                    placeholder="5"
                    value={emailCount}
                    onChange={(e) => setEmailCount(e.target.value)}
                    className="bg-background/50 border-border focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-foreground">Email Message</Label>
                <Textarea
                  id="message"
                  placeholder="Enter your email message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-background/50 border-border focus:ring-primary min-h-32"
                  required
                />
              </div>

              <Alert className="border-primary/50 bg-primary/10">
                <AlertCircle className="w-4 h-4 text-primary" />
                <AlertDescription className="text-primary">
                  Emails will be sent at random intervals throughout the day. The system will distribute 
                  the {emailCount || "specified number of"} emails randomly over a 24-hour period.
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading || campaignStatus === "running"}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Starting Campaign...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Start Email Campaign
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};