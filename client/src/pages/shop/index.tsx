import { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import ShopShell from "@/components/shop/ShopShell";
import ProductCard from "@/components/shop/ProductCard";
import { SupplierPicker } from "@/components/shop/SupplierPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import { META_PIXEL_CURRENCY, trackMetaEvent } from "@/lib/metaPixel";
import Seo from "@/lib/seo/Seo";
import { toPrerenderSafeImageSrc } from "@/lib/prerenderImage";

const getUnitPrice = (price?: number, salePrice?: number, onSale?: boolean) => {
  if (onSale && typeof salePrice === "number" && salePrice > 0) return salePrice;
  return typeof price === "number" ? price : 0;
};

const getCategoryIds = (categories?: unknown[]) => {
  if (!categories) return [] as string[];
  return categories
    .map((cat) => {
      if (!cat) return null;
      if (typeof cat === "string") return cat;
      if (typeof cat === "object" && "id" in (cat as { id: string })) {
        return (cat as { id: string }).id;
      }
      return null;
    })
    .filter(Boolean) as string[];
};

const PER_PAGE_OPTIONS = [12, 24, 48];
const ELLIPSIS = "ellipsis" as const;
type PageItem = number | typeof ELLIPSIS;
const PRODUCT_SKELETON_COUNT = 12;

const getPageItems = (totalPages: number, currentPage: number): PageItem[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);

  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const items: PageItem[] = [];

  sorted.forEach((page, index) => {
    items.push(page);
    const nextPage = sorted[index + 1];
    if (nextPage && nextPage - page > 1) {
      items.push(ELLIPSIS);
    }
  });

  return items;
};

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Skeleton className="h-44 w-full rounded-xl" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-20 rounded-full" />
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

export default function ShopPage() {
  const { products, productMap, loading } = useProducts();
  const { categories } = useProductCategories();
  const { suppliers, supplierMap, loading: suppliersLoading } = useSuppliers();
  const { addItem, cartItems } = useCart();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [supplierMode, setSupplierMode] = useState<"all" | "single">("all");
  const [sort, setSort] = useState("default");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(true);
  const [priceOpen, setPriceOpen] = useState(true);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(12);
  const [page, setPage] = useState<number>(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const trimmedSearch = search.trim();
  const isSearching = trimmedSearch.length > 0;

  const sortOptions = useMemo(() => {
    const hasNewest = products.some((product) => product.created_at || product.createdAt);
    const hasPopularity = products.some(
      (product) => typeof product.popularity === "number"
    );
    const base = [
      { value: "default", label: "Default" },
      { value: "price-asc", label: "Price: Low to High" },
      { value: "price-desc", label: "Price: High to Low" },
    ];
    if (hasNewest) base.push({ value: "newest", label: "Newest" });
    if (hasPopularity) base.push({ value: "popularity", label: "Popularity" });
    return base;
  }, [products]);

  const filteredProducts = useMemo(() => {
    let data = [...products];

    data = data.filter((product) => {
      const quantity =
        typeof product.quantity === "number" ? product.quantity : 1;
      const price = getUnitPrice(product.price, product.sale_price, product.on_sale);
      return quantity > 0 && price > 0;
    });

    const needle = deferredSearch.trim().toLowerCase();
    if (needle) {
      data = data.filter((product) =>
        (product.name ?? "").toLowerCase().includes(needle)
      );
    } else {
      if (selectedCategory !== "all") {
        data = data.filter((product) =>
          getCategoryIds(product.categories as unknown[]).includes(selectedCategory)
        );
      }

      if (supplierMode === "single" && selectedSupplier !== "all") {
        data = data.filter(
          (product) => product.supplierRef && product.supplierRef.id === selectedSupplier
        );
      }

      const min = Number.parseFloat(minPrice);
      const max = Number.parseFloat(maxPrice);
      const hasMin = Number.isFinite(min);
      const hasMax = Number.isFinite(max);
      if (hasMin || hasMax) {
        data = data.filter((product) => {
          const price = getUnitPrice(product.price, product.sale_price, product.on_sale);
          if (hasMin && price < min) return false;
          if (hasMax && price > max) return false;
          return true;
        });
      }
    }

    if (sort !== "default") {
      data.sort((a, b) => {
        switch (sort) {
          case "price-asc":
            return (
              getUnitPrice(a.price, a.sale_price, a.on_sale) -
              getUnitPrice(b.price, b.sale_price, b.on_sale)
            );
          case "price-desc":
            return (
              getUnitPrice(b.price, b.sale_price, b.on_sale) -
              getUnitPrice(a.price, a.sale_price, a.on_sale)
            );
          case "newest": {
            const aTime = a.created_at?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
            const bTime = b.created_at?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
            return bTime - aTime;
          }
          case "popularity":
            return (b.popularity ?? 0) - (a.popularity ?? 0);
          default:
            return 0;
        }
      });
    }

    return data;
  }, [
    products,
    deferredSearch,
    selectedCategory,
    selectedSupplier,
    minPrice,
    maxPrice,
    sort,
  ]);

  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * perPage;
  const pageEnd = pageStart + perPage;
  const visibleProducts = filteredProducts.slice(pageStart, pageEnd);
  const showingFrom = totalItems === 0 ? 0 : pageStart + 1;
  const showingTo = Math.min(pageEnd, totalItems);

  const visibleCategories = useMemo(
    () => (showAllCategories ? categories : categories.slice(0, 8)),
    [categories, showAllCategories]
  );
  const hiddenCategoryCount = Math.max(categories.length - visibleCategories.length, 0);

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

  const hasPriceFilter = minPrice.trim() !== "" || maxPrice.trim() !== "";
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== "all") count += 1;
    if (supplierMode === "single" && selectedSupplier !== "all") count += 1;
    if (hasPriceFilter) count += 1;
    return count;
  }, [
    selectedCategory,
    supplierMode,
    selectedSupplier,
    hasPriceFilter,
  ]);

  const handleAdd = useCallback(async (productId: string) => {
    const product = productMap[productId];
    if (!product) return;
    try {
      await addItem(product, 1);
      const unitPrice = getUnitPrice(product.price, product.sale_price, product.on_sale);
      trackMetaEvent("AddToCart", {
        content_ids: [product.id],
        content_type: "product",
        content_name: product.name ?? "Product",
        value: unitPrice,
        currency: META_PIXEL_CURRENCY,
        contents: [{ id: product.id, quantity: 1, item_price: unitPrice }],
      });
      toast({ title: "Added to cart", description: product.name ?? "Item" });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unable to add this item right now.";
      toast({ title: "Add to cart failed", description: message, variant: "destructive" });
    }
  }, [addItem, productMap, toast]);

  const clearFilters = useCallback(() => {
    setSelectedCategory("all");
    setSelectedSupplier("all");
    setSupplierMode("all");
    setMinPrice("");
    setMaxPrice("");
    setPage(1);
  }, []);

  const headerSearch = (
    <div className="mx-auto flex w-full max-w-[980px] items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search products, brands, and essentials..."
          className="h-11 rounded-full border-slate-300 bg-white pl-10 pr-4 text-sm shadow-sm"
        />
      </div>
      <Button
        variant="outline"
        className="border-slate-200 lg:hidden"
        onClick={() => setFiltersOpen((prev) => !prev)}
        aria-label="Toggle filters"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </Button>
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
        title="Shop | TwoPaws"
        description="Browse pet food, supplies, and accessories from trusted suppliers."
        canonicalUrl="/shop"
        ogType="website"
      />
      <div className="grid min-w-0 gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <div className="flex items-center justify-between lg:hidden">
            <p className="text-sm font-semibold text-slate-800">Filters</p>
            <Button
              variant="outline"
              className="border-slate-200"
              onClick={() => setFiltersOpen((prev) => !prev)}
            >
              {filtersOpen ? "Hide" : "Show"}
            </Button>
          </div>

          <div className={`${filtersOpen ? "block" : "hidden"} lg:block`}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {activeFilterCount > 0 ? `${activeFilterCount} active filters` : "No active filters"}
              </span>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="font-semibold text-brand-green-dark hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="mt-5 space-y-5">
            <div>
              <button
                type="button"
                className="flex w-full items-center justify-between text-sm font-semibold text-slate-800"
                onClick={() => setCategoryOpen((v) => !v)}
              >
                Category
                {categoryOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {categoryOpen && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="cat-all"
                      checked={selectedCategory === "all"}
                      onCheckedChange={() => {
                        setSelectedCategory("all");
                        setPage(1);
                      }}
                      className="h-5 w-5 rounded-sm"
                    />
                    <label htmlFor="cat-all" className="text-sm text-slate-800">
                      All items
                    </label>
                  </div>
                  {visibleCategories.map((category) => (
                    <div key={category.id} className="flex items-center gap-3">
                      <Checkbox
                        id={`cat-${category.id}`}
                        checked={selectedCategory === category.id}
                        onCheckedChange={(checked) => {
                          setSelectedCategory(checked ? category.id : "all");
                          setPage(1);
                        }}
                        className="h-5 w-5 rounded-sm"
                      />
                      <label
                        htmlFor={`cat-${category.id}`}
                        className="flex items-center gap-2 text-sm text-slate-800"
                      >
                        {(category.pic as string | undefined) && (
                          <img
                            src={toPrerenderSafeImageSrc(category.pic as string)}
                            alt={category.name ?? "Category"}
                            width={20}
                            height={20}
                            className="h-5 w-5 rounded-sm object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                        {category.name ?? "Category"}
                      </label>
                    </div>
                  ))}
                  {hiddenCategoryCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllCategories(true)}
                      className="text-sm font-semibold text-brand-green-dark"
                    >
                      + {hiddenCategoryCount} more
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <button
                type="button"
                className="flex w-full items-center justify-between text-sm font-semibold text-slate-800"
                onClick={() => setPriceOpen((v) => !v)}
              >
                Filter by Price
                {priceOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {priceOpen && (
                <div className="mt-3 space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="h-9"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage(1)}
                    className="w-full rounded-md bg-brand-green-dark px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                  >
                    FILTER
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-100 bg-gradient-to-br from-orange-100 to-orange-200 p-3 text-sm text-slate-800">
              <p className="font-semibold text-orange-900">Special promo</p>
              <p className="text-xs text-orange-800">Save on pet essentials today.</p>
            </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <header className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-slate-800">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">
                {isSearching
                  ? `Results for "${trimmedSearch}" (${totalItems})`
                  : `Total items: ${totalItems}`}
              </span>
              {search !== deferredSearch && (
                <span className="text-xs text-slate-500">Updating results...</span>
              )}
              <div className="flex items-center gap-2">
                <span>Show</span>
                <Select
                  value={String(perPage)}
                  onValueChange={(value) => {
                    setPerPage(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PER_PAGE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
                <span>Sort by</span>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="h-8 w-full sm:w-40">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </header>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Available Shops</p>
                <p className="text-xs text-slate-500">
                  Shop across all shops or lock to one shop.
                </p>
              </div>
            </div>
            <div className="mt-3">
              <SupplierPicker
                suppliers={suppliers}
                selectedSupplierId={selectedSupplier}
                supplierMode={supplierMode}
                loading={suppliersLoading}
                onSelectAll={() => {
                  setSelectedSupplier("all");
                  setSupplierMode("all");
                  setPage(1);
                }}
                onSelectSupplier={(supplierId) => {
                  setSelectedSupplier(supplierId);
                  setSupplierMode("single");
                  setPage(1);
                }}
              />
            </div>
          </section>

          <section className="grid grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {loading &&
              Array.from({ length: PRODUCT_SKELETON_COUNT }).map((_, index) => (
                <ProductCardSkeleton key={`product-skeleton-${index}`} />
              ))}
            {!loading && visibleProducts.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  {isSearching ? "No products match your search." : "No products found."}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {isSearching
                    ? "Try a different product name."
                    : "Try a different search term or reset your filters."}
                </p>
                {isSearching && (
                  <Button
                    variant="outline"
                    className="mt-4 border-slate-200"
                    onClick={() => setSearch("")}
                  >
                    Clear search
                  </Button>
                )}
                {activeFilterCount > 0 && (
                  <Button
                    variant="outline"
                    className="mt-4 border-slate-200"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
            {!loading &&
              visibleProducts.map((product) => {
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    supplierName={product.supplierRef?.id ? supplierMap[product.supplierRef.id]?.name : undefined}
                    cartQuantity={cartQuantityByProductId[product.id] ?? 0}
                    onAdd={handleAdd}
                  />
                );
              })}
          </section>

          <footer className="flex flex-wrap items-center justify-center gap-4 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-50"
                disabled={loading || currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1">
                {getPageItems(totalPages, currentPage).map((item, index) => {
                  if (item === ELLIPSIS) {
                    return (
                      <span
                        key={`ellipsis-${index}`}
                        className="flex h-8 w-8 items-center justify-center text-sm text-slate-400"
                      >
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      aria-current={currentPage === item ? "page" : undefined}
                      className={`h-8 w-8 rounded-md border text-sm ${
                        currentPage === item
                          ? "border-brand-dark text-brand-dark"
                          : "border-slate-200 text-slate-700"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-50"
                disabled={loading || currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="text-xs text-slate-500">
              Showing {showingFrom}-{showingTo} of {totalItems}
            </div>
          </footer>
        </div>
      </div>
    </ShopShell>
  );
}
