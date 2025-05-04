
import { create } from 'zustand';
import { supabase } from './supabaseClient';
import type { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  checkSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true, // Start loading until initial check is done

  // Function to update session and user state
  setSession: (session) => {
    set({ session: session, user: session?.user ?? null, loading: false });
  },

  // Function to check the current session on app load
  checkSession: async () => {
    console.log("Checking initial Supabase session...");
    set({ loading: true });
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error.message);
        toast.error("Error checking authentication status.");
      }
      console.log("Initial session:", session);
      set({ session, user: session?.user ?? null, loading: false });
    } catch (error: any) {
       console.error("Exception during session check:", error);
       toast.error("Failed to check authentication status.");
       set({ loading: false });
    }
  },

  // Function to sign out the user
  signOut: async () => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ session: null, user: null, loading: false });
      toast.success("Successfully logged out.");
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast.error(`Sign out failed: ${error.message}`);
      set({ loading: false }); // Ensure loading is false even on error
    }
  },
}));

// --- Initialize Auth State Listener ---
// Run checkSession once on initial load
useAuthStore.getState().checkSession();

// Listen for auth state changes (login, logout, token refresh)
const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
  console.log("Supabase auth event:", event, "Session:", session);
  // Update the store with the new session
  useAuthStore.getState().setSession(session);

  // Handle specific events if needed
  if (event === 'SIGNED_IN') {
    // Can add specific logic for sign-in if needed beyond state update
  } else if (event === 'SIGNED_OUT') {
    // Can add specific logic for sign-out if needed
  } else if (event === 'PASSWORD_RECOVERY') {
    // Handle password recovery flow if needed
  } else if (event === 'USER_UPDATED') {
     // Handle user profile updates if needed
  } else if (event === 'TOKEN_REFRESHED') {
    // Token refreshed, session updated in store automatically
  }
});

// Optional: Function to unsubscribe the listener if needed (e.g., in tests or specific scenarios)
export const unsubscribeAuthListener = () => {
  if (authListener && authListener.subscription) {
    authListener.subscription.unsubscribe();
    console.log("Unsubscribed from Supabase auth state changes.");
  }
};

// Log initial state check call
console.log("Auth store initialized, initial session check triggered.");
