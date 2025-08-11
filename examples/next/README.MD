# Aori SDK Next.js Example

A comprehensive Next.js application showcasing all features of the Aori TypeScript SDK.

## Features

- **Modern Options API**: Uses the new `Aori.create()` options object format for cleaner configuration
- **Real-time Swaps**: Complete swap workflow with quote → sign → submit → monitor
- **Token Management**: Automatic token loading and caching
- **Order Cancellation**: Cancel order demo with real transaction execution
- **Responsive UI**: Custom CSS design system with dark/light themes
- **Wallet Integration**: WalletConnect v2 with wagmi hooks

### Configuration Details

- **TypeScript Mapping**: The `tsconfig.json` includes path mappings that point `@aori/aori-ts` to `../../src/index.ts`
- **Webpack Alias**: Next.js is configured to resolve the local SDK files during build
- **Dependencies**: The local SDK's dependencies (like `ethers`) are included directly

### Running the Example

```bash
# Install dependencies
npm install

# Copy and configure environment variables
cp env.example .env.local
# Edit .env.local with your preferred API URLs and optional API key

# Start the development server
npm run dev
```

The app will automatically use your local SDK changes - no rebuild or republish required!

### SDK Usage Example

This example demonstrates the new options object approach for creating Aori instances:

```typescript
// AoriProvider.tsx
const aoriPromise = Aori.create({
  apiBaseUrl: process.env.NEXT_PUBLIC_AORI_API_URL,
  wsBaseUrl: process.env.NEXT_PUBLIC_AORI_WS_URL,
  apiKey: process.env.NEXT_PUBLIC_AORI_API_KEY,
  loadTokens: true
})
```

**Benefits of the options object approach:**
- Self-documenting parameter names
- Only specify needed configuration
- No need for `undefined` placeholders
- Better TypeScript autocompletion

### Environment Variables

- `NEXT_PUBLIC_AORI_API_URL`: Aori API base URL (defaults to dev environment)
- `NEXT_PUBLIC_AORI_WS_URL`: Aori WebSocket URL (defaults to dev environment)
- `NEXT_PUBLIC_AORI_API_KEY`: Optional API key for enhanced features
- `NEXT_PUBLIC_PROJECT_ID`: WalletConnect project ID
