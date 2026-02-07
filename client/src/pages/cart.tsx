import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import ShopShell from "@/components/shop/ShopShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useSuppliers } from "@/hooks/useSuppliers";
import { formatCurrency } from "@/lib/format";
import { functions } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { META_PIXEL_CURRENCY, trackMetaEvent } from "@/lib/metaPixel";
import Seo from "@/lib/seo/Seo";

const PROMO_STORAGE_KEY = "twopawsPromo";

type PromoState = {
  code: string;
  discount: number;
  total: number;
};

export default function CartPage() {
  const { user } = useAuth();
  const { cart, cartItems, setItemQuantity, removeItem, clearCart, activeSupplierRef } = useCart();
  const { supplierMap } = useSuppliers();
  const { toast } = useToast();
  const [promoCode, setPromoCode] = useState("");
  const [promo, setPromo] = useState<PromoState | null>(null);
  const [applying, setApplying] = useState(false);
  const lastPromoRecalcKey = useRef<string | null>(null);
  const promoRecalcTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supplierName = activeSupplierRef ? supplierMap[activeSupplierRef.id]?.name : undefined;

  useEffect(() => {
    const stored = localStorage.getItem(PROMO_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PromoState;
        if (parsed?.code) {
          setPromo(parsed);
          setPromoCode(parsed.code);
        }
      } catch {
        localStorage.removeItem(PROMO_STORAGE_KEY);
      }
    }
  }, []);

  const subtotal = cart?.total ?? 0;
  const previewTotal = promo ? promo.total : subtotal;
  const discount = promo ? promo.discount : 0;
  const activePromoCode = promo?.code ?? "";

  const recalcPromo = async (code: string) => {
    if (!cart?.id || !code) return;
    setApplying(true);
    try {
      const fn = httpsCallable(functions, "validatePromo");
      const result = await fn({ code, cartId: cart.id });
      const data = result.data as { ok: boolean; discountapp?: number; total?: number };
      if (!data?.ok) {
        throw new Error("Promo code not valid.");
      }
      const nextPromo = {
        code,
        discount: data.discountapp ?? 0,
        total: data.total ?? subtotal,
      };
      setPromo(nextPromo);
      localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(nextPromo));
    } catch (err) {
      setPromo(null);
      localStorage.removeItem(PROMO_STORAGE_KEY);
      toast({
        title: "Promo removed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!cart?.id || !promoCode.trim()) return;
    setApplying(true);
    try {
      const fn = httpsCallable(functions, "validatePromo");
      const result = await fn({ code: promoCode.trim(), cartId: cart.id });
      const data = result.data as { ok: boolean; discountapp?: number; total?: number };
      if (!data?.ok) {
        throw new Error("Promo code not valid.");
      }
      const nextPromo = {
        code: promoCode.trim(),
        discount: data.discountapp ?? 0,
        total: data.total ?? subtotal,
      };
      setPromo(nextPromo);
      localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(nextPromo));
      toast({ title: "Promo applied", description: `Saved ${formatCurrency(nextPromo.discount)}` });
    } catch (err) {
      toast({
        title: "Promo failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  const handleClearPromo = () => {
    setPromo(null);
    localStorage.removeItem(PROMO_STORAGE_KEY);
  };

  useEffect(() => {
    if (cartItems.length === 0 && activePromoCode) {
      handleClearPromo();
      return;
    }
    if (!activePromoCode || !cart?.id) return;
    const key = `${cart.id}:${activePromoCode}:${subtotal}:${cartItems.length}`;
    if (lastPromoRecalcKey.current === key) return;
    if (promoRecalcTimer.current) {
      clearTimeout(promoRecalcTimer.current);
    }
    promoRecalcTimer.current = setTimeout(() => {
      lastPromoRecalcKey.current = key;
      recalcPromo(activePromoCode);
    }, 300);
    return () => {
      if (promoRecalcTimer.current) {
        clearTimeout(promoRecalcTimer.current);
        promoRecalcTimer.current = null;
      }
    };
  }, [cartItems.length, subtotal, activePromoCode, cart?.id]);

  const handleQuantityChange = async (productId: string, nextQty: number) => {
    const item = cartItems.find((entry) => entry.productIdValue === productId);
    if (!item?.product) return;
    const cappedQty = Math.min(
      Math.max(nextQty, 0),
      typeof item.product.quantity === "number" ? item.product.quantity : nextQty
    );
    try {
      await setItemQuantity(item.product, cappedQty);
    } catch (err) {
      toast({
        title: "Unable to update",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleRemove = async (productId: string) => {
    const item = cartItems.find((entry) => entry.productIdValue === productId);
    if (!item?.product) return;
    try {
      await removeItem(item.product);
      const unitPrice =
        typeof item.unitPrice === "number"
          ? item.unitPrice
          : typeof item.product.price === "number"
            ? item.product.price
            : 0;
      const quantity = item.quantity ?? 1;
      trackMetaEvent("RemoveFromCart", {
        content_ids: [item.product.id],
        content_type: "product",
        content_name: item.product.name ?? "Product",
        value: unitPrice * quantity,
        currency: META_PIXEL_CURRENCY,
        contents: [{ id: item.product.id, quantity, item_price: unitPrice }],
      });
    } catch (err) {
      toast({
        title: "Unable to remove",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleClearCart = async () => {
    const removedItems = cartItems
      .map((item) => {
        const id = item.productIdValue ?? item.product?.id ?? item.id;
        const unitPrice =
          typeof item.unitPrice === "number"
            ? item.unitPrice
            : typeof item.product?.price === "number"
              ? item.product.price
              : 0;
        return { id, quantity: item.quantity ?? 1, item_price: unitPrice };
      })
      .filter((item) => Boolean(item.id));
    const removedTotal = removedItems.reduce(
      (sum, item) => sum + item.item_price * (item.quantity ?? 1),
      0
    );
    try {
      await clearCart();
      handleClearPromo();
      if (removedItems.length > 0) {
        trackMetaEvent("RemoveFromCart", {
          content_ids: removedItems.map((item) => item.id),
          content_type: "product",
          contents: removedItems,
          value: removedTotal,
          currency: META_PIXEL_CURRENCY,
          num_items: removedItems.reduce(
            (sum, item) => sum + (item.quantity ?? 1),
            0
          ),
        });
      }
    } catch (err) {
      toast({
        title: "Unable to clear cart",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  const cartEmpty = cartItems.length === 0;

  return (
    <ShopShell>
      <Seo
        title="Cart | TwoPaws Shop"
        description="Review and update items in your TwoPaws shopping cart."
        canonicalUrl="/cart"
        noIndex
      />
      <header className="space-y-2">
        <p className="text-sm font-semibold text-brand-olive">Cart</p>
        <h1 className="text-3xl font-semibold text-slate-900">Your cart</h1>
        {supplierName && (
          <p className="text-sm text-slate-500">Cart supplier: {supplierName}</p>
        )}
      </header>

      {!user && (
        <Card className="border-slate-100">
          <CardContent className="p-6">
            <p className="text-slate-600">Sign in to view your cart.</p>
            <Button asChild className="mt-4 bg-brand-green-dark text-white">
              <Link to="/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {user && (
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-4">
            {cartEmpty && (
              <Card className="border-slate-100">
                <CardContent className="p-6 text-slate-600">
                  Your cart is empty.
                </CardContent>
              </Card>
            )}
            {cartItems.map((item) => {
              const product = item.product;
              if (!product) return null;
              const unitPrice =
                typeof item.unitPrice === "number"
                  ? item.unitPrice
                  : typeof product.price === "number"
                    ? product.price
                    : 0;
              const stock = typeof product.quantity === "number" ? product.quantity : 0;
              const photo = Array.isArray(product.photo_url)
                ? product.photo_url[0]
                : product.photo_url;

              return (
                <Card key={item.id} className="border-slate-100">
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                    <Link
                      to={`/shop/product/${product.id}`}
                      className="flex h-20 w-20 items-center justify-center"
                    >
                      {photo ? (
                        <img src={photo} alt={product.name} className="h-20 w-20 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">
                          No image
                        </div>
                      )}
                    </Link>
                    <div className="flex-1">
                      <Link
                        to={`/shop/product/${product.id}`}
                        className="text-lg font-semibold text-slate-900 hover:text-brand-green-dark"
                      >
                        {product.name}
                      </Link>
                      <p className="text-sm text-slate-500">
                        {formatCurrency(unitPrice)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="border-slate-200"
                        onClick={() => handleQuantityChange(product.id, (item.quantity ?? 1) - 1)}
                        disabled={(item.quantity ?? 0) <= 1}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={stock}
                        value={item.quantity ?? 1}
                        onChange={(event) =>
                          handleQuantityChange(product.id, Number(event.target.value))
                        }
                        className="w-20 text-center"
                      />
                      <Button
                        variant="outline"
                        className="border-slate-200"
                        onClick={() => handleQuantityChange(product.id, (item.quantity ?? 1) + 1)}
                        disabled={stock > 0 ? (item.quantity ?? 0) >= stock : true}
                      >
                        +
                      </Button>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(unitPrice * (item.quantity ?? 1))}
                      </p>
                      <Button
                        variant="ghost"
                        className="text-xs text-slate-500"
                        onClick={() => handleRemove(product.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {!cartEmpty && (
              <Button
                variant="outline"
                className="border-slate-200 text-slate-700"
                onClick={handleClearCart}
              >
                Clear cart
              </Button>
            )}
          </div>

          <div className="space-y-4">
            <Card className="border-slate-100">
              <CardContent className="space-y-4 p-4">
                <h3 className="text-lg font-semibold text-slate-900">Order summary</h3>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {promo && (
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Promo discount</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-base font-semibold text-slate-900">
                  <span>Total</span>
                  <span>{formatCurrency(previewTotal)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-100">
              <CardContent className="space-y-3 p-4">
                <h3 className="text-lg font-semibold text-slate-900">Promo code</h3>
                <Input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(event) => setPromoCode(event.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Button
                    className="bg-brand-green-dark text-white"
                    onClick={handleApplyPromo}
                    disabled={applying || !promoCode.trim() || cartEmpty}
                  >
                    {applying ? "Applying..." : "Apply"}
                  </Button>
                  {promo && (
                    <Button variant="outline" className="border-slate-200" onClick={handleClearPromo}>
                      Remove
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button
              asChild
              className="w-full bg-brand-olive text-brand-dark"
              disabled={cartEmpty}
            >
              <Link to="/checkout">Proceed to checkout</Link>
            </Button>
          </div>
        </div>
      )}
    </ShopShell>
  );
}
