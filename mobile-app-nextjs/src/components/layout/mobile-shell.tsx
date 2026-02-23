"use client";

import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BottomNav } from "./bottom-nav";

interface MobileShellProps {
  children: React.ReactNode;
  className?: string;
  showNav?: boolean;
}

export function MobileShell({
  children,
  className,
  showNav = true,
}: MobileShellProps) {
  const { isLoading, error, user } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated after loading completes
  useEffect(() => {
    if (!isLoading && !user && !error) {
      router.push("/login");
    }
  }, [isLoading, user, error, router]);

  // Show error state if auth failed to initialize
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-foreground font-semibold">Configuration Error</p>
            <p className="text-muted-foreground text-sm max-w-xs">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-6">
          {/* Modern animated loader */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 animate-pulse shadow-xl shadow-violet-500/30" />
            <div className="absolute inset-0 w-16 h-16 rounded-2xl border-2 border-white/20 animate-ping" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-foreground font-semibold">Loading</p>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main
        className={cn(
          "flex-1 overflow-y-auto safe-area-top scrollbar-hide",
          showNav && "pb-28",
          className
        )}
      >
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}