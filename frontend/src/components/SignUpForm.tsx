
import React, { useState } from "react";
import { supabase } from "utils/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner"; // Using sonner for notifications

export function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        // Optionally pass username if needed by handle_new_user trigger
        // options: {
        //   data: { username: 'initial_username_if_collected' }
        // }
      });

      if (error) throw error;

      // Check if signup needs email confirmation
      if (data.user && data.user.identities && data.user.identities.length === 0) {
         toast.info("Signup successful, but email confirmation might be pending if enabled.");
      } else if (data.session) {
        toast.success("Sign up successful! You are now logged in.");
        // Potentially navigate user or update state here
      } else {
         toast.info("Sign up successful! Please check your email to confirm your account.");
      }

    } catch (error: any) {
      console.error("Error signing up:", error);
      toast.error(`Sign up failed: ${error.error_description || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign Up</CardTitle>
        <CardDescription>Create a new account to start playing.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSignUp}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6} // Supabase default minimum password length
              disabled={loading}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing Up..." : "Sign Up"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
