'use client'

import { createContext, useContext } from 'react'
import type { Role, Store } from '@/types'

export interface SessionUser {
  email: string
  role: Role
  store: Store
}

const UserContext = createContext<SessionUser>({ email: '', role: 'Sales', store: '' })

export const UserProvider = UserContext.Provider

export function useUser(): SessionUser {
  return useContext(UserContext)
}
