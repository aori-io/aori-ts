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

Interacting with the Aori API does not currently require an API key, although it is recommended you visit the [Aori Developer Portal](https://developers.aori.io) to receive an integrator ID to be provided tracking and analytics on your integration.

## API Reference

| Method | Endpoint                   | Description                      | Request Body     |
| ------ | -------------------------- | -------------------------------- | ---------------- |
| `GET`  | `/chains`                  | Get a list of supported chains   | -                |
| `POST` | `/quote`                   | Get a quote                      | `<QuoteRequest>` |
| `POST` | `/swap`                    | Execute Swap                     | `<SwapRequest>`  |
| `GET`  | `/data`                    | Query Historical Orders Database | -                |
| `GET`  | `/data/status/{orderHash}` | Get Swap Details/Status          | -                |
| `WS`   | `/stream`                  | Open a Websocket Connection      | -                |

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

| Chain    | chainKey   | chainId | eid   | address                                      | vm  |
| -------- | ---------- | ------- | ----- | -------------------------------------------- | --- |
| Ethereum | `ethereum` | 1       | 30101 | `0xe8820573Bb2d748Dc86C381b2c4bC3cFdFabf30A` | EVM |
| Base     | `base`     | 8453    | 30184 | `0x21FC19BE519fB20e9182aDF3Ca0C2Ef625aB1647` | EVM |
| Arbitrum | `arbitrum` | 42161   | 30110 | `0x708a4498dA06b133f73Ee6107F1737015372cb76` | EVM |
| Optimism | `optimism` | 10      | 30111 | `0xbfd66f36aCa484802387a8e484BCe4630A1da764` | EVM |

## SDK Functions

| Function            | Description                                                    | Parameters                                                                   | Return Type                                       |
| ------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------- |
| `getQuote`          | Requests a quote for a token swap                              | `request: QuoteRequest,  baseUrl?: string`                                   | `Promise<QuoteResponse>`                          |
| `signOrder`         | Signs an order using the provided private key                  | `quoteResponse: QuoteResponse, signer: SignerType`                           | `Promise<string>`                                 |
| `signReadableOrder` | Signs an order using EIP-712 typed data (for frontends)        | `quoteResponse: QuoteResponse, signer: TypedDataSigner, userAddress: string` | `Promise<{orderHash: string, signature: string}>` |
| `submitSwap`        | Submits a signed swap order to the Aori API.                   | `request: SwapRequest, baseUrl?: string`                                     | `Promise<SwapResponse>`                           |
| `getOrderStatus`    | Polls the status of an order until completion or timeout.      | `orderHash: string, baseUrl?: string,`                                       | `Promise<OrderStatus>`                            |
| `getChains`         | Fetches the list of supported chains and their configurations. | `baseUrl?: string`                                                           | `Promise<ChainInfo[]>`                            |

# Examples

### Executing an Order with a Wallet in a frontend application

This example demonstrates how to use the SDK with a wallet in a frontend application:

```typescript
import { useAccount } from "wagmi";
import {
  getQuote,
  signReadableOrder,
  submitSwap,
  getOrderStatus,
} from "aori-ts";

// React component example
function SwapComponent() {
  const { address, connector } = useAccount();

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

      const quote = await getQuote(quoteRequest);

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
      const { orderHash, signature } = await signReadableOrder(
        quote,
        walletWrapper,
        address
      );

      // 5. Submit the swap with signature:
      const swapRequest = {
        orderHash,
        signature,
      };

      const swapResponse = await submitSwap(swapRequest);
      console.log("Swap submitted successfully:", swapResponse);

      // 6. Check current order status:
      const status = await getOrderStatus(swapResponse.orderHash);
      console.log(`Current order status: ${status.type}`);
      // });
    } catch (error) {
      console.error("Swap failed:", error);
    }
  };

  return <button onClick={handleSwap}> Swap Tokens </button>;
}
```

### Polling HTTP request for Order Status Updates using `getOrderStatus`

```typescript
import { getOrderStatus } from "aori-ts";

async function pollOrderStatus(
  orderHash: string,
  baseUrl: string = "https://api.aori.io",
  options: {
    onStatusChange?: (status: OrderStatus) => void;
    onComplete?: (status: OrderStatus) => void;
    onError?: (error: Error) => void;
    interval?: number;
    timeout?: number;
  } = {}
): Promise<OrderStatus> {
  const {
    onStatusChange,
    onComplete,
    onError,
    interval = 1000,
    timeout = 60000,
  } = options;

  let lastType: string | null = null;
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      try {
        // Check if we've exceeded the timeout
        if (Date.now() - startTime > timeout) {
          const error = new Error("Order status polling timed out");
          onError?.(error);
          reject(error);
          return;
        }

        // Fetch the order status
        const response = await fetch(`${baseUrl}/data/status/${orderHash}`);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch order status: ${errorText}`);
        }

        const status: OrderStatus = await response.json();

        // Notify if status type has changed
        if (status.type !== lastType) {
          lastType = status.type;
          onStatusChange?.(status);
        }

        // Check for completed or failed status
        if (status.type === "Completed" || status.type === "Failed") {
          onComplete?.(status);
          resolve(status);
          return;
        }

        // Continue polling
        setTimeout(checkStatus, interval);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
        reject(err);
      }
    };

    // Start polling
    checkStatus();
  });
}
```

## License

This project is released under the [MIT License](LICENSE.MD).
