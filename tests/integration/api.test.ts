import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { Aori } from '../../src/core';
import { getChain, getAddress, getQuote } from '../../src/helpers';
import { AORI_API } from '../../src/constants';

describe('Aori API Integration Tests', () => {
  const mockChains = [
    {
      chainKey: 'base',
      chainId: 8453,
      eid: 30184,
      address: '0xB7E80e3FCD83cBEf76AE05aA42534a1Dc35761A7'
    },
    {
      chainKey: 'arbitrum',
      chainId: 42161,
      eid: 30110,
      address: '0xA7B93E8C3E7F23D8F9F8B2D1C0A3E5F8B4C2D1E9'
    },
    {
      chainKey: 'ethereum',
      chainId: 1,
      eid: 30101,
      address: '0x1234567890123456789012345678901234567890'
    }
  ];

  const handlers = [
    http.get('https://api.aori.io/chains', () => {
      return HttpResponse.json(mockChains)
    }),
    http.get('https://api.aori.io/domain', () => {
      return HttpResponse.json({
        domainTypeString: "EIP712Domain(string name,string version,address verifyingContract)",
        name: "Aori",
        orderTypeString: "Order(uint128 inputAmount,uint128 outputAmount,address inputToken,address outputToken,uint32 startTime,uint32 endTime,uint32 srcEid,uint32 dstEid,address offerer,address recipient)",
        version: "0.3.1"
      })
    }),
  ]
  const server = setupServer(...handlers)

  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())


  describe('Chain fetching', () => {
    it('should fetch chains from live API', async () => {

      const aori = await Aori.create();

      expect(aori.chains).toHaveProperty('base');
      expect(aori.chains).toHaveProperty('arbitrum');
      expect(aori.chains).toHaveProperty('ethereum');
      
      expect(aori.chains.base.chainId).toBe(8453);
      expect(aori.chains.arbitrum.chainId).toBe(42161);
      expect(aori.chains.ethereum.chainId).toBe(1);
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      server.use(
        http.get('https://api.aori.io/chains', () => {
          return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
        })
      )

      await expect(Aori.create()).rejects.toThrow('Failed to fetch chains');
    });

    it('should include API key in requests when provided', async () => {
      const apiKey = 'test-api-key-123';
      let xApiKeyHeader;

      server.use(
        http.get('https://api.aori.io/chains', (req) => {
          xApiKeyHeader = req.request.headers.get('x-api-key');
          return HttpResponse.json(mockChains)
        })
      )

      const aori = await Aori.create(AORI_API, 'wss://ws.aori.io', apiKey);

      expect(aori.chains).toHaveProperty('base');
      expect(xApiKeyHeader).toBe(apiKey);
    });
  });

  describe('Standalone functions', () => {
    it('should get chain info by string identifier', async () => {
      const chain = await getChain('base');

      expect(chain).toBeDefined();
      expect(chain.chainKey).toBe('base');
      expect(chain.chainId).toBe(8453);
      expect(chain.address).toBeValidAddress();
    });

    it('should get chain info by number identifier', async () => {
      const chain = await getChain(42161);

      expect(chain).toBeDefined();
      expect(chain.chainKey).toBe('arbitrum');
      expect(chain.chainId).toBe(42161);
    });

    it('should get address by chain identifier', async () => {
      const address = await getAddress('ethereum');

      expect(address).toBeValidAddress();
      expect(address).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should handle non-existent chains', async () => {
      await expect(getChain('fakenetwork')).rejects.toThrow(
        'Chain not found for identifier: fakenetwork'
      );
    });
  });

  describe('Quote functionality', () => {

    it('should request quotes successfully', async () => {
      const mockQuoteResponse = {
        orderHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        signingHash: '0x9876543210987654321098765432109876543210987654321098765432109876',
        offerer: '0x742d35Cc6635C0532925a3b8D698d2B0C44a4D5e',
        recipient: '0x742d35Cc6635C0532925a3b8D698d2B0C44a4D5e',
        inputToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        outputToken: '0xA0b86a33E6441b6c4A27A5b6B5E7A7f7c7A6E5D4',
        inputAmount: '1000000',
        outputAmount: '985000',
        inputChain: 'base',
        outputChain: 'arbitrum',
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + 3600,
        estimatedTime: 300
      };

      server.use(
        http.post('https://api.aori.io/quote', async (req) => {
          return HttpResponse.json(mockQuoteResponse)
        })
      )

      const aori = await Aori.create();

      const quoteRequest = {
        offerer: '0x742d35Cc6635C0532925a3b8D698d2B0C44a4D5e',
        recipient: '0x742d35Cc6635C0532925a3b8D698d2B0C44a4D5e',
        inputToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        outputToken: '0xA0b86a33E6441b6c4A27A5b6B5E7A7f7c7A6E5D4',
        inputAmount: '1000000',
        inputChain: 'base',
        outputChain: 'arbitrum'
      };

      const quote = await aori.getQuote(quoteRequest);

      expect(quote.orderHash).toBeValidOrderHash();
      expect(quote.signingHash).toBeValidOrderHash();
      expect(quote.inputChain).toBe('base');
      expect(quote.outputChain).toBe('arbitrum');
      expect(quote.inputAmount).toBe('1000000');
      expect(quote.outputAmount).toBe('985000');
      expect(quote.estimatedTime).toBe(300);
    });

    it('should handle quote errors', async () => {

      server.use(
        http.post('https://api.aori.io/quote', async (req) => {
          return HttpResponse.json({ error: 'Invalid input amount' }, { status: 400 })
        })
      )

      const aori = await Aori.create();

      const quoteRequest = {
        offerer: '0x742d35Cc6635C0532925a3b8D698d2B0C44a4D5e',
        recipient: '0x742d35Cc6635C0532925a3b8D698d2B0C44a4D5e',
        inputToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        outputToken: '0xA0b86a33E6441b6c4A27A5b6B5E7A7f7c7A6E5D4',
        inputAmount: '0',
        inputChain: 'base',
        outputChain: 'arbitrum'
      };

      await expect(aori.getQuote(quoteRequest)).rejects.toThrow();
    });
  });

  describe('Rate limiting and retries', () => {
    it('should handle timeout errors gracefully', async () => {
      server.use(
        http.post('https://api.aori.io/quote', async (req) => {
          await new Promise(resolve => setTimeout(resolve, 500));
          return HttpResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
        })
      )

      const quoteRequest = {
        offerer: '0x742d35Cc6635C0532925a3b8D698d2B0C44a4D5e',
        recipient: '0x742d35Cc6635C0532925a3b8D698d2B0C44a4D5e',
        inputToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        outputToken: '0xA0b86a33E6441b6c4A27A5b6B5E7A7f7c7A6E5D4',
        inputAmount: '0',
        inputChain: 'base',
        outputChain: 'arbitrum'
      };

      await expect(getQuote(quoteRequest, undefined, undefined, { signal: AbortSignal.timeout(100) }))
        .rejects.toThrow('Quote request failed: TimeoutError: The operation was aborted due to timeout')

    })

    it('should handle rate limiting gracefully', async () => {
      // First request fails with rate limit
      server.use(
        http.post('https://api.aori.io/quote', async (req) => {
          return HttpResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
        })
      )

      const aori = await Aori.create();

      const quoteRequest = {
        offerer: '0x742d35Cc6635C0532925a3b8D698d2B0C44a4D5e',
        recipient: '0x742d35Cc6635C0532925a3b8D698d2B0C44a4D5e',
        inputToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        outputToken: '0xA0b86a33E6441b6c4A27A5b6B5E7A7f7c7A6E5D4',
        inputAmount: '1000000',
        inputChain: 'base',
        outputChain: 'arbitrum'
      };

      await expect(aori.getQuote(quoteRequest)).rejects.toThrow();
    });
  });
}); 