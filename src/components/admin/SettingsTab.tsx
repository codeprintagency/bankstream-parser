
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const SettingsTab: React.FC = () => {
  const { toast } = useToast();
  const [claudeApiKey, setClaudeApiKey] = useState("");
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(false);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);

  useEffect(() => {
    fetchClaudeApiKey();
  }, []);

  const fetchClaudeApiKey = async () => {
    setIsLoadingApiKey(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'claude_api_key')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setClaudeApiKey(data.value);
      }
    } catch (error: any) {
      console.error("Error fetching Claude API key:", error);
      toast({
        title: "Error fetching Claude API key",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingApiKey(false);
    }
  };

  const handleSaveClaudeApiKey = async () => {
    setIsSavingApiKey(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: claudeApiKey })
        .eq('key', 'claude_api_key');
      
      if (error) throw error;
      
      toast({
        title: "API Key Saved",
        description: "The Claude API key has been updated successfully",
      });
    } catch (error: any) {
      console.error("Error saving Claude API key:", error);
      toast({
        title: "Error saving Claude API key",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingApiKey(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Settings</CardTitle>
        <CardDescription>Configure system-wide settings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="claude-api-key">Claude API Key</Label>
            <div className="flex space-x-2">
              <Input 
                id="claude-api-key" 
                type="password" 
                placeholder="Claude API Key" 
                value={claudeApiKey}
                onChange={(e) => setClaudeApiKey(e.target.value)}
                className="flex-1"
                disabled={isLoadingApiKey}
              />
              <Button 
                onClick={handleSaveClaudeApiKey}
                disabled={isSavingApiKey || isLoadingApiKey}
              >
                {isSavingApiKey ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
