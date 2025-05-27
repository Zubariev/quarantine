// Mock auth store for testing
import { create } from 'zustand';

interface AuthState {
  user: any | null;
  session: any | null;
}

export const useAuthStore = create<AuthState>(() => ({
  user: null,
  session: null,
})); 