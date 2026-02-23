"use client";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, useRef } from "react";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs to manage abort controllers and mounted state
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const profileFetchInProgressRef = useRef(false);

  // Memoize Supabase client creation to handle errors gracefully
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch (err) {
      console.error("Failed to initialize Supabase client:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize authentication");
      setIsLoading(false);
      return null;
    }
  }, []);

  const fetchProfile = async (userEmail: string | undefined, authUser?: User | null) => {
    // Prevent concurrent profile fetches
    if (profileFetchInProgressRef.current || !userEmail || !supabase || !mountedRef.current) {
      return null;
    }

    // Abort previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      profileFetchInProgressRef.current = true;

      // Try to fetch from users table by notification_email or username
      const { data, error } = await supabase
        .from("users")
        .select(`
          user_id,
          name,
          username,
          shortcode,
          notification_email,
          role_id,
          status,
          roles (role_name)
        `)
        .or(`notification_email.eq."${userEmail}",username.eq."${userEmail}"`)
        .eq("status", "Active")
        .single();

      // Check if request was aborted
      if (signal.aborted) {
        console.log('Profile fetch aborted');
        return null;
      }

      if (error) {
        // If user not found in users table, create a basic profile from auth user
        console.log("User not in users table, creating fallback profile from auth data");

        // Create a minimal profile from auth user metadata
        if (authUser && mountedRef.current && !signal.aborted) {
          const metadata = authUser.user_metadata || {};
          return {
            user_id: 0, // Placeholder
            name: metadata.full_name || metadata.name || userEmail.split('@')[0],
            username: userEmail.split('@')[0],
            shortcode: (userEmail.split('@')[0]).substring(0, 3).toUpperCase(),
            email: userEmail,
            phone: metadata.phone || null,
            role_id: null,
            status: "Active",
            role: "Driver", // Default role for mobile app
            full_name: metadata.full_name || metadata.name || userEmail.split('@')[0],
          } as Profile;
        }
        return null;
      }

      if (!mountedRef.current || signal.aborted) return null;

      // Extract role name - roles is an object from single FK join
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userData = data as any;
      const rolesData = userData.roles as { role_name: string } | null;

      // Map to Profile type
      return {
        user_id: userData.user_id,
        name: userData.name,
        username: userData.username,
        shortcode: userData.shortcode,
        email: userData.notification_email,
        phone: null,
        role_id: userData.role_id,
        status: userData.status,
        role: rolesData?.role_name || null,
        full_name: userData.name, // Alias for compatibility
      } as Profile;
    } catch (err) {
      // Check if error is due to abort
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Profile fetch aborted');
        return null;
      }
      
      // Check if signal was aborted (some browsers might not throw AbortError)
      if (signal.aborted) {
        console.log('Profile fetch aborted (signal check)');
        return null;
      }
      
      console.error("Error fetching profile:", err);
      
      // Return fallback profile on any error
      if (authUser && mountedRef.current && !signal.aborted) {
        const metadata = authUser.user_metadata || {};
        return {
          user_id: 0,
          name: metadata.full_name || metadata.name || userEmail.split('@')[0],
          username: userEmail.split('@')[0],
          shortcode: (userEmail.split('@')[0]).substring(0, 3).toUpperCase(),
          email: userEmail,
          phone: metadata.phone || null,
          role_id: null,
          status: "Active",
          role: "Driver",
          full_name: metadata.full_name || metadata.name || userEmail.split('@')[0],
        } as Profile;
      }
      return null;
    } finally {
      profileFetchInProgressRef.current = false;
      // Only clear if this controller hasn't been replaced
      if (abortControllerRef.current?.signal === signal && !signal.aborted) {
        abortControllerRef.current = null;
      }
    }
  };

  const refreshProfile = async () => {
    if (user?.email && mountedRef.current) {
      const profileData = await fetchProfile(user.email, user);
      if (mountedRef.current) {
        setProfile(profileData);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    
    // If supabase client failed to initialize, don't proceed
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Safety timeout - ensure loading state resolves even if auth hangs
    const loadingTimeout = setTimeout(() => {
      if (mountedRef.current && isLoading) {
        console.warn("Auth initialization timeout - forcing loading state to complete");
        setIsLoading(false);
      }
    }, 3000); // 3 second timeout (faster for mobile)

    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Error getting session:", sessionError);
          if (mountedRef.current) setIsLoading(false);
          return;
        }

        if (mountedRef.current) {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user?.email) {
            try {
              const profileData = await fetchProfile(session.user.email, session.user);
              if (mountedRef.current) setProfile(profileData);
            } catch (err) {
              // Ignore abort errors
              if (err instanceof Error && err.name !== 'AbortError') {
                console.error("Error fetching profile:", err);
              }
            }
          }

          setIsLoading(false);
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Auth initialization error:", err);
        }
        if (mountedRef.current) setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user?.email) {
        try {
          const profileData = await fetchProfile(session.user.email, session.user);
          if (mountedRef.current) setProfile(profileData);
        } catch (err) {
          // Ignore abort errors in auth state change
          if (err instanceof Error && err.name !== 'AbortError') {
            console.error("Error in auth state change:", err);
          }
        }
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(loadingTimeout);
      
      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error("Authentication service not available") };
    }

    // Abort any pending profile fetches before sign in
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("Sign in error:", signInError);
        return { error: signInError as Error };
      }

      // Manually set user/session if auth state change doesn't fire immediately
      if (data.user && data.session && mountedRef.current) {
        setUser(data.user);
        setSession(data.session);
        const profileData = await fetchProfile(data.user.email, data.user);
        if (mountedRef.current) setProfile(profileData);
      }

      return { error: null };
    } catch (err) {
      console.error("Sign in exception:", err);
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    // Abort any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (!supabase) {
      // Still clear local state even if no supabase client
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      // Sign out from Supabase first (local scope to just clear this session)
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) {
        console.error("Sign out error:", signOutError);
        throw signOutError;
      }

      // Clear local state after successful sign out
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsLoading(false);
    } catch (err) {
      console.error("Sign out exception:", err);
      // Still clear local state even if Supabase call fails
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsLoading(false);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        error,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}