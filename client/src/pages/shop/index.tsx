import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Search,
} from "lucide-react";
import ShopShell from "@/components/shop/ShopShell";
import ProductCard from "@/components/shop/ProductCard";
import { SupplierPicker } from "@/components/shop/SupplierPicker";
import { Input } from "@/components/ui/input";
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

export default function ShopPage() {
  const { products, loading } = useProducts();
  const { categories } = useProductCategories();
  const { supplierMap, suppliers } = useSuppliers();
  const { addItem } = useCart();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [supplierMode, setSupplierMode] = useState<"all" | "single">("all");
  const [sort, setSort] = useState("price-asc");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(true);
  const [brandOpen, setBrandOpen] = useState(true);
  const [storeOpen, setStoreOpen] = useState(true);
  const [priceOpen, setPriceOpen] = useState(true);
  const [brandSelections, setBrandSelections] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(12);
  const [page, setPage] = useState<number>(1);

  const sortOptions = useMemo(() => {
    const hasNewest = products.some((product) => product.created_at || product.createdAt);
    const hasPopularity = products.some(
      (product) => typeof product.popularity === "number"
    );
    const base = [
      { value: "price-asc", label: "Price: Low to High" },
      { value: "price-desc", label: "Price: High to Low" },
    ];
    if (hasNewest) base.push({ value: "newest", label: "Newest" });
    if (hasPopularity) base.push({ value: "popularity", label: "Popularity" });
    return base;
  }, [products]);

  const categoryNameMap = useMemo(() => {
    return categories.reduce<Record<string, string>>((acc, cat) => {
      acc[cat.id] = cat.name ?? "Category";
      return acc;
    }, {});
  }, [categories]);

  const filteredProducts = useMemo(() => {
    let data = [...products];

    data = data.filter((product) => {
      const quantity =
        typeof product.quantity === "number" ? product.quantity : 1;
      const price = getUnitPrice(product.price, product.sale_price, product.on_sale);
      return quantity > 0 && price > 0;
    });

    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      data = data.filter((product) =>
        (product.name ?? "").toLowerCase().includes(needle)
      );
    }

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

    if (brandSelections.length > 0) {
      data = data.filter((product) => {
        const supplierId = product.supplierRef?.id;
        return supplierId ? brandSelections.includes(supplierId) : false;
      });
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

    data.sort((a, b) => {
      switch (sort) {
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
          return (
            getUnitPrice(a.price, a.sale_price, a.on_sale) -
            getUnitPrice(b.price, b.sale_price, b.on_sale)
          );
      }
    });

    return data;
  }, [
    products,
    search,
    selectedCategory,
    selectedSupplier,
    brandSelections,
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

  const visibleCategories = useMemo(
    () => (showAllCategories ? categories : categories.slice(0, 8)),
    [categories, showAllCategories]
  );
  const hiddenCategoryCount = Math.max(categories.length - visibleCategories.length, 0);

  const brandOptions = useMemo(() => suppliers.slice(0, 8), [suppliers]);

  const toggleBrand = (supplierId: string) => {
    setBrandSelections((prev) =>
      prev.includes(supplierId)
        ? prev.filter((id) => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const handleAdd = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    try {
      await addItem(product, 1);
      toast({ title: "Added to cart", description: product.name ?? "Item" });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unable to add this item right now.";
      toast({ title: "Add to cart failed", description: message, variant: "destructive" });
    }
  };

  return (
    <ShopShell>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="h-10 pl-9 text-sm"
            />
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
                      <label htmlFor={`cat-${category.id}`} className="text-sm text-slate-800">
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
                onClick={() => setStoreOpen((v) => !v)}
              >
                Stores
                {storeOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {storeOpen && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="store-all"
                      checked={selectedSupplier === "all"}
                      onCheckedChange={() => {
                        setSelectedSupplier("all");
                        setSupplierMode("all");
                        setPage(1);
                      }}
                      className="h-5 w-5 rounded-sm"
                    />
                    <label htmlFor="store-all" className="text-sm text-slate-800">
                      All suppliers
                    </label>
                  </div>
                  {suppliers.map((supplier) => (
                    <div key={supplier.id} className="flex items-center gap-3">
                      <Checkbox
                        id={`store-${supplier.id}`}
                        checked={selectedSupplier === supplier.id}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedSupplier(supplier.id);
                            setSupplierMode("single");
                          } else {
                            setSelectedSupplier("all");
                            setSupplierMode("all");
                          }
                          setPage(1);
                        }}
                        className="h-5 w-5 rounded-sm"
                      />
                      <label htmlFor={`store-${supplier.id}`} className="text-sm text-slate-800">
                        {supplier.name ?? "Supplier"}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <button
                type="button"
                className="flex w-full items-center justify-between text-sm font-semibold text-slate-800"
                onClick={() => setBrandOpen((v) => !v)}
              >
                Top Brand
                {brandOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {brandOpen && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="brand-all"
                      checked={brandSelections.length === 0}
                      onCheckedChange={() => setBrandSelections([])}
                      className="h-5 w-5 rounded-sm"
                    />
                    <label htmlFor="brand-all" className="text-sm text-slate-800">
                      All brands
                    </label>
                  </div>
                  {brandOptions.map((brand) => (
                    <div key={brand.id} className="flex items-center gap-3">
                      <Checkbox
                        id={`brand-${brand.id}`}
                        checked={brandSelections.includes(brand.id)}
                        onCheckedChange={() => toggleBrand(brand.id)}
                        className="h-5 w-5 rounded-sm"
                      />
                      <label htmlFor={`brand-${brand.id}`} className="text-sm text-slate-800">
                        {brand.name ?? "Brand"}
                      </label>
                    </div>
                  ))}
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
        </aside>

        <div className="flex flex-col gap-4">
          <header className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-slate-800">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold">Total items: {totalItems}</span>
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
              <div className="ml-auto flex items-center gap-2">
                <span>Sort by</span>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="h-8 w-40">
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
                <p className="text-sm font-semibold text-slate-800">Supplier mode</p>
                <p className="text-xs text-slate-500">
                  Shop across all suppliers or lock to one store.
                </p>
              </div>
            </div>
            <div className="mt-3">
              <SupplierPicker
                suppliers={suppliers}
                selectedSupplierId={selectedSupplier}
                supplierMode={supplierMode}
                loading={false}
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

          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {loading && (
              <p className="text-sm text-slate-500">Loading products...</p>
            )}
            {!loading && visibleProducts.length === 0 && (
              <p className="text-sm text-slate-500">No products found.</p>
            )}
            {visibleProducts.map((product) => {
              const supplierId = product.supplierRef?.id;
              const supplier = supplierId ? supplierMap[supplierId] : undefined;
              const supplierName = supplier?.name;
              const supplierLogo =
                (supplier?.logo_url as string) ||
                (supplier?.logoUrl as string) ||
                (supplier?.logo as string);
              const categoryId = getCategoryIds(product.categories as unknown[])[0];
              const categoryName = categoryId ? categoryNameMap[categoryId] : undefined;
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  supplierId={supplierId}
                  supplierName={supplierName}
                  supplierLogo={supplierLogo}
                  categoryName={categoryName}
                  onAdd={() => handleAdd(product.id)}
                />
              );
            })}
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-50"
                disabled={currentPage === 1}
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
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="text-xs text-slate-500">
              Showing {pageStart + 1}-{Math.min(pageEnd, totalItems)} of {totalItems}
            </div>
          </footer>
        </div>
      </div>
    </ShopShell>
  );
}
