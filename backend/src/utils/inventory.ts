import mongoose, { ClientSession } from 'mongoose';
import Book from '../models/Book';

const bookLookupQuery = (bookId: string) => {
  const value = String(bookId ?? '').trim();
  if (!value) {
    return { _id: null };
  }

  if (mongoose.isValidObjectId(value)) {
    return { _id: new mongoose.Types.ObjectId(value) };
  }

  const numeric = Number(value);
  if (Number.isInteger(numeric) && !Number.isNaN(numeric)) {
    return { id: numeric };
  }

  return { _id: new mongoose.Types.ObjectId(value) };
};

const resolveStockLevel = (book: any): number => {
  if (book && typeof book.stock === 'number' && Number.isFinite(book.stock)) {
    return book.stock;
  }
  if (book?.availability === 'Out of Stock') {
    return 0;
  }
  return Number.MAX_SAFE_INTEGER;
};

export const stockChangeForOrder = (orderItems: any[]) => {
  const changes: Record<string, number> = {};

  for (const item of orderItems || []) {
    const bookId = String(item?.bookId ?? item?.productId ?? item?.id ?? '');
    const quantity = Number(item?.quantity);

    if (!bookId) {
      throw new Error('Book is missing from the order');
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error('Order item quantity must be a positive integer');
    }

    changes[bookId] = (changes[bookId] ?? 0) + quantity;
  }

  return changes;
};

export const validateOrderStock = (orderItems: any[], catalogBooks: any[]) => {
  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    throw new Error('At least one order item is required');
  }

  const catalog = new Map<string, any>();
  for (const book of catalogBooks || []) {
    if (!book || typeof book !== 'object') continue;
    const bookId = String(book._id ?? book.id ?? '');
    if (!bookId) continue;
    catalog.set(bookId, book);
  }

  const seen = new Set<string>();
  const normalized: Array<{ bookId: string; quantity: number; title: string; price: number }> = [];

  for (const item of orderItems) {
    const bookId = String(item?.bookId ?? item?.productId ?? item?.id ?? '');
    if (!bookId) {
      throw new Error('Book is missing from the order');
    }
    if (seen.has(bookId)) {
      throw new Error('Order items contain duplicate books');
    }
    seen.add(bookId);

    const catalogBook = catalog.get(bookId);
    if (!catalogBook) {
      throw new Error('Book is unavailable');
    }

    const quantity = Number(item?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error('Order item quantity must be a positive integer');
    }

    const stock = resolveStockLevel(catalogBook);
    if (stock < quantity || stock <= 0) {
      throw new Error('Requested quantity is unavailable');
    }
    if (!Number.isFinite(Number(catalogBook.price)) || Number(catalogBook.price) <= 0) {
      throw new Error('Book price is invalid');
    }

    normalized.push({
      bookId,
      quantity,
      title: String(catalogBook.title ?? ''),
      price: Number(catalogBook.price),
    });
  }

  return normalized;
};

export const decrementOrderStock = async (orderItems: any[], session?: ClientSession) => {
  const changes = stockChangeForOrder(orderItems);
  const entries = Object.entries(changes);

  const applyDecrement = async (txSession?: ClientSession) => {
    for (const [bookId, quantity] of entries) {
      const query = bookLookupQuery(bookId);
      const book = await Book.findOne(
        { ...query, stock: { $gte: quantity } },
        null,
        { session: txSession }
      );

      if (!book) {
        throw new Error('Inventory changed. Please review your cart.');
      }

      const nextStock = Math.max((Number(book.stock) ?? 0) - quantity, 0);
      const updated = await Book.findOneAndUpdate(
        { ...query, stock: { $gte: quantity } },
        {
          $set: {
            stock: nextStock,
            availability: nextStock > 0 ? 'In Stock' : 'Out of Stock',
          },
        },
        {
          session: txSession,
          new: true,
          runValidators: true,
        }
      );

      if (!updated) {
        throw new Error('Inventory changed. Please review your cart.');
      }
    }
  };

  if (session) {
    await applyDecrement(session);
    return;
  }

  const txSession = await mongoose.startSession();
  try {
    await txSession.withTransaction(async () => {
      await applyDecrement(txSession);
    });
  } finally {
    await txSession.endSession();
  }
};
