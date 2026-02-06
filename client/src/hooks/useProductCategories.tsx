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

export type ProductCategoryDoc = {
  id: string;
  name?: string;
  pic?: string;
  icon?: string;
  image?: string;
  [key: string]: unknown;
};

const mapSnapshot = (snap: QuerySnapshot<DocumentData>) =>
  snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

export function useProductCategories() {
  const [categories, setCategories] = useState<ProductCategoryDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isReactSnapPrerender()) {
      getDocs(collection(db, "productCategories"))
        .then((snap) => setCategories(mapSnapshot(snap)))
        .finally(() => setLoading(false));
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, "productCategories"),
      (snap) => {
        setCategories(mapSnapshot(snap));
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const categoryMap = useMemo(() => {
    return categories.reduce<Record<string, ProductCategoryDoc>>(
      (acc, category) => {
        acc[category.id] = category;
        return acc;
      },
      {}
    );
  }, [categories]);

  return { categories, categoryMap, loading };
}
