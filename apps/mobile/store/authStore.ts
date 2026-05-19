import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type User = {
  name: string;
  email: string;
};

type AuthStore = {
  user: User | null;
  hydrated: boolean;
  signIn: (user: User) => void;
  signOut: () => void;
  setHydrated: () => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,
      signIn: (user) => set({ user }),
      signOut: () => set({ user: null }),
      setHydrated: () => set({ hydrated: true })
    }),
    {
      name: "brgr-auth",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      }
    }
  )
);
