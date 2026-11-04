import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { ShoppingBag, Minus, Plus, ChefHat, Sparkles, ChevronDown, ChevronUp } from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { Product } from '../types/database';

export interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
  unitNotes?: string[];
}

interface CartDrawerProps {
  items: CartItem[];
  customerName: string;
  onChangeCustomerName: (name: string) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onUpdateNotes: (productId: string, notes: string) => void;
  onUpdateUnitNote?: (productId: string, unitIndex: number, note: string) => void;
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
  onUpdateUnitNote,
  onClearCart,
  onSubmitOrder,
  onAddCombo,
  submitting = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
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

  // Barra compacta flutuante quando o usuário recolhe para ver o cardápio inteiro
  if (isCollapsed) {
    return (
      <View style={styles.collapsedContainer}>
        <TouchableOpacity
          style={styles.collapsedBar}
          onPress={() => setIsCollapsed(false)}
          activeOpacity={0.85}
        >
          <View style={styles.collapsedLeft}>
            <View style={styles.collapsedBadge}>
              <Text style={styles.collapsedBadgeText}>{totalItemCount}</Text>
            </View>
            <View style={styles.collapsedTextCol}>
              <Text style={styles.collapsedTitle}>Ver Pedido em Andamento</Text>
              <Text style={styles.collapsedTotal}>R$ {total.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.collapsedBtn}>
            <ChevronUp size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.collapsedBtnText}>Expandir</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barra de Acento do Topo com controle de toque para recolher */}
      <TouchableOpacity
        style={styles.topAccentArea}
        onPress={() => setIsCollapsed(true)}
        activeOpacity={0.7}
      >
        <View style={styles.topAccentBar} />
      </TouchableOpacity>

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

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setIsCollapsed(true)}
              style={styles.collapseBtn}
              activeOpacity={0.7}
            >
              <ChevronDown size={14} color={THEME.colors.textSecondary} style={{ marginRight: 2 }} />
              <Text style={styles.collapseText}>Recolher</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClearCart} style={styles.clearBtn} activeOpacity={0.7}>
              <Text style={styles.clearText}>Limpar</Text>
            </TouchableOpacity>
          </View>
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
        {items.map(({ product, quantity, notes, unitNotes }) => (
          <View key={product.id} style={styles.itemRow}>
            <View style={styles.itemTop}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>
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
                  <Minus size={14} color={THEME.colors.textPrimary} strokeWidth={3} />
                </TouchableOpacity>

                <Text style={styles.qtyValue}>{quantity}</Text>

                <TouchableOpacity
                  style={[styles.qtyBtn, styles.qtyBtnPlus]}
                  onPress={() => onUpdateQuantity(product.id, 1)}
                  activeOpacity={0.7}
                >
                  <Plus size={14} color="#FFFFFF" strokeWidth={3} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Observações / Ponto: se for 1 unidade, input simples; se > 1, inputs individuais para cada lanche */}
            {quantity > 1 ? (
              <View style={styles.unitNotesWrapper}>
                <Text style={styles.unitNotesHeading}>Observações individuais por lanche:</Text>
                {Array.from({ length: quantity }).map((_, unitIdx) => (
                  <View key={unitIdx} style={styles.unitNoteRow}>
                    <View style={styles.unitIndexBadge}>
                      <Text style={styles.unitIndexText}>#{unitIdx + 1}</Text>
                    </View>
                    <TextInput
                      style={styles.unitNoteInput}
                      placeholder={`Obs do lanche #${unitIdx + 1} (ex: sem picles, bem passado...)`}
                      placeholderTextColor={THEME.colors.textMuted}
                      value={unitNotes?.[unitIdx] ?? ''}
                      onChangeText={(text) => {
                        if (onUpdateUnitNote) {
                          onUpdateUnitNote(product.id, unitIdx, text);
                        } else {
                          onUpdateNotes(product.id, text);
                        }
                      }}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <TextInput
                style={styles.notesInput}
                placeholder="Obs: Sem picles, bem passado, maionese à parte..."
                placeholderTextColor={THEME.colors.textMuted}
                value={unitNotes?.[0] !== undefined ? unitNotes[0] : notes}
                onChangeText={(text) => {
                  if (onUpdateUnitNote) {
                    onUpdateUnitNote(product.id, 0, text);
                  } else {
                    onUpdateNotes(product.id, text);
                  }
                }}
              />
            )}
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
    maxHeight: 460,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  collapsedContainer: {
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1.5,
    borderTopColor: THEME.colors.surfaceBorderHighlight,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  collapsedBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderSubtle,
  },
  collapsedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collapsedBadge: {
    backgroundColor: THEME.colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  collapsedBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  collapsedTextCol: {
    justifyContent: 'center',
  },
  collapsedTitle: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  collapsedTotal: {
    color: THEME.colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  collapsedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.full,
  },
  collapsedBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  topAccentArea: {
    width: '100%',
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topAccentBar: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.primary,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderSubtle,
  },
  collapseText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '700',
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
    paddingVertical: 5,
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
    maxHeight: 220,
  },
  itemRow: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    marginBottom: 10,
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
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
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
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceHighlight,
  },
  qtyBtnPlus: {
    backgroundColor: THEME.colors.primary,
  },
  qtyValue: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    paddingHorizontal: 10,
  },
  notesInput: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorderSubtle,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: THEME.colors.textPrimary,
    marginTop: 8,
  },
  unitNotesWrapper: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceBorderSubtle,
  },
  unitNotesHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.grillAmber,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  unitNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  unitIndexBadge: {
    backgroundColor: 'rgba(190, 56, 39, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(190, 56, 39, 0.4)',
    width: 30,
    height: 30,
    borderRadius: 6,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitIndexText: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  unitNoteInput: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorderSubtle,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: THEME.colors.textPrimary,
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
