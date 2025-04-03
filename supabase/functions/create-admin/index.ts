import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// This is a one-time setup function that should be called manually to create the first admin

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const body = await req.json();
    const { email, userId } = body;
    
    if (!email && !userId) {
      return new Response(
        JSON.stringify({ error: "Email or user ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    let user;
    
    // If userId is provided, use it directly
    if (userId) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (userError) {
        throw userError;
      }
      
      user = userData.user;
    } 
    // Otherwise use email to find or create user
    else {
      // Check if user exists
      const { data: existingUsers, error: lookupError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (lookupError) {
        throw lookupError;
      }
      
      user = existingUsers.users.find((u) => u.email === email);
      
      // If user doesn't exist, create them
      if (!user) {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          password: crypto.randomUUID().substring(0, 8),
        });
        
        if (createError) {
          throw createError;
        }
        
        user = newUser.user;
      }
    }
    
    if (!user || !user.id) {
      throw new Error("Failed to find or create user");
    }
    
    // Check if user is already an admin
    const { data: existingRole } = await supabaseClient
      .from("user_roles")
      .select("*")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    
    if (existingRole) {
      return new Response(
        JSON.stringify({ message: "User is already an admin", user }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Make user an admin
    const { error: roleError } = await supabaseClient
      .from("user_roles")
      .insert({
        user_id: user.id,
        role: "admin",
      });
    
    if (roleError) {
      throw roleError;
    }
    
    return new Response(
      JSON.stringify({
        message: "User has been made an admin successfully",
        user,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
