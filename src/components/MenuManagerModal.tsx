import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { THEME } from '../constants/theme';
import { Product, ProductCategory } from '../types/database';
import { ProductsRepository } from '../db/productsRepository';

interface MenuManagerModalProps {
  visible: boolean;
  onClose: () => void;
  products: Product[];
  onProductsUpdated: () => void;
}

const CATEGORY_OPTIONS: { key: ProductCategory; label: string }[] = [
  { key: 'burger', label: 'Hambúrguer' },
  { key: 'combo', label: 'Combo' },
  { key: 'side', label: 'Batata / Porção' },
  { key: 'drink', label: 'Bebida' },
  { key: 'dessert', label: 'Sobremesa' },
];

export const MenuManagerModal: React.FC<MenuManagerModalProps> = ({
  visible,
  onClose,
  products,
  onProductsUpdated,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<ProductCategory | 'all'>('all');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [category, setCategory] = useState<ProductCategory>('burger');
  const [pattyCount, setPattyCount] = useState<number>(1);
  const [description, setDescription] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setCategory('burger');
    setPattyCount(1);
    setDescription('');
    setIsEditing(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(product.price.toString());
    setCategory(product.category);
    setPattyCount(product.patty_count);
    setDescription(product.description || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingProduct(null);
  };

  const handleSave = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      Alert.alert('Nome obrigatório', 'Informe o nome do produto.');
      return;
    }

    const numericPrice = parseFloat(price.replace(',', '.'));
    if (isNaN(numericPrice) || numericPrice < 0) {
      Alert.alert('Preço inválido', 'Informe um preço válido maior ou igual a zero.');
      return;
    }

    setIsSaving(true);
    try {
      await ProductsRepository.saveProduct({
        id: editingProduct?.id,
        name: cleanName,
        price: numericPrice,
        category,
        patty_count: category === 'burger' ? pattyCount : 0,
        description,
      });

      setIsEditing(false);
      setEditingProduct(null);
      onProductsUpdated();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as alterações no produto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Remover Item',
      `Deseja realmente remover "${product.name}" do cardápio?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProductsRepository.deleteProduct(product.id);
              onProductsUpdated();
            } catch {
              Alert.alert('Erro', 'Não foi possível remover o produto.');
            }
          },
        },
      ]
    );
  };

  const handleResetDefaults = () => {
    Alert.alert(
      'Restaurar Cardápio Padrão',
      'Isso restaurará os 10 itens oficiais da Bodega do Vidigal com os preços originais. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProductsRepository.resetToDefault();
              onProductsUpdated();
            } catch {
              Alert.alert('Erro', 'Não foi possível restaurar o cardápio padrão.');
            }
          },
        },
      ]
    );
  };

  const filteredProducts = products.filter((p) => {
    if (selectedFilter === 'all') return true;
    return p.category === selectedFilter;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Cabeçalho do Modal */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Cardápio da Bodega</Text>
            <Text style={styles.headerSubtitle}>Personalizar itens, carnes e preços</Text>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {isEditing ? (
          /* Formulário de Criação / Edição */
          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            <Text style={styles.formTitle}>
              {editingProduct ? `Editar: ${editingProduct.name}` : 'Cadastrar Novo Item'}
            </Text>

            {/* Nome do Item */}
            <Text style={styles.label}>Nome do Item *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Hambúrguer Triplo Especial"
              placeholderTextColor={THEME.colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Preço (R$) */}
            <Text style={styles.label}>Preço (R$) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 26.00"
              placeholderTextColor={THEME.colors.textMuted}
              keyboardType="decimal-pad"
              value={price}
              onChangeText={setPrice}
            />

            {/* Categoria */}
            <Text style={styles.label}>Categoria</Text>
            <View style={styles.categoryPickerRow}>
              {CATEGORY_OPTIONS.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryPickerBtn,
                    category === cat.key && styles.categoryPickerBtnActive,
                  ]}
                  onPress={() => setCategory(cat.key)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.categoryPickerBtnText,
                      category === cat.key && styles.categoryPickerBtnTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Carnes na Chapa (Exibido para Hambúrguer) */}
            {category === 'burger' && (
              <View style={styles.pattySection}>
                <View>
                  <Text style={styles.label}>Carnes na Chapa por Unidade</Text>
                  <Text style={styles.helperText}>
                    Quantos blends este lanche soma no contador da Cozinha
                  </Text>
                </View>

                <View style={styles.pattyCounterRow}>
                  <TouchableOpacity
                    style={styles.pattyBtn}
                    onPress={() => setPattyCount((prev) => Math.max(1, prev - 1))}
                  >
                    <Text style={styles.pattyBtnText}>-</Text>
                  </TouchableOpacity>

                  <Text style={styles.pattyCountValue}>{pattyCount}</Text>

                  <TouchableOpacity
                    style={styles.pattyBtn}
                    onPress={() => setPattyCount((prev) => prev + 1)}
                  >
                    <Text style={styles.pattyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Descrição / Ingredientes */}
            <Text style={styles.label}>Descrição / Ingredientes (Opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ex: Pão brioche, 2x blends 100g, cheddar cremoso e bacon..."
              placeholderTextColor={THEME.colors.textMuted}
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />

            {/* Botões do Formulário */}
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancelEdit}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>
                  {isSaving ? 'Salvando...' : 'Salvar no Cardápio'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          /* Lista de Produtos Cadastrados */
          <View style={styles.listContainer}>
            {/* Barra de Ações: Adicionar e Restaurar */}
            <View style={styles.topActionsRow}>
              <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd} activeOpacity={0.85}>
                <Text style={styles.addBtnText}>+ Adicionar Novo Item</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resetBtn}
                onPress={handleResetDefaults}
                activeOpacity={0.8}
              >
                <Text style={styles.resetBtnText}>Restaurar Padrão</Text>
              </TouchableOpacity>
            </View>

            {/* Filtro por Categorias */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ maxHeight: 52 }}
              contentContainerStyle={styles.filterScroll}
            >
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  selectedFilter === 'all' && styles.filterPillActive,
                ]}
                onPress={() => setSelectedFilter('all')}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedFilter === 'all' && styles.filterTextActive,
                  ]}
                >
                  Todos ({products.length})
                </Text>
              </TouchableOpacity>

              {CATEGORY_OPTIONS.map((cat) => {
                const count = products.filter((p) => p.category === cat.key).length;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.filterPill,
                      selectedFilter === cat.key && styles.filterPillActive,
                    ]}
                    onPress={() => setSelectedFilter(cat.key)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        selectedFilter === cat.key && styles.filterTextActive,
                      ]}
                    >
                      {cat.label} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Lista dos Itens */}
            <ScrollView style={styles.productsScroll} contentContainerStyle={styles.productsContent}>
              {filteredProducts.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>Nenhum produto nesta categoria.</Text>
                </View>
              ) : (
                filteredProducts.map((product) => (
                  <View key={product.id} style={styles.productCard}>
                    <View style={styles.productMainInfo}>
                      <View style={styles.productTitleRow}>
                        <Text style={styles.productName}>{product.name}</Text>
                        <Text style={styles.productPrice}>R$ {product.price.toFixed(2)}</Text>
                      </View>

                      <View style={styles.badgeRow}>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>
                            {CATEGORY_OPTIONS.find((c) => c.key === product.category)?.label ||
                              product.category}
                          </Text>
                        </View>

                        {product.patty_count > 0 && (
                          <View style={styles.pattyBadge}>
                            <Text style={styles.pattyBadgeText}>
                              🥩 {product.patty_count} {product.patty_count === 1 ? 'carne' : 'carnes'}
                            </Text>
                          </View>
                        )}
                      </View>

                      {Boolean(product.description) && (
                        <Text style={styles.productDescription} numberOfLines={2}>
                          {product.description}
                        </Text>
                      )}
                    </View>

                    {/* Ações de Edição e Exclusão */}
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.cardEditBtn}
                        onPress={() => handleOpenEdit(product)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.cardEditBtnText}>Editar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.cardDeleteBtn}
                        onPress={() => handleDelete(product)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.cardDeleteBtnText}>Excluir</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
    paddingBottom: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceBorder,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: THEME.colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
  },
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.sm,
    gap: 10,
  },
  addBtn: {
    flex: 1,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  resetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    backgroundColor: THEME.colors.surfaceElevated,
  },
  resetBtnText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterScroll: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    alignSelf: 'center',
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  productsScroll: {
    flex: 1,
  },
  productsContent: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: 40,
    gap: 10,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
  },
  productCard: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productMainInfo: {
    flex: 1,
    marginRight: 12,
  },
  productTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  productName: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.secondary,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.sm,
  },
  categoryBadgeText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  pattyBadge: {
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.sm,
  },
  pattyBadgeText: {
    fontSize: 11,
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  productDescription: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'column',
    gap: 6,
  },
  cardEditBtn: {
    backgroundColor: THEME.colors.surfaceHighlight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
    alignItems: 'center',
  },
  cardEditBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  cardDeleteBtn: {
    backgroundColor: THEME.colors.dangerLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
    alignItems: 'center',
  },
  cardDeleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.danger,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: THEME.spacing.lg,
    paddingBottom: 40,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  helperText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: THEME.colors.textPrimary,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  categoryPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  categoryPickerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  categoryPickerBtnActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  categoryPickerBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  categoryPickerBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  pattySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    marginTop: 12,
  },
  pattyCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pattyBtn: {
    width: 34,
    height: 34,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pattyBtnText: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  pattyCountValue: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.primary,
    minWidth: 20,
    textAlign: 'center',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
