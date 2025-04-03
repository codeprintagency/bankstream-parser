
import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Auth: React.FC = () => {
  const { user, isLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMakingAdmin, setIsMakingAdmin] = useState(false);
  const { toast } = useToast();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[70vh]">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signIn(email, password);
      navigate("/");
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signUp(email, password);
      // Do not navigate automatically after signup
      // Assuming they need to verify email
    } catch (error) {
      console.error("Sign up error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const makeAdmin = async () => {
    if (!user) return;
    
    setIsMakingAdmin(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-admin', {
        body: { userId: user.id },
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Success",
        description: "You are now an admin! Please refresh the page to see admin features.",
      });
      
      // Force reload to update admin status
      window.location.reload();
      
    } catch (error: any) {
      console.error("Error making admin:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to make user an admin",
        variant: "destructive",
      });
    } finally {
      setIsMakingAdmin(false);
    }
  };

  if (user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold">Account</CardTitle>
                <CardDescription>
                  You are signed in as {user.email}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p>What would you like to do?</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  onClick={() => navigate('/')}
                  variant="outline"
                >
                  Go Home
                </Button>
                <Button 
                  onClick={makeAdmin}
                  disabled={isMakingAdmin}
                >
                  {isMakingAdmin ? "Processing..." : "Make Yourself Admin"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 md:px-8 py-16 md:py-24">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">BankStream Account</CardTitle>
              <CardDescription>
                Sign in to your account or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input 
                        id="signin-email" 
                        type="email" 
                        placeholder="name@example.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password">Password</Label>
                        {/* Could add reset password link here */}
                      </div>
                      <Input 
                        id="signin-password" 
                        type="password" 
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input 
                        id="signup-email" 
                        type="email" 
                        placeholder="name@example.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input 
                        id="signup-password" 
                        type="password" 
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Creating Account..." : "Create Account"}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-4">
                      By signing up, you agree to our Terms of Service and Privacy Policy
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Auth;
