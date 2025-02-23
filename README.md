# Aori TypeScript SDK

Aori TypeScript SDK for interacting with the Aori API.

[![https://devs.aori.io](https://img.shields.io/badge/🗨_telegram_chat-0088cc)](https://devs.aori.io) ![GitHub issues](https://img.shields.io/github/issues-raw/aori-io/aori-ts?color=blue)


## Installation



```bash
npm install aori-ts
```

or 

```bash
bun add aori-ts
```

or 

```bash
yarn add aori-ts
```



## API Reference

### getQuote(request: QuoteRequest, baseUrl?: string): Promise<QuoteResponse>
Requests a quote for a token swap.

### signOrder(quoteResponse: QuoteResponse, signer: SignerType): Promise<string>
Signs an order using the provided private key.

### submitSwap(request: SwapRequest, baseUrl?: string): Promise<SwapResponse>
Submits a signed swap order to the Aori API.

### class AoriWebSocket
WebSocket client for real-time order updates.

### pollOrderStatus(orderHash: string, baseUrl?: string, options?: PollOrderStatusOptions): Promise<OrderRecord>
Polls the status of an order until completion or timeout.

### getChains(baseUrl?: string): Promise<ChainInfo[]>
Fetches the list of supported chains and their configurations.

## Supported Networks

The SDK supports multiple networks including:
- Ethereum Mainnet
- Optimism
- Arbitrum
- Base
- Polygon
- And more...

For a complete list of supported networks, refer to the `ChainId` enum in the SDK.

## Usage Examples

### Requesting a Quote

```typescript
import { getQuote } from 'aori-ts';

const quoteRequest = {
  offerer: "0x...",
  recipient: "0x...",
  inputToken: "0x...", 
  outputToken: "0x...", 
  inputAmount: "1000000000000000000",
  inputChain: "base", 
  outputChain: "arbitrum" 
};

try {
  const quote = await getQuote(quoteRequest);
  console.log('Quote received:', quote);
  // Quote contains signingHash needed for the next step
} catch (error) {
  console.error('Failed to get quote:', error);
}
```

### Signing an Order

```typescript
import { signOrder } from 'aori-ts';

const signer = {
  privateKey: "your_private_key_here" // Replace with actual private key
};

try {
  const signature = await signOrder(quoteResponse, signer);
  console.log('Order signed:', signature);
} catch (error) {
  console.error('Failed to sign order:', error);
}
```

### Submitting a Swap

```typescript
import { submitSwap } from 'aori-ts';

const swapRequest = {
  orderHash: quote.orderHash, // From the quote response
  signature: signature // From the signing step
};

try {
  const swapResponse = await submitSwap(swapRequest);
  console.log('Swap submitted:', swapResponse);
  // Contains order details including status
} catch (error) {
  console.error('Failed to submit swap:', error);
}
```

### WebSocket Connection for Real-time Updates

```typescript
import { AoriWebSocket } from 'aori-ts';

const ws = new AoriWebSocket(undefined, {
  onMessage: (order) => {
    console.log('New order received:', order);
    // Handle incoming order data
  },
  onConnect: () => {
    console.log('Successfully connected to Aori WebSocket');
  },
  onDisconnect: (event) => {
    console.log('Disconnected from WebSocket:', event.reason);
  },
  onError: (error) => {
    console.error('WebSocket error:', error);
  }
});

// Connect to the WebSocket
try {
  await ws.connect();
  
  // Check connection status
  if (ws.isConnected()) {
    console.log('WebSocket is connected');
  }

  // Disconnect when done
  // ws.disconnect();
} catch (error) {
  console.error('Failed to connect:', error);
}
```

### Polling HTTP request for Order Status Updates

```typescript
import { pollOrderStatus } from 'aori-ts';

try {
  const orderStatus = await pollOrderStatus(orderHash, undefined, {
    onStatusChange: (status, order) => {
      console.log(`Status changed to: ${status}`);
      console.log('Current order state:', order);
    },
    onComplete: (order) => {
      console.log('Order completed!', order);
    },
    onError: (error) => {
      console.error('Polling error:', error);
    },
    interval: 1000, // Check every second
    timeout: 60000  // Stop polling after 1 minute
  });
} catch (error) {
  console.error('Order polling failed:', error);
}
```

### Getting Supported Chains

```typescript
import { getChains } from 'aori-ts';

try {
  const chains = await getChains();
  console.log('Supported chains:', chains);
  // Example chain info:
  // {
  //   chainKey: "ethereum",
  //   chainId: 1,
  //   eid: 1,
  //   address: "0x...",
  //   blocktime: 12
  // }
} catch (error) {
  console.error('Failed to fetch chains:', error);
}
```

## Executing an Order with a Wallet in a frontend application

This example demonstrates how to:
- Use wagmi hooks for wallet connection and signing
- Handle loading states and error messages
- Show transaction status updates to users
- Properly type and handle all API responses
- Manage component state during the swap process

```typescript
import { useAccount, useSignMessage } from 'wagmi';
import { getQuote } from 'aori-ts';
import { ethers } from 'ethers';

// React component example
function SwapComponent() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

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
        outputChain: "arbitrum"
      };

      const quote = await getQuote(quoteRequest);

      // 2. Sign the order using wagmi
      const messageToSign = ethers.getBytes('0x' + quote.signingHash.slice(2));
      const signature = await signMessageAsync({ 
        message: { raw: messageToSign } 
      });

      // 3. Submit the swap with signature
      const swapRequest = {
        orderHash: quote.orderHash,
        signature: signature
      };

      const swapResponse = await submitSwap(swapRequest);
      console.log('Swap submitted successfully:', swapResponse);

      // 4. Optional: Poll for status updates
      pollOrderStatus(swapResponse.orderHash, undefined, {
        onStatusChange: (status) => {
          console.log(`Order status: ${status}`);
        },
        onComplete: (order) => {
          console.log('Swap completed!', order);
        }
      });

    } catch (error) {
      console.error('Swap failed:', error);
    }
  };

  return (
    <button onClick={handleSwap}>
      Swap Tokens
    </button>
  );
}
```

### Full React component with loading states and error handling

```typescript
function FullSwapComponent() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleSwap = async () => {
    setLoading(true);
    setError(null);
    setStatus('Getting quote...');

    try {
      // 1. Get quote
      const quote = await getQuote({
        offerer: address,
        recipient: address,
        inputToken: "0x...",
        outputToken: "0x...",
        inputAmount: "1000000000000000000",
        inputChain: "base",
        outputChain: "arbitrum"
      });

      setStatus('Signing order...');
      
      // 2. Sign the order
      const messageToSign = ethers.getBytes('0x' + quote.signingHash.slice(2));
      const signature = await signMessageAsync({ 
        message: { raw: messageToSign } 
      });

      setStatus('Submitting swap...');

      // 3. Submit swap
      const swapResponse = await submitSwap({
        orderHash: quote.orderHash,
        signature: signature
      });

      // 4. Poll for updates
      pollOrderStatus(swapResponse.orderHash, undefined, {
        onStatusChange: (status) => {
          setStatus(`Swap status: ${status}`);
        },
        onComplete: () => {
          setStatus('Swap completed!');
          setLoading(false);
        },
        onError: (error) => {
          setError(error.message);
          setLoading(false);
        }
      });

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Swap failed');
      setLoading(false);
    }
  };

  return (
    <div>
      <button 
        onClick={handleSwap} 
        disabled={loading || !address}
      >
        {loading ? 'Processing...' : 'Swap Tokens'}
      </button>

      {status && (
        <div>Status: {status}</div>
      )}

      {error && (
        <div style={{ color: 'red' }}>
          Error: {error}
        </div>
      )}
    </div>
  );
}
```


## License

This project is released under the [MIT License](LICENSE.MD).

