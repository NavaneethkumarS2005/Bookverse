const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const Publisher = require('../dist/models/Publisher.js').default;
const Book = require('../dist/models/Book.js').default;
const User = require('../dist/models/User.js').default;
const publisherRoutes = require('../dist/routes/publisherRoutes.js').default;
const adminPublisherRoutes = require('../dist/routes/adminPublisherRoutes.js').default;
const { allowedPayload } = require('../dist/routes/adminDiscovery.js');
const { getJwtSecret } = require('../dist/config/env.js');
const {
  applyAsPublisher,
  normalizeBookInput,
  normalizePublisherInput,
  submitPublisherBook,
  updatePublisherBook,
} = require('../dist/controllers/publisherController.js');
const { publicBookFilter } = require('../dist/utils/catalogVisibility.js');
const { normalizeVisibleCartItems } = require('../dist/controllers/cartController.js');
const { queryDiscovery } = require('../dist/routes/ai.js');

const validPublisher = {
  name: 'North Star Press',
  contactEmail: 'CONTACT@NORTHSTAR.EXAMPLE',
  contactPhone: '+91 90000 00000',
  description: 'Independent publisher',
  website: 'https://northstar.example',
};

const validBook = {
  title: 'A Verified Story',
  author: 'A. Writer',
  genre: 'Fiction',
  price: 299,
  isbn: '978-1-23456-789-7',
  image: 'https://images.example/cover.jpg',
};

const response = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const withModelMethods = async (model, overrides, callback) => {
  const previous = Object.fromEntries(Object.keys(overrides).map(key => [key, model[key]]));
  Object.assign(model, overrides);
  try {
    return await callback();
  } finally {
    Object.assign(model, previous);
  }
};

const withServer = async (app, callback) => {
  const server = app.listen(0);
  const address = server.address();
  try {
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
};

test('publisher input normalizes contact email and rejects invalid required fields and URLs', () => {
  const normalized = normalizePublisherInput(validPublisher);
  assert.equal(normalized.value.contactEmail, 'contact@northstar.example');
  assert.equal(normalizePublisherInput({ ...validPublisher, name: 'x' }).error !== undefined, true);
  assert.equal(normalizePublisherInput({ ...validPublisher, contactEmail: 'not-an-email' }).error, 'Enter a valid contact email.');
  assert.equal(normalizePublisherInput({ ...validPublisher, website: 'javascript:alert(1)' }).error, 'Website must be a valid HTTP or HTTPS URL.');
});

test('book input validates ISBN, URL and bounded price', () => {
  assert.equal(normalizeBookInput(validBook).value.isbn, '9781234567897');
  assert.match(normalizeBookInput({ ...validBook, isbn: 'bad-isbn' }).error, /ISBN/);
  assert.match(normalizeBookInput({ ...validBook, image: 'javascript:alert(1)' }).error, /cover/);
  assert.match(normalizeBookInput({ ...validBook, price: -1 }).error, /price/);
  assert.match(normalizeBookInput({ ...validBook, price: '' }).error, /required/);
});

test('valid publisher application persists a pending record owned by the authenticated user', async () => {
  let created;
  const res = response();
  await withModelMethods(Publisher, {
    findOne: async () => null,
    exists: async () => null,
    create: async value => { created = value; return { _id: 'publisher-id', ...value }; },
  }, async () => applyAsPublisher({ user: { id: 'user-id' }, body: validPublisher }, res));

  assert.equal(res.statusCode, 201);
  assert.equal(created.ownerId, 'user-id');
  assert.equal(created.applicationStatus, 'pending');
  assert.equal(created.isActive, false);
  assert.equal(created.contactEmail, 'contact@northstar.example');
  assert.equal(created.role, undefined);
});

test('duplicate publisher application is rejected without creating a second record', async () => {
  let createCalled = false;
  const res = response();
  await withModelMethods(Publisher, {
    findOne: async () => null,
    exists: async () => ({ _id: 'existing-id' }),
    create: async () => { createCalled = true; },
  }, async () => applyAsPublisher({ user: { id: 'user-id' }, body: validPublisher }, res));

  assert.equal(res.statusCode, 409);
  assert.equal(createCalled, false);
});

test('invalid publisher application is rejected before database writes', async () => {
  let databaseCalled = false;
  const res = response();
  await withModelMethods(Publisher, { create: async () => { databaseCalled = true; } }, async () => {
    await applyAsPublisher({ user: { id: 'user-id' }, body: { ...validPublisher, contactEmail: 'invalid' } }, res);
  });
  assert.equal(res.statusCode, 400);
  assert.equal(databaseCalled, false);
});

test('approved publisher book submission is owner-linked and remains pending with no stock', async () => {
  let created;
  const publisher = { _id: 'publisher-id', ownerId: 'user-id', name: 'North Star Press', applicationStatus: 'approved', isActive: true };
  const res = response();
  await withModelMethods(Publisher, { findOne: async () => publisher }, async () => {
    await withModelMethods(Book, { create: async value => { created = value; return { _id: 'book-id', ...value }; } }, async () => {
      await submitPublisherBook({ user: { id: 'user-id' }, body: { ...validBook, publisherId: 'someone-else', stock: 999, publicationStatus: 'approved' } }, res);
    });
  });
  assert.equal(res.statusCode, 201);
  assert.equal(created.publisherId, 'publisher-id');
  assert.equal(created.publisherOwnerId, 'user-id');
  assert.equal(created.publicationStatus, 'pending');
  assert.equal(created.stock, 0);
  assert.equal(created.availability, 'Out of Stock');
});

test('pending publisher cannot submit a book', async () => {
  let createCalled = false;
  const res = response();
  await withModelMethods(Publisher, { findOne: async () => ({ applicationStatus: 'pending', isActive: false }) }, async () => {
    await withModelMethods(Book, { create: async () => { createCalled = true; } }, async () => {
      await submitPublisherBook({ user: { id: 'user-id' }, body: validBook }, res);
    });
  });
  assert.equal(res.statusCode, 403);
  assert.equal(createCalled, false);
});

test('rejected publisher cannot submit a book', async () => {
  const res = response();
  await withModelMethods(Publisher, { findOne: async () => ({ applicationStatus: 'rejected', isActive: false }) }, async () => {
    await submitPublisherBook({ user: { id: 'user-id' }, body: validBook }, res);
  });
  assert.equal(res.statusCode, 403);
});

test('duplicate ISBN errors return a conflict response', async () => {
  const publisher = { _id: 'publisher-id', ownerId: 'user-id', name: 'North Star Press', applicationStatus: 'approved', isActive: true };
  const res = response();
  await withModelMethods(Publisher, { findOne: async () => publisher }, async () => {
    await withModelMethods(Book, { create: async () => { throw Object.assign(new Error('duplicate key'), { code: 11000 }); } }, async () => {
      await submitPublisherBook({ user: { id: 'user-id' }, body: validBook }, res);
    });
  });
  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /ISBN/);
});

test('publisher cannot edit another publisher book', async () => {
  const res = response();
  await withModelMethods(Publisher, {
    findOne: async () => ({ _id: 'publisher-id', applicationStatus: 'approved', isActive: true }),
  }, async () => withModelMethods(Book, { findOne: async () => null }, async () => {
    await updatePublisherBook({ user: { id: 'user-id' }, params: { bookId: '64f000000000000000000001' }, body: validBook }, res);
  }));
  assert.equal(res.statusCode, 404);
});

test('public book filter excludes submissions and books owned by inactive publishers', async () => {
  const originalFind = Publisher.find;
  Publisher.find = () => ({ select: () => ({ lean: async () => [{ _id: 'approved-id' }] }) });
  try {
    const filter = await publicBookFilter({ genre: 'Fiction' });
    assert.deepEqual(filter.$and[0], { genre: 'Fiction' });
    assert.deepEqual(filter.$and[1].$or[0], { publicationStatus: 'approved' });
    assert.deepEqual(filter.$and[2].$or[2], { publisherId: { $in: ['approved-id'] } });
  } finally {
    Publisher.find = originalFind;
  }
});

test('cart responses omit books hidden by publisher publication visibility', async () => {
  const originalBookFind = Book.find;
  const originalPublisherFind = Publisher.find;
  Book.find = () => ({ select: () => ({ lean: async () => [{ _id: 'visible-book' }] }) });
  Publisher.find = () => ({ select: () => ({ lean: async () => [{ _id: 'active-publisher' }] }) });
  try {
    const cart = await normalizeVisibleCartItems([
      { bookId: { _id: 'visible-book', title: 'Visible', author: 'Writer', price: 20, genre: 'Fiction' }, quantity: 1 },
      { bookId: { _id: 'hidden-book', title: 'Hidden', author: 'Writer', price: 20, genre: 'Fiction' }, quantity: 2 },
      { bookId: null, quantity: 1 },
    ]);
    assert.equal(cart.length, 1);
    assert.equal(cart[0].bookId, 'visible-book');
  } finally {
    Book.find = originalBookFind;
    Publisher.find = originalPublisherFind;
  }
});

test('publisher private endpoints reject unauthenticated requests', async () => {
  const app = express();
  app.use(cookieParser());
  app.use('/api/publishers', publisherRoutes);
  await withServer(app, async baseUrl => {
    const response = await fetch(`${baseUrl}/api/publishers/me`);
    assert.equal(response.status, 401);
  });
});

test('ordinary user cannot access admin publisher management endpoints', async () => {
  const originalFindById = User.findById;
  User.findById = async () => ({ role: 'user' });
  const app = express();
  app.use(cookieParser());
  app.use('/api/admin/publishers', adminPublisherRoutes);
  const token = jwt.sign({ id: 'user-id', email: 'user@example.com', name: 'User' }, getJwtSecret());
  try {
    await withServer(app, async baseUrl => {
      const response = await fetch(`${baseUrl}/api/admin/publishers`, { headers: { Cookie: `token=${token}` } });
      assert.equal(response.status, 403);
    });
  } finally {
    User.findById = originalFindById;
  }
});

test('generic admin discovery publisher payload strips ownership and lifecycle fields', () => {
  const payload = allowedPayload('publishers', {
    name: 'North Star Press',
    ownerId: 'attacker-selected-user',
    applicationStatus: 'approved',
    isActive: true,
    reviewedBy: 'attacker-selected-admin',
    reviewedAt: new Date(),
    rejectionReason: 'forged',
    isVerified: true,
  });
  assert.deepEqual(payload, { name: 'North Star Press' });
});

test('AI publisher discovery applies the public publisher filter and projection', async () => {
  const originalFind = Publisher.find;
  let capturedQuery;
  let capturedProjection;
  Publisher.find = query => {
    capturedQuery = query;
    return { select(projection) { capturedProjection = projection; return { limit: async () => [] }; } };
  };
  try {
    await queryDiscovery('publishers', 'North Star Press');
    assert.deepEqual(capturedQuery.$and[1], { applicationStatus: { $in: ['approved', null] }, isActive: { $ne: false } });
    assert.doesNotMatch(capturedProjection, /contactEmail|ownerId|rejectionReason/);
  } finally {
    Publisher.find = originalFind;
  }
});

test('AI book discovery applies publication and active-publisher visibility', async () => {
  const originalBookFind = Book.find;
  const originalPublisherFind = Publisher.find;
  let capturedQuery;
  Book.find = query => {
    capturedQuery = query;
    return { select() { return { limit: async () => [] }; } };
  };
  Publisher.find = () => ({ select: () => ({ lean: async () => [{ _id: 'approved-publisher' }] }) });
  try {
    await queryDiscovery('books', 'fiction');
    assert.deepEqual(capturedQuery.$and[1].$or[0], { publicationStatus: 'approved' });
    assert.deepEqual(capturedQuery.$and[2].$or[2], { publisherId: { $in: ['approved-publisher'] } });
  } finally {
    Book.find = originalBookFind;
    Publisher.find = originalPublisherFind;
  }
});