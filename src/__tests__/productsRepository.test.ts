import { ProductsRepository, INITIAL_PRODUCTS } from '../db/productsRepository';
import { OrdersRepository } from '../db/ordersRepository';
import { InMemoryDatabaseDriver, setCustomDatabaseDriver, initializeDatabase } from '../db/database';

describe('ProductsRepository - Menu Management & Customization', () => {
  let driver: InMemoryDatabaseDriver;

  beforeEach(async () => {
    driver = new InMemoryDatabaseDriver();
    driver.seed(INITIAL_PRODUCTS);
    setCustomDatabaseDriver(driver);
    await initializeDatabase(driver);
  });

  it('retrieves all initial products', async () => {
    const products = await ProductsRepository.getAllProducts();
    expect(products.length).toBe(INITIAL_PRODUCTS.length);
    expect(products.some((p) => p.id === 'prod-burger-1-carne')).toBe(true);
  });

  it('finds product by id', async () => {
    const product = await ProductsRepository.getProductById('prod-burger-2-carnes');
    expect(product).toBeDefined();
    expect(product?.name).toBe('Hambúrguer 2 Carnes');
    expect(product?.price).toBe(24.0);
    expect(product?.patty_count).toBe(2);
  });

  it('saves a new custom product to the menu', async () => {
    const newProduct = await ProductsRepository.saveProduct({
      name: 'Smash Supremo com Cheddar',
      price: 32.5,
      category: 'burger',
      patty_count: 3,
      description: 'Pão brioche especial, 3 blends e muito cheddar',
    });

    expect(newProduct.id).toBeDefined();
    expect(newProduct.name).toBe('Smash Supremo com Cheddar');
    expect(newProduct.price).toBe(32.5);
    expect(newProduct.patty_count).toBe(3);

    const all = await ProductsRepository.getAllProducts();
    expect(all.length).toBe(INITIAL_PRODUCTS.length + 1);
    expect(all.some((p) => p.id === newProduct.id)).toBe(true);
  });

  it('updates an existing product price and details', async () => {
    const updated = await ProductsRepository.saveProduct({
      id: 'prod-burger-1-carne',
      name: 'Hambúrguer 1 Carne (Promocional)',
      price: 15.0,
      category: 'burger',
      patty_count: 1,
      description: 'Preço especial de terça-feira',
    });

    expect(updated.id).toBe('prod-burger-1-carne');
    expect(updated.name).toBe('Hambúrguer 1 Carne (Promocional)');
    expect(updated.price).toBe(15.0);

    const fromDb = await ProductsRepository.getProductById('prod-burger-1-carne');
    expect(fromDb?.price).toBe(15.0);
    expect(fromDb?.name).toBe('Hambúrguer 1 Carne (Promocional)');
  });

  it('deletes a product from the menu', async () => {
    const success = await ProductsRepository.deleteProduct('prod-suco');
    expect(success).toBe(true);

    const fromDb = await ProductsRepository.getProductById('prod-suco');
    expect(fromDb).toBeNull();

    const all = await ProductsRepository.getAllProducts();
    expect(all.some((p) => p.id === 'prod-suco')).toBe(false);
  });

  it('resets menu back to default official products', async () => {
    // Add custom product
    await ProductsRepository.saveProduct({
      name: 'Item Temporário',
      price: 99.0,
      category: 'burger',
      patty_count: 1,
    });

    // Delete one
    await ProductsRepository.deleteProduct('prod-agua');

    // Reset
    const restored = await ProductsRepository.resetToDefault();
    expect(restored.length).toBe(INITIAL_PRODUCTS.length);

    const all = await ProductsRepository.getAllProducts();
    expect(all.length).toBe(INITIAL_PRODUCTS.length);
    expect(all.some((p) => p.id === 'prod-agua')).toBe(true);
    expect(all.some((p) => p.name === 'Item Temporário')).toBe(false);
  });

  it('creates an order correctly with a newly added custom product', async () => {
    const customBurger = await ProductsRepository.saveProduct({
      name: 'X-Tudo Artesanal',
      price: 35.0,
      category: 'burger',
      patty_count: 2,
    });

    const order = await OrdersRepository.createOrder({
      customer_name: 'Juliana',
      items: [
        { product_id: customBurger.id, quantity: 2, notes: 'Sem maionese' },
      ],
    });

    expect(order.daily_number).toBe(1);
    expect(order.total).toBe(70.0); // 35 * 2
    expect(order.items?.[0].product_name).toBe('X-Tudo Artesanal');
    expect(order.items?.[0].product_price).toBe(35.0);
    expect(order.items?.[0].patty_count).toBe(2);
  });
});
