
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Subscription {
  id: string;
  user_id: string;
  plan_type: string;
  price_cents: number;
  status: string;
  current_period_end: string;
}

export const SubscriptionsTab: React.FC = () => {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setIsLoadingSubscriptions(true);
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          id,
          user_id,
          plan_type,
          price_cents,
          status,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          created_at
        `);
      
      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error: any) {
      console.error("Error fetching subscriptions:", error);
      toast({
        title: "Error fetching subscriptions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingSubscriptions(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscriptions</CardTitle>
        <CardDescription>View and manage user subscriptions</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingSubscriptions ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : subscriptions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2">User ID</th>
                  <th className="text-left pb-2">Plan</th>
                  <th className="text-left pb-2">Price</th>
                  <th className="text-left pb-2">Status</th>
                  <th className="text-left pb-2">Valid Until</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(sub => (
                  <tr key={sub.id} className="border-b hover:bg-muted/50">
                    <td className="py-2">{sub.user_id.substring(0, 8)}...</td>
                    <td className="py-2">{sub.plan_type}</td>
                    <td className="py-2">${(sub.price_cents / 100).toFixed(2)}</td>
                    <td className="py-2">{sub.status}</td>
                    <td className="py-2">{new Date(sub.current_period_end).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No subscriptions found.</p>
        )}
      </CardContent>
    </Card>
  );
};
