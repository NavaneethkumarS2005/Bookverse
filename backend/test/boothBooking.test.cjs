const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const Booth = require('../dist/models/Booth.js').default;
const BoothBooking = require('../dist/models/BoothBooking.js').default;
const BookFair = require('../dist/models/BookFair.js').default;
const Publisher = require('../dist/models/Publisher.js').default;
const User = require('../dist/models/User.js').default;
const bookingRoutes = require('../dist/routes/boothBookingRoutes.js').default;
const adminBookingRoutes = require('../dist/routes/adminBoothBookingRoutes.js').default;
const { getJwtSecret } = require('../dist/config/env.js');
const {
  cancelMyBoothBooking,
  requestBoothBooking,
  reviewBoothBooking,
} = require('../dist/controllers/boothBookingController.js');

const ids = {
  user: '64f000000000000000000001',
  otherUser: '64f000000000000000000002',
  publisher: '64f000000000000000000003',
  booth: '64f000000000000000000004',
  fair: '64f000000000000000000005',
  booking: '64f000000000000000000006',
  admin: '64f000000000000000000007',
};

const response = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const withModelMethods = async (model, overrides, callback) => {
  const originals = Object.fromEntries(Object.keys(overrides).map(key => [key, model[key]]));
  Object.assign(model, overrides);
  try { return await callback(); }
  finally { Object.assign(model, originals); }
};

const publisherQuery = publisher => ({ select: async () => publisher });
const boothQuery = booth => ({ select: async () => booth });
const fairQuery = fair => ({ select: async () => fair });

const approvedPublisher = { _id: ids.publisher, applicationStatus: 'approved', isActive: true };
const availableBooth = { _id: ids.booth, fairId: ids.fair, price: 12500, status: 'AVAILABLE', isBooked: false };
const upcomingFair = { _id: ids.fair };
const booking = {
  _id: ids.booking,
  boothId: ids.booth,
  fairId: ids.fair,
  publisherId: ids.publisher,
  bookingReference: 'EXPO_TEST_REFERENCE',
  quotedPrice: 12500,
  status: 'pending',
  isActive: true,
  paymentStatus: 'not_integrated',
};

const validRequest = { user: { id: ids.user }, body: { boothId: ids.booth, publisherId: ids.otherUser, status: 'approved', paymentStatus: 'paid', price: 1 } };

const withRequestModels = (overrides, callback) => withModelMethods(Publisher, {
  findOne: () => publisherQuery(approvedPublisher),
  ...overrides.publisher,
}, async () => withModelMethods(Booth, {
  findById: () => boothQuery(availableBooth),
  findOneAndUpdate: async () => ({ ...availableBooth, status: 'RESERVED', bookingReference: 'EXPO_TEST_REFERENCE' }),
  updateOne: async () => ({ modifiedCount: 1 }),
  ...overrides.booth,
}, async () => withModelMethods(BookFair, {
  findOne: () => fairQuery(upcomingFair),
  ...overrides.fair,
}, async () => withModelMethods(BoothBooking, {
  create: async value => ({ _id: ids.booking, ...value }),
  ...overrides.booking,
}, callback))));

const withServer = async (app, callback) => {
  const server = app.listen(0);
  const address = server.address();
  try { await callback(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
};

test('eligible publisher request uses database price and ignores client ownership/status/payment fields', async () => {
  const res = response();
  let created;
  await withRequestModels({ booking: { create: async value => { created = value; return { _id: ids.booking, ...value }; } } }, async () => {
    await requestBoothBooking(validRequest, res);
  });
  assert.equal(res.statusCode, 201);
  assert.equal(created.publisherId, ids.publisher);
  assert.equal(created.fairId, ids.fair);
  assert.equal(created.boothId, ids.booth);
  assert.equal(created.quotedPrice, 12500);
  assert.equal(created.status, 'pending');
  assert.equal(created.paymentStatus, 'not_integrated');
});

test('pending and inactive publishers cannot request stalls', async () => {
  for (const publisher of [null, { ...approvedPublisher, applicationStatus: 'pending' }, { ...approvedPublisher, isActive: false }]) {
    const res = response();
    await withRequestModels({ publisher: { findOne: () => publisherQuery(publisher) } }, async () => requestBoothBooking(validRequest, res));
    assert.equal(res.statusCode, 403);
  }
});

test('stall requests require a configured price and eligible real fair', async () => {
  const noPriceResponse = response();
  await withRequestModels({ booth: { findById: () => boothQuery({ ...availableBooth, price: undefined }) } }, async () => requestBoothBooking(validRequest, noPriceResponse));
  assert.equal(noPriceResponse.statusCode, 409);

  const fairResponse = response();
  await withRequestModels({ fair: { findOne: query => {
    assert.deepEqual(query.status.$in, ['UPCOMING', 'ONGOING']);
    assert.ok(query.endDate.$gte instanceof Date);
    assert.equal(query.isVirtual.$ne, true);
    return fairQuery(null);
  } } }, async () => requestBoothBooking(validRequest, fairResponse));
  assert.equal(fairResponse.statusCode, 409);
});

test('concurrent stall requests have a single winner through the atomic availability claim', async () => {
  let claimed = false;
  let createCount = 0;
  const overrides = {
    booth: {
      findOneAndUpdate: async () => {
        if (claimed) return null;
        claimed = true;
        return { ...availableBooth, status: 'RESERVED', bookingReference: 'EXPO_TEST_REFERENCE' };
      },
    },
    booking: { create: async value => { createCount += 1; return { _id: ids.booking, ...value }; } },
  };
  const results = await withRequestModels(overrides, async () => {
    const first = response();
    const second = response();
    await Promise.all([
      requestBoothBooking(validRequest, first),
      requestBoothBooking(validRequest, second),
    ]);
    return [first, second];
  });
  assert.deepEqual(results.map(result => result.statusCode).sort(), [201, 409]);
  assert.equal(createCount, 1);
  assert.ok(BoothBooking.schema.indexes().some(([keys, options]) => keys.boothId === 1 && options.unique && options.partialFilterExpression?.isActive === true));
});

test('only the owning publisher can cancel its pending booking', async () => {
  let cancellationQuery;
  const res = response();
  await withModelMethods(Publisher, { findOne: () => publisherQuery(approvedPublisher) }, async () => {
    await withModelMethods(BoothBooking, {
      findOneAndUpdate: async query => { cancellationQuery = query; return { ...booking, status: 'cancelled', isActive: false }; },
    }, async () => withModelMethods(Booth, { updateOne: async () => ({ modifiedCount: 1 }) }, async () => {
      await cancelMyBoothBooking({ user: { id: ids.user }, params: { id: ids.booking } }, res);
    }));
  });
  assert.equal(res.statusCode, 200);
  assert.equal(cancellationQuery.publisherId, ids.publisher);
  assert.equal(cancellationQuery.status, 'pending');
});

test('approved bookings cannot be cancelled by publisher', async () => {
  const res = response();
  await withModelMethods(Publisher, { findOne: () => publisherQuery(approvedPublisher) }, async () => {
    await withModelMethods(BoothBooking, {
      findOneAndUpdate: async () => null,
      exists: async () => ({ _id: ids.booking }),
    }, async () => cancelMyBoothBooking({ user: { id: ids.user }, params: { id: ids.booking } }, res));
  });
  assert.equal(res.statusCode, 409);
});

test('admin approval confirms the publisher and stall reservation and never changes payment status', async () => {
  const res = response();
  let approvedBooking;
  await withModelMethods(BoothBooking, {
    findOne: async () => booking,
    findOneAndUpdate: async (_query, update) => { approvedBooking = { ...booking, ...update.$set }; return approvedBooking; },
  }, async () => withModelMethods(Publisher, { findOne: () => ({ select: async () => ({ _id: ids.publisher }) }) }, async () =>
    withModelMethods(BookFair, { findOne: () => ({ select: async () => ({ _id: ids.fair }) }) }, async () =>
    withModelMethods(Booth, {
      findOne: () => ({ select: async () => ({ _id: ids.booth }) }),
      findOneAndUpdate: async () => ({ ...availableBooth, status: 'BOOKED', publisherId: ids.publisher }),
    }, async () => reviewBoothBooking({ user: { id: ids.admin }, params: { id: ids.booking }, body: { status: 'approved', paymentStatus: 'paid' } }, res)))));
  assert.equal(res.statusCode, 200);
  assert.equal(approvedBooking.status, 'approved');
  assert.equal(approvedBooking.paymentStatus, 'not_integrated');
  assert.match(res.body.message, /no payment has been collected/i);
});

test('admin rejection requires a reason and marks the booking inactive', async () => {
  const invalid = response();
  await reviewBoothBooking({ params: { id: ids.booking }, body: { status: 'rejected' } }, invalid);
  assert.equal(invalid.statusCode, 400);

  const res = response();
  let updated;
  await withModelMethods(BoothBooking, {
    findOne: async () => booking,
    findOneAndUpdate: async (_query, update) => { updated = update.$set; return { ...booking, ...updated }; },
  }, async () => withModelMethods(Booth, { updateOne: async () => ({ modifiedCount: 1 }) }, async () =>
    reviewBoothBooking({ user: { id: ids.admin }, params: { id: ids.booking }, body: { status: 'rejected', rejectionReason: 'Fair is full.' } }, res)));
  assert.equal(res.statusCode, 200);
  assert.equal(updated.status, 'rejected');
  assert.equal(updated.isActive, false);
});

test('admin cannot approve a pending booking after its fair is no longer eligible', async () => {
  const res = response();
  await withModelMethods(BoothBooking, { findOne: async () => booking }, async () =>
    withModelMethods(Publisher, { findOne: () => ({ select: async () => ({ _id: ids.publisher }) }) }, async () =>
      withModelMethods(BookFair, { findOne: () => ({ select: async () => null }) }, async () => {
        await reviewBoothBooking({ user: { id: ids.admin }, params: { id: ids.booking }, body: { status: 'approved' } }, res);
      })));
  assert.equal(res.statusCode, 409);
});

test('publisher booking routes require authentication and admin review requires database-verified admin role', async () => {
  const app = express();
  app.use(cookieParser());
  app.use('/api/booth-bookings', bookingRoutes);
  await withServer(app, async baseUrl => {
    const response = await fetch(`${baseUrl}/api/booth-bookings/me`);
    assert.equal(response.status, 401);
  });

  const originalFindById = User.findById;
  User.findById = async () => ({ role: 'user' });
  const adminApp = express();
  adminApp.use(cookieParser());
  adminApp.use('/api/admin/booth-bookings', adminBookingRoutes);
  const token = jwt.sign({ id: ids.user, email: 'user@example.com', name: 'User', role: 'admin' }, getJwtSecret());
  try {
    await withServer(adminApp, async baseUrl => {
      const response = await fetch(`${baseUrl}/api/admin/booth-bookings`, { headers: { Cookie: `token=${token}` } });
      assert.equal(response.status, 403);
    });
  } finally {
    User.findById = originalFindById;
  }
});