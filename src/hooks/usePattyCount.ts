import { useMemo } from 'react';
import { Order } from '../types/database';
import { PattyCounterSummary } from '../types/kds';
import { KdsService } from '../services/kdsService';

export function usePattyCount(orders: Order[]): PattyCounterSummary {
  return useMemo(() => {
    return KdsService.calculatePattyCounter(orders);
  }, [orders]);
}
