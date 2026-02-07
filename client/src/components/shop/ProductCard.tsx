import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { ProductDoc } from "@/hooks/useProducts";
import { formatCurrency } from "@/lib/format";
import { Info } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toPrerenderSafeImageSrc } from "@/lib/prerenderImage";

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
  cartQuantity?: number;
  onAdd?: (productId: string) => void;
};

function ProductCard({
  product,
  supplierName,
  cartQuantity = 0,
  onAdd,
}: ProductCardProps) {
  const navigate = useNavigate();
  const photo = getPhoto(product.photo_url);
  const photoSrc = toPrerenderSafeImageSrc(photo);
  const price = typeof product.price === "number" ? product.price : 0;
  const salePrice = typeof product.sale_price === "number" ? product.sale_price : 0;
  const showSale = product.on_sale && salePrice > 0;
  const unitLabel = getUnitLabel(product);
  const isInCart = cartQuantity > 0;

  return (
    <Link to={`/shop/product/${product.id}`} className="block h-full">
      <Card className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
        <div className="relative flex h-44 w-full items-center justify-center overflow-hidden bg-white sm:h-56">
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={product.name ?? "Product"}
              width={512}
              height={512}
              className="h-full w-full object-contain p-4 transition"
              loading="lazy"
              decoding="async"
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
          {isInCart && (
            <span className="absolute left-2 top-2 rounded-full bg-brand-olive px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-dark">
              In cart: {cartQuantity}
            </span>
          )}
        </div>

        <CardContent className="flex flex-1 flex-col gap-1 p-4">
          <h3 className="text-base font-semibold leading-snug text-slate-900 line-clamp-2">
            {product.name ?? "Untitled product"}
          </h3>
          {supplierName ? (
            <p className="text-xs text-slate-500 line-clamp-1">By {supplierName}</p>
          ) : null}
          {unitLabel ? (
            <p className="text-xs text-muted-foreground">{unitLabel}</p>
          ) : null}

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
            {onAdd ? (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  onAdd(product.id);
                }}
                className="text-xs font-semibold uppercase text-red-500 hover:text-red-600"
              >
                Add +
              </button>
            ) : (
              <span className="text-xs font-semibold uppercase text-slate-400">View</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default memo(ProductCard, (prev, next) => {
  return (
    prev.product === next.product &&
    prev.supplierName === next.supplierName &&
    prev.cartQuantity === next.cartQuantity &&
    prev.onAdd === next.onAdd
  );
});
