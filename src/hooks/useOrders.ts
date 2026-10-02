import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Order, OrderStatus, CreateOrderInput } from '../types/database';
import { OrdersRepository } from '../db/ordersRepository';
import { PosWebSocketServer } from '../network/server';
import { KdsWebSocketClient } from '../network/client';
import { SocketMessage, InitialSyncMessage, NewOrderMessage, OrderStatusChangedMessage } from '../types/events';
import { KdsService } from '../services/kdsService';

interface UseOrdersProps {
  role: 'pos' | 'kds' | 'dashboard';
  client?: KdsWebSocketClient | null;
  server?: PosWebSocketServer | null;
}

export function useOrders({ role, client, server }: UseOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [readyNotification, setReadyNotification] = useState<Order | null>(null);

  // Carrega pedidos iniciais do SQLite local
  const loadOrders = useCallback(async () => {
    try {
      if (role === 'kds') {
        const active = await OrdersRepository.getActiveKitchenOrders();
        setOrders(KdsService.sortKdsOrders(active));
      } else {
        const all = await OrdersRepository.getAllOrders();
        setOrders(all);
      }
    } catch (e) {
      // Ignora erro
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Recarrega pedidos imediatamente do SQLite quando o usuário volta de outro app ou desbloqueia
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        loadOrders();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadOrders]);

  // Listener para eventos de WebSocket
  useEffect(() => {
    if (role === 'kds' && client) {
      const unsub = client.onMessage((msg: SocketMessage) => {
        if (msg.type === 'INITIAL_SYNC') {
          const syncPayload = (msg as InitialSyncMessage).payload;
          setOrders(KdsService.sortKdsOrders(syncPayload.orders));
        } else if (msg.type === 'NEW_ORDER') {
          const newOrder = (msg as NewOrderMessage).payload;
          setOrders((prev) => {
            const exists = prev.some((o) => o.id === newOrder.id);
            if (exists) return prev;
            return KdsService.sortKdsOrders([...prev, newOrder]);
          });
        } else if (msg.type === 'ORDER_STATUS_CHANGED') {
          const { order_id, status } = (msg as OrderStatusChangedMessage).payload;
          setOrders((prev) => {
            const updated = prev
              .map((o) => (o.id === order_id ? { ...o, status } : o))
              .filter((o) => o.status !== 'delivered'); // Remove da tela de cozinha se entregue
            return KdsService.sortKdsOrders(updated);
          });
        }
      });

      return () => {
        unsub();
      };
    }

    if (role === 'pos' && server) {
      const unsub = server.onMessage((msg: SocketMessage) => {
        if (msg.type === 'ORDER_STATUS_CHANGED') {
          const { order_id, status } = (msg as OrderStatusChangedMessage).payload;
          setOrders((prev) => {
            const found = prev.find((o) => o.id === order_id);
            if (found && status === 'ready' && found.status !== 'ready') {
              // Notificar o Caixa que o pedido está pronto
              setReadyNotification({ ...found, status: 'ready' });
            }
            return prev.map((o) => (o.id === order_id ? { ...o, status } : o));
          });
        }
      });

      return () => {
        unsub();
      };
    }
  }, [role, client, server]);

  /**
   * Caixa: Cria um novo pedido no SQLite e envia via WebSocket para a cozinha
   */
  const createOrder = useCallback(
    async (input: CreateOrderInput): Promise<Order> => {
      const newOrder = await OrdersRepository.createOrder(input);

      // Atualizar lista local
      setOrders((prev) => [newOrder, ...prev]);

      // Enviar instantaneamente via WebSocket para a cozinha
      if (server) {
        server.broadcastNewOrder(newOrder);
      }

      return newOrder;
    },
    [server]
  );

  /**
   * Atualiza o status do pedido (queued -> preparing -> ready -> delivered)
   */
  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      // Atualiza estado local imediatamente (otimista)
      setOrders((prev) => {
        const next = prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
        return role === 'kds'
          ? KdsService.sortKdsOrders(next.filter((o) => o.status !== 'delivered'))
          : next;
      });

      if (role === 'kds' && client) {
        // Envia evento para o Caixa via WebSocket
        client.updateOrderStatus(orderId, newStatus);
      } else {
        // Atualiza no banco local e faz broadcast
        await OrdersRepository.updateOrderStatus(orderId, newStatus);
        if (server) {
          server.broadcastOrderStatusChanged(orderId, newStatus);
        }
      }
    },
    [role, client, server]
  );

  /**
   * Ação rápida de entregar pedido
   */
  const deliverOrder = useCallback(
    async (orderId: string) => {
      await updateOrderStatus(orderId, 'delivered');
      if (readyNotification?.id === orderId) {
        setReadyNotification(null);
      }
    },
    [updateOrderStatus, readyNotification]
  );

  const dismissNotification = useCallback(() => {
    setReadyNotification(null);
  }, []);

  return {
    orders,
    loading,
    readyNotification,
    createOrder,
    updateOrderStatus,
    deliverOrder,
    dismissNotification,
    refreshOrders: loadOrders,
  };
}
