import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setSession: ({ user, accessToken }) =>
        set({ user, accessToken }),
      updateUser: (user) => set({ user }),
      clearSession: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'auth-state',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
    }
  )
);

export default useAuthStore;
