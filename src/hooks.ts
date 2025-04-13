import { SwapRequest, SwapResponse, QuoteRequest, QuoteResponse, OrderRecord, ChainInfo, OrderStatus } from './types';
import { ethers } from 'ethers';
import {
  AORI_API,
  AORI_WS_API,
  getChainInfoByKey
} from './constants';
import { getOrderStatus } from './helpers';

////////////////////////////////////////////////////////////////*/
//                   POLL FOR ORDER STATUS
//////////////////////////////////////////////////////////////*/

export interface PollOrderStatusOptions {
  onStatusChange?: (status: OrderStatus) => void;
  onComplete?: (status: OrderStatus) => void;
  onError?: (error: Error) => void;
  interval?: number;
  timeout?: number;
}

/**
 * Polls the order status until it's completed, failed, or times out
 * @param orderHash The hash of the order to poll
 * @param baseUrl The base URL of the API
 * @param options Polling options and callbacks
 * @returns A promise that resolves with the final order status
 */
export async function pollOrderStatus(
  orderHash: string,
  baseUrl: string = AORI_API,
  options: PollOrderStatusOptions = {}
): Promise<OrderStatus> {
  const {
    onStatusChange,
    onComplete,
    onError,
    interval = 150,
    timeout = 60000
  } = options;

  let lastStatus: string | null = null;
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      try {
        // Check if we've exceeded the timeout
        if (Date.now() - startTime > timeout) {
          const error = new Error('Order status polling timed out');
          onError?.(error);
          reject(error);
          return;
        }

        // Use the new getOrderStatus function
        const status = await getOrderStatus(orderHash, baseUrl);

        // Notify if status has changed
        if (status.type !== lastStatus) {
          lastStatus = status.type;
          onStatusChange?.(status);
        }

        // Check for completed or failed status
        if (status.type === 'Completed' || status.type === 'Failed') {
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