# Aori SDK Next.js Example

A comprehensive Next.js application showcasing all features of the Aori TypeScript SDK.

## Local Development Setup

This example app is configured to use the **local SDK source files** instead of the published npm package. This allows you to test SDK changes in real-time without needing to publish.

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

### Environment Variables

- `NEXT_PUBLIC_AORI_API_URL`: Aori API base URL (defaults to dev environment)
- `NEXT_PUBLIC_AORI_WS_URL`: Aori WebSocket URL (defaults to dev environment)
- `NEXT_PUBLIC_AORI_API_KEY`: Optional API key for enhanced features
- `NEXT_PUBLIC_PROJECT_ID`: WalletConnect project ID

### Features Demonstrated

- Cross-chain swaps
- Real-time order tracking via WebSocket
- Token selection and approval
- Order signing with wallet integration
- Complete swap lifecycle management
