import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  nome: string
  email: string
  nivel: string
}

interface UserState {
  user: User | null
  setUser: (user: User) => void
  logout: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'pdv-user-storage',
    }
  )
)
