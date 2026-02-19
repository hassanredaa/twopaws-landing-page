import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import ShopShell from "@/components/shop/ShopShell";
import ProductCard from "@/components/shop/ProductCard";
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
import { useProducts, type ProductDoc } from "@/hooks/useProducts";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { META_PIXEL_CURRENCY, trackMetaEvent } from "@/lib/metaPixel";
import Seo from "@/lib/seo/Seo";
import { BASE_URL } from "@/lib/seo/constants";
import { isReactSnapPrerender } from "@/lib/isPrerender";
import { toPrerenderSafeImageSrc } from "@/lib/prerenderImage";

const getPhoto = (photoUrl?: string[] | string) => {
  if (Array.isArray(photoUrl)) return photoUrl;
  return photoUrl ? [photoUrl] : [];
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

const getUnitPrice = (price?: number, salePrice?: number, onSale?: boolean) => {
  if (onSale && typeof salePrice === "number" && salePrice > 0) return salePrice;
  return typeof price === "number" ? price : 0;
};
const IMAGE_LENS_SIZE = 180;
const IMAGE_ZOOM_SCALE = 2.2;

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

const PRODUCT_BRAND_KEYS = [
  "brand",
  "brand_name",
  "brandName",
  "manufacturer",
  "vendor",
] as const;
const PRODUCT_SKU_KEYS = ["sku", "item_sku", "itemSku"] as const;
const PRODUCT_MPN_KEYS = ["mpn", "manufacturer_part_number", "manufacturerPartNumber"] as const;
const PRODUCT_GTIN_KEYS = [
  "gtin",
  "gtin8",
  "gtin12",
  "gtin13",
  "gtin14",
  "barcode",
  "barcodeNumber",
  "barcode_number",
  "ean",
  "upc",
] as const;
const PRODUCT_CATEGORY_KEYS = ["google_product_category", "product_type", "categoryName"] as const;
const PRODUCT_CONDITION_KEYS = ["condition", "itemCondition", "item_condition"] as const;

const getFirstString = (record: Record<string, unknown>, keys: readonly string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
};

const normalizeGtin = (value?: string) => {
  if (!value) return undefined;
  const digits = value.replace(/\D+/g, "");
  if (!digits) return undefined;
  if ([8, 12, 13, 14].includes(digits.length)) return digits;
  return undefined;
};

const resolveItemCondition = (raw?: string) => {
  const condition = String(raw || "").trim().toLowerCase();
  if (condition.includes("used")) return "https://schema.org/UsedCondition";
  if (condition.includes("refurb")) return "https://schema.org/RefurbishedCondition";
  return "https://schema.org/NewCondition";
};

const buildPriceValidUntil = (daysAhead = 30) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysAhead);
  return date.toISOString().slice(0, 10);
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
  const { products } = useProducts();
  const { supplierMap } = useSuppliers();
  const { addItem, clearCart, activeSupplierRef, cartItems } = useCart();
  const [product, setProduct] = useState<ProductDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [shippingZones, setShippingZones] = useState<ShippingZoneDoc[]>([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [pendingAdd, setPendingAdd] = useState(false);
  const viewTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    const productRef = doc(db, "products", productId);

    if (isReactSnapPrerender()) {
      getDoc(productRef)
        .then((snap) => {
          if (!snap.exists()) {
            setProduct(null);
            return;
          }
          setProduct({ id: snap.id, ...snap.data() } as ProductDoc);
        })
        .finally(() => setLoading(false));
      return;
    }

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

    if (isReactSnapPrerender()) {
      getDocs(zonesRef).then((snap) => {
        setShippingZones(
          snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })) as ShippingZoneDoc[]
        );
      });
      return;
    }

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
  const safeImageUrls = imageUrls.map((image) => toPrerenderSafeImageSrc(image) ?? image);
  useEffect(() => {
    if (selectedImage < imageUrls.length) return;
    setSelectedImage(0);
  }, [selectedImage, imageUrls.length]);
  useEffect(() => {
    if (imageUrls.length > 0) return;
    setZoomActive(false);
  }, [imageUrls.length]);
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
  const canonicalPath = productId ? `/shop/product/${productId}/` : "/shop/";
  const primaryImage = imageUrls[0];
  const offerPrice = showSale ? salePrice : price;
  const productRecord = (product ?? {}) as Record<string, unknown>;
  const sku = getFirstString(productRecord, PRODUCT_SKU_KEYS) ?? product?.id;
  const brandName =
    getFirstString(productRecord, PRODUCT_BRAND_KEYS) ??
    supplier?.name ??
    "TwoPaws";
  const mpn = getFirstString(productRecord, PRODUCT_MPN_KEYS);
  const gtin = normalizeGtin(getFirstString(productRecord, PRODUCT_GTIN_KEYS));
  const productCategory = getFirstString(productRecord, PRODUCT_CATEGORY_KEYS);
  const itemCondition = resolveItemCondition(
    getFirstString(productRecord, PRODUCT_CONDITION_KEYS)
  );
  const priceValidUntil = buildPriceValidUntil();
  const cheapestZone = useMemo(() => {
    if (!shippingZones.length) return null;
    return [...shippingZones].sort(
      (a, b) => (a.rateEGP ?? 0) - (b.rateEGP ?? 0)
    )[0];
  }, [shippingZones]);
  const shippingDetails =
    cheapestZone && typeof cheapestZone.rateEGP === "number"
      ? {
          "@type": "OfferShippingDetails",
          shippingRate: {
            "@type": "MonetaryAmount",
            value: cheapestZone.rateEGP,
            currency: META_PIXEL_CURRENCY,
          },
          shippingDestination: {
            "@type": "DefinedRegion",
            addressCountry: "EG",
          },
        }
      : undefined;
  const structuredData = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        "@id": `${BASE_URL}${canonicalPath}#product`,
        name: productName,
        description: seoDescription,
        url: `${BASE_URL}${canonicalPath}`,
        image: imageUrls.length ? imageUrls : primaryImage ? [primaryImage] : undefined,
        sku,
        mpn,
        gtin,
        category: productCategory,
        brand: {
          "@type": "Brand",
          name: brandName,
        },
        offers: {
          "@type": "Offer",
          "@id": `${BASE_URL}${canonicalPath}#offer`,
          priceCurrency: META_PIXEL_CURRENCY,
          price: offerPrice,
          availability:
            stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          itemCondition,
          url: `${BASE_URL}${canonicalPath}`,
          priceValidUntil,
          shippingDetails,
          seller: {
            "@type": "Organization",
            name: "TwoPaws",
            url: BASE_URL,
          },
        },
      }
    : undefined;
  const cartQuantityByProductId = useMemo(() => {
    return cartItems.reduce<Record<string, number>>((acc, item) => {
      const id = item.productIdValue ?? item.productRef?.id ?? null;
      if (!id) return acc;
      const qty = typeof item.quantity === "number" ? item.quantity : 0;
      if (qty <= 0) return acc;
      acc[id] = (acc[id] ?? 0) + qty;
      return acc;
    }, {});
  }, [cartItems]);
  const recommendedProducts = useMemo(() => {
    if (!product?.id) return [] as ProductDoc[];
    const supplierId = product.supplierRef?.id;
    if (!supplierId) return [] as ProductDoc[];
    const currentCategoryIds = new Set(getCategoryIds(product.categories as unknown[]));
    if (currentCategoryIds.size === 0) return [] as ProductDoc[];

    return products
      .filter((candidate) => {
        if (!candidate.id || candidate.id === product.id) return false;
        if (candidate.supplierRef?.id !== supplierId) return false;
        const candidateCategories = getCategoryIds(candidate.categories as unknown[]);
        const sameCategory = candidateCategories.some((id) => currentCategoryIds.has(id));
        if (!sameCategory) return false;
        const unitPrice = getUnitPrice(candidate.price, candidate.sale_price, candidate.on_sale);
        if (unitPrice <= 0) return false;
        const quantity = typeof candidate.quantity === "number" ? candidate.quantity : 1;
        return quantity > 0;
      })
      .slice(0, 8);
  }, [products, product]);
  const selectedImageUrl = safeImageUrls[selectedImage] ?? null;

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
  const handleImageMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
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
        noIndex={!loading && !product}
      />
      {loading && <p className="text-sm text-slate-500">Loading product...</p>}
      {!loading && !product && (
        <p className="text-sm text-slate-500">Product not found.</p>
      )}
      {product && (
        <>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <div
                className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50"
                onMouseEnter={() => setZoomActive(Boolean(selectedImageUrl))}
                onMouseLeave={() => setZoomActive(false)}
                onMouseMove={handleImageMouseMove}
              >
                {imageUrls.length ? (
                  <img
                    src={safeImageUrls[selectedImage]}
                    alt={product.name ?? "Product"}
                    className="mx-auto max-h-[420px] w-auto max-w-full cursor-zoom-in object-contain p-4"
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <div className="flex h-[420px] w-full items-center justify-center bg-slate-100 text-slate-400">
                    No images
                  </div>
                )}
                {zoomActive && selectedImageUrl ? (
                  <div
                    className="pointer-events-none absolute hidden rounded-full border border-white/90 shadow-xl md:block"
                    style={{
                      width: IMAGE_LENS_SIZE,
                      height: IMAGE_LENS_SIZE,
                      left: `calc(${zoomPosition.x}% - ${IMAGE_LENS_SIZE / 2}px)`,
                      top: `calc(${zoomPosition.y}% - ${IMAGE_LENS_SIZE / 2}px)`,
                      backgroundImage: `url(${selectedImageUrl})`,
                      backgroundRepeat: "no-repeat",
                      backgroundSize: `${IMAGE_ZOOM_SCALE * 100}%`,
                      backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    }}
                  />
                ) : null}
              </div>
              {imageUrls.length > 1 && (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {safeImageUrls.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setSelectedImage(index)}
                      className={`overflow-hidden rounded-xl border ${
                        index === selectedImage
                          ? "border-brand-green-dark"
                          : "border-slate-100"
                      }`}
                    >
                      <img
                        src={image}
                        alt="Thumbnail"
                        width={320}
                        height={80}
                        className="h-20 w-full object-contain bg-white p-1"
                        loading="lazy"
                        decoding="async"
                      />
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
                <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
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

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-slate-900">
                Recommended
              </h2>
            </div>
            {recommendedProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                No similar products available right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {recommendedProducts.map((recommended) => (
                  <ProductCard
                    key={recommended.id}
                    product={recommended}
                    supplierName={recommended.supplierRef?.id ? supplierMap[recommended.supplierRef.id]?.name : undefined}
                    cartQuantity={cartQuantityByProductId[recommended.id] ?? 0}
                  />
                ))}
              </div>
            )}
          </section>
        </>
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
