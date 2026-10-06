import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { THEME } from '../constants/theme';
import { Product, Order } from '../types/database';
import { INITIAL_PRODUCTS } from '../db/productsRepository';
import { getDatabase } from '../db/database';
import { QuickMenuPicker } from '../components/QuickMenuPicker';
import { CartDrawer, CartItem } from '../components/CartDrawer';
import { OrderCard } from '../components/OrderCard';

interface PosScreenProps {
  orders: Order[];
  onCreateOrder: (customerName: string, items: { product_id: string; quantity: number; notes?: string }[]) => Promise<Order>;
  onDeliverOrder: (orderId: string) => void;
  readyNotification: Order | null;
  onDismissNotification: () => void;
}

export const PosScreen: React.FC<PosScreenProps> = ({
  orders,
  onCreateOrder,
  onDeliverOrder,
  readyNotification,
  onDismissNotification,
}) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'menu' | 'active_orders'>('menu');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    // Carregar produtos do SQLite
    getDatabase().then(async (db) => {
      const prods = await db.getAllAsync<Product>('SELECT * FROM products');
      if (prods && prods.length > 0) {
        setProducts(prods);
      }
    });
  }, []);

  const handleSelectProduct = (product: Product) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1,
        };
        return next;
      }
      return [...prev, { product, quantity: 1, notes: '' }];
    });
  };

  const handleAddCombo = () => {
    const comboProduct = products.find((p) => p.id === 'prod-combo-batata-bebida');
    if (comboProduct) {
      handleSelectProduct(comboProduct);
    }
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleUpdateNotes = (productId: string, notes: string) => {
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, notes } : item))
    );
  };

  const handleClearCart = () => {
    setCart([]);
    setCustomerName('');
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    try {
      const itemsPayload = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        notes: item.notes,
      }));

      const newOrder = await onCreateOrder(customerName, itemsPayload);
      handleClearCart();

      Alert.alert(
        'Pedido Criado com Sucesso!',
        `Senha #${String(newOrder.daily_number).padStart(2, '0')} enviada para a Cozinha.`
      );
    } catch (err: any) {
      Alert.alert('Erro ao criar pedido', 'Não foi possível salvar o pedido localmente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeOrders = orders.filter((o) => o.status !== 'delivered');

  return (
    <View style={styles.container}>
      {/* Alerta de Pedido Pronto para Retirada */}
      {readyNotification && (
        <View style={styles.readyAlertBanner}>
          <View style={styles.readyAlertContent}>
            <Text style={styles.readyAlertTitle}>
              🔔 Pedido #{String(readyNotification.daily_number).padStart(2, '0')} está Pronto!
            </Text>
            <Text style={styles.readyAlertSub}>
              Cliente: {readyNotification.customer_name}
            </Text>
          </View>

          <View style={styles.readyAlertActions}>
            <TouchableOpacity
              style={styles.deliverFastBtn}
              onPress={() => onDeliverOrder(readyNotification.id)}
            >
              <Text style={styles.deliverFastBtnText}>Entregar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDismissNotification} style={styles.dismissBtn}>
              <Text style={styles.dismissBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Sub Header de Navegação do Caixa: Cardápio vs Pedidos Ativos */}
      <View style={styles.posTabs}>
        <TouchableOpacity
          style={[styles.posTab, activeTab === 'menu' && styles.posTabActive]}
          onPress={() => setActiveTab('menu')}
        >
          <Text style={[styles.posTabText, activeTab === 'menu' && styles.posTabTextActive]}>
            Lançamento Rápido
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.posTab, activeTab === 'active_orders' && styles.posTabActive]}
          onPress={() => setActiveTab('active_orders')}
        >
          <Text style={[styles.posTabText, activeTab === 'active_orders' && styles.posTabTextActive]}>
            Pedidos em Andamento ({activeOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo Principal */}
      {activeTab === 'menu' ? (
        <View style={styles.menuContainer}>
          <ScrollView style={styles.pickerScroll}>
            <QuickMenuPicker products={products} onSelectProduct={handleSelectProduct} />
          </ScrollView>

          {/* Carrinho / Gaveta de Pedido */}
          <CartDrawer
            items={cart}
            customerName={customerName}
            onChangeCustomerName={setCustomerName}
            onUpdateQuantity={handleUpdateQuantity}
            onUpdateNotes={handleUpdateNotes}
            onClearCart={handleClearCart}
            onSubmitOrder={handleSubmitOrder}
            onAddCombo={handleAddCombo}
            submitting={isSubmitting}
          />
        </View>
      ) : (
        <ScrollView style={styles.ordersScroll} contentContainerStyle={styles.ordersContent}>
          {activeOrders.length === 0 ? (
            <View style={styles.emptyOrdersBox}>
              <Text style={styles.emptyOrdersText}>Nenhum pedido em andamento no momento.</Text>
            </View>
          ) : (
            activeOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                mode="pos"
                onDeliverOrder={onDeliverOrder}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  readyAlertBanner: {
    backgroundColor: THEME.colors.success,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  readyAlertContent: {
    flex: 1,
  },
  readyAlertTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  readyAlertSub: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '600',
  },
  readyAlertActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deliverFastBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
  },
  deliverFastBtnText: {
    color: THEME.colors.success,
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  dismissBtn: {
    padding: 6,
  },
  dismissBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  posTabs: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceBorder,
    gap: 8,
  },
  posTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.surfaceElevated,
  },
  posTabActive: {
    backgroundColor: THEME.colors.primary,
  },
  posTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  posTabTextActive: {
    color: '#FFFFFF',
  },
  menuContainer: {
    flex: 1,
  },
  pickerScroll: {
    flex: 1,
  },
  ordersScroll: {
    flex: 1,
  },
  ordersContent: {
    padding: THEME.spacing.lg,
  },
  emptyOrdersBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyOrdersText: {
    color: THEME.colors.textMuted,
    fontSize: 15,
  },
});
