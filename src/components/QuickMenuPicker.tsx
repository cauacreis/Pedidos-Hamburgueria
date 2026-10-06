import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { THEME } from '../constants/theme';
import { Product, ProductCategory } from '../types/database';

interface QuickMenuPickerProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

const CATEGORIES: { key: ProductCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'burger', label: 'Hambúrgueres' },
  { key: 'combo', label: 'Combos' },
  { key: 'side', label: 'Batatas' },
  { key: 'drink', label: 'Bebidas' },
];

export const QuickMenuPicker: React.FC<QuickMenuPickerProps> = ({ products, onSelectProduct }) => {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');

  const filteredProducts = products.filter((p) => {
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  return (
    <View style={styles.container}>
      {/* Barra de Categorias */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryPill,
              selectedCategory === cat.key && styles.categoryPillActive,
            ]}
            onPress={() => setSelectedCategory(cat.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat.key && styles.categoryTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Grid de Produtos */}
      <View style={styles.grid}>
        {filteredProducts.map((product) => (
          <TouchableOpacity
            key={product.id}
            style={styles.card}
            onPress={() => onSelectProduct(product)}
            activeOpacity={0.75}
          >
            <View style={styles.cardTop}>
              <Text style={styles.productName} numberOfLines={2}>
                {product.name}
              </Text>
              {product.patty_count > 0 && (
                <View style={styles.pattyBadge}>
                  <Text style={styles.pattyText}>
                    {product.patty_count} {product.patty_count === 1 ? 'carne' : 'carnes'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.cardBottom}>
              <Text style={styles.price}>R$ {product.price.toFixed(2)}</Text>
              <View style={styles.addBtn}>
                <Text style={styles.addBtnText}>+ Adicionar</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categoryScroll: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  categoryPillActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: THEME.spacing.md,
    gap: 10,
    justifyContent: 'space-between',
    paddingBottom: 100,
  },
  card: {
    width: '48%',
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1.5,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    justifyContent: 'space-between',
    minHeight: 115,
  },
  cardTop: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  productName: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    lineHeight: 18,
    marginBottom: 4,
  },
  pattyBadge: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.grillBorder,
  },
  pattyText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.grillAmber,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceBorder,
  },
  price: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  addBtn: {
    backgroundColor: THEME.colors.surfaceHighlight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
});
