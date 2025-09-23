import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/index';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: false,
      login: (token: string, user: User) => {
        localStorage.setItem('auth_token', token);
        set({ user, token, isAuthenticated: true, isInitialized: true });
      },
      logout: () => {
        localStorage.removeItem('auth_token');
        set({ user: null, token: null, isAuthenticated: false, isInitialized: true });
      },
      initialize: () => {
        try {
          const savedToken = localStorage.getItem('auth_token');
          const state = get();

          // If we have a saved token and persisted user, restore authentication
          if (savedToken && state.user) {
            console.log('🔄 Restoring authentication from localStorage');
            set({
              token: savedToken,
              isAuthenticated: true,
              isInitialized: true
            });
          } else {
            console.log('🔍 No valid session found, staying logged out');
            // Clear any invalid state
            localStorage.removeItem('auth_token');
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isInitialized: true
            });
          }
        } catch (error) {
          console.error('❌ Error initializing auth:', error);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isInitialized: true
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        // Don't persist token in Zustand, keep it only in localStorage
      }),
    }
  )
);