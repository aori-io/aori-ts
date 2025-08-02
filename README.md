# Aori TypeScript SDK

![aori-ts banner](https://github.com/aori-io/.github/blob/main/assets/aori-ts.png)

[![https://devs.aori.io](https://img.shields.io/badge/🗨_telegram_chat-0088cc)](https://t.me/+sHy6ym4a1ps2Yjlk) ![GitHub issues](https://img.shields.io/github/issues-raw/aori-io/aori-ts?color=blue)

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

// Create an Aori instance with API key
const aori = await Aori.create('https://api.aori.io', 'wss://api.aori.io', apiKey);

// Connect to WebSocket with optional filter and callbacks
await aori.connect({
  orderHash: '0x...',        // Filter by specific order hash
  offerer: '0x...',          // Filter by offerer address
  recipient: '0x...',        // Filter by recipient address
  inputToken: '0x...',       // Filter by input token address
  inputChain: 'arbitrum',    // Filter by input chain
  outputToken: '0x...',      // Filter by output token address
  outputChain: 'base',       // Filter by output chain
  eventType: 'completed'     // Filter by event type (created, received, completed, failed)
}, {
  onMessage: (event) => console.log(event),
  onConnect: () => console.log('Connected!'),
  onDisconnect: (event) => console.log('Disconnected:', event),
  onError: (error) => console.error('WebSocket error:', error)
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

## Request Cancellation with AbortSignal

All API functions in the Aori SDK now support request cancellation using the native `AbortSignal` API. This allows you to cancel ongoing HTTP requests, which is especially useful for:

- **Timeout handling**: Cancel requests that take too long
- **User cancellation**: Allow users to cancel operations in progress
- **Component cleanup**: Cancel requests when React components unmount
- **Race conditions**: Cancel older requests when new ones are made

### Basic Usage

All functions accept an optional `{ signal }` parameter as their last argument:

```typescript
// Cancel request after 5 seconds
const signal = AbortSignal.timeout(5000);
const quote = await getQuote(quoteRequest, baseUrl, apiKey, { signal });
```

### Timeout Examples

```typescript
import { getQuote, getOrderStatus } from '@aori/aori-ts';

// Set a 3-second timeout for quote requests
try {
  const quote = await getQuote(quoteRequest, 'https://api.aori.io', apiKey, {
    signal: AbortSignal.timeout(3000)
  });
  console.log('Quote received:', quote);
} catch (error) {
  if (error.name === 'TimeoutError') {
    console.log('Quote request timed out after 3 seconds');
  }
}

// Set a 10-second timeout for order status polling
const status = await getOrderStatus(orderHash, 'https://api.aori.io', apiKey, {
  signal: AbortSignal.timeout(10000)
});
```

### Manual Cancellation

```typescript
// Create an abort controller for manual cancellation
const controller = new AbortController();

// Start a request
const quotePromise = getQuote(quoteRequest, 'https://api.aori.io', apiKey, {
  signal: controller.signal
});

// Cancel the request after 2 seconds
setTimeout(() => {
  controller.abort('User cancelled the request');
}, 2000);

try {
  const quote = await quotePromise;
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request was cancelled:', error.reason);
  }
}
```

### React Component Example

```typescript
import React, { useEffect, useState } from 'react';
import { getQuote } from '@aori/aori-ts';

function QuoteComponent({ quoteRequest }) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    
    const fetchQuote = async () => {
      setLoading(true);
      try {
        const result = await getQuote(
          quoteRequest, 
          'https://api.aori.io', 
          apiKey,
          { signal: controller.signal }
        );
        setQuote(result);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Quote failed:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();

    // Cleanup: cancel the request if component unmounts
    return () => controller.abort();
  }, [quoteRequest]);

  return loading ? <div>Loading...</div> : <div>{quote ? 'Quote loaded' : 'No quote'}</div>;
}
```

### Supported Functions

All the following functions support AbortSignal:

- `getQuote(request, baseUrl, apiKey, { signal })`
- `submitSwap(request, baseUrl, apiKey, { signal })`
- `executeSwap(quote, config, baseUrl, apiKey, { signal })`
- `getOrderStatus(orderHash, baseUrl, apiKey, { signal })`
- `pollOrderStatus(orderHash, baseUrl, options, apiKey, { signal })`
- `getOrderDetails(orderHash, baseUrl, apiKey, { signal })`
- `getOrder(orderHash, chains, baseUrl, apiKey, { signal })`
- `queryOrders(baseUrl, params, apiKey, { signal })`
- `fetchAllChains(baseUrl, apiKey, { signal })`
- `getDomain(baseUrl, apiKey, { signal })`
- `getChain(chain, baseUrl, apiKey, { signal })`
- `getChainByEid(eid, baseUrl, apiKey, { signal })`
- `getAddress(chain, baseUrl, apiKey, { signal })`
- `fetchAllTokens(baseUrl, apiKey, { signal, chain })`
- `getTokens(chain, baseUrl, apiKey, { signal })`
- `cancelOrder(orderHashOrCancelTx, txExecutor, baseUrl, apiKey, { signal })`
- `getCancelTx(orderHash, baseUrl, apiKey, { signal })`
- `canCancel(orderHash, orderDetails, baseUrl, apiKey, { signal })`

### Aori Class Methods

The `Aori` class methods also support AbortSignal through the same pattern:

```typescript
const aori = await Aori.create();

// All instance methods support signal parameter
const quote = await aori.getQuote(quoteRequest, { signal: AbortSignal.timeout(5000) });
const swapResult = await aori.executeSwap(quote, config, { signal: controller.signal });
const status = await aori.getOrderStatus(orderHash, { signal: controller.signal });
const order = await aori.getOrder(orderHash, { signal: AbortSignal.timeout(3000) });

// Token methods also support AbortSignal
await aori.loadTokens('ethereum', { signal: AbortSignal.timeout(3000) });
const tokens = await aori.fetchTokens('base', { signal: controller.signal });

// Cancellation methods also support AbortSignal
const canCancel = await aori.canCancel(orderHash, { signal: AbortSignal.timeout(5000) });
const cancelTx = await aori.getCancelTx(orderHash, { signal: controller.signal });
const cancelResult = await aori.cancelOrder(orderHash, txExecutor, { signal: controller.signal });
```

## API Reference

| Method | Endpoint                   | Description                      | Request Body     |
| ------ | -------------------------- | -------------------------------- | ---------------- |
| `GET`  | `/chains`                  | Get a list of supported chains   | -                |
| `GET`  | `/domain`                  | Get EIP-712 domain information   | -                |
| `GET`  | `/tokens`                  | Get a list of supported tokens   | -                |
| `POST` | `/quote`                   | Get a quote                      | `<QuoteRequest>` |
| `POST` | `/swap`                    | Execute Swap                     | `<SwapRequest>`  |
| `POST` | `/cancel`                  | Get cancellation transaction data| `{ "orderHash": "0x..." }` |
| `GET`  | `/data/query`              | Query Historical Orders Database | 
| `GET`  | `/data/details/{orderHash}`| Query Single Orders Database | -                |
| `GET`  | `/data/status/{orderHash}` | Get Swap Details/Status          | -                |
| `WS`   | `/stream`                  | Open a Websocket Connection      | -                |

### `/domain`

The domain endpoint provides EIP-712 domain information needed for typed data signing. This information is automatically fetched and cached when creating an Aori instance.

#### Example Response

```json
{
  "domainTypeString": "EIP712Domain(string name,string version,address verifyingContract)",
  "name": "Aori",
  "orderTypeString": "Order(uint128 inputAmount,uint128 outputAmount,address inputToken,address outputToken,uint32 startTime,uint32 endTime,uint32 srcEid,uint32 dstEid,address offerer,address recipient)",
  "version": "0.3.1"
}
```

### `/quote`

The swap endpoint acts as the primary endpoint for users to request quotes.

#### Example QuoteRequest

```bash
curl -X POST https://api.aori.io/quote \
-H "Content-Type: application/json" \
-H "x-api-key: your_api_key_here" \
-d '{
    "offerer": "0x0000000000000000000000000000000000000001",
    "recipient": "0x0000000000000000000000000000000000000001",
    "inputToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "outputToken": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    "inputAmount": "100000000",
    "inputChain": "base",
    "outputChain": "arbitrum"
}'
```

#### Example QuoteResponse

```json
{
  "orderHash": "0x...",
  "signingHash": "0x...",
  "offerer": "0x0000000000000000000000000000000000000001",
  "recipient": "0x0000000000000000000000000000000000000001",
  "inputToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "outputToken": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  "inputAmount": "100000000",
  "outputAmount": "99999999",
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
-d '{
    "orderHash": "0x...",
    "signature": "0x..."
}'
```

#### Example SwapResponse

```json
{
  "orderHash": "0x...",
  "offerer": "0x0000000000000000000000000000000000000001",
  "recipient": "0x0000000000000000000000000000000000000001",
  "inputToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "outputToken": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
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

### `/cancel`

The cancel endpoint provides pre-calculated transaction data for cancelling orders. This endpoint handles all the complex logic including chain detection, LayerZero fee calculation, and ABI encoding.

#### Example Cancel Request

```bash
curl -X POST https://api.aori.io/cancel \
-H "Content-Type: application/json" \
-H "x-api-key: your_api_key_here" \
-d '{
    "orderHash": "0x89f0b7fcb38e0b97fb66701579583c038031c3034abfa8ff75e0f8914f65ccf3"
}'
```

#### Example Cancel Response

```json
{
  "orderHash": "0x89f0b7fcb38e0b97fb66701579583c038031c3034abfa8ff75e0f8914f65ccf3",
  "to": "0x5f4e18f8D3D3952A02FBBE7cb9800D189059F66d",
  "data": "0x983f7fd189f0b7fcb38e0b97fb66701579583c038031c3034abfa8ff75e0f8914f65ccf3...",
  "value": "74173060168071",
  "chain": "ethereum"
}
```

The response provides all the data needed to execute the cancellation transaction:
- `orderHash`: The order being cancelled
- `to`: Contract address to send the transaction to
- `data`: Encoded function call data
- `value`: Transaction value (LayerZero fees for cross-chain cancellations)
- `chain`: The chain where the cancellation should be executed

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

You can easily fetch complete chain information or just the contract address using these helper functions:

#### Get Complete Chain Information

```typescript
import { getChain } from '@aori/aori-ts';

// Using chainKey (string)
const optimismChain = await getChain("optimism");
console.log(optimismChain); 
// { chainKey: "optimism", chainId: 10, eid: 30111, address: "0x...", explorerUrl: "..." }

// Using chainId (number)  
const baseChain = await getChain(8453);
console.log(baseChain.address); // "0xFfe691A6dDb5D2645321e0a920C2e7Bdd00dD3D8"

// With API key
const ethereumChain = await getChain("ethereum", "https://api.aori.io", apiKey);
```

#### Get All Supported Chains

When using the Aori class, you can easily get all supported chains at once:

```typescript
import { Aori } from '@aori/aori-ts';

const aori = await Aori.create('https://api.aori.io', 'wss://api.aori.io', apiKey);

// Get all chains as a mapping of chainKey -> ChainInfo
const allChains = aori.getAllChains();
console.log(allChains);
// {
//   base: { chainKey: "base", chainId: 8453, eid: 30184, address: "0x...", ... },
//   arbitrum: { chainKey: "arbitrum", chainId: 42161, eid: 30110, address: "0x...", ... },
//   ...
// }

// Iterate through all chains
Object.entries(allChains).forEach(([chainKey, chainInfo]) => {
  console.log(`${chainKey}: Chain ID ${chainInfo.chainId}, EID ${chainInfo.eid}`);
});

// Check if a specific chain is supported
if ('polygon' in allChains) {
  console.log('Polygon is supported!');
}

// Get all chain IDs
const chainIds = Object.values(allChains).map(chain => chain.chainId);
console.log('Supported chain IDs:', chainIds); // [1, 8453, 42161, 10]

// Find chains by specific criteria
const evmChains = Object.values(allChains).filter(chain => chain.vm === 'EVM');
console.log('EVM chains:', evmChains.length);

// Get contract addresses for all chains
const contractAddresses = Object.fromEntries(
  Object.entries(allChains).map(([key, chain]) => [key, chain.address])
);
console.log('Contract addresses:', contractAddresses);
```

For standalone usage, you can use the `fetchAllChains` function:

```typescript
import { fetchAllChains } from '@aori/aori-ts';

// Fetch all chains without creating an Aori instance
const allChains = await fetchAllChains('https://api.aori.io', apiKey);

// Same operations as above
console.log('Available chains:', Object.keys(allChains));
```

#### Get Just the Contract Address

```typescript
import { getAddress } from '@aori/aori-ts';

// Using chainKey (string)
const optimismAddress = await getAddress("optimism");
console.log(optimismAddress); // "0xFfe691A6dDb5D2645321e0a920C2e7Bdd00dD3D8"

// Using chainId (number)
const baseAddress = await getAddress(8453);
console.log(baseAddress); // "0xFfe691A6dDb5D2645321e0a920C2e7Bdd00dD3D8"

// With API key
const address = await getAddress("ethereum", "https://api.aori.io", apiKey);
```

## Domain Information

The Aori SDK automatically handles EIP-712 domain information needed for typed data signing. This information includes the domain name, version, and type definitions required for secure order signing.

### Automatic Domain Fetching

When you create an Aori instance, domain information is automatically fetched and cached:

```typescript
import { Aori } from '@aori/aori-ts';

// Domain info is automatically fetched and cached during creation
const aori = await Aori.create('https://api.aori.io', 'wss://api.aori.io', apiKey);

// Access cached domain information
const domainInfo = aori.getDomain();
console.log(domainInfo);
// {
//   domainTypeString: "EIP712Domain(string name,string version,address verifyingContract)",
//   name: "Aori",
//   orderTypeString: "Order(uint128 inputAmount,uint128 outputAmount,...)",
//   version: "0.3.1"
// }
```

### Standalone Domain Fetching

For stateless usage, you can fetch domain information directly:

```typescript
import { getDomain } from '@aori/aori-ts';

const domainInfo = await getDomain('https://api.aori.io', apiKey);
console.log(`Domain: ${domainInfo.name} v${domainInfo.version}`);
```

### Integration with Order Signing

Domain information is automatically used when signing orders with EIP-712:

```typescript
// When using the Aori class, domain info is automatically included
const { orderHash, signature } = await aori.signReadableOrder(
  quote,
  walletWrapper,
  userAddress
); // Domain info from cache is used automatically

// For standalone usage, domain info is fetched automatically if not provided
const { orderHash, signature } = await signReadableOrder(
  quote,
  walletWrapper,
  userAddress,
  'https://api.aori.io',
  apiKey
); // Domain info is fetched from API automatically
```

## SDK Reference

### Aori Class (Stateful Usage)

The `Aori` class provides a stateful interface for interacting with the Aori API. It automatically fetches chain information on initialization and maintains API configuration.

#### Constructor and Initialization

```typescript
// Create an Aori instance with automatic chain and domain fetching
const aori = await Aori.create(
  apiBaseUrl?: string,    // Default: 'https://api.aori.io'
  wsBaseUrl?: string,     // Default: 'wss://api.aori.io'
  apiKey?: string,        // Optional API key
  loadTokens?: boolean    // Optional: load all tokens during initialization
);
```

The `loadTokens` parameter allows you to pre-load all tokens during initialization:

```typescript
// Don't load tokens (default behavior)
const aori = await Aori.create();

// Load all tokens across all chains
const aoriWithAllTokens = await Aori.create(
  'https://api.aori.io',
  'wss://api.aori.io', 
  apiKey,
  true  // Load all tokens
);

// For specific chains, load them after creation
const aori = await Aori.create('https://api.aori.io', 'wss://api.aori.io', apiKey);

// Load tokens for specific chains using instance method
await aori.loadTokens('ethereum');  // Load Ethereum tokens
await aori.loadTokens(8453);        // Load Base tokens (chainId: 8453)
await aori.loadTokens();            // Load all tokens
```

**Performance Benefits**: Pre-loading all tokens during initialization eliminates the need for separate API calls later when you call `getTokens()` or `getAllTokens()`. For specific chains, use the `loadTokens()` instance method after creation.

#### Instance Methods

| Method | Description | Parameters | Return Type |
| ------ | ----------- | ---------- | ----------- |
| `getQuote` | Requests a quote for a token swap | `request: QuoteRequest, options?: { signal?: AbortSignal }` | `Promise<QuoteResponse>` |
| `signOrder` | Signs an order using the provided private key | `quoteResponse: QuoteResponse, signer: SignerType` | `Promise<string>` |
| `signReadableOrder` | Signs an order using EIP-712 typed data | `quoteResponse: QuoteResponse, signer: TypedDataSigner, userAddress: string` | `Promise<{orderHash: string, signature: string}>` |
| `submitSwap` | Submits a signed swap order to the Aori API | `request: SwapRequest, options?: { signal?: AbortSignal }` | `Promise<SwapResponse>` |
| `executeSwap` | Executes a swap (sign + submit for ERC20, submit + execute for native) | `quote: QuoteResponse, config: SwapConfig, options?: { signal?: AbortSignal }` | `Promise<TransactionResponse \| SwapResponse>` |
| `getOrderStatus` | Gets the current status of an order | `orderHash: string, options?: { signal?: AbortSignal }` | `Promise<OrderStatus>` |
| `pollOrderStatus` | Polls the status of an order until completion or timeout | `orderHash: string, options?: PollOrderStatusOptions, abortOptions?: { signal?: AbortSignal }` | `Promise<OrderStatus>` |
| `getOrderDetails` | Fetches detailed information about an order | `orderHash: string, options?: { signal?: AbortSignal }` | `Promise<OrderDetails>` |
| `getOrder` | Fetches order details and parses into Order object | `orderHash: string, options?: { signal?: AbortSignal }` | `Promise<Order>` |
| `parseOrder` | Parses QuoteResponse/SwapResponse/OrderDetails into Order object | `order: QuoteResponse \| SwapResponse \| OrderDetails` | `Promise<Order>` |
| `queryOrders` | Queries orders with filtering criteria | `params: QueryOrdersParams, options?: { signal?: AbortSignal }` | `Promise<QueryOrdersResponse>` |
| `cancelOrder` | Cancels an order by executing the cancellation transaction | `orderHash: string, txExecutor: CancelTxExecutor, options?: { signal?: AbortSignal }` | `Promise<CancelOrderResponse>` |
| `getCancelTx` | Gets cancellation transaction data from the API | `orderHash: string, options?: { signal?: AbortSignal }` | `Promise<CancelTx>` |
| `canCancel` | Checks if an order can be cancelled based on its state | `orderHash: string, options?: { signal?: AbortSignal }` | `Promise<boolean>` |
| `connect` | Connects to the WebSocket server | `filter?: SubscriptionParams, callbacks?: WebSocketCallbacks` | `Promise<void>` |
| `disconnect` | Disconnects from the WebSocket server | - | `void` |
| `isConnected` | Checks if WebSocket is connected | - | `boolean` |
| `getChain` | Gets chain info by chain identifier | `chain: string \| number` | `ChainInfo \| undefined` |
| `getChainByEid` | Gets chain info by EID | `eid: number` | `ChainInfo \| undefined` |
| `getChainInfoByEid` | Gets chain info by EID (alias for getChainByEid) | `eid: number` | `ChainInfo \| undefined` |
| `getAllChains` | Gets all supported chains and their information | - | `Record<string, ChainInfo>` |
| `getDomain` | Gets cached EIP-712 domain information | - | `DomainInfo \| null` |
| `loadTokens` | Loads tokens into cache from API | `chain?: string \| number, options?: { signal?: AbortSignal }` | `Promise<void>` |
| `getAllTokens` | Gets all cached tokens | - | `TokenInfo[]` |
| `getTokens` | Gets cached tokens for specific chain | `chain: string \| number` | `TokenInfo[]` |
| `fetchTokens` | Fetches tokens from API (bypasses cache) | `chain: string \| number, options?: { signal?: AbortSignal }` | `Promise<TokenInfo[]>` |
| `isNativeToken` | Checks if a token address is the native token | `tokenAddress: string` | `boolean` |
| `getNativeTokenAddress` | Gets the native token address | - | `string` |
| `isNativeSwap` | Checks if a quote response is for a native token swap | `quoteResponse: QuoteResponse` | `boolean` |
| `executeNativeSwap` | Executes a native token swap transaction | `nativeResponse: NativeSwapResponse, txExecutor: TxExecutor, gasLimit?: string` | `Promise<TransactionResponse>` |
| `constructNativeSwapTransaction` | Constructs a native swap transaction request | `nativeResponse: NativeSwapResponse, gasLimit?: string` | `TransactionRequest` |

### Standalone Functions (Non-Stateful Usage)

For simple operations without maintaining state, use these standalone functions:

| Function | Description | Parameters | Return Type |
| -------- | ----------- | ---------- | ----------- |
| `getQuote` | Requests a quote for a token swap | `request: QuoteRequest, baseUrl?: string, apiKey?: string, options?: { signal?: AbortSignal }` | `Promise<QuoteResponse>` |
| `signOrder` | Signs an order using the provided private key | `quoteResponse: QuoteResponse, signer: SignerType` | `Promise<string>` |
| `signReadableOrder` | Signs an order using EIP-712 typed data | `quoteResponse: QuoteResponse, signer: TypedDataSigner, userAddress: string, baseUrl?: string, apiKey?: string, inputChain?: ChainInfo, outputChain?: ChainInfo` | `Promise<{orderHash: string, signature: string}>` |
| `submitSwap` | Submits a signed swap order to the Aori API | `request: SwapRequest, baseUrl?: string, apiKey?: string, options?: { signal?: AbortSignal }` | `Promise<SwapResponse>` |
| `executeSwap` | Executes a swap (sign + submit for ERC20, submit + execute for native) | `quote: QuoteResponse, config: SwapConfig, baseUrl?: string, apiKey?: string, options?: { signal?: AbortSignal }` | `Promise<TransactionResponse \| SwapResponse>` |
| `getOrderStatus` | Gets the current status of an order | `orderHash: string, baseUrl?: string, apiKey?: string, options?: { signal?: AbortSignal }` | `Promise<OrderStatus>` |
| `pollOrderStatus` | Polls the status of an order until completion or timeout | `orderHash: string, baseUrl?: string, options?: PollOrderStatusOptions, apiKey?: string, abortOptions?: { signal?: AbortSignal }` | `Promise<OrderStatus>` |
| `getOrderDetails` | Fetches detailed information about an order | `orderHash: string, baseUrl?: string, apiKey?: string, options?: { signal?: AbortSignal }` | `Promise<OrderDetails>` |
| `getOrder` | Fetches order details and parses into Order object | `orderHash: string, chains?: Record<string, ChainInfo>, baseUrl?: string, apiKey?: string, options?: { signal?: AbortSignal }` | `Promise<Order>` |
| `parseOrder` | Parses QuoteResponse/SwapResponse/OrderDetails into Order object | `order: QuoteResponse \| SwapResponse \| OrderDetails, chains?: Record<string, ChainInfo>, baseUrl?: string, apiKey?: string` | `Promise<Order>` |
| `queryOrders` | Queries orders with filtering criteria | `baseUrl: string, params: QueryOrdersParams, apiKey?: string, options?: { signal?: AbortSignal }` | `Promise<QueryOrdersResponse>` |
| `cancelOrder` | Cancels an order by executing the cancellation transaction | `orderHashOrCancelTx: string \| CancelTx, txExecutor: CancelTxExecutor, baseUrl?: string, apiKey?: string, options?: { signal?: AbortSignal }` | `Promise<CancelOrderResponse>` |
| `getCancelTx` | Gets cancellation transaction data from the API | `orderHash: string, baseUrl?: string, apiKey?: string, options?: { signal?: AbortSignal }` | `Promise<CancelTx>` |
| `canCancel` | Checks if an order can be cancelled based on its state | `orderHash: string, orderDetails?: OrderDetails, baseUrl?: string, apiKey?: string, options?: { signal?: AbortSignal }` | `Promise<boolean>` |
| `fetchAllChains` | Fetches the list of supported chains | `baseUrl?: string, apiKey?: string, options?: { signal?: AbortSignal }` | `Promise<Record<string, ChainInfo>>` |
| `getDomain` | Fetches EIP-712 domain information for typed data signing | `baseUrl?: string, apiKey?: string, options?: { signal?: AbortSignal }` | `Promise<DomainInfo>` |
| `getChain` | Fetches the chain information for a specific chain | `chain: string \| number, baseUrl?: string, apiKey?: string, options?: { signal?: AbortSignal }` | `Promise<ChainInfo>` |
| `getChainByEid` | Fetches the chain information for a specific EID | `eid: number, baseUrl?: string, apiKey?: string, options?: { signal?: AbortSignal }` | `Promise<ChainInfo>` |
| `getAddress` | Fetches the contract address for a specific chain | `chain: string \| number, baseUrl?: string, apiKey?: string, options?: { signal?: AbortSignal }` | `Promise<string>` |
| `fetchAllTokens` | Fetches all tokens, optionally filtered by chain | `baseUrl?: string, apiKey?: string, options?: { signal?: AbortSignal, chain?: string \| number }` | `Promise<TokenInfo[]>` |
| `getTokens` | Fetches tokens for a specific chain | `chain: string \| number, baseUrl?: string, apiKey?: string, options?: { signal?: AbortSignal }` | `Promise<TokenInfo[]>` |
| `isNativeToken` | Checks if a token address is the native token | `tokenAddress: string` | `boolean` |
| `isNativeQuoteResponse` | Type guard for native quote responses | `response: QuoteResponse` | `response is NativeQuoteResponse` |
| `isERC20QuoteResponse` | Type guard for ERC20 quote responses | `response: QuoteResponse` | `response is ERC20QuoteResponse` |
| `isNativeSwap` | Checks if a quote response is for a native token swap | `quoteResponse: QuoteResponse` | `boolean` |
| `isNativeSwapResponse` | Type guard for native swap responses | `response: SwapResponse` | `response is NativeSwapResponse` |
| `isERC20SwapResponse` | Type guard for ERC20 swap responses | `response: SwapResponse` | `response is ERC20SwapResponse` |
| `executeNativeSwap` | Executes a native token swap transaction | `nativeResponse: NativeSwapResponse, txExecutor: TxExecutor, gasLimit?: string` | `Promise<TransactionResponse>` |
| `validateNativeSwapResponse` | Validates a native swap response | `response: NativeSwapResponse` | `void` |
| `constructNativeSwapTransaction` | Constructs a native swap transaction request | `nativeResponse: NativeSwapResponse, gasLimit?: string` | `TransactionRequest` |
| `validateContractAddress` | Validates a contract address against trusted addresses | `contractAddress: string, trustedAddresses?: string[]` | `void` |
| `validateDepositNativeCalldata` | Validates transaction calldata for native deposits | `data: string` | `boolean` |
| `createTypedData` | Creates EIP-712 typed data for order signing | `quoteResponse: QuoteResponse, params: TypedDataParams` | `TypedData` |

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
    offerer: "0x0000000000000000000000000000000000000001",
    recipient: "0x0000000000000000000000000000000000000001",
    inputToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    outputToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    inputAmount: "100000000",
    inputChain: "base",
    outputChain: "arbitrum"
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
  
  // Use WebSocket functionality with filter and callbacks
  await aori.connect({
    orderHash: swapResponse.orderHash, // Only listen to events for this specific order
    eventType: 'completed' // Only listen to completion events
  }, {
    onMessage: (event) => console.log('WebSocket event:', event),
    onConnect: () => console.log('WebSocket connected'),
    onDisconnect: (event) => console.log('WebSocket disconnected:', event),
    onError: (error) => console.error('WebSocket error:', error)
  });
  // WebSocket events will be handled by the callbacks above
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
    offerer: "0x0000000000000000000000000000000000000001",
    recipient: "0x0000000000000000000000000000000000000001",
    inputToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    outputToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    inputAmount: "100000000",
    inputChain: "base",
    outputChain: "arbitrum"
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

### Cancelling an Order

This example demonstrates how to cancel an order using the SDK's cancellation functionality:

```typescript
import { Aori } from '@aori/aori-ts';
import { useWalletClient } from 'wagmi';

async function cancelOrderExample() {
  const apiKey = process.env.AORI_API_KEY;
  const aori = await Aori.create('https://api.aori.io', 'wss://api.aori.io', apiKey);
  
  const orderHash = "0x89f0b7fcb38e0b97fb66701579583c038031c3034abfa8ff75e0f8914f65ccf3";
  
  // 1. Check if the order can be cancelled
  const canCancel = await aori.canCancel(orderHash);
  if (!canCancel) {
    console.log("Order cannot be cancelled - it may be completed, already cancelled, or expired");
    return;
  }
  
  // 2. Get cancellation transaction data
  const cancelTx = await aori.getCancelTx(orderHash);
  console.log(`Cancellation requires ${cancelTx.chain} network`);
  console.log(`LayerZero fee: ${cancelTx.value === "0" ? "0 ETH (single-chain)" : `${Number(cancelTx.value) / 1e18} ETH`}`);
  
  // 3. Create transaction executor (using wagmi as example)
  const walletClient = await connector?.getWalletClient();
  
  const txExecutor = {
    address: userAddress,
    getChainId: async () => walletClient.chain?.id || 0,
    sendTransaction: async (request) => {
      const hash = await walletClient.sendTransaction({
        to: request.to,
        data: request.data,
        value: BigInt(request.value),
        gas: request.gasLimit ? BigInt(request.gasLimit) : undefined,
      });
      
      return {
        hash,
        wait: async () => {
          const { waitForTransactionReceipt } = await import('viem/actions');
          return await waitForTransactionReceipt(walletClient, { hash });
        }
      };
    },
    estimateGas: async (request) => {
      const { estimateGas } = await import('viem/actions');
      return await estimateGas(walletClient, {
        to: request.to,
        data: request.data,
        value: BigInt(request.value),
      });
    }
  };
  
  // 4. Execute the cancellation
  try {
    const result = await aori.cancelOrder(orderHash, txExecutor);
    
    if (result.success) {
      console.log(`✅ Order cancelled successfully!`);
      console.log(`Transaction hash: ${result.txHash}`);
      console.log(`Cross-chain: ${result.isCrossChain ? 'Yes' : 'No'}`);
      if (result.fee) {
        console.log(`LayerZero fee paid: ${Number(result.fee) / 1e18} ETH`);
      }
    } else {
      console.error(`❌ Cancellation failed: ${result.error}`);
    }
  } catch (error) {
    console.error('Cancellation error:', error);
  }
}

// Usage with standalone functions
import { canCancel, getCancelTx, cancelOrder } from '@aori/aori-ts';

async function cancelOrderStandalone() {
  const apiKey = process.env.AORI_API_KEY;
  const orderHash = "0x89f0b7fcb38e0b97fb66701579583c038031c3034abfa8ff75e0f8914f65ccf3";
  
  // Check cancellability
  const canCancelResult = await canCancel(orderHash, undefined, 'https://api.aori.io', apiKey);
  if (!canCancelResult) return;
  
  // Get cancel data
  const cancelTx = await getCancelTx(orderHash, 'https://api.aori.io', apiKey);
  
  // Execute cancellation
  const result = await cancelOrder(orderHash, txExecutor, 'https://api.aori.io', apiKey);
  console.log('Cancellation result:', result);
}

cancelOrderExample().catch(console.error);
```

### Executing an Order with a Wallet in a frontend application

These examples demonstrates how to use the SDK with a wallet in a frontend application:

#### Using a stateful aori instance

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
        inputToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        outputToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        inputAmount: "100000000",
        inputChain: "base",
        outputChain: "arbitrum"
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

      // 4. Sign the order using EIP-712 (chains fetched automatically from quote):
      const { orderHash, signature } = await aori.signReadableOrder(
        quote,
        walletWrapper,
        address
      );

      // Alternative: Optimize by pre-fetching and caching chain info to avoid repeated API calls
      // const inputChain = await getChain(quote.inputChain, "https://api.aori.io", apiKey);
      // const outputChain = await getChain(quote.outputChain, "https://api.aori.io", apiKey);
      // const { orderHash, signature } = await signReadableOrder(
      //   quote,
      //   walletWrapper,
      //   address,
      //   "https://api.aori.io",
      //   apiKey,
      //   inputChain,   // Pre-fetched chain info
      //   outputChain   // Pre-fetched chain info
      // );

      // 5. Submit the swap with signature:
      const swapRequest = {
        orderHash,
        signature,
      };

      const swapResponse = await aori.submitSwap(swapRequest);
      console.log("Swap submitted successfully:", swapResponse);

      // 6. Check current order status:
      const status = await aori.getOrderStatus(swapResponse.orderHash);
      console.log(`Current order status: ${status.status}`);
    } catch (error) {
      console.error("Swap failed:", error);
    }
  };

  return <button onClick={handleSwap}> Swap Tokens </button>;
}
```
#### Using stateless helper functions

```typescript
function SwapComponentWithFunctions() {
  const { address, connector } = useAccount();
  
  const apiKey = process.env.REACT_APP_AORI_API_KEY;

  const handleSwap = async () => {
    try {
      // 1. Get the quote first
      const quoteRequest = {
        offerer: address,
        recipient: address,
        inputToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        outputToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        inputAmount: "100000000",
        inputChain: "base",
        outputChain: "arbitrum"
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

      // 4. Sign the order using EIP-712 (chains fetched automatically from quote):
      const { orderHash, signature } = await signReadableOrder(
        quote,
        walletWrapper,
        address,
        "https://api.aori.io",
        apiKey
      );

      // Alternative: Optimize by pre-fetching and caching chain info to avoid repeated API calls
      // const inputChain = await getChain(quote.inputChain, "https://api.aori.io", apiKey);
      // const outputChain = await getChain(quote.outputChain, "https://api.aori.io", apiKey);
      // const { orderHash, signature } = await signReadableOrder(
      //   quote,
      //   walletWrapper,
      //   address,
      //   "https://api.aori.io",
      //   apiKey,
      //   inputChain,   // Pre-fetched chain info
      //   outputChain   // Pre-fetched chain info
      // );

      // 5. Submit the swap with signature:
      const swapRequest = {
        orderHash,
        signature,
      };

      const swapResponse = await submitSwap(swapRequest, "https://api.aori.io", apiKey);
      console.log("Swap submitted successfully:", swapResponse);

      // 6. Check current order status:
      const status = await getOrderStatus(swapResponse.orderHash, "https://api.aori.io", apiKey);
      console.log(`Current order status: ${status.status}`);
    } catch (error) {
      console.error("Swap failed:", error);
    }
  };

  return <button onClick={handleSwap}> Swap Tokens </button>;
}
```

### Request Cancellation and Timeout Handling

This example demonstrates how to implement proper request cancellation and timeout handling:

```typescript
import { getQuote, submitSwap, pollOrderStatus } from '@aori/aori-ts';

async function executeSwapWithTimeouts() {
  const apiKey = process.env.AORI_API_KEY;
  
  try {
    // 1. Get quote with 5-second timeout
    console.log('Requesting quote...');
    const quote = await getQuote(quoteRequest, 'https://api.aori.io', apiKey, {
      signal: AbortSignal.timeout(5000)
    });
    
    console.log('Quote received:', quote);
    
    // ... sign the quote ...
    
    // 2. Submit swap with 10-second timeout
    console.log('Submitting swap...');
    const swapResponse = await submitSwap({
      orderHash: quote.orderHash,
      signature: signature
    }, 'https://api.aori.io', apiKey, {
      signal: AbortSignal.timeout(10000)
    });
    
    console.log('Swap submitted:', swapResponse);
    
    // 3. Poll order status with overall 5-minute timeout
    console.log('Monitoring order status...');
    const finalStatus = await pollOrderStatus(
      swapResponse.orderHash,
      'https://api.aori.io',
      {
        interval: 2000,        // Check every 2 seconds
        maxAttempts: 150,      // Maximum 150 attempts (5 minutes)
        onStatusChange: (status) => console.log(`Status changed to: ${status.status}`)
      },
      apiKey,
      { signal: AbortSignal.timeout(300000) } // 5-minute overall timeout
    );
    
    console.log('Final status:', finalStatus);
    
  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.error('Operation timed out:', error.message);
    } else if (error.name === 'AbortError') {
      console.error('Operation was cancelled:', error.message);
    } else {
      console.error('Operation failed:', error);
    }
  }
}

// Usage with manual cancellation
async function executeSwapWithManualCancellation() {
  const controller = new AbortController();
  
  // Set up cancellation after 30 seconds
  const timeoutId = setTimeout(() => {
    controller.abort('Operation taking too long');
  }, 30000);
  
  try {
    const quote = await getQuote(quoteRequest, 'https://api.aori.io', apiKey, {
      signal: controller.signal
    });
    
    // Clear timeout if quote succeeds quickly
    clearTimeout(timeoutId);
    
    // Continue with swap...
    const swapResponse = await submitSwap(swapRequest, 'https://api.aori.io', apiKey, {
      signal: controller.signal
    });
    
    console.log('Swap completed:', swapResponse);
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.log('User cancelled the operation');
    } else {
      console.error('Swap failed:', error);
    }
  }
}

// React hook for cancellable requests
function useAoriSwap() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const controllerRef = useRef();
  
  const executeSwap = useCallback(async (quoteRequest) => {
    // Cancel any existing request
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    
    controllerRef.current = new AbortController();
    setLoading(true);
    setError(null);
    
    try {
      const quote = await getQuote(
        quoteRequest, 
        'https://api.aori.io', 
        apiKey, 
        { signal: controllerRef.current.signal }
      );
      
      // Continue with signing and submission...
      // All using the same signal for consistent cancellation
      
      return quote;
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  const cancel = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);
  
  return { executeSwap, cancel, loading, error };
}
```

### Working with Multiple Chains

This example demonstrates how to use `getAllChains()` to build applications that work across multiple chains:

```typescript
import { Aori } from '@aori/aori-ts';

async function buildMultiChainApp() {
  const aori = await Aori.create('https://api.aori.io', 'wss://api.aori.io', apiKey);
  
  // Get all supported chains
  const allChains = aori.getAllChains();
  
  // Create a chain selector for a UI
  const chainOptions = Object.entries(allChains).map(([key, chain]) => ({
    value: key,
    label: `${chain.chainKey} (${chain.chainId})`,
    chainId: chain.chainId,
    address: chain.address
  }));
  
  console.log('Chain options for UI:', chainOptions);
  
  // Validate user input against supported chains
  function validateChainInput(userChainInput: string | number): boolean {
    if (typeof userChainInput === 'string') {
      return userChainInput.toLowerCase() in allChains;
    } else {
      return Object.values(allChains).some(chain => chain.chainId === userChainInput);
    }
  }
  
  // Get optimal routes between chains
  function getAvailableRoutes() {
    const routes = [];
    const chainKeys = Object.keys(allChains);
    
    for (const inputChain of chainKeys) {
      for (const outputChain of chainKeys) {
        if (inputChain !== outputChain) {
          routes.push({
            from: inputChain,
            to: outputChain,
            fromChainId: allChains[inputChain].chainId,
            toChainId: allChains[outputChain].chainId
          });
        }
      }
    }
    
    return routes;
  }
  
  const availableRoutes = getAvailableRoutes();
  console.log(`Total available routes: ${availableRoutes.length}`);
  
  // Check contract deployment status
  function checkContractDeployments() {
    const deployments = Object.entries(allChains).map(([key, chain]) => ({
      chain: key,
      chainId: chain.chainId,
      contractAddress: chain.address,
      isDeployed: !!chain.address
    }));
    
    const deployedCount = deployments.filter(d => d.isDeployed).length;
    console.log(`Contracts deployed on ${deployedCount}/${deployments.length} chains`);
    
    return deployments;
  }
  
  checkContractDeployments();
  
  // Build a quote request with validation
  async function requestQuoteWithValidation(inputChain: string, outputChain: string, amount: string) {
    // Validate chains are supported
    if (!validateChainInput(inputChain)) {
      throw new Error(`Input chain '${inputChain}' is not supported`);
    }
    
    if (!validateChainInput(outputChain)) {
      throw new Error(`Output chain '${outputChain}' is not supported`);
    }
    
    if (inputChain === outputChain) {
      throw new Error('Input and output chains must be different');
    }
    
    const quoteRequest = {
      offerer: userAddress,
      recipient: userAddress,
      inputToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
      outputToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC on Arbitrum
      inputAmount: amount,
      inputChain: inputChain,
      outputChain: outputChain
    };
    
    console.log(`Requesting quote: ${inputChain} → ${outputChain}`);
    return await aori.getQuote(quoteRequest);
  }
  
  // Example usage
  try {
    const quote = await requestQuoteWithValidation('base', 'arbitrum', '1000000');
    console.log('Quote received:', quote);
  } catch (error) {
    console.error('Quote failed:', error.message);
  }
}

buildMultiChainApp().catch(console.error);

// Performance optimization example with chain caching
async function performanceOptimizedBatch() {
  const apiKey = process.env.AORI_API_KEY;
  
  // Pre-fetch all chains once to avoid repeated API calls
  const allChains = await fetchAllChains('https://api.aori.io', apiKey);
  
  const orders = [
    { inputChain: 'base', outputChain: 'arbitrum', amount: '1000000' },
    { inputChain: 'arbitrum', outputChain: 'optimism', amount: '2000000' },
    { inputChain: 'optimism', outputChain: 'base', amount: '1500000' }
  ];
  
  for (const order of orders) {
    try {
      // Get quote
      const quote = await getQuote({
        offerer: userAddress,
        recipient: userAddress,
        inputToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        outputToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        inputAmount: order.amount,
        inputChain: order.inputChain,
        outputChain: order.outputChain
      }, 'https://api.aori.io', apiKey);
      
      // Get cached chain info (no API calls needed!)
      const inputChain = allChains[order.inputChain];
      const outputChain = allChains[order.outputChain];
      
      // Sign with cached chain info - this avoids 2 API calls per order
      const { orderHash, signature } = await signReadableOrder(
        quote,
        walletWrapper,
        userAddress,
        'https://api.aori.io',
        apiKey,
        inputChain,   // Use cached chain info
        outputChain   // Use cached chain info
      );
      
      console.log(`Order ${orderHash} signed efficiently with cached chain data`);
      
      // Submit swap
      const swapResponse = await submitSwap({
        orderHash,
        signature
      }, 'https://api.aori.io', apiKey);
      
      console.log(`Swap submitted: ${swapResponse.orderHash}`);
      
    } catch (error) {
      console.error(`Failed to process order ${order.inputChain} → ${order.outputChain}:`, error);
    }
  }
}

// React component for chain selection
function ChainSelector({ onChainSelect }) {
  const [chains, setChains] = useState({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadChains() {
      try {
        const aori = await Aori.create();
        const allChains = aori.getAllChains();
        setChains(allChains);
      } catch (error) {
        console.error('Failed to load chains:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadChains();
  }, []);
  
  if (loading) return <div>Loading chains...</div>;
  
  return (
    <select onChange={(e) => onChainSelect(e.target.value)}>
      <option value="">Select a chain</option>
      {Object.entries(chains).map(([key, chain]) => (
        <option key={key} value={key}>
          {chain.chainKey} (Chain ID: {chain.chainId})
        </option>
      ))}
    </select>
  );
}
```

## License

This project is released under the [MIT License](LICENSE.MD).