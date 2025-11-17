import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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
  const [formData, setFormData] = useState({
    indexNumber: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(formData.indexNumber, formData.password);
      toast({
        title: "Login Successful",
        description: "Welcome to the voting portal.",
      });
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Login Failed",
        description: err.message || "Invalid index number or password",
        variant: "destructive",
      });
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
