import { Product } from '../types/database';

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
