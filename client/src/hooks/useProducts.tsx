import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  documentId,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  type DocumentData,
  type DocumentReference,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isReactSnapPrerender } from "@/lib/isPrerender";

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

type UseProductsMode = "all" | "paginated";

type UseProductsOptions = {
  mode?: UseProductsMode;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 120;

const mapSnapshot = (snap: QuerySnapshot<DocumentData>) =>
  snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

const buildPaginatedQuery = (
  pageSize: number,
  cursor?: QueryDocumentSnapshot<DocumentData> | null
) => {
  const constraints: QueryConstraint[] = [orderBy(documentId()), limit(pageSize)];
  if (cursor) constraints.splice(1, 0, startAfter(cursor));
  return query(collection(db, "products"), ...constraints);
};

export function useProducts(options: UseProductsOptions = {}) {
  const mode = options.mode ?? "all";
  const pageSize = Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE);

  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(mode === "paginated");

  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const requestIdRef = useRef(0);
  const isFetchingRef = useRef(false);
  const hasMoreRef = useRef(mode === "paginated");

  const loadMore = useCallback(async () => {
    if (mode !== "paginated") return false;
    if (isFetchingRef.current || !hasMoreRef.current) return false;

    const requestId = requestIdRef.current;
    isFetchingRef.current = true;
    setLoadingMore(true);
    try {
      const snap = await getDocs(buildPaginatedQuery(pageSize, cursorRef.current));
      if (requestIdRef.current !== requestId) return false;

      const nextProducts = mapSnapshot(snap);
      if (nextProducts.length > 0) {
        setProducts((prev) => [...prev, ...nextProducts]);
      }

      cursorRef.current = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : cursorRef.current;
      const nextHasMore = snap.docs.length === pageSize;
      hasMoreRef.current = nextHasMore;
      setHasMore(nextHasMore);
      return nextProducts.length > 0;
    } finally {
      if (requestIdRef.current === requestId) {
        isFetchingRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [mode, pageSize]);

  useEffect(() => {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    cursorRef.current = null;
    isFetchingRef.current = false;
    setProducts([]);
    setLoading(true);
    setLoadingMore(false);

    if (isReactSnapPrerender()) {
      const pathname =
        typeof window !== "undefined" ? window.location.pathname : "/";
      const prerenderLimit =
        mode === "paginated"
          ? pageSize
          : pathname.startsWith("/shop/product/")
            ? 24
            : 120;
      const productsQuery = query(collection(db, "products"), limit(prerenderLimit));

      hasMoreRef.current = false;
      setHasMore(false);
      getDocs(productsQuery)
        .then((snap) => {
          if (requestIdRef.current !== requestId) return;
          setProducts(mapSnapshot(snap));
        })
        .finally(() => {
          if (requestIdRef.current !== requestId) return;
          setLoading(false);
          setLoadingMore(false);
        });
      return () => {
        requestIdRef.current += 1;
      };
    }

    if (mode === "paginated") {
      hasMoreRef.current = true;
      setHasMore(true);

      const bootstrap = async () => {
        isFetchingRef.current = true;
        setLoadingMore(true);
        try {
          const snap = await getDocs(buildPaginatedQuery(pageSize));
          if (requestIdRef.current !== requestId) return;

          setProducts(mapSnapshot(snap));
          cursorRef.current = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
          const nextHasMore = snap.docs.length === pageSize;
          hasMoreRef.current = nextHasMore;
          setHasMore(nextHasMore);
        } finally {
          if (requestIdRef.current !== requestId) return;
          isFetchingRef.current = false;
          setLoading(false);
          setLoadingMore(false);
        }
      };

      void bootstrap();
      return () => {
        requestIdRef.current += 1;
      };
    }

    hasMoreRef.current = false;
    setHasMore(false);
    const unsubscribe = onSnapshot(collection(db, "products"), (snap) => {
      if (requestIdRef.current !== requestId) return;
      setProducts(mapSnapshot(snap));
      setLoading(false);
    });
    return () => {
      unsubscribe();
      requestIdRef.current += 1;
    };
  }, [mode, pageSize]);

  const productMap = useMemo(() => {
    return products.reduce<Record<string, ProductDoc>>((acc, product) => {
      acc[product.id] = product;
      return acc;
    }, {});
  }, [products]);

  return { products, productMap, loading, loadingMore, hasMore, loadMore };
}
