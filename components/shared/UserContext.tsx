'use client'

import { createContext, useContext } from 'react'
import type { Role, Store } from '@/types'

export interface SessionUser {
  username: string
  role: Role
  store: Store
}

const UserContext = createContext<SessionUser>({ username: '', role: 'Sales', store: '' })

export const UserProvider = UserContext.Provider

export function useUser(): SessionUser {
  return useContext(UserContext)
}
