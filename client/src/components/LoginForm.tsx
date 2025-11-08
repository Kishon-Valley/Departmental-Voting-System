import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function LoginForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login attempt:", formData);
    toast({
      title: "Login Successful",
      description: "Welcome back!",
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-serif">Student Login</CardTitle>
        <CardDescription>Enter your credentials to access the voting portal</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Student Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="student@university.edu"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              data-testid="input-email"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <a href="#" className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                Forgot password?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              data-testid="input-password"
            />
          </div>

          <Button type="submit" className="w-full" data-testid="button-login">
            Login
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register">
              <a className="text-primary hover:underline" data-testid="link-register">
                Register here
              </a>
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
