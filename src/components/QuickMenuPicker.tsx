import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Plus } from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { Product, ProductCategory } from '../types/database';

interface QuickMenuPickerProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onOpenMenuManager?: () => void;
}

const CATEGORIES: { key: ProductCategory | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: 'Todos', icon: '🔥' },
  { key: 'burger', label: 'Hambúrgueres', icon: '🍔' },
  { key: 'combo', label: 'Combos', icon: '🍟🥤' },
  { key: 'side', label: 'Batatas', icon: '🍟' },
  { key: 'drink', label: 'Bebidas', icon: '🥤' },
  { key: 'dessert', label: 'Sobremesas', icon: '🍦' },
];

export const QuickMenuPicker: React.FC<QuickMenuPickerProps> = ({
  products,
  onSelectProduct,
  onOpenMenuManager,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');

  const filteredProducts = products.filter((p) => {
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  const getCategoryEmoji = (category: ProductCategory) => {
    switch (category) {
      case 'burger':
        return '🍔';
      case 'combo':
        return '🍟🥤';
      case 'side':
        return '🍟';
      case 'drink':
        return '🥤';
      case 'dessert':
        return '🍦';
      default:
        return '🍴';
    }
  };

  return (
    <View style={styles.container}>
      {/* Barra Superior do Cardápio */}
      <View style={styles.topHeader}>
        <View style={styles.titleWithCount}>
          <Text style={styles.menuTitle}>Cardápio</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{products.length} itens</Text>
          </View>
        </View>

        {onOpenMenuManager && (
          <TouchableOpacity
            style={styles.manageBtn}
            onPress={onOpenMenuManager}
            activeOpacity={0.8}
          >
            <Text style={styles.manageBtnText}>✏️ Editar Cardápio</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Barra Horizontal de Categorias */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.key;
          const count =
            cat.key === 'all'
              ? products.length
              : products.filter((p) => p.category === cat.key).length;

          if (cat.key !== 'all' && count === 0) return null;

          return (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryPill,
                isActive && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory(cat.key)}
              activeOpacity={0.75}
            >
              <Text style={styles.categoryEmoji}>{cat.icon}</Text>
              <Text
                style={[
                  styles.categoryText,
                  isActive && styles.categoryTextActive,
                ]}
              >
                {cat.label}
              </Text>
              <View
                style={[
                  styles.categoryCounter,
                  isActive && styles.categoryCounterActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryCounterText,
                    isActive && styles.categoryCounterTextActive,
                  ]}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Grid de Produtos */}
      <View style={styles.grid}>
        {filteredProducts.map((product) => {
          const isBurger = product.category === 'burger';
          const hasDescription = Boolean(product.description && product.description.trim());

          return (
            <TouchableOpacity
              key={product.id}
              style={[
                styles.card,
                isBurger && styles.cardBurger,
              ]}
              onPress={() => onSelectProduct(product)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={styles.categoryMiniBadge}>
                  <Text style={styles.categoryMiniEmoji}>{getCategoryEmoji(product.category)}</Text>
                </View>

                {product.patty_count > 0 && (
                  <View style={styles.pattyBadge}>
                    <Text style={styles.pattyText}>
                      🥩 {product.patty_count} {product.patty_count === 1 ? 'carne' : 'carnes'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                {hasDescription && (
                  <Text style={styles.productDesc} numberOfLines={1}>
                    {product.description}
                  </Text>
                )}
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.priceContainer}>
                  <Text style={styles.pricePrefix}>R$</Text>
                  <Text style={styles.priceValue}>{product.price.toFixed(2)}</Text>
                </View>

                <View style={styles.addBtn}>
                  <Plus size={14} color="#FFFFFF" strokeWidth={3} />
                  <Text style={styles.addBtnText}>Adicionar</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: 6,
  },
  titleWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: THEME.colors.textPrimary,
  },
  countBadge: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderSubtle,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  manageBtn: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderHighlight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
  },
  manageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.gold,
  },
  categoryScroll: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: 8,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    height: 36,
  },
  categoryPillActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  categoryEmoji: {
    fontSize: 13,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  categoryCounter: {
    marginLeft: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  categoryCounterActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  categoryCounterText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
  },
  categoryCounterTextActive: {
    color: '#FFFFFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: THEME.spacing.md,
    gap: 10,
    justifyContent: 'space-between',
    paddingBottom: 110,
    marginTop: 4,
  },
  card: {
    width: '48.5%',
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.lg,
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 128,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 2,
  },
  cardBurger: {
    borderColor: THEME.colors.surfaceBorderHighlight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryMiniBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: THEME.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderSubtle,
  },
  categoryMiniEmoji: {
    fontSize: 13,
  },
  pattyBadge: {
    backgroundColor: 'rgba(226, 88, 34, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(226, 88, 34, 0.35)',
  },
  pattyText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.grillAmber,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    lineHeight: 18,
  },
  productDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    lineHeight: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceBorderSubtle,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pricePrefix: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginRight: 2,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.3,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.full,
    gap: 3,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
