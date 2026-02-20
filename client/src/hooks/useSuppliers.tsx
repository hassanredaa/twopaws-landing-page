import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  onSnapshot,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isReactSnapPrerender } from "@/lib/isPrerender";

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

type UseSuppliersOptions = {
  realtime?: boolean;
};

export function useSuppliers(options: UseSuppliersOptions = {}) {
  const realtime = options.realtime ?? true;
  const [suppliers, setSuppliers] = useState<SupplierDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isReactSnapPrerender() || !realtime) {
      getDocs(collection(db, "suppliers"))
        .then((snap) => setSuppliers(mapSnapshot(snap)))
        .finally(() => setLoading(false));
      return;
    }

    const unsubscribe = onSnapshot(collection(db, "suppliers"), (snap) => {
      setSuppliers(mapSnapshot(snap));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [realtime]);

  const supplierMap = useMemo(() => {
    return suppliers.reduce<Record<string, SupplierDoc>>((acc, supplier) => {
      acc[supplier.id] = supplier;
      return acc;
    }, {});
  }, [suppliers]);

  return { suppliers, supplierMap, loading };
}
