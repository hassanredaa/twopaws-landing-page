import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type QuerySnapshot,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ProductDoc = {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  quantity?: number;
  photo_url?: string[] | string;
  on_sale?: boolean;
  sale_price?: number;
  categories?: DocumentReference[];
  supplierRef?: DocumentReference;
  created_at?: Timestamp;
  createdAt?: Timestamp;
  popularity?: number;
  [key: string]: unknown;
};

const mapSnapshot = (snap: QuerySnapshot<DocumentData>) =>
  snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

export function useProducts() {
  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "products"), (snap) => {
      setProducts(mapSnapshot(snap));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const productMap = useMemo(() => {
    return products.reduce<Record<string, ProductDoc>>((acc, product) => {
      acc[product.id] = product;
      return acc;
    }, {});
  }, [products]);

  return { products, productMap, loading };
}
