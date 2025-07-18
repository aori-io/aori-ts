import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppKitProvider } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Aori Swap Example',
  description: 'A simple example of cross-chain swaps using Aori SDK',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppKitProvider>{children}</AppKitProvider>
      </body>
    </html>
  )
} 