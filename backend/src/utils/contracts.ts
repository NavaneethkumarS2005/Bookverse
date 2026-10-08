import mongoose from 'mongoose';

export interface CatalogBookSummary {
  _id: string;
  id?: number;
  title: string;
  author: string;
  category?: string;
  genre?: string;
  price: number;
  image: string;
  availability?: string;
  isFeatured?: boolean;
  featuredOrder?: number;
  rating?: number;
  reviews?: number;
  authorId?: string;
  publisherId?: string;
  publisher?: string;
  description?: string;
  stock?: number;
}

export interface CartItemContract {
  bookId: string;
  quantity: number;
  book: CatalogBookSummary;
}

export interface OrderItemContract {
  bookId: string;
  title: string;
  quantity: number;
  price: number;
}

export interface ShippingAddressContract {
  address: string;
  city: string;
  zip: string;
  phone: string;
}

export interface OrderInputContract {
  orderItems: OrderItemContract[];
  shippingAddress: ShippingAddressContract;
  totalPrice: number;
  paymentMethod: string;
  paymentResult?: { id: string; status: string };
}

export interface OrderContract {
  _id: string;
  user: string;
  orderItems: OrderItemContract[];
  shippingAddress?: ShippingAddressContract;
  totalPrice: number;
  paymentResult?: { id: string; status: string };
  paymentMethod: string;
  status: string;
  createdAt: string;
}

const asStringId = (value: unknown): string | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
};

const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const idOf = (value: unknown): string | undefined => {
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return asStringId((value as { _id: unknown })._id);
  }
  if (typeof value === 'string' && mongoose.isValidObjectId(value)) return value;
  if (typeof value === 'number') return String(value);
  return asStringId(value);
};

export const normalizeBook = (value: unknown): CatalogBookSummary => {
  if (!value || typeof value !== 'object') {
    throw new Error('Book data is required');
  }

  const book = value as Record<string, any>;
  const _id = idOf(book._id) ?? idOf(book.id) ?? '';
  if (!_id) throw new Error('Book identifier is required');

  const featuredMetadata = book.featuredMetadata && typeof book.featuredMetadata === 'object'
    ? book.featuredMetadata
    : undefined;
  const authorReference = book.authorId && typeof book.authorId === 'object'
    ? book.authorId
    : undefined;
  const category = book.category || book.genre || (Array.isArray(book.genres) ? book.genres[0] : undefined);
  const stock = book.stock ?? book.quantity ?? undefined;

  return {
    _id,
    id: typeof book.id === 'number' ? book.id : undefined,
    title: String(book.title ?? ''),
    author: String(book.author ?? authorReference?.name ?? ''),
    category,
    genre: book.genre || category,
    price: asNumber(book.price),
    image: String(book.image ?? book.coverImage ?? ''),
    availability: book.availability ?? (stock === 0 ? 'Out of Stock' : stock && stock < 1 ? 'Out of Stock' : 'In Stock'),
    isFeatured: book.isFeatured ?? featuredMetadata?.featured,
    featuredOrder: book.featuredOrder ?? featuredMetadata?.order,
    rating: book.rating ?? book.averageRating,
    reviews: book.reviews ?? book.numReviews ?? book.reviewCount,
    authorId: idOf(book.authorId),
    publisherId: idOf(book.publisherId),
    publisher: typeof book.publisher === 'string' ? book.publisher : undefined,
    description: book.description ? String(book.description) : undefined,
    stock,
  };
};

export const normalizeCartItem = (value: unknown): CartItemContract => {
  if (!value || typeof value !== 'object') {
    throw new Error('Cart item data is required');
  }

  const item = value as Record<string, any>;
  const book = normalizeBook(item.book ?? item);
  const quantity = Math.floor(asNumber(item.quantity, 1));
  if (quantity < 1) throw new Error('Cart item quantity must be at least 1');

  return {
    bookId: book._id,
    quantity,
    book,
  };
};

const normalizeShippingAddress = (value: unknown): ShippingAddressContract => {
  if (!value || typeof value !== 'object') {
    throw new Error('Shipping address is required');
  }

  const address = value as Record<string, any>;
  return {
    address: String(address.address ?? address.street ?? ''),
    city: String(address.city ?? ''),
    zip: String(address.zip ?? address.zipCode ?? ''),
    phone: String(address.phone ?? address.mobileNumber ?? ''),
  };
};

type CatalogBookForOrder = { _id: string; title: string; price: number };

export const normalizeOrderItems = (
  value: unknown,
  catalogBooks: Array<CatalogBookForOrder | unknown>,
): { orderItems: OrderItemContract[]; totalPrice: number } => {
  if (!Array.isArray(value) || !value.length) {
    throw new Error('At least one order item is required');
  }

  const catalog = new Map(catalogBooks.map(book => {
    const normalized = normalizeBook(book);
    return [normalized._id, normalized];
  }));
  const orderItems = value.map((item: any) => {
    if (!item || typeof item !== 'object') throw new Error('Order item is invalid');
    const bookId = idOf(item.bookId ?? item.productId ?? item.id);
    if (!bookId) throw new Error('Order item book identifier is required');
    const catalogBook = catalog.get(bookId);
    if (!catalogBook) throw new Error('One or more books are unavailable');
    const quantity = Math.floor(asNumber(item.quantity, 1));
    if (quantity < 1) throw new Error('Order item quantity must be at least 1');
    return {
      bookId,
      title: catalogBook.title,
      quantity,
      price: catalogBook.price,
    };
  });

  const totalPrice = orderItems.reduce((total: number, item: OrderItemContract) => total + item.price * item.quantity, 0);
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) throw new Error('Order total must be greater than zero');
  return { orderItems, totalPrice };
};

export const normalizeOrderInput = (
  value: unknown,
  catalogBooks: Array<CatalogBookForOrder | unknown>,
): OrderInputContract => {
  if (!value || typeof value !== 'object') {
    throw new Error('Order data is required');
  }

  const input = value as Record<string, any>;
  const shippingAddress = normalizeShippingAddress(input.shippingAddress ?? input.shippingDetails);
  if (!shippingAddress.address || !shippingAddress.phone) {
    throw new Error('Shipping address and phone are required');
  }
  const { orderItems, totalPrice } = normalizeOrderItems(input.orderItems ?? input.items, catalogBooks);

  return {
    orderItems,
    shippingAddress,
    totalPrice,
    paymentMethod: String(input.paymentMethod ?? 'Stripe'),
    paymentResult: input.paymentResult
      ? { id: String(input.paymentResult.id), status: String(input.paymentResult.status) }
      : undefined,
  };
};

export const serializeOrder = (value: unknown): OrderContract => {
  if (!value || typeof value !== 'object') throw new Error('Order data is required');
  const order = value as Record<string, any>;
  const orderItems = Array.isArray(order.orderItems) ? order.orderItems : Array.isArray(order.items) ? order.items : [];
  const shippingAddress = order.shippingAddress ?? order.shippingDetails;
  const totalPrice = asNumber(order.totalPrice ?? order.totalAmount);
  const paymentId = order.paymentId ?? order.paymentResult?.id;

  return {
    _id: String(order._id),
    user: String(order.user),
    orderItems: orderItems.map((item: any) => ({
      bookId: String(item.bookId ?? item.product ?? item.id),
      title: String(item.title ?? ''),
      quantity: Math.floor(asNumber(item.quantity, 1)),
      price: asNumber(item.price),
    })),
    shippingAddress: shippingAddress ? normalizeShippingAddress(shippingAddress) : undefined,
    totalPrice,
    paymentResult: paymentId ? { id: String(paymentId), status: String(order.status ?? 'Paid') } : undefined,
    paymentMethod: String(order.paymentMethod ?? 'Stripe'),
    status: String(order.status ?? 'Paid'),
    createdAt: new Date(order.createdAt ?? Date.now()).toISOString(),
  };
};
