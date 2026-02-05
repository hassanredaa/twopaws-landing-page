import { Card, CardContent } from "@/components/ui/card";
import type { ProductDoc } from "@/hooks/useProducts";
import { formatCurrency } from "@/lib/format";
import { Info } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const getPhoto = (photoUrl?: string[] | string) => {
  if (Array.isArray(photoUrl)) return photoUrl[0];
  return photoUrl;
};

const getUnitLabel = (product: ProductDoc) => {
  const unitCandidates = [
    (product as { unit?: string }).unit,
    (product as { packSize?: string }).packSize,
    (product as { packageSize?: string }).packageSize,
    (product as { size?: string }).size,
    (product as { variant?: string }).variant,
  ].filter(Boolean) as string[];

  return unitCandidates[0] ?? null;
};

type ProductCardProps = {
  product: ProductDoc;
  supplierName?: string;
  supplierId?: string;
  supplierLogo?: string;
  categoryName?: string;
  onAdd?: () => void;
};

export default function ProductCard({
  product,
  categoryName,
  onAdd,
}: ProductCardProps) {
  const navigate = useNavigate();
  const photo = getPhoto(product.photo_url);
  const price = typeof product.price === "number" ? product.price : 0;
  const salePrice = typeof product.sale_price === "number" ? product.sale_price : 0;
  const showSale = product.on_sale && salePrice > 0;
  const stock = typeof product.quantity === "number" ? product.quantity : 0;
  const unitLabel = getUnitLabel(product);
  const isOutOfStock = stock <= 0;

  return (
    <Link to={`/shop/product/${product.id}`} className="block h-full">
      <Card className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
        <div className="relative flex h-56 w-full items-center justify-center overflow-hidden bg-white">
          {photo ? (
            <img
              src={photo}
              alt={product.name ?? "Product"}
              className={`h-full w-full object-contain p-4 transition ${isOutOfStock ? "opacity-60" : ""}`}
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-50 text-sm text-slate-400">
              No image
            </div>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              navigate(`/shop/product/${product.id}`);
            }}
            className="absolute bottom-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700"
            aria-label="View details"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>

        <CardContent className="flex flex-1 flex-col gap-1 p-4">
          {categoryName ? (
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {categoryName}
            </p>
          ) : null}
          <h3 className="text-base font-semibold leading-snug text-slate-900 line-clamp-2">
            {product.name ?? "Untitled product"}
          </h3>
          {unitLabel ? (
            <p className="text-xs text-muted-foreground">{unitLabel}</p>
          ) : null}
          {isOutOfStock && (
            <p className="text-xs text-slate-500">Out of stock</p>
          )}

          <div className="mt-auto flex items-end justify-between pt-3">
            <div className="flex items-center gap-2">
              {showSale ? (
                <>
                  <span className="text-sm font-semibold text-brand-green-dark">
                    {formatCurrency(salePrice)}
                  </span>
                  <span className="text-xs text-slate-400 line-through">
                    {formatCurrency(price)}
                  </span>
                </>
              ) : (
                <span className="text-sm font-semibold text-brand-green-dark">
                  {formatCurrency(price)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                onAdd?.();
              }}
              className="text-xs font-semibold uppercase text-red-500 hover:text-red-600"
            >
              Add +
            </button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
