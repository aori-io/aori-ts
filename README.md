# Aori TypeScript SDK

![aori-ts banner](https://github.com/aori-io/.github-private/blob/main/assets/public/aori-ts.png)

[![https://devs.aori.io](https://img.shields.io/badge/🗨_telegram_chat-0088cc)](https://devs.aori.io) ![GitHub issues](https://img.shields.io/github/issues-raw/aori-io/aori-ts?color=blue)

## Getting Started

#### Installation

```bash
bun add @aori/aori-ts
```

or

```bash
npm install @aori/aori-ts
```

or


```bash
yarn add @aori/aori-ts
```

#### Authorization

Interacting with the Aori API does not currently require an API key, although it is recommended you visit the [Aori Developer Portal](https://developers.aori.io) to receive an integrator ID to be provided tracking and analytics on your integration.

## API Reference

| Method | Endpoint            | Description                      | Request Body     |
| ------ | ------------------- | -------------------------------- | ---------------- |
| `GET`  | `/chains`           | Get a list of supported chains   | -                |
| `POST` | `/quote`            | Get a quote                      | `<QuoteRequest>` |
| `POST` | `/swap`             | Execute Swap                     | `<SwapRequest>`  |
| `GET`  | `/data`             | Query Historical Orders Database | -                |
| `GET`  | `/data/status/{orderHash}` | Get Swap Details/Status          | -                |
| `WS`   | `/stream`           | Open a Websocket Connection      | -                |

### `/quote`

The swap endpoint acts as the primary endpoint for users to request quotes.

#### Example QuateRequest

```bash
curl -X POST https://v3development.api.aori.io/quote \
-H "Content-Type: application/json" \
-H "X-API-KEY: your_api_key_here" \
-d '{
    "offerer": "0x0000000000000000000000000000000000000000",
    "recipient": "0x0000000000000000000000000000000000000000",
    "inputToken": "0x4200000000000000000000000000000000000006",
    "outputToken": "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    "inputAmount": "1000000000000000000",
    "inputChain": "base",
    "outputChain": "arbitrum"
}'
```

#### Example QuoteResponse

```json
{
  "orderHash": "0x9a3af...",
  "signingHash": "0xas23f...",
  "offerer": "0x0000000000000000000000000000000000000001",
  "recipient": "0x0000000000000000000000000000000000000001",
  "inputToken": "0x0000000000000000000000000000000000000002",
  "outputToken": "0x0000000000000000000000000000000000000003",
  "inputAmount": "1000000000000000000",
  "outputAmount": "1000000000000000000",
  "inputChain": "base",
  "outputChain": "arbitrum",
  "startTime": "1700000000",
  "endTime": "1700000010",
  "estimatedTime": 3000, // in milliseconds
  "exclusiveSolver": "0x0000000000000000000000000000000000000000",
  "exclusiveSolverDuration": 0
}
```

### `/swap`

The swap endpoint acts as the primary endpoint for users to post signed orders for execution.

#### Example SwapRequest

```bash
curl -X POST https://api.aori.io/swap \
-H "Content-Type: application/json" \
-d  'orderHash: "0x...",
    'signature': "0x...",
```

#### Example SwapResponse

```json
{
  "orderHash": "0x9a3af...",
  "offerer": "0x0000000000000000000000000000000000000001",
  "recipient": "0x0000000000000000000000000000000000000001",
  "inputToken": "0x0000000000000000000000000000000000000002",
  "outputToken": "0x0000000000000000000000000000000000000003",
  "inputAmount": "1000000000000000000",
  "outputAmount": "1000000000000000000",
  "inputChain": "base",
  "outputChain": "arbitrum",
  "startTime": "1700000000",
  "endTime": "1700000010",
  "status": "pending",
  "createdAt": "1700000000"
}
```

### `/data`

The data endpoint acts as the primary endpoint for users to query historical orders.

#### Parameters

| Parameter     | Type           | Description                                                 |
| ------------- | -------------- | ----------------------------------------------------------- |
| order_hash    | String         | Hash of the order                                           |
| offerer       | String         | Address of the order creator                                |
| recipient     | String         | Address of the order recipient                              |
| input_token   | String         | Address of the token being sent                             |
| input_amount  | String         | Amount of input token                                       |
| output_token  | String         | Address of the token being received                         |
| output_amount | String         | Amount of output token                                      |
| input_chain   | String         | Chain key for the input token (e.g., "arbitrum")            |
| output_chain  | String         | Chain key for the output token (e.g., "base")               |
| src_tx        | Option<String> | Source chain transaction hash                               |
| dst_tx        | Option<String> | Destination chain transaction hash                          |
| status        | String         | Order status (Pending, Received, Filled, Confirmed, Failed) |
| min_time      | u64            | Unix timestamp, start of filter range by created_at         |
| max_time      | u64            | Unix timestamp, end of filter range by created_at           |
| page          | u64            | Page number (1-x)                                           |
| limit         | u64            | Results per page (1-100)                                    |

## Chains

| Chain    | chainKey   | chainId | eid | address                                      | blocktime | vm  |
| -------- | ---------- | ------- | --- | -------------------------------------------- | --------- | --- |
| Ethereum | `ethereum` | 1       | ??? | ???                                          | ???       | EVM |
| Base     | `base`     | 8453    | ??? | `0x4F424e1c94F2918251C16bD7C62b82ee16F9fB9D` | ???       | EVM |
| Arbitrum | `arbitrum` | 42161   | ??? | `0x48051Dfe36367c2BC4DE8de39945C6166F5fa8Ee` | ???       | EVM |
| Optimism | `optimism` | 10      | ??? | ???                                          | ???       | EVM |
| Solana   | `solana`   | N/A     | ??? | ???                                          | ???       | SVM |

## SDK Functions

| Function              | Description                                                   | Parameters                                                              | Return Type                                |
| --------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------ |
| `getQuote`            | Requests a quote for a token swap                             | `request: QuoteRequest, baseUrl?: string`                               | `Promise<QuoteResponse>`                   |
| `signOrder`           | Signs an order using the provided private key                 | `quoteResponse: QuoteResponse, signer: SignerType`                      | `Promise<string>`                          |
| `signReadableOrder`   | Signs an order using EIP-712 typed data (for wallet clients)  | `quoteResponse: QuoteResponse, signer: TypedDataSigner, userAddress: string` | `Promise<{orderHash: string, signature: string}>` |
| `submitSwap`          | Submits a signed swap order to the Aori API                   | `request: SwapRequest, baseUrl?: string`                                | `Promise<SwapResponse>`                    |
| `class AoriWebSocket` | WebSocket client for real-time order updates                  | -                                                                       | -                                          |
| `pollOrderStatus`     | Polls the status of an order until completion or timeout      | `orderHash: string, baseUrl?: string, options?: PollOrderStatusOptions` | `Promise<OrderRecord>`                     |
| `getChains`           | Fetches the list of supported chains and their configurations | `baseUrl?: string`                                                      | `Promise<ChainInfo[]>`                     |

## Usage Examples

### Requesting a Quote

```typescript
import { getQuote } from "aori-ts";

const quoteRequest = {
  offerer: "0x...",
  recipient: "0x...",
  inputToken: "0x...",
  outputToken: "0x...",
  inputAmount: "1000000000000000000",
  inputChain: "base",
  outputChain: "arbitrum",
};

try {
  const quote = await getQuote(quoteRequest);
  console.log("Quote received:", quote);
  // Quote contains signingHash needed for the next step
} catch (error) {
  console.error("Failed to get quote:", error);
}
```

### Signing an Order with Private Key

```typescript
import { signOrder } from "aori-ts";

const signer = {
  privateKey: "your_private_key_here", // Replace with actual private key
};

try {
  const signature = await signOrder(quoteResponse, signer);
  console.log("Order signed:", signature);
} catch (error) {
  console.error("Failed to sign order:", error);
}
```

### Signing an Order with a Wallet Client (EIP-712)

```typescript
import { signReadableOrder } from "aori-ts";

// Create a wrapper for your wallet client (viem, ethers, etc.)
const walletClientWrapper = {
  signTypedData: async (params) => {
    // For viem:
    return signTypedData(walletClient, {
      account: params.account,
      domain: params.domain,
      types: params.types,
      primaryType: params.primaryType,
      message: params.message
    });
    
    // For ethers v6:
    // return wallet._signTypedData(params.domain, params.types, params.message);
  }
};

try {
  const { orderHash, signature } = await signReadableOrder(
    quoteResponse,
    walletClientWrapper,
    userAddress
  );
  
  console.log("Order signed:", signature);
} catch (error) {
  console.error("Failed to sign order:", error);
}
```

### Submitting a Swap

```typescript
import { submitSwap } from "aori-ts";

const swapRequest = {
  orderHash: quote.orderHash, // From the quote response
  signature: signature, // From the signing step
};

try {
  const swapResponse = await submitSwap(swapRequest);
  console.log("Swap submitted:", swapResponse);
  // Contains order details including status
} catch (error) {
  console.error("Failed to submit swap:", error);
}
```

### WebSocket Connection for Real-time Updates

```typescript
import { AoriWebSocket } from "aori-ts";

const ws = new AoriWebSocket(undefined, {
  onMessage: (order) => {
    console.log("New order received:", order);
    // Handle incoming order data
  },
  onConnect: () => {
    console.log("Successfully connected to Aori WebSocket");
  },
  onDisconnect: (event) => {
    console.log("Disconnected from WebSocket:", event.reason);
  },
  onError: (error) => {
    console.error("WebSocket error:", error);
  },
});

// Connect to the WebSocket
try {
  await ws.connect();

  // Check connection status
  if (ws.isConnected()) {
    console.log("WebSocket is connected");
  }

  // Disconnect when done
  // ws.disconnect();
} catch (error) {
  console.error("Failed to connect:", error);
}
```

### Polling HTTP request for Order Status Updates

```typescript
import { pollOrderStatus } from "aori-ts";

try {
  const orderStatus = await pollOrderStatus(orderHash, undefined, {
    onStatusChange: (status, order) => {
      console.log(`Status changed to: ${status}`);
      console.log("Current order state:", order);
    },
    onComplete: (order) => {
      console.log("Order completed!", order);
    },
    onError: (error) => {
      console.error("Polling error:", error);
    },
    interval: 1000, // Check every second
    timeout: 60000, // Stop polling after 1 minute
  });
} catch (error) {
  console.error("Order polling failed:", error);
}
```

The `pollOrderStatus` function polls the `/data/status/{orderHash}` endpoint to get real-time updates on the status of an order. It will continue polling until the order reaches a terminal state (completed, failed, or src_failed) or until the timeout is reached.

### Getting Supported Chains

```typescript
import { getChains } from "aori-ts";

try {
  const chains = await getChains();
  console.log("Supported chains:", chains);
} catch (error) {
  console.error("Failed to fetch chains:", error);
}

// Example chain info:
// {
//   chainKey: "ethereum",
//   chainId: 1,
//   eid: 1,
//   address: "0x...",
// }
```

## Executing an Order with a Wallet in a frontend application

This example demonstrates how to use the SDK with a wallet in a frontend application:

```typescript
import { useAccount } from "wagmi";
import { getQuote, signReadableOrder, submitSwap, pollOrderStatus } from "aori-ts";

// React component example
function SwapComponent() {
  const { address, connector } = useAccount();

  const handleSwap = async () => {
    try {
      // 1. Get the quote first
      const quoteRequest = {
        offerer: address,
        recipient: address,
        inputToken: "0x...", // WETH on Base
        outputToken: "0x...", // USDC on Arbitrum
        inputAmount: "1000000000000000000", // 1 ETH
        inputChain: "base",
        outputChain: "arbitrum",
      };

      const quote = await getQuote(quoteRequest);

      // 2. Get the wallet client
      const walletClient = await connector?.getWalletClient();
      
      // 3. Create a wrapper for the wallet client
      const walletWrapper = {
        signTypedData: async (params) => {
          return walletClient.signTypedData({
            account: params.account,
            domain: params.domain,
            types: params.types,
            primaryType: params.primaryType,
            message: params.message
          });
        }
      };

      // 4. Sign the order using EIP-712
      const { orderHash, signature } = await signReadableOrder(
        quote,
        walletWrapper,
        address
      );

      // 5. Submit the swap with signature
      const swapRequest = {
        orderHash,
        signature,
      };

      const swapResponse = await submitSwap(swapRequest);
      console.log("Swap submitted successfully:", swapResponse);

      // 6. Optional: Poll for status updates
      pollOrderStatus(swapResponse.orderHash, undefined, {
        onStatusChange: (status) => {
          console.log(`Order status: ${status}`);
        },
        onComplete: (order) => {
          console.log("Swap completed!", order);
        },
      });
    } catch (error) {
      console.error("Swap failed:", error);
    }
  };

  return <button onClick={handleSwap}>Swap Tokens</button>;
}
```

## License

This project is released under the [MIT License](LICENSE.MD).
