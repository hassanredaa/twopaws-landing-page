import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
  where,
  type DocumentData,
  type DocumentReference,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import type { ProductDoc } from "@/hooks/useProducts";
import { isReactSnapPrerender } from "@/lib/isPrerender";

type CartDoc = {
  id: string;
  total?: number;
  itemCount?: number;
  userId?: DocumentReference;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  [key: string]: unknown;
};

type CartItemDoc = {
  id: string;
  productId?: DocumentReference | string;
  quantity?: number;
  unitPrice?: number;
  lastPriceSyncAt?: Timestamp;
  [key: string]: unknown;
};

type CartItemWithProduct = CartItemDoc & {
  product?: ProductDoc | null;
  productRef?: DocumentReference;
  productIdValue?: string | null;
};

type SupplierMismatchError = Error & {
  code?: "supplier-mismatch";
  activeSupplierId?: string;
  newSupplierId?: string;
};

type CartContextValue = {
  cartId: string | null;
  cart: CartDoc | null;
  cartItems: CartItemWithProduct[];
  activeSupplierRef: DocumentReference | null;
  loading: boolean;
  error: string | null;
  addItem: (product: ProductDoc, quantity: number) => Promise<void>;
  setItemQuantity: (product: ProductDoc, nextQty: number) => Promise<void>;
  removeItem: (product: ProductDoc) => Promise<void>;
  clearCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);
const GUEST_CART_ID = "guest";
const GUEST_CART_STORAGE_KEY = "twopaws:guest-cart:v1";

const toNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const getProductUnitPrice = (product: ProductDoc) => {
  const salePrice = toNumber(product.sale_price);
  const price = toNumber(product.price);
  if (product.on_sale && salePrice > 0) return salePrice;
  return price;
};

const getProductRef = (productId: unknown): DocumentReference | null => {
  if (!productId) return null;
  if (typeof productId === "string") {
    return doc(db, "products", productId);
  }
  if (typeof productId === "object" && "id" in (productId as DocumentReference)) {
    return productId as DocumentReference;
  }
  return null;
};

const refsEqual = (
  first?: DocumentReference | null,
  second?: DocumentReference | null
) => {
  if (!first || !second) return false;
  return first.path === second.path;
};

const readGuestCartItems = (): CartItemDoc[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, index) => {
        const payload = (item ?? {}) as Record<string, unknown>;
        const productId = typeof payload.productId === "string" ? payload.productId.trim() : "";
        const quantity = Math.floor(toNumber(payload.quantity));
        const unitPrice = toNumber(payload.unitPrice);
        if (!productId || quantity <= 0) return null;
        return {
          id: typeof payload.id === "string" && payload.id.trim() ? payload.id : `${productId}-${index}`,
          productId,
          quantity,
          unitPrice,
        } satisfies CartItemDoc;
      })
      .filter(Boolean) as CartItemDoc[];
  } catch {
    return [];
  }
};

const writeGuestCartItems = (items: CartItemDoc[]) => {
  if (typeof window === "undefined") return;
  if (items.length === 0) {
    window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    return;
  }
  const payload = items
    .map((item) => {
      const productId = getProductRef(item.productId)?.id;
      const quantity = Math.floor(toNumber(item.quantity));
      const unitPrice = toNumber(item.unitPrice);
      if (!productId || quantity <= 0) return null;
      return {
        id: item.id,
        productId,
        quantity,
        unitPrice,
      };
    })
    .filter(Boolean);
  window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(payload));
};

const summarizeCart = (items: CartItemDoc[]) => {
  let itemCount = 0;
  let total = 0;
  for (const item of items) {
    const quantity = Math.max(0, Math.floor(toNumber(item.quantity)));
    const unitPrice = toNumber(item.unitPrice);
    itemCount += quantity;
    total += quantity * unitPrice;
  }
  return { itemCount, total: Math.max(total, 0) };
};

function useCartState(): CartContextValue {
  const prerender = isReactSnapPrerender();
  const { user } = useAuth();
  const [cartId, setCartId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartDoc | null>(null);
  const [items, setItems] = useState<CartItemDoc[]>([]);
  const [productsById, setProductsById] = useState<Record<string, ProductDoc>>(
    {}
  );
  const [loading, setLoading] = useState(!prerender);
  const [error, setError] = useState<string | null>(null);
  const syncInFlight = useRef(false);
  const productUnsubs = useRef<Record<string, () => void>>({});

  const findExistingItem = useCallback(
    (productId: string) =>
      items.find((item) => getProductRef(item.productId)?.id === productId),
    [items]
  );

  useEffect(() => {
    if (prerender) {
      setCartId(null);
      setCart(null);
      setItems([]);
      setProductsById({});
      setError(null);
      setLoading(false);
      return;
    }

    setCartId(null);
    setCart(null);
    setItems([]);
    setProductsById({});
    setError(null);
    if (!user) {
      const guestItems = readGuestCartItems();
      const summary = summarizeCart(guestItems);
      setCartId(GUEST_CART_ID);
      setItems(guestItems);
      setCart({
        id: GUEST_CART_ID,
        itemCount: summary.itemCount,
        total: summary.total,
      });
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;

    const ensureCart = async () => {
      const uid = user.uid;
      const userRef = doc(db, "users", uid);
      const cartQuery = query(
        collection(db, "carts"),
        where("userId", "==", userRef),
        limit(1)
      );
      const cartQuerySnap = await getDocs(cartQuery);
      if (!cartQuerySnap.empty) {
        return cartQuerySnap.docs[0].id;
      }
      const cartRef = doc(collection(db, "carts"));
      await setDoc(cartRef, {
        userId: userRef,
        total: 0,
        itemCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return cartRef.id;
    };

    ensureCart()
      .then((id) => {
        if (!cancelled) {
          setCartId(id);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setError("Failed to load cart.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, prerender]);

  useEffect(() => {
    if (prerender) return;
    if (!user) return;
    if (!cartId) return;
    const cartRef = doc(db, "carts", cartId);
    const unsubscribe = onSnapshot(cartRef, (snap) => {
      if (!snap.exists()) {
        setCart(null);
      } else {
        setCart({ id: snap.id, ...snap.data() } as CartDoc);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [cartId, prerender]);

  useEffect(() => {
    if (prerender) return;
    if (!user) return;
    if (!cartId) return;
    const itemsRef = collection(db, "carts", cartId, "cartItems");
    const unsubscribe = onSnapshot(itemsRef, (snap) => {
      setItems(
        snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as CartItemDoc[]
      );
    });
    return () => unsubscribe();
  }, [cartId, prerender]);

  useEffect(() => {
    if (prerender) return;
    const currentUnsubs = productUnsubs.current;
    const activeIds = new Set<string>();

    items.forEach((item) => {
      const productRef = getProductRef(item.productId);
      if (!productRef) return;
      const productId = productRef.id;
      activeIds.add(productId);
      if (currentUnsubs[productId]) return;

      currentUnsubs[productId] = onSnapshot(productRef, (snap) => {
        if (!snap.exists()) return;
        setProductsById((prev) => ({
          ...prev,
          [snap.id]: { id: snap.id, ...snap.data() } as ProductDoc,
        }));
      });
    });

    Object.keys(currentUnsubs).forEach((productId) => {
      if (!activeIds.has(productId)) {
        currentUnsubs[productId]();
        delete currentUnsubs[productId];
        setProductsById((prev) => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
      }
    });
  }, [items, prerender]);

  useEffect(() => {
    if (prerender) return;
    return () => {
      Object.values(productUnsubs.current).forEach((unsubscribe) => unsubscribe());
      productUnsubs.current = {};
    };
  }, [prerender]);

  const cartItems = useMemo<CartItemWithProduct[]>(() => {
    return items.map((item) => {
      const productRef = getProductRef(item.productId);
      const productIdValue = productRef?.id ?? null;
      return {
        ...item,
        productRef: productRef ?? undefined,
        productIdValue,
        product: productIdValue ? productsById[productIdValue] : null,
      };
    });
  }, [items, productsById]);

  useEffect(() => {
    if (prerender) return;
    if (user) return;
    const summary = summarizeCart(items);
    setCart({
      id: GUEST_CART_ID,
      itemCount: summary.itemCount,
      total: summary.total,
    });
    writeGuestCartItems(items);
  }, [items, user, prerender]);

  useEffect(() => {
    if (prerender) return;
    if (!user || !cartId) return;

    const updates: {
      id: string;
      nextQty: number;
      nextUnitPrice: number;
      shouldDelete: boolean;
    }[] = [];

    let nextItemCount = 0;
    let nextTotal = 0;

    const grouped = new Map<string, CartItemWithProduct[]>();
    cartItems.forEach((item) => {
      const key = item.productIdValue ?? item.id;
      const list = grouped.get(key) ?? [];
      list.push(item);
      grouped.set(key, list);
    });

    grouped.forEach((group) => {
      const primary = group[0];
      const product = group.find((item) => item.product)?.product ?? null;
      const combinedQty = group.reduce(
        (sum, item) => sum + toNumber(item.quantity),
        0
      );

      let nextQty = combinedQty;
      let nextUnitPrice = toNumber(primary.unitPrice);

      if (product) {
        const available = toNumber(product.quantity);
        nextUnitPrice = getProductUnitPrice(product);
        nextQty = available > 0 ? Math.min(combinedQty, available) : 0;
      }

      if (nextQty > 0) {
        nextItemCount += nextQty;
        nextTotal += nextQty * nextUnitPrice;
      }

      const primaryQty = toNumber(primary.quantity);
      const primaryUnitPrice = toNumber(primary.unitPrice);
      const needsPrimaryUpdate =
        nextQty !== primaryQty ||
        nextUnitPrice !== primaryUnitPrice ||
        group.length > 1;

      if (needsPrimaryUpdate) {
        updates.push({
          id: primary.id,
          nextQty,
          nextUnitPrice,
          shouldDelete: nextQty === 0,
        });
      }

      group.slice(1).forEach((dup) => {
        updates.push({
          id: dup.id,
          nextQty: 0,
          nextUnitPrice,
          shouldDelete: true,
        });
      });
    });

    const cartItemCount = toNumber(cart?.itemCount);
    const cartTotal = toNumber(cart?.total);
    const cartNeedsUpdate =
      cartItemCount !== nextItemCount || cartTotal !== nextTotal;

    if (updates.length === 0 && !cartNeedsUpdate) return;
    if (syncInFlight.current) return;

    syncInFlight.current = true;
    const cartRef = doc(db, "carts", cartId);
    const batch = writeBatch(db);

    updates.forEach((update) => {
      const itemRef = doc(cartRef, "cartItems", update.id);
      if (update.shouldDelete) {
        batch.delete(itemRef);
        return;
      }
      batch.set(
        itemRef,
        {
          quantity: update.nextQty,
          unitPrice: update.nextUnitPrice,
          lastPriceSyncAt: serverTimestamp(),
        },
        { merge: true }
      );
    });

    if (cartNeedsUpdate) {
      batch.set(
        cartRef,
        {
          itemCount: nextItemCount,
          total: Math.max(nextTotal, 0),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    batch
      .commit()
      .catch((err) => {
        console.error("Cart sync failed:", err);
      })
      .finally(() => {
        syncInFlight.current = false;
      });
  }, [user, cartId, cartItems, cart, prerender]);

  const activeSupplierRef = useMemo(() => {
    for (const item of cartItems) {
      if (item.product?.supplierRef) {
        return item.product.supplierRef as DocumentReference;
      }
    }
    return null;
  }, [cartItems]);

  const addItem = useCallback(
    async (product: ProductDoc, quantity: number) => {
      if (!cartId) {
        throw new Error("Cart is unavailable right now.");
      }
      if (!product.id) {
        throw new Error("Invalid product.");
      }
      const available = toNumber(product.quantity);
      if (available <= 0) {
        throw new Error("This item is out of stock.");
      }
      if (quantity <= 0) return;

      let cartSupplierRef = activeSupplierRef;
      if (!cartSupplierRef && items.length > 0) {
        const firstProductRef = getProductRef(items[0].productId);
        if (firstProductRef) {
          const firstSnap = await getDoc(firstProductRef);
          if (firstSnap.exists()) {
            cartSupplierRef = firstSnap.data().supplierRef as DocumentReference;
          }
        }
      }

      if (
        cartSupplierRef &&
        product.supplierRef &&
        !refsEqual(cartSupplierRef, product.supplierRef as DocumentReference)
      ) {
        const mismatch: SupplierMismatchError = new Error(
          "Cart supplier mismatch."
        );
        mismatch.code = "supplier-mismatch";
        mismatch.activeSupplierId = cartSupplierRef.id;
        mismatch.newSupplierId = (product.supplierRef as DocumentReference).id;
        throw mismatch;
      }

      const unitPrice = getProductUnitPrice(product);
      if (!user || cartId === GUEST_CART_ID) {
        setItems((prev) => {
          const existing = prev.find((item) => getProductRef(item.productId)?.id === product.id);
          const existingQty = existing ? toNumber(existing.quantity) : 0;
          const newQty = Math.min(existingQty + quantity, available);
          if (newQty === existingQty) return prev;

          if (!existing) {
            return [
              ...prev,
              {
                id: product.id,
                productId: product.id,
                quantity: newQty,
                unitPrice,
              },
            ];
          }

          return prev.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  productId: product.id,
                  quantity: newQty,
                  unitPrice,
                  lastPriceSyncAt: undefined,
                }
              : item
          );
        });
        return;
      }

      const cartRef = doc(db, "carts", cartId);
      const existingItem = findExistingItem(product.id);
      const itemRef = doc(cartRef, "cartItems", existingItem?.id ?? product.id);
      await runTransaction(db, async (transaction) => {
        const cartSnap = await transaction.get(cartRef);
        const cartData = cartSnap.exists() ? (cartSnap.data() as DocumentData) : {};
        const itemSnap = await transaction.get(itemRef);
        const existingQty = itemSnap.exists()
          ? toNumber(itemSnap.data()?.quantity)
          : 0;
        const existingUnitPrice = itemSnap.exists()
          ? toNumber(itemSnap.data()?.unitPrice)
          : unitPrice;
        const newQty = Math.min(existingQty + quantity, available);
        if (newQty === existingQty) {
          return;
        }

        const newItemCount =
          toNumber(cartData.itemCount) + (newQty - existingQty);
        const newTotal =
          toNumber(cartData.total) + newQty * unitPrice - existingQty * existingUnitPrice;

        const cartUpdate: Record<string, unknown> = {
          itemCount: newItemCount,
          total: Math.max(newTotal, 0),
          updatedAt: serverTimestamp(),
        };
        if (!cartSnap.exists()) {
          cartUpdate.userId = doc(db, "users", user.uid);
          cartUpdate.createdAt = serverTimestamp();
        }
        transaction.set(cartRef, cartUpdate, { merge: true });
        transaction.set(
          itemRef,
          {
            productId: doc(db, "products", product.id),
            quantity: newQty,
            unitPrice,
            lastPriceSyncAt: serverTimestamp(),
          },
          { merge: true }
        );
      });
    },
    [user, cartId, activeSupplierRef, items, findExistingItem]
  );

  const setItemQuantity = useCallback(
    async (product: ProductDoc, nextQty: number) => {
      if (!cartId) {
        throw new Error("Cart is unavailable right now.");
      }
      if (!product.id) {
        throw new Error("Invalid product.");
      }
      const available = toNumber(product.quantity);
      if (available <= 0 && nextQty > 0) {
        throw new Error("This item is out of stock.");
      }
      const targetQty = Math.min(Math.max(nextQty, 0), available > 0 ? available : 0);
      const unitPrice = getProductUnitPrice(product);
      if (!user || cartId === GUEST_CART_ID) {
        setItems((prev) => {
          const existing = prev.find((item) => getProductRef(item.productId)?.id === product.id);
          if (!existing) {
            if (targetQty <= 0) return prev;
            return [
              ...prev,
              {
                id: product.id,
                productId: product.id,
                quantity: targetQty,
                unitPrice,
              },
            ];
          }
          if (targetQty <= 0) {
            return prev.filter((item) => item.id !== existing.id);
          }
          return prev.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  productId: product.id,
                  quantity: targetQty,
                  unitPrice,
                  lastPriceSyncAt: undefined,
                }
              : item
          );
        });
        return;
      }

      const cartRef = doc(db, "carts", cartId);
      const existingItem = findExistingItem(product.id);
      const itemRef = doc(cartRef, "cartItems", existingItem?.id ?? product.id);

      await runTransaction(db, async (transaction) => {
        const cartSnap = await transaction.get(cartRef);
        const cartData = cartSnap.exists() ? (cartSnap.data() as DocumentData) : {};
        const itemSnap = await transaction.get(itemRef);
        const existingQty = itemSnap.exists()
          ? toNumber(itemSnap.data()?.quantity)
          : 0;
        const existingUnitPrice = itemSnap.exists()
          ? toNumber(itemSnap.data()?.unitPrice)
          : unitPrice;

        if (targetQty === existingQty) {
          return;
        }

        const newItemCount =
          toNumber(cartData.itemCount) + (targetQty - existingQty);
        const newTotal =
          toNumber(cartData.total) +
          targetQty * unitPrice -
          existingQty * existingUnitPrice;

        const cartUpdate: Record<string, unknown> = {
          itemCount: newItemCount,
          total: Math.max(newTotal, 0),
          updatedAt: serverTimestamp(),
        };
        if (!cartSnap.exists()) {
          cartUpdate.userId = doc(db, "users", user.uid);
          cartUpdate.createdAt = serverTimestamp();
        }
        transaction.set(cartRef, cartUpdate, { merge: true });

        if (targetQty === 0) {
          transaction.delete(itemRef);
        } else {
          transaction.set(
            itemRef,
            {
              productId: doc(db, "products", product.id),
              quantity: targetQty,
              unitPrice,
              lastPriceSyncAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      });
    },
    [user, cartId, findExistingItem]
  );

  const removeItem = useCallback(
    async (product: ProductDoc) => {
      await setItemQuantity(product, 0);
    },
    [setItemQuantity]
  );

  const clearCart = useCallback(async () => {
    if (!cartId) {
      throw new Error("Cart is unavailable right now.");
    }
    if (!user || cartId === GUEST_CART_ID) {
      setItems([]);
      return;
    }
    const cartRef = doc(db, "carts", cartId);
    await runTransaction(db, async (transaction) => {
      const cartSnap = await transaction.get(cartRef);
      const cartData = cartSnap.exists() ? cartSnap.data() : {};
      items.forEach((item) => {
        transaction.delete(doc(cartRef, "cartItems", item.id));
      });
      const cartUpdate: Record<string, unknown> = {
        itemCount: 0,
        total: 0,
        updatedAt: serverTimestamp(),
      };
      if (!cartSnap.exists()) {
        cartUpdate.userId = doc(db, "users", user.uid);
        cartUpdate.createdAt = serverTimestamp();
      }
      transaction.set(cartRef, cartUpdate, { merge: true });
    });
  }, [user, cartId, items]);

  return {
    cartId,
    cart,
    cartItems,
    activeSupplierRef,
    loading,
    error,
    addItem,
    setItemQuantity,
    removeItem,
    clearCart,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const value = useCartState();
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}

export type { CartDoc, CartItemDoc, CartItemWithProduct, SupplierMismatchError };
