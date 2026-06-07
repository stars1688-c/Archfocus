// src/stores/account-store.ts
import { create } from 'zustand'
import type { Account } from '@/types'

interface AccountState {
  accounts: Account[]
  selectedAccountId: string | null
  isLoading: boolean
  setAccounts: (accounts: Account[]) => void
  addAccount: (account: Account) => void
  updateAccount: (id: string, updates: Partial<Account>) => void
  deleteAccount: (id: string) => void
  selectAccount: (id: string | null) => void
  getSelectedAccount: () => Account | undefined
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  selectedAccountId: null,
  isLoading: false,

  setAccounts: (accounts) => set({ accounts }),

  addAccount: (account) => set((state) => ({
    accounts: [...state.accounts, account]
  })),

  updateAccount: (id, updates) => set((state) => ({
    accounts: state.accounts.map((a) =>
      a.id === id ? { ...a, ...updates } : a
    ),
  })),

  deleteAccount: (id) => set((state) => ({
    accounts: state.accounts.filter((a) => a.id !== id),
    selectedAccountId: state.selectedAccountId === id ? null : state.selectedAccountId,
  })),

  selectAccount: (id) => set({ selectedAccountId: id }),

  getSelectedAccount: () => {
    const state = get()
    return state.accounts.find((a) => a.id === state.selectedAccountId)
  },
}))
