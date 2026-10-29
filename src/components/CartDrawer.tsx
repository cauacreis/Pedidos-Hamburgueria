import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { ShoppingBag, Minus, Plus, ChefHat, Sparkles } from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { Product } from '../types/database';

export interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
}

interface CartDrawerProps {
  items: CartItem[];
  customerName: string;
  onChangeCustomerName: (name: string) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onUpdateNotes: (productId: string, notes: string) => void;
  onClearCart: () => void;
  onSubmitOrder: () => void;
  onAddCombo?: () => void;
  submitting?: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  items,
  customerName,
  onChangeCustomerName,
  onUpdateQuantity,
  onUpdateNotes,
  onClearCart,
  onSubmitOrder,
  onAddCombo,
  submitting = false,
}) => {
  const total = items.reduce((acc, curr) => acc + curr.product.price * curr.quantity, 0);
  const totalItemCount = items.reduce((acc, curr) => acc + curr.quantity, 0);
  const hasBurger = items.some((i) => i.product.category === 'burger');
  const hasCombo = items.some((i) => i.product.category === 'combo');

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyContent}>
          <ShoppingBag size={18} color={THEME.colors.textMuted} style={styles.emptyIcon} />
          <Text style={styles.emptyText}>Toque nos itens do cardápio para montar o pedido</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barra de Acento do Topo */}
      <View style={styles.topAccentBar} />

      {/* Cabeçalho do Carrinho */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.titleWithBadge}>
            <Text style={styles.title}>Pedido em Andamento</Text>
            <View style={styles.itemsCountBadge}>
              <Text style={styles.itemsCountText}>
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'itens'}
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={onClearCart} style={styles.clearBtn} activeOpacity={0.7}>
            <Text style={styles.clearText}>Limpar</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.nameInput}
          placeholder="Nome do Cliente (ex: Lucas, Balcão 02)"
          placeholderTextColor={THEME.colors.textMuted}
          value={customerName}
          onChangeText={onChangeCustomerName}
        />
      </View>

      {/* Itens do Pedido */}
      <ScrollView style={styles.itemsScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {items.map(({ product, quantity, notes }) => (
          <View key={product.id} style={styles.itemRow}>
            <View style={styles.itemTop}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {product.name}
                </Text>
                <Text style={styles.itemPrice}>
                  R$ {(product.price * quantity).toFixed(2)}
                  {quantity > 1 && (
                    <Text style={styles.unitPriceText}> (R$ {product.price.toFixed(2)} un)</Text>
                  )}
                </Text>
              </View>

              {/* Controles de Quantidade Circulares */}
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => onUpdateQuantity(product.id, -1)}
                  activeOpacity={0.7}
                >
                  <Minus size={13} color={THEME.colors.textPrimary} strokeWidth={3} />
                </TouchableOpacity>

                <Text style={styles.qtyValue}>{quantity}</Text>

                <TouchableOpacity
                  style={[styles.qtyBtn, styles.qtyBtnPlus]}
                  onPress={() => onUpdateQuantity(product.id, 1)}
                  activeOpacity={0.7}
                >
                  <Plus size={13} color="#FFFFFF" strokeWidth={3} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Observação / Ponto */}
            <TextInput
              style={styles.notesInput}
              placeholder="Obs: Sem picles, bem passado, maionese à parte..."
              placeholderTextColor={THEME.colors.textMuted}
              value={notes}
              onChangeText={(text) => onUpdateNotes(product.id, text)}
            />
          </View>
        ))}
      </ScrollView>

      {/* Banner de Upsell do Combo */}
      {onAddCombo && hasBurger && !hasCombo && (
        <TouchableOpacity style={styles.comboBanner} onPress={onAddCombo} activeOpacity={0.85}>
          <View style={styles.comboBannerLeft}>
            <Sparkles size={16} color={THEME.colors.gold} style={styles.comboIcon} />
            <Text style={styles.comboBannerText}>Combo: Batata Média + Bebida (+R$ 6,00)?</Text>
          </View>
          <View style={styles.comboBannerBtn}>
            <Text style={styles.comboBannerBtnText}>+ Adicionar</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Rodapé: Total e Botão de Envio */}
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>Total do Pedido</Text>
            <Text style={styles.subTotalCount}>{totalItemCount} itens no carrinho</Text>
          </View>
          <View style={styles.totalPriceContainer}>
            <Text style={styles.totalPrefix}>R$</Text>
            <Text style={styles.totalValue}>{total.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={onSubmitOrder}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <ChefHat size={18} color="#FFFFFF" style={styles.submitIcon} />
          <Text style={styles.submitButtonText}>
            {submitting ? 'ENVIANDO PEDIDO...' : 'ENVIAR PEDIDO PARA COZINHA'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceBorder,
    paddingVertical: 14,
    paddingHorizontal: THEME.spacing.lg,
  },
  emptyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderSubtle,
  },
  emptyIcon: {
    marginRight: 8,
  },
  emptyText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  container: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    borderBottomWidth: 0,
    maxHeight: 410,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  topAccentBar: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.primary,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  header: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.3,
  },
  itemsCountBadge: {
    backgroundColor: 'rgba(190, 56, 39, 0.16)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(190, 56, 39, 0.35)',
  },
  itemsCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
  },
  clearText: {
    fontSize: 12,
    color: THEME.colors.danger,
    fontWeight: '700',
  },
  nameInput: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    color: THEME.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  itemsScroll: {
    paddingHorizontal: THEME.spacing.lg,
    maxHeight: 170,
  },
  itemRow: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.md,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderSubtle,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    paddingRight: 10,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  unitPriceText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderSubtle,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceHighlight,
  },
  qtyBtnPlus: {
    backgroundColor: THEME.colors.primary,
  },
  qtyValue: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    paddingHorizontal: 9,
  },
  notesInput: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorderSubtle,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    color: THEME.colors.textPrimary,
    marginTop: 6,
  },
  comboBanner: {
    backgroundColor: 'rgba(229, 169, 60, 0.1)',
    borderColor: 'rgba(229, 169, 60, 0.35)',
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: THEME.spacing.lg,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  comboBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  comboIcon: {
    marginRight: 6,
  },
  comboBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  comboBannerBtn: {
    backgroundColor: THEME.colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.full,
  },
  comboBannerBtnText: {
    color: '#12100F',
    fontSize: 11,
    fontWeight: '900',
  },
  footer: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceBorder,
    backgroundColor: THEME.colors.surfaceElevated,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  subTotalCount: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  totalPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  totalPrefix: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginRight: 3,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
  },
  submitButton: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
