import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { getChain, getAddress, fetchAllChains } from '../../src/helpers';
import { ChainInfo } from '../../src/types';


describe('Chain Helper Functions', () => {
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
    },
    {
      chainKey: 'ethereum',
      chainId: 1,
      eid: 30101,
      address: '0x1111111111111111111111111111111111111111'
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

  describe('fetchAllChains', () => {
    it('should fetch and format chains correctly', async () => {

      const result = await fetchAllChains();

      expect(result).toEqual({
        base: mockChains[0],
        arbitrum: mockChains[1],
        ethereum: mockChains[2]
      });
    });

    it('should include API key in headers when provided', async () => {
      const apiKey = 'test-api-key';
      let xApiKeyHeader;

      server.use(
        http.get('https://api.aori.io/chains', (req) => {
          xApiKeyHeader = req.request.headers.get('x-api-key');
          return HttpResponse.json(mockChains)
        })
      )
      await fetchAllChains('https://api.aori.io', 'test-api-key');
      expect(xApiKeyHeader).toBe(apiKey);
    });

    it('should handle API errors gracefully', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
      await expect(fetchAllChains()).rejects.toThrow('Failed to fetch chains: Error: Network error');
      fetchSpy.mockRestore();
    });
  });

  describe('getChain', () => {
    it('should fetch chain by string identifier (chainKey)', async () => {
      const result = await getChain('base');

      expect(result).toEqual(mockChains[0]);
      expect(result.chainKey).toBe('base');
      expect(result.chainId).toBe(8453);
    });

    it('should fetch chain by number identifier (chainId)', async () => {
      const result = await getChain(42161);

      expect(result).toEqual(mockChains[1]);
      expect(result.chainKey).toBe('arbitrum');
      expect(result.chainId).toBe(42161);
    });

    it('should be case insensitive for string identifiers', async () => {
      const result = await getChain('BASE');

      expect(result).toEqual(mockChains[0]);
      expect(result.chainKey).toBe('base');
    });

    it('should throw error for non-existent chain', async () => {
      await expect(getChain('nonexistent')).rejects.toThrow(
        'Chain not found for identifier: nonexistent'
      );
    });

    it('should throw error for non-existent chainId', async () => {
      await expect(getChain(99999)).rejects.toThrow(
        'Chain not found for identifier: 99999'
      );
    });
  });

  describe('getAddress', () => {

    it('should return just the address for a given chain', async () => {
      const result = await getAddress('base');

      expect(result).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should work with chainId', async () => {
      const result = await getAddress(42161);

      expect(result).toBe('0x9876543210987654321098765432109876543210');
    });

    it('should validate returned address format', async () => {
      const result = await getAddress('ethereum');

      expect(result).toBeValidAddress();
    });
  });
}); 