import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { ShoppingBag, Clock, Bell, CheckCircle2 } from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { Product, Order, OrderStatus } from '../types/database';
import { INITIAL_PRODUCTS, ProductsRepository } from '../db/productsRepository';
import { getDatabase } from '../db/database';
import { QuickMenuPicker } from '../components/QuickMenuPicker';
import { CartDrawer, CartItem } from '../components/CartDrawer';
import { OrderCard } from '../components/OrderCard';
import { MenuManagerModal } from '../components/MenuManagerModal';

interface PosScreenProps {
  orders: Order[];
  onCreateOrder: (customerName: string, items: { product_id: string; quantity: number; notes?: string }[]) => Promise<Order>;
  onDeliverOrder: (orderId: string) => void;
  onUpdateStatus?: (orderId: string, status: OrderStatus) => void;
  readyNotification: Order | null;
  onDismissNotification: () => void;
}

export const PosScreen: React.FC<PosScreenProps> = ({
  orders,
  onCreateOrder,
  onDeliverOrder,
  onUpdateStatus,
  readyNotification,
  onDismissNotification,
}) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'menu' | 'active_orders'>('menu');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isMenuManagerVisible, setIsMenuManagerVisible] = useState<boolean>(false);

  const loadProducts = async () => {
    try {
      const prods = await ProductsRepository.getAllProducts();
      if (prods && prods.length > 0) {
        setProducts(prods);
      }
    } catch {
      // Falha silenciosa
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleSelectProduct = (product: Product) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        const existing = next[existingIndex];
        const newQty = existing.quantity + 1;
        const newUnitNotes = [...(existing.unitNotes || [existing.notes || ''])];
        while (newUnitNotes.length < newQty) {
          newUnitNotes.push('');
        }
        next[existingIndex] = {
          ...existing,
          quantity: newQty,
          unitNotes: newUnitNotes,
        };
        return next;
      }
      return [...prev, { product, quantity: 1, notes: '', unitNotes: [''] }];
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
            if (newQty <= 0) return null;
            const unitNotes = [...(item.unitNotes || [item.notes || ''])].slice(0, newQty);
            while (unitNotes.length < newQty) {
              unitNotes.push('');
            }
            return { ...item, quantity: newQty, unitNotes };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleUpdateNotes = (productId: string, notes: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const unitNotes = [...(item.unitNotes || [''])];
          unitNotes[0] = notes;
          return { ...item, notes, unitNotes };
        }
        return item;
      })
    );
  };

  const handleUpdateUnitNote = (productId: string, unitIndex: number, note: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const unitNotes = [...(item.unitNotes || [item.notes || ''])];
          while (unitNotes.length <= unitIndex) {
            unitNotes.push('');
          }
          unitNotes[unitIndex] = note;
          return {
            ...item,
            unitNotes,
            notes: unitNotes.filter(Boolean).join(' | '),
          };
        }
        return item;
      })
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
      const itemsPayload: { product_id: string; quantity: number; notes?: string }[] = [];

      for (const item of cart) {
        if (item.quantity === 1) {
          const singleNote = (item.unitNotes?.[0] ?? item.notes ?? '').trim();
          itemsPayload.push({
            product_id: item.product.id,
            quantity: 1,
            notes: singleNote,
          });
        } else {
          // Quando tem mais de 1 unidade do mesmo produto
          const hasAnyUnitNotes = item.unitNotes && item.unitNotes.some((n) => n && n.trim().length > 0);

          if (hasAnyUnitNotes) {
            // Se tiver observações específicas por lanche (ex: lanche 1 sem picles, lanche 2 bem passado),
            // lança cada unidade separada na comanda para a cozinha ver certinho
            for (let i = 0; i < item.quantity; i++) {
              const uNote = (item.unitNotes?.[i] ?? '').trim();
              itemsPayload.push({
                product_id: item.product.id,
                quantity: 1,
                notes: uNote,
              });
            }
          } else {
            // Se nenhuma unidade tiver observação individual, agrupa
            itemsPayload.push({
              product_id: item.product.id,
              quantity: item.quantity,
              notes: (item.notes || '').trim(),
            });
          }
        }
      }

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
          <View style={styles.readyAlertIconBox}>
            <Bell size={20} color="#FFFFFF" />
          </View>

          <View style={styles.readyAlertContent}>
            <Text style={styles.readyAlertTitle}>
              Pedido #{String(readyNotification.daily_number).padStart(2, '0')} está Pronto!
            </Text>
            <Text style={styles.readyAlertSub}>
              Cliente: {readyNotification.customer_name || 'Balcão'}
            </Text>
          </View>

          <View style={styles.readyAlertActions}>
            <TouchableOpacity
              style={styles.deliverFastBtn}
              onPress={() => onDeliverOrder(readyNotification.id)}
              activeOpacity={0.85}
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
      <View style={styles.posTabsWrapper}>
        <View style={styles.posTabs}>
          <TouchableOpacity
            style={[styles.posTab, activeTab === 'menu' && styles.posTabActive]}
            onPress={() => setActiveTab('menu')}
            activeOpacity={0.8}
          >
            <ShoppingBag
              size={14}
              color={activeTab === 'menu' ? '#FFFFFF' : THEME.colors.textSecondary}
              style={styles.tabIcon}
            />
            <Text style={[styles.posTabText, activeTab === 'menu' && styles.posTabTextActive]}>
              Lançamento Rápido
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.posTab, activeTab === 'active_orders' && styles.posTabActive]}
            onPress={() => setActiveTab('active_orders')}
            activeOpacity={0.8}
          >
            <Clock
              size={14}
              color={activeTab === 'active_orders' ? '#FFFFFF' : THEME.colors.textSecondary}
              style={styles.tabIcon}
            />
            <Text style={[styles.posTabText, activeTab === 'active_orders' && styles.posTabTextActive]}>
              Em Andamento
            </Text>
            {activeOrders.length > 0 && (
              <View
                style={[
                  styles.activeCountBadge,
                  activeTab === 'active_orders' && styles.activeCountBadgeSelected,
                ]}
              >
                <Text
                  style={[
                    styles.activeCountText,
                    activeTab === 'active_orders' && styles.activeCountTextSelected,
                  ]}
                >
                  {activeOrders.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Conteúdo Principal */}
      {activeTab === 'menu' ? (
        <View style={styles.menuContainer}>
          <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
            <QuickMenuPicker
              products={products}
              onSelectProduct={handleSelectProduct}
              onOpenMenuManager={() => setIsMenuManagerVisible(true)}
            />
          </ScrollView>

          {/* Carrinho / Gaveta de Pedido */}
          <CartDrawer
            items={cart}
            customerName={customerName}
            onChangeCustomerName={setCustomerName}
            onUpdateQuantity={handleUpdateQuantity}
            onUpdateNotes={handleUpdateNotes}
            onUpdateUnitNote={handleUpdateUnitNote}
            onClearCart={handleClearCart}
            onSubmitOrder={handleSubmitOrder}
            onAddCombo={handleAddCombo}
            submitting={isSubmitting}
          />
        </View>
      ) : (
        <ScrollView style={styles.ordersScroll} contentContainerStyle={styles.ordersContent} showsVerticalScrollIndicator={false}>
          {activeOrders.length === 0 ? (
            <View style={styles.emptyOrdersBox}>
              <View style={styles.emptyIconCircle}>
                <CheckCircle2 size={32} color={THEME.colors.secondary} />
              </View>
              <Text style={styles.emptyOrdersTitle}>Nenhum pedido em andamento</Text>
              <Text style={styles.emptyOrdersText}>
                Todos os pedidos foram entregues. Novos pedidos lançados no cardápio aparecerão aqui.
              </Text>
            </View>
          ) : (
            activeOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                mode="pos"
                onUpdateStatus={onUpdateStatus}
                onDeliverOrder={onDeliverOrder}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Modal de Gerenciamento do Cardápio */}
      <MenuManagerModal
        visible={isMenuManagerVisible}
        onClose={() => setIsMenuManagerVisible(false)}
        products={products}
        onProductsUpdated={loadProducts}
      />
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
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: THEME.colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  readyAlertIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  readyAlertContent: {
    flex: 1,
  },
  readyAlertTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  readyAlertSub: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  readyAlertActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deliverFastBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.full,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  posTabsWrapper: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceBorder,
  },
  posTabs: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderSubtle,
  },
  posTab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: THEME.borderRadius.sm,
  },
  posTabActive: {
    backgroundColor: THEME.colors.primary,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 2,
  },
  tabIcon: {
    marginRight: 6,
  },
  posTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  posTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  activeCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 6,
  },
  activeCountBadgeSelected: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  activeCountText: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  activeCountTextSelected: {
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
    paddingBottom: 40,
  },
  emptyOrdersBox: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderHighlight,
  },
  emptyOrdersTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyOrdersText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});
