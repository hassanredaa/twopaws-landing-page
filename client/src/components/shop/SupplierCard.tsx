import { Card, CardContent } from "@/components/ui/card";
import type { SupplierDoc } from "@/hooks/useSuppliers";

const getLogo = (supplier: SupplierDoc) =>
  (supplier.logo_url as string) || (supplier.logoUrl as string) || (supplier.logo as string);

type SupplierCardProps = {
  supplier: SupplierDoc;
};

export default function SupplierCard({ supplier }: SupplierCardProps) {
  const logo = getLogo(supplier);

  return (
    <a href={`/shop/supplier/${supplier.id}`}>
      <Card className="flex h-full items-center gap-4 border-slate-100 p-4 shadow-sm transition hover:shadow-md">
        {logo ? (
          <img src={logo} alt={supplier.name ?? "Supplier"} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400">
            Logo
          </div>
        )}
        <CardContent className="p-0">
          <h3 className="text-lg font-semibold text-slate-900">
            {supplier.name ?? "Supplier"}
          </h3>
          <p className="text-sm text-slate-500">Browse products</p>
        </CardContent>
      </Card>
    </a>
  );
}
