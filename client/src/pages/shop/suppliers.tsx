import ShopShell from "@/components/shop/ShopShell";
import SupplierCard from "@/components/shop/SupplierCard";
import { useSuppliers } from "@/hooks/useSuppliers";

export default function SuppliersPage() {
  const { suppliers, loading } = useSuppliers();
  const activeSuppliers = suppliers.filter((supplier) => supplier.isActive !== false);

  return (
    <ShopShell>
      <header className="space-y-2">
        <p className="text-sm font-semibold text-brand-olive">Suppliers</p>
        <h1 className="text-3xl font-semibold text-slate-900">Shop by supplier</h1>
        <p className="text-slate-600">Browse verified suppliers and their catalogs.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading && <p className="text-sm text-slate-500">Loading suppliers...</p>}
        {!loading && activeSuppliers.length === 0 && (
          <p className="text-sm text-slate-500">No suppliers available.</p>
        )}
        {activeSuppliers.map((supplier) => (
          <SupplierCard key={supplier.id} supplier={supplier} />
        ))}
      </section>
    </ShopShell>
  );
}
