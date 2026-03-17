import { create } from "zustand";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "EMPLOYEE" | "MANAGER" | "FINANCE" | "CEO";
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: {
    id: "demo-ceo",
    name: "Demo CEO",
    email: "ceo@example.com",
    role: "CEO"
  },
  token: null,
  setAuth: (user, token) => set({ user, token }),
  logout: () => set({ user: null, token: null })
}));

