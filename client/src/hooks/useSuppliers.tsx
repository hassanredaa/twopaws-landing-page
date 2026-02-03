import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type SupplierDoc = {
  id: string;
  name?: string;
  logo_url?: string;
  logoUrl?: string;
  logo?: string;
  isActive?: boolean;
  [key: string]: unknown;
};

const mapSnapshot = (snap: QuerySnapshot<DocumentData>) =>
  snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<SupplierDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "suppliers"), (snap) => {
      setSuppliers(mapSnapshot(snap));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const supplierMap = useMemo(() => {
    return suppliers.reduce<Record<string, SupplierDoc>>((acc, supplier) => {
      acc[supplier.id] = supplier;
      return acc;
    }, {});
  }, [suppliers]);

  return { suppliers, supplierMap, loading };
}
