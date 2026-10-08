const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeBook,
  normalizeCartItem,
  normalizeOrderInput,
  normalizeOrderItems,
  serializeOrder,
} = require('../dist/utils/contracts.js');

test('normalizeBook returns a canonical catalog response while accepting legacy fields', () => {
  const book = normalizeBook({
    _id: '64f5d8a9b5e6d9a0f2c3d4e5',
    id: 42,
    title: 'The Book',
    author: 'Author Name',
    publisher: 'Publisher Name',
    genre: 'Fiction',
    price: 299,
    availability: 'In Stock',
    featuredMetadata: { featured: true, order: 3 },
    rating: 4.8,
    reviews: 12,
  });

  assert.equal(book._id, '64f5d8a9b5e6d9a0f2c3d4e5');
  assert.equal(book.category, 'Fiction');
  assert.equal(book.authorId, undefined);
  assert.equal(book.publisherId, undefined);
  assert.equal(book.availability, 'In Stock');
  assert.equal(book.isFeatured, true);
  assert.equal(book.featuredOrder, 3);
  assert.equal(book.rating, 4.8);
  assert.equal(book.reviews, 12);
});

test('normalizeCartItem returns a stable cart contract', () => {
  const item = normalizeCartItem({
    _id: '64f5d8a9b5e6d9a0f2c3d4e5',
    title: 'The Book',
    price: 299,
    image: 'cover.jpg',
    quantity: 2,
  });

  assert.deepEqual(item, {
    bookId: '64f5d8a9b5e6d9a0f2c3d4e5',
    quantity: 2,
    book: {
      _id: '64f5d8a9b5e6d9a0f2c3d4e5',
      id: undefined,
      title: 'The Book',
      author: '',
      category: undefined,
      genre: undefined,
      price: 299,
      image: 'cover.jpg',
      availability: 'In Stock',
      isFeatured: undefined,
      featuredOrder: undefined,
      rating: undefined,
      reviews: undefined,
      authorId: undefined,
      publisherId: undefined,
      publisher: undefined,
      description: undefined,
      stock: undefined,
    },
  });
  assert.equal(item.quantity, 2);
  assert.equal(item.book.stock, undefined);
});

test('normalizeOrderInput accepts legacy checkout fields and validates quantities', () => {
  const order = normalizeOrderInput({
    items: [{ bookId: '64f5d8a9b5e6d9a0f2c3d4e5', quantity: 2, title: 'The Book', price: 299 }],
    shippingDetails: { address: '1 Main', city: 'Bengaluru', zip: '560001', phone: '9000000000' },
    paymentMethod: 'COD',
  }, [
    { _id: '64f5d8a9b5e6d9a0f2c3d4e5', title: 'The Book', price: 299 },
  ]);

  assert.equal(order.orderItems[0].bookId, '64f5d8a9b5e6d9a0f2c3d4e5');
  assert.equal(order.orderItems[0].quantity, 2);
  assert.equal(order.shippingAddress.address, '1 Main');
  assert.equal(order.totalPrice, 598);
  assert.equal(order.paymentMethod, 'COD');
});

test('normalizeOrderItems rejects unavailable books and duplicate items atomically', () => {
  assert.throws(() => normalizeOrderItems([
    { bookId: '64f5d8a9b5e6d9a0f2c3d4e5', quantity: 1 },
    { bookId: '64f5d8a9b5e6d9a0f2c3d4e6', quantity: 1 },
  ], [
    { _id: '64f5d8a9b5e6d9a0f2c3d4e5', title: 'Available', price: 299, availability: 'In Stock' },
    { _id: '64f5d8a9b5e6d9a0f2c3d4e6', title: 'Unavailable', price: 199, availability: 'Out of Stock' },
  ]), /unavailable/i);

  assert.throws(() => normalizeOrderItems([
    { bookId: '64f5d8a9b5e6d9a0f2c3d4e5', quantity: 1 },
    { bookId: '64f5d8a9b5e6d9a0f2c3d4e5', quantity: 1 },
  ], [
    { _id: '64f5d8a9b5e6d9a0f2c3d4e5', title: 'Available', price: 299, availability: 'In Stock' },
  ]), /duplicate/i);
});

test('normalizeOrderItems returns a server-calculated total without trusting client values', () => {
  const order = normalizeOrderItems([
    { bookId: '64f5d8a9b5e6d9a0f2c3d4e5', quantity: 2, price: 1, totalPrice: 1 },
  ], [
    { _id: '64f5d8a9b5e6d9a0f2c3d4e5', title: 'The Book', price: 299, availability: 'In Stock' },
  ]);

  assert.equal(order.totalPrice, 598);
  assert.equal(order.orderItems[0].price, 299);
});

test('serializeOrder returns canonical order fields and preserves legacy payment details', () => {
  const order = serializeOrder({
    _id: '64f5d8a9b5e6d9a0f2c3d4e5',
    items: [{ bookId: 42, title: 'The Book', quantity: 1, price: 299 }],
    orderItems: [{ bookId: '64f5d8a9b5e6d9a0f2c3d4e5', title: 'The Book', quantity: 1, price: 299 }],
    shippingDetails: { address: '1 Main', city: 'Bengaluru', zip: '560001', phone: '9000000000' },
    totalAmount: 299,
    paymentId: 'pi_123',
    paymentMethod: 'Stripe',
    status: 'Paid',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  assert.equal(order._id, '64f5d8a9b5e6d9a0f2c3d4e5');
  assert.equal(order.orderItems[0].bookId, '64f5d8a9b5e6d9a0f2c3d4e5');
  assert.equal(order.shippingAddress.address, '1 Main');
  assert.equal(order.totalPrice, 299);
  assert.deepEqual(order.paymentResult, { id: 'pi_123', status: 'Paid' });
});
