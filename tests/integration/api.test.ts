import * as nock from 'nock';
import { Aori } from '../../src/core';
import { getChain, getAddress } from '../../src/helpers';
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

  beforeEach(() => {
    // Clean up any pending nocks
    nock.cleanAll();
  });

  afterAll(() => {
    nock.restore();
  });

  describe('Chain fetching', () => {
    it('should fetch chains from live API', async () => {
      // Mock the chains endpoint
      nock(AORI_API)
        .get('/chains')
        .reply(200, mockChains);

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
      nock(AORI_API)
        .get('/chains')
        .reply(500, { error: 'Internal Server Error' });

      await expect(Aori.create()).rejects.toThrow('Failed to fetch chains');
    });

    it('should include API key in requests when provided', async () => {
      const apiKey = 'test-api-key-123';

      nock(AORI_API, {
        reqheaders: {
          'x-api-key': apiKey
        }
      })
        .get('/chains')
        .reply(200, mockChains);

      const aori = await Aori.create(AORI_API, 'wss://ws.aori.io', apiKey);

      expect(aori.chains).toHaveProperty('base');
    });
  });

  describe('Standalone functions', () => {
    beforeEach(() => {
      // Mock chains endpoint for standalone functions
      nock(AORI_API)
        .get('/chains')
        .reply(200, mockChains);
    });

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
    beforeEach(() => {
      // Mock chains endpoint
      nock(AORI_API)
        .get('/chains')
        .reply(200, mockChains);
    });

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

      nock(AORI_API)
        .post('/quote')
        .reply(200, mockQuoteResponse);

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
      nock(AORI_API)
        .get('/chains')
        .reply(200, mockChains);

      nock(AORI_API)
        .post('/quote')
        .reply(400, { error: 'Invalid input amount' });

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
    beforeEach(() => {
      nock(AORI_API)
        .get('/chains')
        .reply(200, mockChains);
    });

    it('should handle rate limiting gracefully', async () => {
      // First request fails with rate limit
      nock(AORI_API)
        .post('/quote')
        .reply(429, { error: 'Rate limit exceeded' });

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