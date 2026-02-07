import { useDeferredValue, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useParams } from "react-router-dom";
import ShopShell from "@/components/shop/ShopShell";
import ProductCard from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/useCart";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import Seo from "@/lib/seo/Seo";
import { BASE_URL } from "@/lib/seo/constants";

const getUnitPrice = (price?: number, salePrice?: number, onSale?: boolean) => {
  if (onSale && typeof salePrice === "number" && salePrice > 0) return salePrice;
  return typeof price === "number" ? price : 0;
};

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Skeleton className="h-44 w-full rounded-xl" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-4 w-3/4 rounded-full" />
      </div>
      <div className="mt-5 flex items-center justify-between">
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
    </div>
  );
}

export default function SupplierShopPage() {
  const { supplierId } = useParams();
  const { products, loading } = useProducts();
  const { cartItems } = useCart();
  const { supplierMap } = useSuppliers();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const trimmedSearch = search.trim();
  const isSearching = trimmedSearch.length > 0;

  const supplier = supplierId ? supplierMap[supplierId] : undefined;
  const supplierLogo =
    (supplier?.logo_url as string) ||
    (supplier?.logoUrl as string) ||
    (supplier?.logo as string);
  const absoluteSupplierLogo = supplierLogo
    ? supplierLogo.startsWith("http")
      ? supplierLogo
      : `${BASE_URL}${supplierLogo.startsWith("/") ? "" : "/"}${supplierLogo}`
    : undefined;

  const supplierProducts = useMemo(() => {
    if (!supplierId) return [];
    return products.filter((product) => {
      const quantity = typeof product.quantity === "number" ? product.quantity : 1;
      const price = getUnitPrice(product.price, product.sale_price, product.on_sale);
      if (quantity <= 0 || price <= 0) return false;
      return product.supplierRef && product.supplierRef.id === supplierId;
    });
  }, [products, supplierId]);
  const visibleProducts = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    if (!needle) return supplierProducts;
    return supplierProducts.filter((product) =>
      (product.name ?? "").toLowerCase().includes(needle)
    );
  }, [supplierProducts, deferredSearch]);
  const cartQuantityByProductId = useMemo(() => {
    return cartItems.reduce<Record<string, number>>((acc, item) => {
      const productId = item.productIdValue ?? item.productRef?.id ?? null;
      if (!productId) return acc;
      const qty = typeof item.quantity === "number" ? item.quantity : 0;
      if (qty <= 0) return acc;
      acc[productId] = (acc[productId] ?? 0) + qty;
      return acc;
    }, {});
  }, [cartItems]);
  const canonicalPath = supplierId ? `/shop/supplier/${supplierId}` : "/shop/suppliers";
  const supplierName = supplier?.name ?? "Supplier";
  const seoDescription = supplier
    ? `Shop ${supplierName} on TwoPaws for pet food, accessories, and essentials with delivery in Egypt.`
    : "Browse supplier shops on TwoPaws and discover pet products available for delivery in Egypt.";
  const structuredData = useMemo(() => {
    if (!supplierId) return undefined;

    return [
      {
        "@context": "https://schema.org",
        "@type": "Store",
        name: supplierName,
        url: `${BASE_URL}${canonicalPath}`,
        image: absoluteSupplierLogo ? [absoluteSupplierLogo] : undefined,
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${supplierName} products`,
        numberOfItems: supplierProducts.length,
        itemListElement: supplierProducts.slice(0, 24).map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: product.name ?? `Product ${index + 1}`,
          url: `${BASE_URL}/shop/product/${product.id}`,
        })),
      },
    ];
  }, [absoluteSupplierLogo, canonicalPath, supplierId, supplierName, supplierProducts]);

  const headerSearch = (
    <div className="mx-auto flex w-full max-w-[980px] items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`Search in ${supplier?.name ?? "supplier"}...`}
          className="h-11 rounded-full border-slate-300 bg-white pl-10 pr-4 text-sm shadow-sm"
        />
      </div>
      {isSearching && (
        <Button
          variant="outline"
          className="hidden border-slate-200 sm:inline-flex"
          onClick={() => setSearch("")}
        >
          Clear
        </Button>
      )}
    </div>
  );

  return (
    <ShopShell headerContent={headerSearch}>
      <Seo
        title={`${supplierName} | TwoPaws Supplier Shop`}
        description={seoDescription}
        canonicalUrl={canonicalPath}
        structuredData={structuredData}
        noIndex={!loading && !supplier}
      />
      <header className="space-y-2">
        <p className="text-sm font-semibold text-brand-olive">Supplier shop</p>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
          {supplierName}
        </h1>
        <p className="text-slate-600">Explore products sold by this supplier.</p>
        <p className="text-sm text-slate-500">
          {isSearching
            ? `Results for "${trimmedSearch}" (${visibleProducts.length})`
            : `${visibleProducts.length} products`}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {loading &&
          Array.from({ length: 8 }).map((_, index) => (
            <ProductCardSkeleton key={`supplier-product-skeleton-${index}`} />
          ))}
        {!loading && visibleProducts.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <p className="text-sm text-slate-600">
              {isSearching
                ? "No products match your search."
                : "No products found for this supplier."}
            </p>
          </div>
        )}
        {visibleProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            supplierId={supplierId}
            supplierName={supplier?.name}
            supplierLogo={supplierLogo}
            cartQuantity={cartQuantityByProductId[product.id] ?? 0}
          />
        ))}
      </section>
    </ShopShell>
  );
}
