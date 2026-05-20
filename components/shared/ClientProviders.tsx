'use client'

import { ToastProvider } from './ToastContext'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}
