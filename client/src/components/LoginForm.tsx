import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface LoginResponse {
  message: string;
  user: {
    id: string;
    indexNumber: string;
    fullName: string;
    email?: string | null;
    year?: string | null;
    hasVoted: boolean;
  };
}

export default function LoginForm() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    indexNumber: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (data: { indexNumber: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json() as Promise<LoginResponse>;
    },
    onSuccess: (data) => {
      toast({
        title: "Login Successful",
        description: `Welcome, ${data.user.fullName}!`,
      });
      // Redirect to home or voting page
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid index number or password",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await loginMutation.mutateAsync(formData);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-serif">Student Login</CardTitle>
        <CardDescription>Enter your index number and password to access the voting portal</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="indexNumber">Index Number</Label>
            <Input
              id="indexNumber"
              type="text"
              placeholder="e.g., LABT/2021/001"
              value={formData.indexNumber}
              onChange={(e) => setFormData({ ...formData, indexNumber: e.target.value.toUpperCase() })}
              required
              disabled={isLoading}
              data-testid="input-index-number"
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
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={isLoading}
              data-testid="input-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
            {isLoading ? "Logging in..." : "Login"}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Need help?{" "}
            <a href="/contact" className="text-primary hover:underline" data-testid="link-contact">
              Contact support
            </a>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
