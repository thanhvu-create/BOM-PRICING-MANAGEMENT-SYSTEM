'use client'

import { createContext, useContext } from 'react'

interface AppConfig {
  vndRate: number
  mgrDiscCap: number
}

const ConfigContext = createContext<AppConfig>({ vndRate: 0, mgrDiscCap: 20 })

export const ConfigProvider = ConfigContext.Provider

export function useConfig(): AppConfig {
  return useContext(ConfigContext)
}
