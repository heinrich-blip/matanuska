"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import
  {
    Eye,
    EyeOff,
    Lock,
    LogIn,
    Mail,
    Shield,
    Sparkles,
    Truck
  } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn(email, password);

      if (result && result.error) {
        toast({
          title: "Authentication Failed",
          description: result.error.message || "Invalid credentials",
          variant: "destructive",
        });
        setIsLoading(false);
      } else {
        toast({
          title: "Welcome!",
          description: "Signing you in...",
        });
        // Use router.refresh to sync server state, then redirect
        router.refresh();
        // Short delay to ensure cookies are synced, then redirect
        setTimeout(() => {
          router.push("/");
        }, 500);
      }
    } catch (err) {
      console.error("Login error:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background safe-area-top safe-area-bottom">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />

        {/* Floating particles - using percentage-based positioning */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-violet-400/30 rounded-full"
            style={{
              left: `${(i * 8 + 5) % 100}%`,
              top: `${(i * 7 + 10) % 100}%`,
            }}
            animate={{
              y: [0, -20, 20, 0],
              x: [0, 10, -10, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3 + (i % 3),
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        {/* Logo & Brand Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-10"
        >
          <div className="relative">
            <div className="absolute inset-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 blur-xl opacity-60" />
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center mb-4 shadow-2xl shadow-violet-500/40">
              <Truck className="w-10 h-10 text-white" strokeWidth={2} />
            </div>
            <motion.div
              className="absolute -top-2 -right-2"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-6 h-6 text-amber-500" fill="currentColor" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-violet-500 to-blue-400 bg-clip-text text-transparent">
              Matanuska
            </h1>
            <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Fleet Management Portal
            </p>
          </motion.div>
        </motion.div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <Card className="border border-white/12 shadow-2xl shadow-violet-500/10 backdrop-blur-xl bg-black/35">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold">Welcome Back</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Enter your credentials to access the portal
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Mail className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      autoComplete="email"
                      disabled={isLoading}
                      className={cn(
                        "h-12 pl-12 pr-4 text-base",
                        "border-border/50 bg-background",
                        "focus:border-primary focus:ring-2 focus:ring-primary/20",
                        "transition-all duration-300",
                        "placeholder:text-muted-foreground/60"
                      )}
                    />
                    <AnimatePresence>
                      {email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          Show
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Lock className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      disabled={isLoading}
                      className={cn(
                        "h-12 pl-12 pr-4 text-base",
                        "border-border/50 bg-background",
                        "focus:border-primary focus:ring-2 focus:ring-primary/20",
                        "transition-all duration-300",
                        "placeholder:text-muted-foreground/60"
                      )}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                      "w-full h-14 text-base font-semibold rounded-2xl",
                      "bg-gradient-to-r from-violet-500 to-violet-600",
                      "hover:from-violet-600 hover:to-violet-700",
                      "shadow-xl shadow-violet-500/30",
                      "transition-all duration-300",
                      "relative overflow-hidden group"
                    )}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        <>
                          <LogIn className="w-5 h-5" />
                          Sign In
                        </>
                      )}
                    </span>

                    {/* Button shine effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.6 }}
                    />
                  </Button>
                </motion.div>
              </form>

            </CardContent>
          </Card>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-8"
          >
            <p className="text-sm text-muted-foreground">
              Need help?{" "}
              <button
                onClick={() => {
                  toast({
                    title: "Contact Support",
                    description: "Please contact your administrator for assistance",
                  });
                }}
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Contact Support
              </button>
            </p>
            <p className="text-xs text-muted-foreground/60 mt-4">
              Secure login powered by enterprise authentication
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center"
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 animate-pulse shadow-xl shadow-violet-500/40 mx-auto mb-4 flex items-center justify-center">
                <Truck className="w-8 h-8 text-white" />
              </div>
              <p className="text-lg font-semibold">Authenticating...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Securing your connection
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}