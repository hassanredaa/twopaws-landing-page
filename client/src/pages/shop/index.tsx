import { useMemo, useState } from "react";
import ShopShell from "@/components/shop/ShopShell";
import ProductCard from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";

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

export default function ShopPage() {
  const { products, loading } = useProducts();
  const { categories } = useProductCategories();
  const { supplierMap, suppliers } = useSuppliers();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [supplierMode, setSupplierMode] = useState<"all" | "single">("all");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [sort, setSort] = useState("price-asc");

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

  const filteredProducts = useMemo(() => {
    let data = [...products];

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
  }, [products, search, selectedCategory, supplierMode, selectedSupplier, sort]);

  return (
    <ShopShell>
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-brand-olive">Marketplace</p>
        <h1 className="text-3xl font-semibold text-slate-900">Shop pet essentials</h1>
        <p className="text-slate-600">
          Browse curated pet supplies from trusted Egyptian suppliers.
        </p>
      </header>

      <section className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Search</label>
          <Input
            placeholder="Search products"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Category</label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name ?? "Category"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Sort by</label>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="mt-2">
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
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Supplier mode</p>
            <p className="text-xs text-slate-500">
              Shop across all suppliers or lock to one store.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={supplierMode === "all" ? "default" : "outline"}
              className={
                supplierMode === "all"
                  ? "bg-brand-green-dark text-white"
                  : "border-slate-200 text-slate-700"
              }
              onClick={() => {
                setSupplierMode("all");
                setSelectedSupplier("all");
              }}
            >
              All suppliers
            </Button>
            <Button
              variant={supplierMode === "single" ? "default" : "outline"}
              className={
                supplierMode === "single"
                  ? "bg-brand-green-dark text-white"
                  : "border-slate-200 text-slate-700"
              }
              onClick={() => setSupplierMode("single")}
            >
              Choose supplier
            </Button>
          </div>
        </div>

        {supplierMode === "single" && (
          <div className="max-w-sm">
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All suppliers</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name ?? "Supplier"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </section>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading && (
          <p className="text-sm text-slate-500">Loading products...</p>
        )}
        {!loading && filteredProducts.length === 0 && (
          <p className="text-sm text-slate-500">No products found.</p>
        )}
        {filteredProducts.map((product) => {
          const supplierId = product.supplierRef?.id;
          const supplier = supplierId ? supplierMap[supplierId] : undefined;
          const supplierName = supplier?.name;
          const supplierLogo =
            (supplier?.logo_url as string) ||
            (supplier?.logoUrl as string) ||
            (supplier?.logo as string);
          return (
            <ProductCard
              key={product.id}
              product={product}
              supplierId={supplierId}
              supplierName={supplierName}
              supplierLogo={supplierLogo}
            />
          );
        })}
      </section>
    </ShopShell>
  );
}
