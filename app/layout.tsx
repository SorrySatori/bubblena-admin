import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// Pořadí importů reprodukuje původní kaskádu z Vite (globální třídy se překrývají).
import '@/styles/index.css'
import '@/styles/App.css'
import '@/styles/Login.css'
import '@/styles/StockManagement.css'
import '@/styles/Warehouse.css'

export const metadata: Metadata = {
  title: 'Bubblena Admin',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  )
}
