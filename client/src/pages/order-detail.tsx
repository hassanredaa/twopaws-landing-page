import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  doc,
  onSnapshot,
  type DocumentReference,
} from "firebase/firestore";
import ShopShell from "@/components/shop/ShopShell";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useOrder } from "@/hooks/useOrders";
import { formatAddress } from "@/hooks/useAddresses";
import type { ProductDoc } from "@/hooks/useProducts";

const formatDate = (timestamp?: { toMillis?: () => number }) => {
  const millis = timestamp?.toMillis?.();
  if (!millis) return "";
  return new Date(millis).toLocaleDateString("en-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

type OrderItemDoc = {
  id: string;
  productRef?: DocumentReference;
  quantity?: number;
  [key: string]: unknown;
};

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const { order, loading } = useOrder(orderId);
  const [items, setItems] = useState<OrderItemDoc[]>([]);
  const [productsById, setProductsById] = useState<Record<string, ProductDoc>>({});
  const [address, setAddress] = useState<Record<string, unknown> | null>(null);
  const [supplier, setSupplier] = useState<Record<string, unknown> | null>(null);
  const productUnsubs = useRef<Record<string, () => void>>({});

  useEffect(() => {
    if (!orderId) return;
    const itemsRef = collection(db, "orders", orderId, "orderItems");
    const unsubscribe = onSnapshot(itemsRef, (snap) => {
      setItems(
        snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as OrderItemDoc[]
      );
    });
    return () => unsubscribe();
  }, [orderId]);

  useEffect(() => {
    if (!order?.shippingAddress) {
      setAddress(null);
      return;
    }
    const addressRef = order.shippingAddress as DocumentReference;
    const unsubscribe = onSnapshot(addressRef, (snap) => {
      setAddress(snap.exists() ? (snap.data() as Record<string, unknown>) : null);
    });
    return () => unsubscribe();
  }, [order?.shippingAddress]);

  useEffect(() => {
    if (!order?.supplierRef) {
      setSupplier(null);
      return;
    }
    const supplierRef = order.supplierRef as DocumentReference;
    const unsubscribe = onSnapshot(supplierRef, (snap) => {
      setSupplier(snap.exists() ? (snap.data() as Record<string, unknown>) : null);
    });
    return () => unsubscribe();
  }, [order?.supplierRef]);

  useEffect(() => {
    const currentUnsubs = productUnsubs.current;
    const activeIds = new Set<string>();

    items.forEach((item) => {
      if (!item.productRef) return;
      const productId = item.productRef.id;
      activeIds.add(productId);
      if (currentUnsubs[productId]) return;

      currentUnsubs[productId] = onSnapshot(item.productRef, (snap) => {
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

  const promoCode = (order as Record<string, unknown>)?.promoCode as string | undefined;
  const promoDiscount =
    (order as any)?.promoDiscount ??
    (order as any)?.discount ??
    (order as any)?.promo?.discount;

  const orderItems = useMemo(() => {
    return items.map((item) => {
      const productId = item.productRef?.id;
      const product = productId ? productsById[productId] : undefined;
      return { ...item, product };
    });
  }, [items, productsById]);

  if (!user) {
    return (
      <ShopShell>
        <Card className="border-slate-100">
          <CardContent className="p-6">Sign in to view orders.</CardContent>
        </Card>
      </ShopShell>
    );
  }

  return (
    <ShopShell>
      {loading && <p className="text-sm text-slate-500">Loading order...</p>}
      {!loading && !order && (
        <p className="text-sm text-slate-500">Order not found.</p>
      )}
      {order && (
        <div className="space-y-6">
          <header className="space-y-2">
            <p className="text-sm font-semibold text-brand-olive">Order</p>
            <h1 className="text-3xl font-semibold text-slate-900">
              Order #{order.orderNumber ?? order.id.slice(0, 6)}
            </h1>
            <p className="text-sm text-slate-500">
              {order.status ?? order.orderStatus ?? "Processing"} · {formatDate(order.created_at ?? order.createdAt)}
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <Card className="border-slate-100">
              <CardContent className="space-y-4 p-6">
                <h3 className="text-lg font-semibold text-slate-900">Items</h3>
                {orderItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.product?.name ?? "Product"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Qty {item.quantity ?? 1}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border-slate-100">
                <CardContent className="space-y-3 p-4">
                  <h3 className="text-lg font-semibold text-slate-900">Summary</h3>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Shipping</span>
                    <span>{formatCurrency(order.shippingCost ?? 0)}</span>
                  </div>
                  {promoCode && (
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Promo ({promoCode})</span>
                      <span>-{formatCurrency(Number(promoDiscount ?? 0))}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-base font-semibold text-slate-900">
                    <span>Total</span>
                    <span>{formatCurrency(order.totalPrice ?? 0)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-100">
                <CardContent className="space-y-3 p-4">
                  <h3 className="text-lg font-semibold text-slate-900">Shipping to</h3>
                  <p className="text-sm text-slate-600">
                    {formatAddress(address as any)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-100">
                <CardContent className="space-y-3 p-4">
                  <h3 className="text-lg font-semibold text-slate-900">Supplier</h3>
                  <p className="text-sm text-slate-600">
                    {(supplier?.name as string) ?? "Supplier"}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </ShopShell>
  );
}
