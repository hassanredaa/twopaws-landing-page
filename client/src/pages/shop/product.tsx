import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  doc,
  onSnapshot,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import ShopShell from "@/components/shop/ShopShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useCart, type SupplierMismatchError } from "@/hooks/useCart";
import type { ProductDoc } from "@/hooks/useProducts";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { META_PIXEL_CURRENCY, trackMetaEvent } from "@/lib/metaPixel";
import Seo from "@/lib/seo/Seo";
import { BASE_URL } from "@/lib/seo/constants";

const getPhoto = (photoUrl?: string[] | string) => {
  if (Array.isArray(photoUrl)) return photoUrl;
  return photoUrl ? [photoUrl] : [];
};

const toAbsoluteUrl = (value?: string | null) => {
  if (!value) return null;
  if (value.startsWith("http")) return value;
  const prefix = value.startsWith("/") ? "" : "/";
  return `${BASE_URL}${prefix}${value}`;
};

const toSeoDescription = (value: string, maxLength = 160) => {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
};

type ShippingZoneDoc = {
  id: string;
  label?: string;
  rateEGP?: number;
  shippingEtaLabel?: string;
  shippingSlaMinHours?: number;
  shippingSlaMaxHours?: number;
  [key: string]: unknown;
};

export default function ProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { supplierMap } = useSuppliers();
  const { addItem, clearCart, activeSupplierRef } = useCart();
  const [product, setProduct] = useState<ProductDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [shippingZones, setShippingZones] = useState<ShippingZoneDoc[]>([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [pendingAdd, setPendingAdd] = useState(false);
  const viewTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    const productRef = doc(db, "products", productId);
    const unsubscribe = onSnapshot(productRef, (snap) => {
      if (!snap.exists()) {
        setProduct(null);
        setLoading(false);
        return;
      }
      setProduct({ id: snap.id, ...snap.data() } as ProductDoc);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [productId]);

  useEffect(() => {
    if (!product?.supplierRef) {
      setShippingZones([]);
      return;
    }
    const supplierId = product.supplierRef.id;
    const zonesRef = collection(db, "suppliers", supplierId, "shippingZones");
    const unsubscribe = onSnapshot(zonesRef, (snap) => {
      setShippingZones(
        snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as ShippingZoneDoc[]
      );
    });
    return () => unsubscribe();
  }, [product?.supplierRef]);

  const images = getPhoto(product?.photo_url);
  const imageUrls = images
    .map((image) => toAbsoluteUrl(image))
    .filter(Boolean) as string[];
  const supplier = product?.supplierRef ? supplierMap[product.supplierRef.id] : undefined;
  const currentSupplierName = activeSupplierRef
    ? supplierMap[activeSupplierRef.id]?.name
    : undefined;
  const price = typeof product?.price === "number" ? product?.price : 0;
  const salePrice = typeof product?.sale_price === "number" ? product?.sale_price : 0;
  const showSale = product?.on_sale && salePrice > 0;
  const stock = typeof product?.quantity === "number" ? product?.quantity : 0;
  const maxQty = Math.max(1, Math.min(stock || 1, 10));
  const productName = product?.name ?? "Product";
  const rawDescription =
    product?.description ?? "Shop premium pet supplies and accessories at TwoPaws.";
  const seoDescription = toSeoDescription(rawDescription);
  const canonicalPath = product ? `/shop/product/${product.id}` : "/shop";
  const primaryImage = imageUrls[0];
  const offerPrice = showSale ? salePrice : price;
  const structuredData = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: productName,
        description: seoDescription,
        url: `${BASE_URL}${canonicalPath}`,
        image: imageUrls.length ? imageUrls : undefined,
        sku: product.id,
        brand: supplier?.name
          ? {
              "@type": "Brand",
              name: supplier.name,
            }
          : undefined,
        offers: {
          "@type": "Offer",
          priceCurrency: META_PIXEL_CURRENCY,
          price: offerPrice,
          availability:
            stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          url: `${BASE_URL}${canonicalPath}`,
        },
      }
    : undefined;

  useEffect(() => {
    setQuantity((prev) => Math.max(1, Math.min(prev, maxQty)));
  }, [maxQty]);

  useEffect(() => {
    if (!product || viewTrackedRef.current === product.id) return;
    const unitPrice = showSale ? salePrice : price;
    trackMetaEvent("ViewContent", {
      content_ids: [product.id],
      content_type: "product",
      content_name: product.name ?? "Product",
      value: unitPrice,
      currency: META_PIXEL_CURRENCY,
    });
    viewTrackedRef.current = product.id;
  }, [product, price, salePrice, showSale]);

  const cheapestZone = useMemo(() => {
    if (!shippingZones.length) return null;
    return [...shippingZones].sort(
      (a, b) => (a.rateEGP ?? 0) - (b.rateEGP ?? 0)
    )[0];
  }, [shippingZones]);

  const handleAddToCart = async () => {
    if (!product) return;
    try {
      await addItem(product, quantity);
      const unitPrice = showSale ? salePrice : price;
      trackMetaEvent("AddToCart", {
        content_ids: [product.id],
        content_type: "product",
        content_name: product.name ?? "Product",
        value: unitPrice * quantity,
        currency: META_PIXEL_CURRENCY,
        contents: [{ id: product.id, quantity, item_price: unitPrice }],
      });
      toast({ title: "Added to cart", description: product.name });
      navigate("/cart");
    } catch (err) {
      const mismatch = err as SupplierMismatchError;
      if (mismatch?.code === "supplier-mismatch") {
        setShowSupplierModal(true);
        return;
      }
      toast({
        title: "Unable to add",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleClearAndAdd = async () => {
    if (!product) return;
    setPendingAdd(true);
    try {
      await clearCart();
      await addItem(product, quantity);
      const unitPrice = showSale ? salePrice : price;
      trackMetaEvent("AddToCart", {
        content_ids: [product.id],
        content_type: "product",
        content_name: product.name ?? "Product",
        value: unitPrice * quantity,
        currency: META_PIXEL_CURRENCY,
        contents: [{ id: product.id, quantity, item_price: unitPrice }],
      });
      toast({ title: "Cart updated", description: "New supplier selected." });
      navigate("/cart");
    } catch (err) {
      toast({
        title: "Unable to update cart",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setPendingAdd(false);
      setShowSupplierModal(false);
    }
  };

  return (
    <ShopShell>
      <Seo
        title={`${productName} | TwoPaws Shop`}
        description={seoDescription}
        canonicalUrl={canonicalPath}
        ogType="product"
        ogImageUrl={primaryImage}
        structuredData={structuredData}
      />
      {loading && <p className="text-sm text-slate-500">Loading product...</p>}
      {!loading && !product && (
        <p className="text-sm text-slate-500">Product not found.</p>
      )}
      {product && (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              {images.length ? (
                <img
                  src={images[selectedImage]}
                  alt={product.name ?? "Product"}
                  className="h-[420px] w-full object-cover"
                />
              ) : (
                <div className="flex h-[420px] w-full items-center justify-center bg-slate-100 text-slate-400">
                  No images
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    className={`overflow-hidden rounded-xl border ${
                      index === selectedImage
                        ? "border-brand-green-dark"
                        : "border-slate-100"
                    }`}
                  >
                    <img src={image} alt="Thumbnail" className="h-20 w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              {showSale && (
                <Badge className="bg-brand-olive text-brand-dark">On sale</Badge>
              )}
              <h1 className="text-3xl font-semibold text-slate-900">
                {product.name}
              </h1>
              <p className="text-slate-600">{product.description}</p>
            </div>

            <div className="flex items-center gap-3">
              {showSale ? (
                <>
                  <span className="text-3xl font-semibold text-brand-green-dark">
                    {formatCurrency(salePrice)}
                  </span>
                  <span className="text-lg text-slate-400 line-through">
                    {formatCurrency(price)}
                  </span>
                </>
              ) : (
                <span className="text-3xl font-semibold text-brand-green-dark">
                  {formatCurrency(price)}
                </span>
              )}
              <span className="text-sm text-slate-500">
                {stock > 0 ? `${stock} in stock` : "Out of stock"}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-700">Sold by</p>
              <p className="text-lg font-semibold text-brand-green-dark">
                {supplier?.name ?? "Supplier"}
              </p>
              {cheapestZone ? (
                <p className="text-sm text-slate-500">
                  Shipping from {formatCurrency(cheapestZone.rateEGP ?? 0)} · {cheapestZone.shippingEtaLabel ?? "Select at checkout"}
                </p>
              ) : (
                <p className="text-sm text-slate-500">Select shipping at checkout.</p>
              )}
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">Quantity</label>
                <Input
                  type="number"
                  min={1}
                  max={maxQty}
                  value={quantity}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isNaN(next)) return;
                    setQuantity(Math.max(1, Math.min(next, maxQty)));
                  }}
                  className="w-24"
                />
              </div>
              <Button
                className="bg-brand-green-dark text-white"
                disabled={stock <= 0}
                onClick={handleAddToCart}
              >
                Add to cart
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={showSupplierModal} onOpenChange={setShowSupplierModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              Your cart contains items from {currentSupplierName ?? "another supplier"}. Clear the cart to shop from {supplier?.name ?? "this supplier"}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingAdd}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAndAdd} disabled={pendingAdd}>
              Clear & Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ShopShell>
  );
}
