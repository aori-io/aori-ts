import axios from 'axios';
import { getChain, getAddress, fetchChains } from '../../src/helpers';
import { ChainInfo } from '../../src/types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchChains', () => {
    it('should fetch and format chains correctly', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockChains });

      const result = await fetchChains();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.aori.io/chains',
        { headers: { 'Content-Type': 'application/json' } }
      );

      expect(result).toEqual({
        base: mockChains[0],
        arbitrum: mockChains[1],
        ethereum: mockChains[2]
      });
    });

    it('should include API key in headers when provided', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockChains });

      await fetchChains('https://api.aori.io', 'test-api-key');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.aori.io/chains',
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'test-api-key'
          }
        }
      );
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(fetchChains()).rejects.toThrow('Failed to fetch chains: Error: Network error');
    });
  });

  describe('getChain', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockChains });
    });

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
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockChains });
    });

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