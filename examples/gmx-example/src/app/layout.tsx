"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { Inter } from "next/font/google";
import "../globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider, createConfig, http } from "wagmi";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import { useState } from "react";
import { SUPPORTED_CHAINS } from "@/lib/chains";
import type { Chain } from "viem";

const inter = Inter({ subsets: ["latin"] });

// Wagmi configuration
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "aori-demo-project";

const chains = SUPPORTED_CHAINS as unknown as readonly [Chain, ...Chain[]];
const transports = Object.fromEntries(chains.map((c) => [c.id, http()]));

const wagmiConfig = createConfig({
  chains,
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({ appName: "GMX Aori Deposit" }),
    walletConnect({ projectId }),
  ],
  transports,
  ssr: true,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en" className="dark">
      <head>
        <title>GMX Aori Deposit</title>
        <meta name="description" content="Deposit into GMX with Aori" />
      </head>
      <body className={`${inter.className} antialiased bg-black text-zinc-50`}>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider theme={darkTheme({ accentColor: "#66FF00", borderRadius: "medium" })}>
              {children}
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
