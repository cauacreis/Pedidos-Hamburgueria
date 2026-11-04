import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  ShoppingBag,
  Minus,
  Plus,
  ChefHat,
  Sparkles,
  ChevronRight,
  X,
  Trash2,
} from 'lucide-react-native';
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
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);

  const total = items.reduce((acc, curr) => acc + curr.product.price * curr.quantity, 0);
  const totalItemCount = items.reduce((acc, curr) => acc + curr.quantity, 0);
  const hasBurger = items.some((i) => i.product.category === 'burger');
  const hasCombo = items.some((i) => i.product.category === 'combo');

  // Se o carrinho esvaziar, fecha o modal automaticamente
  useEffect(() => {
    if (items.length === 0 && isReviewOpen) {
      setIsReviewOpen(false);
    }
  }, [items.length, isReviewOpen]);

  // Se não há itens, deixa o cardápio com 100% de visão limpa
  if (items.length === 0) {
    return null;
  }

  return (
    <>
      {/* Barra Flutuante Compacta - Nunca espreme o cardápio */}
      <View style={styles.floatingContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.floatingBar}
          onPress={() => setIsReviewOpen(true)}
          activeOpacity={0.88}
        >
          <View style={styles.floatingLeft}>
            <View style={styles.floatingIconBadge}>
              <ShoppingBag size={18} color="#FFFFFF" />
              <View style={styles.floatingCountCircle}>
                <Text style={styles.floatingCountNumber}>{totalItemCount}</Text>
              </View>
            </View>

            <View style={styles.floatingInfoCol}>
              <Text style={styles.floatingInfoLabel}>
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'itens'} no pedido
              </Text>
              <Text style={styles.floatingTotalValue}>R$ {total.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.floatingActionBtn}>
            <Text style={styles.floatingActionText}>Revisar Pedido</Text>
            <ChevronRight size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Modal Dedicado de Revisão - Espaço Confortável e sem Aperto */}
      <Modal
        visible={isReviewOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsReviewOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          {/* Fundo semi-transparente para fechar ao tocar fora */}
          <TouchableOpacity
            style={styles.modalBackdropDismiss}
            onPress={() => setIsReviewOpen(false)}
            activeOpacity={1}
          />

          <View style={styles.modalSheet}>
            {/* Cabeçalho do Modal */}
            <View style={styles.sheetHeader}>
              <View style={styles.dragHandle} />

              <View style={styles.sheetHeaderRow}>
                <View style={styles.sheetTitleWithBadge}>
                  <Text style={styles.sheetTitle}>Conferir Pedido</Text>
                  <View style={styles.sheetBadge}>
                    <Text style={styles.sheetBadgeText}>
                      {totalItemCount} {totalItemCount === 1 ? 'item' : 'itens'}
                    </Text>
                  </View>
                </View>

                <View style={styles.sheetHeaderActions}>
                  <TouchableOpacity
                    style={styles.sheetClearBtn}
                    onPress={() => {
                      onClearCart();
                      setIsReviewOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={13} color={THEME.colors.danger} style={{ marginRight: 4 }} />
                    <Text style={styles.sheetClearText}>Limpar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.sheetCloseBtn}
                    onPress={() => setIsReviewOpen(false)}
                    activeOpacity={0.7}
                  >
                    <X size={20} color={THEME.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Nome do Cliente com Espaço Amplo */}
              <View style={styles.clientInputWrapper}>
                <Text style={styles.inputLabel}>NOME DO CLIENTE / MESA / BALCÃO</Text>
                <TextInput
                  style={styles.nameInput}
                  placeholder="Ex: Lucas, Balcão 02, Mesa 3..."
                  placeholderTextColor={THEME.colors.textMuted}
                  value={customerName}
                  onChangeText={onChangeCustomerName}
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Lista Rolável de Itens com Espaço Total */}
            <ScrollView
              style={styles.sheetItemsScroll}
              contentContainerStyle={styles.sheetItemsContent}
              showsVerticalScrollIndicator={false}
            >
              {items.map(({ product, quantity, notes, unitNotes }) => (
                <View key={product.id} style={styles.itemRow}>
                  <View style={styles.itemTop}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{product.name}</Text>
                      <Text style={styles.itemPrice}>
                        R$ {(product.price * quantity).toFixed(2)}
                        {quantity > 1 && (
                          <Text style={styles.unitPriceText}>
                            {' '}
                            (R$ {product.price.toFixed(2)} un)
                          </Text>
                        )}
                      </Text>
                    </View>

                    {/* Controles de Quantidade Espaçosos */}
                    <View style={styles.qtyControls}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => onUpdateQuantity(product.id, -1)}
                        activeOpacity={0.7}
                      >
                        <Minus size={15} color={THEME.colors.textPrimary} strokeWidth={3} />
                      </TouchableOpacity>

                      <Text style={styles.qtyValue}>{quantity}</Text>

                      <TouchableOpacity
                        style={[styles.qtyBtn, styles.qtyBtnPlus]}
                        onPress={() => onUpdateQuantity(product.id, 1)}
                        activeOpacity={0.7}
                      >
                        <Plus size={15} color="#FFFFFF" strokeWidth={3} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Observações Individuais por Unidade */}
                  {quantity > 1 ? (
                    <View style={styles.unitNotesWrapper}>
                      <Text style={styles.unitNotesHeading}>
                        Observações individuais por lanche:
                      </Text>
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

              {/* Banner de Upsell de Combo */}
              {onAddCombo && hasBurger && !hasCombo && (
                <TouchableOpacity
                  style={styles.comboBanner}
                  onPress={onAddCombo}
                  activeOpacity={0.85}
                >
                  <View style={styles.comboBannerLeft}>
                    <Sparkles size={16} color={THEME.colors.gold} style={styles.comboIcon} />
                    <Text style={styles.comboBannerText}>
                      Combo: Batata Média + Bebida (+R$ 6,00)?
                    </Text>
                  </View>
                  <View style={styles.comboBannerBtn}>
                    <Text style={styles.comboBannerBtnText}>+ Adicionar</Text>
                  </View>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Rodapé Fixo do Modal */}
            <View style={styles.sheetFooter}>
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
                onPress={() => {
                  onSubmitOrder();
                  setIsReviewOpen(false);
                }}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <ChefHat size={20} color="#FFFFFF" style={styles.submitIcon} />
                <Text style={styles.submitButtonText}>
                  {submitting ? 'ENVIANDO PEDIDO...' : 'ENVIAR PEDIDO PARA COZINHA'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  floatingBar: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingIconBadge: {
    backgroundColor: THEME.colors.primary,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  floatingCountCircle: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: THEME.colors.gold,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.surfaceElevated,
  },
  floatingCountNumber: {
    color: '#12100F',
    fontSize: 10,
    fontWeight: '900',
  },
  floatingInfoCol: {
    justifyContent: 'center',
  },
  floatingInfoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  floatingTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  floatingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: THEME.borderRadius.full,
  },
  floatingActionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    marginRight: 4,
  },

  /* Modal de Revisão */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  modalBackdropDismiss: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderHighlight,
    borderBottomWidth: 0,
    maxHeight: '90%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 12,
  },
  sheetHeader: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceBorder,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.surfaceBorderHighlight,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetTitleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
  },
  sheetBadge: {
    backgroundColor: 'rgba(190, 56, 39, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(190, 56, 39, 0.4)',
  },
  sheetBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  sheetHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  sheetClearText: {
    fontSize: 12,
    color: THEME.colors.danger,
    fontWeight: '700',
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderSubtle,
  },
  clientInputWrapper: {
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.secondary,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  nameInput: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    color: THEME.colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },

  /* Itens */
  sheetItemsScroll: {
    paddingHorizontal: THEME.spacing.lg,
    maxHeight: 320,
  },
  sheetItemsContent: {
    paddingTop: 14,
    paddingBottom: 16,
  },
  itemRow: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.md,
    padding: 14,
    marginBottom: 12,
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
    paddingRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 3,
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
    padding: 4,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderSubtle,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceHighlight,
  },
  qtyBtnPlus: {
    backgroundColor: THEME.colors.primary,
  },
  qtyValue: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    paddingHorizontal: 12,
  },
  notesInput: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorderSubtle,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: THEME.colors.textPrimary,
    marginTop: 10,
  },
  unitNotesWrapper: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceBorderSubtle,
  },
  unitNotesHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.grillAmber,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  unitNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  unitIndexBadge: {
    backgroundColor: 'rgba(190, 56, 39, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(190, 56, 39, 0.4)',
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitIndexText: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  unitNoteInput: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorderSubtle,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 13,
    color: THEME.colors.textPrimary,
  },
  comboBanner: {
    backgroundColor: 'rgba(229, 169, 60, 0.1)',
    borderColor: 'rgba(229, 169, 60, 0.35)',
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
    marginBottom: 10,
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
    marginRight: 8,
  },
  comboBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  comboBannerBtn: {
    backgroundColor: THEME.colors.gold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
  },
  comboBannerBtnText: {
    color: '#12100F',
    fontSize: 11,
    fontWeight: '900',
  },

  /* Rodapé Fixo */
  sheetFooter: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
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
