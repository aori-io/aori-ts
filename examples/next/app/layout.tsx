import type { Metadata } from 'next'
import './globals.css'
import { WalletProvider } from './providers/WalletProvider'
import { AoriProvider } from './providers/AoriProvider'

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
      <body>
        <WalletProvider>
          <AoriProvider>{children}</AoriProvider>
        </WalletProvider>
      </body>
    </html>
  )
} 