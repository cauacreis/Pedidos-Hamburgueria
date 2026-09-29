import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
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
  submitting = false,
}) => {
  const total = items.reduce((acc, curr) => acc + curr.product.price * curr.quantity, 0);

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Toque nos itens acima para iniciar o pedido</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Cabeçalho do Carrinho */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>Pedido em Andamento</Text>
          <TouchableOpacity onPress={onClearCart}>
            <Text style={styles.clearText}>Limpar</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.nameInput}
          placeholder="Nome do Cliente (ex: Lucas, Balcão)"
          placeholderTextColor={THEME.colors.textMuted}
          value={customerName}
          onChangeText={onChangeCustomerName}
        />
      </View>

      {/* Itens do Pedido */}
      <ScrollView style={styles.itemsScroll} nestedScrollEnabled>
        {items.map(({ product, quantity, notes }) => (
          <View key={product.id} style={styles.itemRow}>
            <View style={styles.itemTop}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{product.name}</Text>
                <Text style={styles.itemPrice}>R$ {(product.price * quantity).toFixed(2)}</Text>
              </View>

              {/* Controles de Quantidade */}
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => onUpdateQuantity(product.id, -1)}
                >
                  <Text style={styles.qtyBtnText}>-</Text>
                </TouchableOpacity>

                <Text style={styles.qtyValue}>{quantity}</Text>

                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => onUpdateQuantity(product.id, 1)}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Observação / Ponto */}
            <TextInput
              style={styles.notesInput}
              placeholder="Obs: Sem picles, bem passado..."
              placeholderTextColor={THEME.colors.textMuted}
              value={notes}
              onChangeText={(text) => onUpdateNotes(product.id, text)}
            />
          </View>
        ))}
      </ScrollView>

      {/* Rodapé: Total e Botão de Envio */}
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total do Pedido</Text>
          <Text style={styles.totalValue}>R$ {total.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={onSubmitOrder}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Enviando...' : 'Enviar Pedido para Cozinha'}
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
    padding: THEME.spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  container: {
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 2,
    borderTopColor: THEME.colors.primary,
    maxHeight: 380,
    paddingTop: THEME.spacing.md,
  },
  header: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  clearText: {
    fontSize: 13,
    color: THEME.colors.danger,
    fontWeight: '600',
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
  },
  itemsScroll: {
    paddingHorizontal: THEME.spacing.lg,
    maxHeight: 180,
  },
  itemRow: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.md,
    padding: 10,
    marginBottom: 8,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.sm,
    padding: 2,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceHighlight,
    borderRadius: THEME.borderRadius.sm,
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  qtyValue: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    paddingHorizontal: 10,
  },
  notesInput: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    color: THEME.colors.textPrimary,
    marginTop: 6,
  },
  footer: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceBorder,
    backgroundColor: THEME.colors.surfaceElevated,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  submitButton: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
