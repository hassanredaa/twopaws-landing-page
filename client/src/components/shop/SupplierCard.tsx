import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { SupplierDoc } from "@/hooks/useSuppliers";
import { Link } from "react-router-dom";

const getLogo = (supplier: SupplierDoc) =>
  (supplier.logo_url as string) || (supplier.logoUrl as string) || (supplier.logo as string);

type SupplierCardProps = {
  supplier: SupplierDoc;
};

function SupplierCard({ supplier }: SupplierCardProps) {
  const logo = getLogo(supplier);

  return (
    <Link to={`/shop/supplier/${supplier.id}`}>
      <Card className="flex h-full items-center gap-4 rounded-2xl border-slate-100 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        {logo ? (
          <img
            src={logo}
            alt={supplier.name ?? "Supplier"}
            className="h-14 w-14 rounded-full object-cover"
            loading="lazy"
            decoding="async"
          />
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
    </Link>
  );
}

export default memo(SupplierCard, (prev, next) => prev.supplier === next.supplier);
