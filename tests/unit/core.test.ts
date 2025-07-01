import { http, HttpResponse, ws } from 'msw'
import { setupServer } from 'msw/node'
import { Aori } from '../../src/core';
import { ChainInfo } from '../../src/types';


describe('Aori Class', () => {
  const mockChains: ChainInfo[] = [
    {
      chainKey: 'base',
      chainId: 8453,
      eid: 30184,
      address: '0x1234567890123456789012345678901234567890'
    },
    {
      chainKey: 'arbitrum',
      chainId: 42161,
      eid: 30110,
      address: '0x9876543210987654321098765432109876543210'
    }
  ];

  const handlers = [
    http.get('https://api.aori.io/chains', () => {
      return HttpResponse.json(mockChains)
    }),
  ]
  const server = setupServer(...handlers)

  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  describe('Aori.create', () => {
    it('should create Aori instance and fetch chains', async () => {
      const aori = await Aori.create();

      expect(aori.chains).toEqual({
        base: mockChains[0],
        arbitrum: mockChains[1]
      });
    });

    it('should create Aori instance with custom configuration', async () => {
      const customBaseUrl = 'https://custom-api.example.com';
      const customWsUrl = 'https://custom-ws.example.com';
      const apiKey = 'test-api-key';

      server.use(
        http.get('https://custom-api.example.com/chains', () => {
          return HttpResponse.json(mockChains)
        })
      )

      const aori = await Aori.create(customBaseUrl, customWsUrl, apiKey);
      expect(aori.apiBaseUrl).toBe(customBaseUrl);
      expect(aori.wsBaseUrl).toBe('wss://custom-ws.example.com');
    });
  });

  describe('getChain', () => {
    let aori: Aori;

    beforeEach(async () => {
      aori = await Aori.create();
    });

    it('should get chain by chainKey string', () => {
      const result = aori.getChain('base');

      expect(result).toEqual(mockChains[0]);
    });

    it('should get chain by chainId number', () => {
      const result = aori.getChain(42161);

      expect(result).toEqual(mockChains[1]);
    });

    it('should be case insensitive for string identifiers', () => {
      const result = aori.getChain('BASE');

      expect(result).toEqual(mockChains[0]);
    });

    it('should return undefined for non-existent chain', () => {
      const result = aori.getChain('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('getChainInfoByEid', () => {
    let aori: Aori;

    beforeEach(async () => {
      aori = await Aori.create();
    });

    it('should get chain by EID', () => {
      const result = aori.getChainInfoByEid(30184);

      expect(result).toEqual(mockChains[0]);
    });

    it('should return undefined for non-existent EID', () => {
      const result = aori.getChainInfoByEid(99999);

      expect(result).toBeUndefined();
    });
  });

  describe('getQuote', () => {
    let aori: Aori;

    beforeEach(async () => {
      aori = await Aori.create();
    });

    it('should make quote request with correct parameters', async () => {
      const mockQuoteResponse = {
        orderHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        signingHash: '0x9876543210987654321098765432109876543210987654321098765432109876',
        offerer: '0x123',
        recipient: '0x456',
        inputToken: '0x789',
        outputToken: '0xabc',
        inputAmount: '1000000',
        outputAmount: '950000',
        inputChain: 'base',
        outputChain: 'arbitrum',
        startTime: 1234567890,
        endTime: 1234567990,
        estimatedTime: 60
      };

      let body;
      server.use(
        http.post('https://api.aori.io/quote', async (req) => {
          body = await req.request.json();
          return HttpResponse.json(mockQuoteResponse)
        })
      )

      const quoteRequest = {
        offerer: '0x123',
        recipient: '0x456',
        inputToken: '0x789',
        outputToken: '0xabc',
        inputAmount: '1000000',
        inputChain: 'base',
        outputChain: 'arbitrum'
      };

      const result = await aori.getQuote(quoteRequest);

      expect(body).toMatchObject(quoteRequest);

      expect(result).toEqual(mockQuoteResponse);
      expect(result.orderHash).toBeValidOrderHash();
    });
  });

  describe('WebSocket functionality', () => {
    let aori: Aori;

    beforeEach(async () => {
      aori = await Aori.create();
      // Mock WebSocket global for tests
      global.WebSocket = jest.fn().mockImplementation(() => ({
        readyState: 1, // WebSocket.OPEN
        close: jest.fn(),
        send: jest.fn()
      })) as any;
      // Define WebSocket constants
      (global.WebSocket as any).OPEN = 1;
      (global.WebSocket as any).CLOSED = 3;
    });

    afterEach(() => {
      // Clean up global mock
      delete (global as any).WebSocket;
    });

    it('should check connection status correctly', () => {
      // Initially not connected (no WebSocket instance)
      expect(aori.isConnected()).toBe(false);
    });
  });
}); 