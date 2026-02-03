import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  where,
  type DocumentData,
  type DocumentReference,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import type { ProductDoc } from "@/hooks/useProducts";

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

export function useCart() {
  const { user } = useAuth();
  const [cartId, setCartId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartDoc | null>(null);
  const [items, setItems] = useState<CartItemDoc[]>([]);
  const [productsById, setProductsById] = useState<Record<string, ProductDoc>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const productUnsubs = useRef<Record<string, () => void>>({});

  useEffect(() => {
    setCartId(null);
    setCart(null);
    setItems([]);
    setProductsById({});
    setError(null);
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;

    const ensureCart = async () => {
      const uid = user.uid;
      const cartRef = doc(db, "carts", uid);
      const cartSnap = await getDoc(cartRef);
      if (cartSnap.exists()) {
        return uid;
      }
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
      await setDoc(cartRef, {
        userId: userRef,
        total: 0,
        itemCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return uid;
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
  }, [user]);

  useEffect(() => {
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
  }, [cartId]);

  useEffect(() => {
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
  }, [cartId]);

  useEffect(() => {
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
  }, [items]);

  useEffect(() => {
    return () => {
      Object.values(productUnsubs.current).forEach((unsubscribe) => unsubscribe());
      productUnsubs.current = {};
    };
  }, []);

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
      if (!user || !cartId) {
        throw new Error("You must be signed in to add items.");
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
      const cartRef = doc(db, "carts", cartId);
      const itemRef = doc(cartRef, "cartItems", product.id);
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

        transaction.set(
          cartRef,
          {
            userId: doc(db, "users", user.uid),
            itemCount: newItemCount,
            total: Math.max(newTotal, 0),
            updatedAt: serverTimestamp(),
            createdAt: cartData.createdAt ?? serverTimestamp(),
          },
          { merge: true }
        );
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
    [user, cartId, activeSupplierRef, items]
  );

  const setItemQuantity = useCallback(
    async (product: ProductDoc, nextQty: number) => {
      if (!user || !cartId) {
        throw new Error("You must be signed in to update items.");
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
      const cartRef = doc(db, "carts", cartId);
      const itemRef = doc(cartRef, "cartItems", product.id);

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

        transaction.set(
          cartRef,
          {
            userId: doc(db, "users", user.uid),
            itemCount: newItemCount,
            total: Math.max(newTotal, 0),
            updatedAt: serverTimestamp(),
            createdAt: cartData.createdAt ?? serverTimestamp(),
          },
          { merge: true }
        );

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
    [user, cartId]
  );

  const removeItem = useCallback(
    async (product: ProductDoc) => {
      await setItemQuantity(product, 0);
    },
    [setItemQuantity]
  );

  const clearCart = useCallback(async () => {
    if (!user || !cartId) {
      throw new Error("You must be signed in to clear the cart.");
    }
    const cartRef = doc(db, "carts", cartId);
    await runTransaction(db, async (transaction) => {
      const cartSnap = await transaction.get(cartRef);
      const cartData = cartSnap.exists() ? cartSnap.data() : {};
      items.forEach((item) => {
        transaction.delete(doc(cartRef, "cartItems", item.id));
      });
      transaction.set(
        cartRef,
        {
          userId: doc(db, "users", user.uid),
          itemCount: 0,
          total: 0,
          updatedAt: serverTimestamp(),
          createdAt: cartData?.createdAt ?? serverTimestamp(),
        },
        { merge: true }
      );
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

export type { CartDoc, CartItemDoc, CartItemWithProduct, SupplierMismatchError };
