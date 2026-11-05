import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { ShoppingBag, Clock, Bell, CheckCircle2, Trash2 } from 'lucide-react-native';
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
  onDeleteOrder?: (orderId: string) => void;
  staleHours?: number;
  onUpdateStaleHours?: (hours: number) => void;
  onCleanStaleOrdersNow?: () => Promise<string[]>;
  readyNotification: Order | null;
  onDismissNotification: () => void;
}

export const PosScreen: React.FC<PosScreenProps> = ({
  orders,
  onCreateOrder,
  onDeliverOrder,
  onUpdateStatus,
  onDeleteOrder,
  staleHours = 2,
  onUpdateStaleHours,
  onCleanStaleOrdersNow,
  readyNotification,
  onDismissNotification,
}) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'menu' | 'active_orders'>('menu');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isMenuManagerVisible, setIsMenuManagerVisible] = useState<boolean>(false);
  const [isStaleModalVisible, setIsStaleModalVisible] = useState<boolean>(false);

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
          <ScrollView
            style={styles.pickerScroll}
            contentContainerStyle={styles.pickerScrollContent}
            showsVerticalScrollIndicator={false}
          >
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
        <View style={styles.activeOrdersWrapper}>
          <View style={styles.activeOrdersHeaderBar}>
            <View style={styles.activeOrdersHeaderLeft}>
              <Text style={styles.activeOrdersHeading}>Fila de Pedidos</Text>
              <Text style={styles.activeOrdersCountSub}>
                {activeOrders.length} {activeOrders.length === 1 ? 'pedido ativo' : 'pedidos ativos'}
              </Text>
            </View>

            {onUpdateStaleHours && (
              <TouchableOpacity
                style={styles.staleFilterBtn}
                onPress={() => setIsStaleModalVisible(true)}
                activeOpacity={0.8}
              >
                <Clock size={12} color={THEME.colors.gold} style={{ marginRight: 5 }} />
                <Text style={styles.staleFilterText}>Auto-reset: {staleHours}h</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={styles.ordersScroll}
            contentContainerStyle={styles.ordersContent}
            showsVerticalScrollIndicator={false}
          >
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
                  onDeleteOrder={onDeleteOrder}
                />
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* Modal de Gerenciamento do Cardápio */}
      <MenuManagerModal
        visible={isMenuManagerVisible}
        onClose={() => setIsMenuManagerVisible(false)}
        products={products}
        onProductsUpdated={loadProducts}
      />

      {/* Modal de Configuração de Auto-Reset de Pedidos Esquecidos */}
      <Modal
        visible={isStaleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsStaleModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.staleModalBackdrop}
          activeOpacity={1}
          onPress={() => setIsStaleModalVisible(false)}
        >
          <View style={styles.staleModalCard}>
            <View style={styles.staleModalHeader}>
              <View style={styles.staleModalIconRing}>
                <Clock size={22} color={THEME.colors.gold} />
              </View>
              <Text style={styles.staleModalTitle}>Limpeza Automática da Fila</Text>
              <Text style={styles.staleModalDesc}>
                Pedidos esquecidos na espera por mais de {staleHours} horas sem finalização são deletados automaticamente para não acumular na tela.
              </Text>
            </View>

            <Text style={styles.staleSectionLabel}>TEMPO LIMITE DE ESPERA:</Text>
            <View style={styles.staleOptionsRow}>
              {[1, 2, 3, 4, 6].map((h) => {
                const isSelected = staleHours === h;
                return (
                  <TouchableOpacity
                    key={h}
                    style={[styles.staleOptionPill, isSelected && styles.staleOptionPillActive]}
                    onPress={() => {
                      if (onUpdateStaleHours) {
                        onUpdateStaleHours(h);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.staleOptionPillText,
                        isSelected && styles.staleOptionPillTextActive,
                      ]}
                    >
                      {h}h
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {onCleanStaleOrdersNow && (
              <TouchableOpacity
                style={styles.cleanNowBtn}
                onPress={async () => {
                  const cleaned = await onCleanStaleOrdersNow();
                  Alert.alert(
                    'Limpeza Concluída',
                    cleaned.length > 0
                      ? `${cleaned.length} pedido(s) esquecido(s) foram removidos da fila.`
                      : 'Nenhum pedido com mais de ' + staleHours + 'h na fila.'
                  );
                  setIsStaleModalVisible(false);
                }}
                activeOpacity={0.85}
              >
                <Trash2 size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.cleanNowBtnText}>Limpar Pedidos Esquecidos Agora</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.closeStaleModalBtn}
              onPress={() => setIsStaleModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.closeStaleModalText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  pickerScrollContent: {
    paddingBottom: 100,
  },
  activeOrdersWrapper: {
    flex: 1,
  },
  activeOrdersHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: 12,
    paddingBottom: 6,
  },
  activeOrdersHeaderLeft: {
    justifyContent: 'center',
  },
  activeOrdersHeading: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
  },
  activeOrdersCountSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    marginTop: 1,
  },
  staleFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderHighlight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.full,
  },
  staleFilterText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.gold,
  },

  /* Modal de Auto-Reset */
  staleModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  staleModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: THEME.colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: THEME.colors.surfaceBorderHighlight,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  staleModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  staleModalIconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(229, 169, 60, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(229, 169, 60, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  staleModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  staleModalDesc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  staleSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.secondary,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  staleOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 18,
  },
  staleOptionPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staleOptionPillActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  staleOptionPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
  },
  staleOptionPillTextActive: {
    color: '#FFFFFF',
  },
  cleanNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.danger,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.md,
    marginBottom: 10,
  },
  cleanNowBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  closeStaleModalBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeStaleModalText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
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
