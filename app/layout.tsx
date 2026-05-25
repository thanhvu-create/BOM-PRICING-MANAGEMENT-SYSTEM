import type { Metadata } from 'next'
import './globals.css'
import ClientProviders from '@/components/shared/ClientProviders'

export const metadata: Metadata = {
  title: 'BOM Pricing | GSNB',
  description: 'BOM Pricing Web App',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Cardo:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          rel="stylesheet"
        />
        {/* Google Identity Services — for Drive image auth */}
        <script src="https://accounts.google.com/gsi/client" async />
      </head>
      <body><ClientProviders>{children}</ClientProviders></body>
    </html>
  )
}
