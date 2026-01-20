# GMX Cross-Chain Deposit Demo

A demo app showing how to deposit tokens into GMX from any supported chain using [Aori](https://aori.io) for cross-chain swaps.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment

Create `.env.local`:

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

## Key Files

| File | Description |
|------|-------------|
| `src/hooks/useDepositFlow.ts` | Complete deposit flow logic |
| `src/lib/gmx-deposit.ts` | GMX contract interactions |
| `src/lib/transactions.ts` | Transaction utilities |
| `src/components/DepositForm.tsx` | Main UI component |

## Supported Tokens

ETH, WETH, USDC, USDT across Ethereum, Arbitrum, Optimism, Base, and BSC.
