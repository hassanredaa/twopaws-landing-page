import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ShopShell from "@/components/shop/ShopShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const redirectTo = params.get("redirect") || "/shop";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName);
      }
      navigate(redirectTo);
    } catch (err) {
      toast({
        title: "Authentication failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ShopShell>
      <div className="flex justify-center">
        <Card className="w-full max-w-md border-slate-100">
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-slate-900">
                {mode === "signin" ? "Sign in" : "Create account"}
              </h1>
              <p className="text-sm text-slate-500">
                Access your cart, orders, and saved addresses.
              </p>
            </div>
            {mode === "signup" && (
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button
              className="w-full bg-brand-green-dark text-white"
              onClick={handleSubmit}
              disabled={loading || !email || !password}
            >
              {loading
                ? "Please wait..."
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-sm text-slate-500"
              onClick={() =>
                setMode((prev) => (prev === "signin" ? "signup" : "signin"))
              }
            >
              {mode === "signin"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ShopShell>
  );
}
