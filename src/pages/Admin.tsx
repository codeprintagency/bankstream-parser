import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type UserRole = 'admin' | 'subscriber' | 'user';

const Admin: React.FC = () => {
  const { user, isLoading, isAdmin, getToken } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [claudeApiKey, setClaudeApiKey] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(false);
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(false);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [userRoles, setUserRoles] = useState<Record<string, UserRole>>({});

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchSubscriptions();
      fetchClaudeApiKey();
      fetchUserRoles();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          created_at
        `);
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error fetching users",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

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

  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (error) throw error;
      
      const roles: Record<string, UserRole> = {};
      (data || []).forEach((item) => {
        roles[item.user_id] = item.role as UserRole;
      });
      
      setUserRoles(roles);
    } catch (error: any) {
      console.error("Error fetching user roles:", error);
      toast({
        title: "Error fetching user roles",
        description: error.message,
        variant: "destructive",
      });
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

  const updateUserRole = async (userId: string, role: UserRole) => {
    setIsUpdatingRole(true);
    try {
      // First check if the user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .single();

      let result;
      if (existingRole) {
        // Update existing role
        result = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId);
      } else {
        // Insert new role
        result = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });
      }

      if (result.error) throw result.error;
      
      toast({
        title: "Role Updated",
        description: `User role has been updated to ${role}`,
      });
      
      // Update local state
      setUserRoles(prev => ({
        ...prev,
        [userId]: role
      }));
    } catch (error: any) {
      console.error("Error updating user role:", error);
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // If still loading auth state, show loading spinner
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[70vh]">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  // If not logged in or not admin, redirect to home page
  if (!user || !isAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 md:px-8 py-16 md:py-24">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        
        <Tabs defaultValue="users">
          <TabsList className="mb-6">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>Manage user accounts and roles</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : users.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map(user => (
                          <TableRow key={user.id}>
                            <TableCell className="font-mono text-xs">{user.id.substring(0, 8)}...</TableCell>
                            <TableCell>{user.first_name} {user.last_name}</TableCell>
                            <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Select
                                value={userRoles[user.id] || "user"}
                                onValueChange={(value: UserRole) => updateUserRole(user.id, value)}
                                disabled={isUpdatingRole}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="subscriber">Subscriber</SelectItem>
                                  <SelectItem value="user">Free User</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-xs"
                                onClick={() => updateUserRole(user.id, userRoles[user.id] || "user")}
                                disabled={isUpdatingRole}
                              >
                                Update
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p>No users found.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="subscriptions">
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
          </TabsContent>
          
          <TabsContent value="settings">
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
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;
