import { useMemo } from "react";
import { useParams } from "react-router-dom";
import ShopShell from "@/components/shop/ShopShell";
import ProductCard from "@/components/shop/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";

export default function SupplierShopPage() {
  const { supplierId } = useParams();
  const { products, loading } = useProducts();
  const { supplierMap } = useSuppliers();

  const supplier = supplierId ? supplierMap[supplierId] : undefined;
  const supplierLogo =
    (supplier?.logo_url as string) ||
    (supplier?.logoUrl as string) ||
    (supplier?.logo as string);

  const supplierProducts = useMemo(() => {
    if (!supplierId) return [];
    return products.filter(
      (product) => product.supplierRef && product.supplierRef.id === supplierId
    );
  }, [products, supplierId]);

  return (
    <ShopShell>
      <header className="space-y-2">
        <p className="text-sm font-semibold text-brand-olive">Supplier shop</p>
        <h1 className="text-3xl font-semibold text-slate-900">
          {supplier?.name ?? "Supplier"}
        </h1>
        <p className="text-slate-600">
          Explore products sold by this supplier.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading && (
          <p className="text-sm text-slate-500">Loading products...</p>
        )}
        {!loading && supplierProducts.length === 0 && (
          <p className="text-sm text-slate-500">No products found.</p>
        )}
        {supplierProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            supplierId={supplierId}
            supplierName={supplier?.name}
            supplierLogo={supplierLogo}
          />
        ))}
      </section>
    </ShopShell>
  );
}
