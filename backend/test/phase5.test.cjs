const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateOrderStock,
  stockChangeForOrder,
} = require('../dist/utils/inventory.js');

test('valid quantity within stock succeeds', () => {
  const result = validateOrderStock([
    { bookId: '64f5d8a9b5e6d9a0f2c3d4e5', quantity: 2 },
  ], [
    { _id: '64f5d8a9b5e6d9a0f2c3d4e5', title: 'Book A', price: 299, stock: 5 },
  ]);

  assert.deepEqual(result, [{ bookId: '64f5d8a9b5e6d9a0f2c3d4e5', quantity: 2, title: 'Book A', price: 299 }]);
});

test('quantity greater than stock fails', () => {
  assert.throws(() => validateOrderStock([
    { bookId: '64f5d8a9b5e6d9a0f2c3d4e5', quantity: 6 },
  ], [
    { _id: '64f5d8a9b5e6d9a0f2c3d4e5', title: 'Book A', price: 299, stock: 5 },
  ]), /unavailable|stock/i);
});

test('zero quantity fails', () => {
  assert.throws(() => validateOrderStock([
    { bookId: '64f5d8a9b5e6d9a0f2c3d4e5', quantity: 0 },
  ], [
    { _id: '64f5d8a9b5e6d9a0f2c3d4e5', title: 'Book A', price: 299, stock: 5 },
  ]), /positive integer|quantity/i);
});

test('decimal quantity fails', () => {
  assert.throws(() => validateOrderStock([
    { bookId: '64f5d8a9b5e6d9a0f2c3d4e5', quantity: 1.5 },
  ], [
    { _id: '64f5d8a9b5e6d9a0f2c3d4e5', title: 'Book A', price: 299, stock: 5 },
  ]), /positive integer|quantity/i);
});

test('unavailable book fails', () => {
  assert.throws(() => validateOrderStock([
    { bookId: '64f5d8a9b5e6d9a0f2c3d4e6', quantity: 1 },
  ], [
    { _id: '64f5d8a9b5e6d9a0f2c3d4e5', title: 'Book A', price: 299, stock: 5 },
  ]), /unavailable|missing/i);
});

test('entire order fails when one line item is invalid', () => {
  assert.throws(() => validateOrderStock([
    { bookId: '64f5d8a9b5e6d9a0f2c3d4e5', quantity: 2 },
    { bookId: '64f5d8a9b5e6d9a0f2c3d4e6', quantity: 99 },
  ], [
    { _id: '64f5d8a9b5e6d9a0f2c3d4e5', title: 'Book A', price: 299, stock: 5 },
    { _id: '64f5d8a9b5e6d9a0f2c3d4e6', title: 'Book B', price: 199, stock: 2 },
  ]), /unavailable|stock/i);
});

test('stock change keeps requested quantity when the request is valid', () => {
  const delta = stockChangeForOrder([
    { bookId: '64f5d8a9b5e6d9a0f2c3d4e5', quantity: 2 },
  ]);

  assert.deepEqual(delta, { '64f5d8a9b5e6d9a0f2c3d4e5': 2 });
});
