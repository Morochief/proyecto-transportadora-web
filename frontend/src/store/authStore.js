import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      authReady: false,
      setSession: ({ user, accessToken }) =>
        set({ user, accessToken }),
      setAuthReady: (authReady) => set({ authReady }),
      updateUser: (user) => set({ user }),
      clearSession: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'auth-state',
      version: 2,
      migrate: (state, version) => {
        if (version < 2) {
          return { ...state, accessToken: null };
        }
        return state;
      },
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
);

export default useAuthStore;
