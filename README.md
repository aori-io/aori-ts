# Aori TypeScript SDK

![aori-ts banner](https://github.com/aori-io/.github/blob/main/assets/aori-ts.png)

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

Interacting with the Aori API currently requires an API key. Inquire at https://aori.io/contact

When you have your API key, you can include it in any API request by passing it as an additional parameter to any of the SDK functions:

```typescript
import { getQuote, submitSwap } from '@aori/aori-ts';

// Load API key from your preferred method
const apiKey = process.env.AORI_API_KEY;

// Use it with any API call
const quote = await getQuote(quoteRequest, 'https://api.aori.io', apiKey);

// Then submit a swap with the same key
const swap = await submitSwap(swapRequest, 'https://api.aori.io', apiKey);
```

You can also use API keys with WebSocket connections:

```typescript
import { Aori } from '@aori/aori-ts';

// Create an Aori instance with API key and WebSocket options
const aori = await Aori.create('https://api.aori.io', 'wss://api.aori.io', apiKey, {
  onMessage: (event) => console.log(event),
  onConnect: () => console.log('Connected!'),
  onDisconnect: (event) => console.log('Disconnected:', event),
  onError: (error) => console.error('WebSocket error:', error)
});

// Connect to WebSocket with optional filter
await aori.connect({
  orderHash: '0x...',        // Filter by specific order hash
  offerer: '0x...',          // Filter by offerer address
  recipient: '0x...',        // Filter by recipient address
  inputToken: '0x...',       // Filter by input token address
  inputChain: 'arbitrum',    // Filter by input chain
  outputToken: '0x...',      // Filter by output token address
  outputChain: 'base',       // Filter by output chain
  eventType: 'completed'     // Filter by event type (created, received, completed, failed)
});

// Check connection status
console.log('Connected:', aori.isConnected());

// Disconnect when done
aori.disconnect();
```

## Usage Patterns

The SDK supports two usage patterns:

### 1. Stateful Usage with Aori Class

For applications that need to maintain state (API keys, chain information, WebSocket connections), use the `Aori` class:

```typescript
import { Aori } from '@aori/aori-ts';

// Create an Aori instance with API key
const aori = await Aori.create('https://api.aori.io', 'wss://api.aori.io', apiKey);

// Use the instance methods
const quote = await aori.getQuote(quoteRequest);
const swap = await aori.submitSwap(swapRequest);

// WebSocket functionality
await aori.connect();
aori.disconnect();
```

### 2. Non-Stateful Usage with Functions

For simple one-off operations, use the standalone functions:

```typescript
import { getQuote, submitSwap } from '@aori/aori-ts';

// Pass API key and URL to each function
const quote = await getQuote(quoteRequest, 'https://api.aori.io', apiKey);
const swap = await submitSwap(swapRequest, 'https://api.aori.io', apiKey);
```

## API Reference

| Method | Endpoint                   | Description                      | Request Body     |
| ------ | -------------------------- | -------------------------------- | ---------------- |
| `GET`  | `/chains`                  | Get a list of supported chains   | -                |
| `POST` | `/quote`                   | Get a quote                      | `<QuoteRequest>` |
| `POST` | `/swap`                    | Execute Swap                     | `<SwapRequest>`  |
| `GET`  | `/data/query`              | Query Historical Orders Database | 
| `GET`  | `/data/details/{orderHash}`| Query Single Orders Database | -                |
| `GET`  | `/data/status/{orderHash}` | Get Swap Details/Status          | -                |
| `WS`   | `/stream`                  | Open a Websocket Connection      | -                |

### `/quote`

The swap endpoint acts as the primary endpoint for users to request quotes.

#### Example QuateRequest

```bash
curl -X POST https://v3development.api.aori.io/quote \
-H "Content-Type: application/json" \
-H "x-api-key: your_api_key_here" \
-d '{
    "offerer": "0x...",
    "recipient": "0x...",
    "inputToken": "0x...",
    "outputToken": "0x...",
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
  "offerer": "0x...",
  "recipient": "0x...",
  "inputToken": "0x...",
  "outputToken": "0x...",
  "inputAmount": "1000000000000000000",
  "outputAmount": "1000000000000000000",
  "inputChain": "base",
  "outputChain": "arbitrum",
  "startTime": "1700000000",
  "endTime": "1700000010",
  "estimatedTime": 3000,
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

| Chain    | chainKey   | chainId | eid   | address                                      | vm  |
| -------- | ---------- | ------- | ----- | -------------------------------------------- | --- |
| Ethereum | `ethereum` | 1       | 30101 | `0x98AD96Ef787ba5180814055039F8E37d98ADea63` | EVM |
| Base     | `base`     | 8453    | 30184 | `0xFfe691A6dDb5D2645321e0a920C2e7Bdd00dD3D8` | EVM |
| Arbitrum | `arbitrum` | 42161   | 30110 | `0xFfe691A6dDb5D2645321e0a920C2e7Bdd00dD3D8` | EVM |
| Optimism | `optimism` | 10      | 30111 | `0xFfe691A6dDb5D2645321e0a920C2e7Bdd00dD3D8` | EVM |

## SDK Reference

### Aori Class (Stateful Usage)

The `Aori` class provides a stateful interface for interacting with the Aori API. It automatically fetches chain information on initialization and maintains API configuration.

#### Constructor and Initialization

```typescript
// Create an Aori instance with automatic chain fetching
const aori = await Aori.create(
  apiBaseUrl?: string,    // Default: 'https://api.aori.io'
  wsBaseUrl?: string,     // Default: 'wss://api.aori.io'
  apiKey?: string,        // Optional API key
  wsOptions?: WebSocketOptions // Optional WebSocket configuration
);
```

#### Instance Methods

| Method | Description | Parameters | Return Type |
| ------ | ----------- | ---------- | ----------- |
| `getQuote` | Requests a quote for a token swap | `request: QuoteRequest` | `Promise<QuoteResponse>` |
| `signOrder` | Signs an order using the provided private key | `quoteResponse: QuoteResponse, signer: SignerType` | `Promise<string>` |
| `signReadableOrder` | Signs an order using EIP-712 typed data | `quoteResponse: QuoteResponse, signer: TypedDataSigner, userAddress: string` | `Promise<{orderHash: string, signature: string}>` |
| `submitSwap` | Submits a signed swap order to the Aori API | `request: SwapRequest` | `Promise<SwapResponse>` |
| `getOrderStatus` | Gets the current status of an order | `orderHash: string` | `Promise<OrderStatus>` |
| `pollOrderStatus` | Polls the status of an order until completion or timeout | `orderHash: string, options?: PollOrderStatusOptions` | `Promise<OrderStatus>` |
| `getOrderDetails` | Fetches detailed information about an order | `orderHash: string` | `Promise<OrderDetails>` |
| `queryOrders` | Queries orders with filtering criteria | `params: QueryOrdersParams` | `Promise<QueryOrdersResponse>` |
| `connect` | Connects to the WebSocket server | `filter?: SubscriptionParams` | `Promise<void>` |
| `disconnect` | Disconnects from the WebSocket server | - | `void` |
| `isConnected` | Checks if WebSocket is connected | - | `boolean` |
| `getChainInfoByKey` | Gets chain info by chain key | `chainKey: string` | `ChainInfo \| undefined` |
| `getChainInfoById` | Gets chain info by chain ID | `chainId: number` | `ChainInfo \| undefined` |
| `getChainInfoByEid` | Gets chain info by EID | `eid: number` | `ChainInfo \| undefined` |

### Standalone Functions (Non-Stateful Usage)

For simple operations without maintaining state, use these standalone functions:

| Function | Description | Parameters | Return Type |
| -------- | ----------- | ---------- | ----------- |
| `getQuote` | Requests a quote for a token swap | `request: QuoteRequest, baseUrl?: string, apiKey?: string` | `Promise<QuoteResponse>` |
| `signOrder` | Signs an order using the provided private key | `quoteResponse: QuoteResponse, signer: SignerType` | `Promise<string>` |
| `signReadableOrder` | Signs an order using EIP-712 typed data | `chains: Record<string, ChainInfo>, quoteResponse: QuoteResponse, signer: TypedDataSigner, userAddress: string` | `Promise<{orderHash: string, signature: string}>` |
| `submitSwap` | Submits a signed swap order to the Aori API | `request: SwapRequest, baseUrl?: string, apiKey?: string` | `Promise<SwapResponse>` |
| `getOrderStatus` | Gets the current status of an order | `orderHash: string, baseUrl?: string, apiKey?: string` | `Promise<OrderStatus>` |
| `pollOrderStatus` | Polls the status of an order until completion or timeout | `orderHash: string, baseUrl?: string, options?: PollOrderStatusOptions, apiKey?: string` | `Promise<OrderStatus>` |
| `getOrderDetails` | Fetches detailed information about an order | `orderHash: string, baseUrl?: string, apiKey?: string` | `Promise<OrderDetails>` |
| `queryOrders` | Queries orders with filtering criteria | `baseUrl: string, params: QueryOrdersParams, apiKey?: string` | `Promise<QueryOrdersResponse>` |
| `fetchChains` | Fetches the list of supported chains | `baseUrl?: string, apiKey?: string` | `Promise<Record<string, ChainInfo>>` |

# Examples

### Stateful Usage with Aori Class

This example demonstrates how to use the Aori class for stateful API interactions:

```typescript
import { Aori } from '@aori/aori-ts';

async function executeSwapWithClass() {
  // Create Aori instance with API key
  const aori = await Aori.create(
    'https://api.aori.io',
    'wss://api.aori.io',
    process.env.AORI_API_KEY
  );
  
  // Create a quote request
  const quoteRequest = {
    offerer: '0x...',
    recipient: '0x...',
    inputToken: '0x...',
    outputToken: '0x...',
    inputAmount: '1000000000000000000', // 1 token with 18 decimals
    inputChain: 'arbitrum',
    outputChain: 'base'
  };
  
  // Get quote using instance method
  const quote = await aori.getQuote(quoteRequest);
  console.log('Quote received:', quote);
  
  // ... sign the quote ...
  
  // Submit the swap using instance method
  const swapResponse = await aori.submitSwap({
    orderHash: quote.orderHash,
    signature: signature
  });
  
  // Check order status using instance method
  const status = await aori.getOrderStatus(swapResponse.orderHash);
  console.log('Order status:', status);
  
  // Use WebSocket functionality with filter
  await aori.connect({
    orderHash: swapResponse.orderHash, // Only listen to events for this specific order
    eventType: 'completed' // Only listen to completion events
  });
  // ... handle WebSocket events ...
  aori.disconnect();
}

executeSwapWithClass().catch(console.error);
```

### Using API Keys with Environment Variables

This example demonstrates how to use API keys from environment variables with standalone functions:

```typescript
import dotenv from 'dotenv';
import { 
  getQuote, 
  submitSwap, 
  getOrderStatus 
} from '@aori/aori-ts';

// Load environment variables
dotenv.config();

async function executeSwap() {
  // Get API key from environment
  const apiKey = process.env.AORI_API_KEY;
  
  // Create a quote request
  const quoteRequest = {
    offerer: '0x...',
    recipient: '0x...',
    inputToken: '0x...',
    outputToken: '0x...',
    inputAmount: '1000000000000000000', // 1 token with 18 decimals
    inputChain: 'arbitrum',
    outputChain: 'base'
  };
  
  // Include API key in all requests
  const quote = await getQuote(quoteRequest, 'https://api.aori.io', apiKey);
  console.log('Quote received:', quote);
  
  // ... sign the quote ...
  
  // Submit the swap with API key
  const swapResponse = await submitSwap({
    orderHash: quote.orderHash,
    signature: signature
  }, 'https://api.aori.io', apiKey);
  
  // Check order status with API key
  const status = await getOrderStatus(swapResponse.orderHash, 'https://api.aori.io', apiKey);
  console.log('Order status:', status);
}

executeSwap().catch(console.error);
```

### Executing an Order with a Wallet in a frontend application

This example demonstrates how to use the SDK with a wallet in a frontend application:

```typescript
import { useAccount } from "wagmi";
import {
  Aori,
  getQuote,
  signReadableOrder,
  submitSwap,
  getOrderStatus,
} from "aori-ts";

// React component example with Aori class
function SwapComponentWithClass() {
  const { address, connector } = useAccount();
  
  // Get API key from environment variables or a secured source
  const apiKey = process.env.REACT_APP_AORI_API_KEY;

  const handleSwap = async () => {
    try {
      // Create Aori instance
      const aori = await Aori.create('https://api.aori.io', 'wss://api.aori.io', apiKey);

      // 1. Get the quote first
      const quoteRequest = {
        offerer: address,
        recipient: address,
        inputToken: "0x...",
        outputToken: "0x...",
        inputAmount: "1000000000",
        inputChain: "base",
        outputChain: "arbitrum",
      };

      const quote = await aori.getQuote(quoteRequest);

      // 2. Get the wallet client:
      const walletClient = await connector?.getWalletClient();

      // 3. Create a wrapper for the wallet client:
      const walletWrapper = {
        signTypedData: async (params) => {
          return walletClient.signTypedData({
            account: params.account,
            domain: params.domain,
            types: params.types,
            primaryType: params.primaryType,
            message: params.message,
          });
        },
      };

      // 4. Sign the order using EIP-712:
      const { orderHash, signature } = await aori.signReadableOrder(
        quote,
        walletWrapper,
        address
      );

      // 5. Submit the swap with signature:
      const swapRequest = {
        orderHash,
        signature,
      };

      const swapResponse = await aori.submitSwap(swapRequest);
      console.log("Swap submitted successfully:", swapResponse);

      // 6. Check current order status:
      const status = await aori.getOrderStatus(swapResponse.orderHash);
      console.log(`Current order status: ${status.type}`);
    } catch (error) {
      console.error("Swap failed:", error);
    }
  };

  return <button onClick={handleSwap}> Swap Tokens </button>;
}

// React component example with standalone functions
function SwapComponentWithFunctions() {
  const { address, connector } = useAccount();
  
  const apiKey = process.env.REACT_APP_AORI_API_KEY;

  const handleSwap = async () => {
    try {
      // 1. Get the quote first
      const quoteRequest = {
        offerer: address,
        recipient: address,
        inputToken: "0x...",
        outputToken: "0x...",
        inputAmount: "1000000000",
        inputChain: "base",
        outputChain: "arbitrum",
      };

      const quote = await getQuote(quoteRequest, "https://api.aori.io", apiKey);

      // 2. Get the wallet client:
      const walletClient = await connector?.getWalletClient();

      // 3. Create a wrapper for the wallet client:
      const walletWrapper = {
        signTypedData: async (params) => {
          return walletClient.signTypedData({
            account: params.account,
            domain: params.domain,
            types: params.types,
            primaryType: params.primaryType,
            message: params.message,
          });
        },
      };

      // 4. Sign the order using EIP-712 (need to fetch chains first):
      const chains = await fetchChains("https://api.aori.io", apiKey);
      const { orderHash, signature } = await signReadableOrder(
        chains,
        quote,
        walletWrapper,
        address
      );

      // 5. Submit the swap with signature:
      const swapRequest = {
        orderHash,
        signature,
      };

      const swapResponse = await submitSwap(swapRequest, "https://api.aori.io", apiKey);
      console.log("Swap submitted successfully:", swapResponse);

      // 6. Check current order status:
      const status = await getOrderStatus(swapResponse.orderHash, "https://api.aori.io", apiKey);
      console.log(`Current order status: ${status.type}`);
    } catch (error) {
      console.error("Swap failed:", error);
    }
  };

  return <button onClick={handleSwap}> Swap Tokens </button>;
}

## License

This project is released under the [MIT License](LICENSE.MD).