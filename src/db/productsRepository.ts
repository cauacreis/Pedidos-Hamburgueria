import { Product, ProductCategory } from '../types/database';
import { getDatabase } from './database';

export const INITIAL_PRODUCTS: Product[] = [
  // --- Hambúrgueres ---
  {
    id: 'prod-burger-1-carne',
    name: 'Hambúrguer 1 Carne',
    price: 18.0,
    patty_count: 1,
    category: 'burger',
    description: 'Pão brioche e 1x blend de carne smash',
  },
  {
    id: 'prod-burger-2-carnes',
    name: 'Hambúrguer 2 Carnes',
    price: 24.0,
    patty_count: 2,
    category: 'burger',
    description: 'Pão brioche e 2x blends de carne smash',
  },
  {
    id: 'prod-burger-1-carne-bacon',
    name: '1 Carne e Bacon',
    price: 21.0,
    patty_count: 1,
    category: 'burger',
    description: 'Pão brioche, 1x blend de carne smash e bacon crocante',
  },
  {
    id: 'prod-burger-2-carnes-bacon',
    name: '2 Carnes e Bacon',
    price: 27.0,
    patty_count: 2,
    category: 'burger',
    description: 'Pão brioche, 2x blends de carne smash e bacon crocante',
  },

  // --- Combos ---
  {
    id: 'prod-combo-batata-bebida',
    name: 'Combo (Batata Média + Bebida)',
    price: 6.0,
    patty_count: 0,
    category: 'combo',
    description: 'Adicional de batata média + bebida para o hambúrguer (+R$ 6,00)',
  },

  // --- Batatas / Acompanhamentos ---
  {
    id: 'prod-batata-grande',
    name: 'Batata Grande',
    price: 7.0,
    patty_count: 0,
    category: 'side',
    description: 'Porção grande de batata frita crocante',
  },
  {
    id: 'prod-batata-pequena',
    name: 'Batata Pequena',
    price: 5.0,
    patty_count: 0,
    category: 'side',
    description: 'Porção pequena de batata frita crocante',
  },

  // --- Bebidas ---
  {
    id: 'prod-agua',
    name: 'Água (com ou sem gás)',
    price: 3.5,
    patty_count: 0,
    category: 'drink',
    description: 'Água mineral 500ml com ou sem gás',
  },
  {
    id: 'prod-refrigerante',
    name: 'Refrigerante',
    price: 5.0,
    patty_count: 0,
    category: 'drink',
    description: 'Refrigerante em lata bem gelado',
  },
  {
    id: 'prod-suco',
    name: 'Suco',
    price: 5.0,
    patty_count: 0,
    category: 'drink',
    description: 'Suco natural ou em lata bem gelado',
  },
];

export class ProductsRepository {
  /**
   * Retorna todos os produtos cadastrados no SQLite local
   */
  static async getAllProducts(): Promise<Product[]> {
    const db = await getDatabase();
    const products = await db.getAllAsync<Product>(
      'SELECT * FROM products ORDER BY category ASC, price ASC'
    );
    return products || [];
  }

  /**
   * Busca um produto pelo ID
   */
  static async getProductById(id: string): Promise<Product | null> {
    const db = await getDatabase();
    return db.getFirstAsync<Product>(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );
  }

  /**
   * Salva ou atualiza um produto no SQLite
   */
  static async saveProduct(product: {
    id?: string;
    name: string;
    price: number;
    patty_count: number;
    category: ProductCategory;
    description?: string;
  }): Promise<Product> {
    const db = await getDatabase();
    const id = product.id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fullProduct: Product = {
      id,
      name: product.name.trim(),
      price: Math.max(0, Number(product.price) || 0),
      patty_count: Math.max(0, Math.floor(Number(product.patty_count) || 0)),
      category: product.category,
      description: product.description?.trim() || '',
    };

    await db.runAsync(
      `INSERT OR REPLACE INTO products (id, name, price, patty_count, category, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        fullProduct.id,
        fullProduct.name,
        fullProduct.price,
        fullProduct.patty_count,
        fullProduct.category,
        fullProduct.description || '',
      ]
    );

    return fullProduct;
  }

  /**
   * Remove um produto do SQLite
   */
  static async deleteProduct(id: string): Promise<boolean> {
    const db = await getDatabase();
    const res = await db.runAsync('DELETE FROM products WHERE id = ?', [id]);
    return res.changes > 0;
  }

  /**
   * Restaura o cardápio oficial padrão da Bodega do Vidigal
   */
  static async resetToDefault(): Promise<Product[]> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM products');
    for (const product of INITIAL_PRODUCTS) {
      await db.runAsync(
        `INSERT OR REPLACE INTO products (id, name, price, patty_count, category, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          product.id,
          product.name,
          product.price,
          product.patty_count,
          product.category,
          product.description || '',
        ]
      );
    }
    return INITIAL_PRODUCTS;
  }
}

