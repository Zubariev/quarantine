import { create } from 'zustand';
import { supabase } from './supabaseClient';
import type { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { navigate } from '@/lib/navigation';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  isTokenRefreshing: boolean;
  lastRefreshed: number | null;
  setSession: (session: Session | null) => void;
  checkSession: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
}

// Token refresh constants
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
const SESSION_EXPIRY_MARGIN = 60 * 1000; // 1 minute in milliseconds

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true, // Start loading until initial check is done
  error: null,
  isTokenRefreshing: false,
  lastRefreshed: null,

  // Function to clear error state
  clearError: () => set({ error: null }),

  // Function to update session and user state
  setSession: (session) => {
    set({ 
      session: session, 
      user: session?.user ?? null, 
      loading: false,
      lastRefreshed: session ? Date.now() : null
    });
  },

  // Function to check the current session on app load
  checkSession: async () => {
    console.log("Checking initial Supabase session...");
    set({ loading: true, error: null });
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error.message);
        toast.error("Error checking authentication status.");
        set({ error: error.message });
      }

      console.log("Initial session:", session);

      // Check if session is about to expire and needs a refresh
      if (session && get().shouldRefreshToken(session)) {
        console.log("Session is about to expire, refreshing token...");
        const refreshed = await get().refreshToken();
        if (!refreshed) {
          // If refresh failed, but we still have a session, use it for now
          set({ 
            session, 
            user: session?.user ?? null, 
            loading: false,
            lastRefreshed: null
          });
        }
      } else {
        set({ 
          session, 
          user: session?.user ?? null, 
          loading: false,
          lastRefreshed: session ? Date.now() : null 
        });
      }
    } catch (error: any) {
      console.error("Exception during session check:", error);
      toast.error("Failed to check authentication status.");
      set({ loading: false, error: error.message || "Authentication check failed" });
    }
  },

  // Helper to determine if token should be refreshed
  shouldRefreshToken: (session: Session): boolean => {
    if (!session.expires_at) return false;
    
    // Convert expires_at to milliseconds
    const expiresAt = session.expires_at * 1000;
    const now = Date.now();
    
    // Check if token is about to expire
    const shouldRefresh = expiresAt - now < TOKEN_REFRESH_THRESHOLD;
    
    // Check if token already expired
    const isExpired = expiresAt - now < SESSION_EXPIRY_MARGIN;
    
    if (isExpired) {
      console.log("Session has expired");
      return false; // Don't try to refresh an expired token
    }
    
    return shouldRefresh;
  },

  // Function to refresh the token
  refreshToken: async (): Promise<boolean> => {
    if (get().isTokenRefreshing) {
      console.log("Token refresh already in progress");
      return false;
    }

    set({ isTokenRefreshing: true });
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error("Error refreshing token:", error.message);
        // Handle refresh failure - might need to redirect to login
        set({ 
          error: `Session refresh failed: ${error.message}`,
          isTokenRefreshing: false
        });
        
        // Check if the error indicates an expired session
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          toast.error("Your session has expired. Please log in again.");
          navigate('/login');
          return false;
        }
        
        return false;
      }
      
      const { session } = data;
      
      if (!session) {
        console.error("No session returned after token refresh");
        set({ 
          error: "Session refresh failed: No session returned",
          isTokenRefreshing: false
        });
        return false;
      }
      
      console.log("Token refreshed successfully");
      set({ 
        session, 
        user: session.user, 
        isTokenRefreshing: false,
        lastRefreshed: Date.now(),
        error: null
      });
      return true;
    } catch (error: any) {
      console.error("Exception during token refresh:", error);
      set({ 
        error: error.message || "Token refresh failed",
        isTokenRefreshing: false
      });
      return false;
    }
  },

  // Function to sign out the user
  signOut: async () => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ session: null, user: null, loading: false, lastRefreshed: null });
      toast.success("Successfully logged out.");
      
      // Clear any user data from localStorage
      localStorage.removeItem('gameStats');
      localStorage.removeItem('gameTime');
      localStorage.removeItem('userSchedule');
      
      // Redirect to login page
      navigate('/login');
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast.error(`Sign out failed: ${error.message}`);
      set({ loading: false, error: error.message }); // Ensure loading is false even on error
    }
  },
}));

// --- Initialize Auth State Listener ---
// Run checkSession once on initial load
useAuthStore.getState().checkSession();

// Set up a timer to periodically check token expiration
setInterval(() => {
  const store = useAuthStore.getState();
  if (store.session && !store.isTokenRefreshing) {
    if (store.shouldRefreshToken(store.session)) {
      console.log("Token refresh needed, running periodic check");
      store.refreshToken();
    }
  }
}, 60000); // Check every minute

// Listen for auth state changes (login, logout, token refresh)
const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
  console.log("Supabase auth event:", event, "Session:", session);
  // Update the store with the new session
  useAuthStore.getState().setSession(session);

  // Handle specific events if needed
  if (event === 'SIGNED_IN') {
    toast.success("Successfully signed in!");
    navigate('/game');
  } else if (event === 'SIGNED_OUT') {
    // Handled in signOut function
  } else if (event === 'PASSWORD_RECOVERY') {
    toast.info("Please reset your password");
    navigate('/reset-password');
  } else if (event === 'USER_UPDATED') {
    toast.success("Your profile has been updated");
  } else if (event === 'TOKEN_REFRESHED') {
    console.log("Token refreshed event from Supabase");
    useAuthStore.getState().setSession(session);
  }
});

// Optional: Function to unsubscribe the listener if needed
export const unsubscribeAuthListener = () => {
  if (authListener && authListener.subscription) {
    authListener.subscription.unsubscribe();
    console.log("Unsubscribed from Supabase auth state changes.");
  }
};

// Log initial state check call
console.log("Auth store initialized, initial session check triggered.");
