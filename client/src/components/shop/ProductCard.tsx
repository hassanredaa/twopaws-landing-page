import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { ProductDoc } from "@/hooks/useProducts";
import { formatCurrency } from "@/lib/format";

const getPhoto = (photoUrl?: string[] | string) => {
  if (Array.isArray(photoUrl)) return photoUrl[0];
  return photoUrl;
};

type ProductCardProps = {
  product: ProductDoc;
  supplierName?: string;
  supplierId?: string;
  supplierLogo?: string;
};

export default function ProductCard({
  product,
  supplierName,
  supplierId,
  supplierLogo,
}: ProductCardProps) {
  const photo = getPhoto(product.photo_url);
  const price = typeof product.price === "number" ? product.price : 0;
  const salePrice = typeof product.sale_price === "number" ? product.sale_price : 0;
  const showSale = product.on_sale && salePrice > 0;
  const stock = typeof product.quantity === "number" ? product.quantity : 0;

  return (
    <Card className="overflow-hidden border-slate-100 shadow-sm transition hover:shadow-md">
      <div className="relative">
        {photo ? (
          <img src={photo} alt={product.name ?? "Product"} className="h-48 w-full object-cover" />
        ) : (
          <div className="flex h-48 w-full items-center justify-center bg-slate-100 text-sm text-slate-400">
            No image
          </div>
        )}
        {showSale && (
          <Badge className="absolute left-3 top-3 bg-brand-olive text-brand-dark">
            Sale
          </Badge>
        )}
      </div>
      <CardContent className="space-y-2 p-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">
            {product.name ?? "Untitled product"}
          </h3>
          {supplierName && supplierId && (
            <a
              href={`/shop/supplier/${supplierId}`}
              className="flex items-center gap-2 text-sm font-medium text-brand-green-dark hover:underline"
            >
              {supplierLogo ? (
                <img
                  src={supplierLogo}
                  alt={supplierName}
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : null}
              {supplierName}
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showSale ? (
            <>
              <span className="text-lg font-semibold text-brand-green-dark">
                {formatCurrency(salePrice)}
              </span>
              <span className="text-sm text-slate-400 line-through">
                {formatCurrency(price)}
              </span>
            </>
          ) : (
            <span className="text-lg font-semibold text-brand-green-dark">
              {formatCurrency(price)}
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500">
          {stock > 0 ? `${stock} in stock` : "Out of stock"}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full bg-brand-green-dark text-white">
          <a href={`/shop/product/${product.id}`}>View product</a>
        </Button>
      </CardFooter>
    </Card>
  );
}
