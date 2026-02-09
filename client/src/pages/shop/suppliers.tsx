import { useDeferredValue, useMemo, useState } from "react";
import { Search } from "lucide-react";
import ShopShell from "@/components/shop/ShopShell";
import SupplierCard from "@/components/shop/SupplierCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSuppliers } from "@/hooks/useSuppliers";
import Seo from "@/lib/seo/Seo";
import { BASE_URL } from "@/lib/seo/constants";

function SupplierCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-36 rounded-full" />
          <Skeleton className="h-3 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const { suppliers, loading } = useSuppliers();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const trimmedSearch = search.trim();
  const isSearching = trimmedSearch.length > 0;
  const activeSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.isActive !== false),
    [suppliers]
  );
  const visibleSuppliers = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    if (!needle) return activeSuppliers;
    return activeSuppliers.filter((supplier) =>
      (supplier.name ?? "").toLowerCase().includes(needle)
    );
  }, [activeSuppliers, deferredSearch]);
  const seoDescription =
    "Browse all verified TwoPaws supplier shops and explore pet products available for delivery in Egypt.";
  const structuredData = useMemo(() => {
    return [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "TwoPaws Suppliers",
        description: seoDescription,
        url: `${BASE_URL}/shop/suppliers/`,
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "TwoPaws supplier shops",
        numberOfItems: activeSuppliers.length,
        itemListElement: activeSuppliers.slice(0, 50).map((supplier, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: supplier.name ?? `Supplier ${index + 1}`,
          url: `${BASE_URL}/shop/supplier/${supplier.id}/`,
        })),
      },
    ];
  }, [activeSuppliers]);

  const headerSearch = (
    <div className="mx-auto flex w-full max-w-[980px] items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search suppliers..."
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
        title="Supplier Shops | TwoPaws Shop"
        description={seoDescription}
        canonicalUrl="/shop/suppliers/"
        structuredData={structuredData}
      />
      <header className="space-y-2">
        <p className="text-sm font-semibold text-brand-olive">Suppliers</p>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Shop by supplier</h1>
        <p className="text-slate-600">Browse verified suppliers and their catalogs.</p>
        <p className="text-sm text-slate-500">
          {isSearching
            ? `Results for "${trimmedSearch}" (${visibleSuppliers.length})`
            : `${visibleSuppliers.length} suppliers`}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading &&
          Array.from({ length: 6 }).map((_, index) => (
            <SupplierCardSkeleton key={`supplier-skeleton-${index}`} />
          ))}
        {!loading && visibleSuppliers.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <p className="text-sm text-slate-600">
              {isSearching
                ? "No suppliers match your search."
                : "No suppliers available right now."}
            </p>
          </div>
        )}
        {visibleSuppliers.map((supplier) => (
          <SupplierCard key={supplier.id} supplier={supplier} />
        ))}
      </section>
    </ShopShell>
  );
}
