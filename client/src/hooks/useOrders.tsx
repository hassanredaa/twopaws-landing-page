import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type DocumentReference,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

export type OrderDoc = {
  id: string;
  buyerId?: DocumentReference;
  shippingCost?: number;
  supplierRef?: DocumentReference;
  shippingAddress?: DocumentReference;
  totalPrice?: number;
  orderNumber?: number;
  created_at?: Timestamp;
  createdAt?: Timestamp;
  updated_at?: Timestamp;
  updatedAt?: Timestamp;
  success?: boolean;
  status?: string;
  orderStatus?: string;
  [key: string]: unknown;
};

const toMillis = (value: Timestamp | undefined) =>
  value?.toMillis ? value.toMillis() : 0;

export function useOrders() {
  const { user, userRef } = useAuth();
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !userRef) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "orders"), where("buyerId", "==", userRef));
    const unsubscribe = onSnapshot(q, (snap) => {
      const next = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as OrderDoc[];

      next.sort((a, b) => {
        const aTime = toMillis(a.created_at ?? a.createdAt);
        const bTime = toMillis(b.created_at ?? b.createdAt);
        return bTime - aTime;
      });

      setOrders(next);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, userRef]);

  return { orders, loading };
}

export function useOrder(orderId?: string) {
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !orderId) {
      setOrder(null);
      setLoading(false);
      return;
    }
    const orderRef = doc(db, "orders", orderId);
    const unsubscribe = onSnapshot(orderRef, (snap) => {
      if (!snap.exists()) {
        setOrder(null);
      } else {
        setOrder({ id: snap.id, ...snap.data() } as OrderDoc);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, orderId]);

  return { order, loading };
}
