import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import ShopShell from "@/components/shop/ShopShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useAddresses, formatAddress } from "@/hooks/useAddresses";
import { useCart } from "@/hooks/useCart";
import { useSuppliers } from "@/hooks/useSuppliers";
import { formatCurrency } from "@/lib/format";
import { db, functions } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const PROMO_STORAGE_KEY = "twopawsPromo";

type PromoState = {
  code: string;
  discount: number;
  total: number;
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

const getNextOrderNumber = async () => {
  const counterRef = doc(db, "meta", "counters");
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    const current = snap.exists()
      ? Number(snap.data()?.orderNumber ?? 1000)
      : 1000;
    const next = current + 1;
    transaction.set(counterRef, { orderNumber: next }, { merge: true });
    return next;
  });
};

export default function CheckoutPage() {
  const { user, loading: authLoading, userRef } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { addresses, addAddress } = useAddresses();
  const { cart, cartItems, clearCart, activeSupplierRef } = useCart();
  const { supplierMap } = useSuppliers();
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [shippingZones, setShippingZones] = useState<ShippingZoneDoc[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "paymob">("cod");
  const [promo, setPromo] = useState<PromoState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: "",
    recipientName: "",
    phone: "",
    city: "",
    area: "",
    street: "",
    building: "",
    floor: "",
    apartment: "",
    notes: "",
  });

  const supplierName = activeSupplierRef ? supplierMap[activeSupplierRef.id]?.name : undefined;

  useEffect(() => {
    const stored = localStorage.getItem(PROMO_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PromoState;
        if (parsed?.code) setPromo(parsed);
      } catch {
        localStorage.removeItem(PROMO_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (!selectedAddressId && addresses.length > 0) {
      setSelectedAddressId(addresses[0].id);
    }
  }, [addresses, selectedAddressId]);

  useEffect(() => {
    if (!activeSupplierRef) {
      setShippingZones([]);
      return;
    }
    const zonesRef = collection(
      db,
      "suppliers",
      activeSupplierRef.id,
      "shippingZones"
    );
    const unsubscribe = onSnapshot(zonesRef, (snap) => {
      setShippingZones(
        snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as ShippingZoneDoc[]
      );
    });
    return () => unsubscribe();
  }, [activeSupplierRef]);

  useEffect(() => {
    if (!selectedZoneId && shippingZones.length > 0) {
      setSelectedZoneId(shippingZones[0].id);
    }
  }, [shippingZones, selectedZoneId]);

  const selectedZone = shippingZones.find((zone) => zone.id === selectedZoneId);
  const subtotal = cart?.total ?? 0;
  const discount = promo?.discount ?? 0;
  const shippingCost = selectedZone?.rateEGP ?? 0;
  const totalPrice = Math.max(subtotal - discount + shippingCost, 0);

  const cartEmpty = cartItems.length === 0;

  const handleAddAddress = async () => {
    try {
      await addAddress({ ...addressForm });
      setAddressForm({
        label: "",
        recipientName: "",
        phone: "",
        city: "",
        area: "",
        street: "",
        building: "",
        floor: "",
        apartment: "",
        notes: "",
      });
    } catch (err) {
      toast({
        title: "Unable to save address",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  const verifyStock = async () => {
    for (const item of cartItems) {
      const productRef = item.productRef ?? (item.productIdValue ? doc(db, "products", item.productIdValue) : null);
      if (!productRef) continue;
      const productSnap = await getDoc(productRef);
      if (!productSnap.exists()) continue;
      const product = productSnap.data() as { quantity?: number };
      const available = typeof product.quantity === "number" ? product.quantity : 0;
      if ((item.quantity ?? 0) > available) {
        throw new Error("Some items are out of stock. Please update your cart.");
      }
    }
  };

  const handleCheckout = async () => {
    if (!user || !userRef || !cart) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (cartEmpty) {
      toast({ title: "Cart empty", description: "Add items before checkout." });
      return;
    }
    if (!selectedAddressId) {
      toast({
        title: "Select an address",
        description: "Choose a shipping address to continue.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedZoneId) {
      toast({
        title: "Select shipping",
        description: "Pick a shipping zone to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!activeSupplierRef) {
      toast({
        title: "Missing supplier",
        description: "We couldn't determine the supplier for this cart.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await verifyStock();

      const orderNumber = await getNextOrderNumber();
      const orderRef = doc(collection(db, "orders"));
      const orderStatus = paymentMethod === "cod" ? "COD_PENDING" : "PAYMENT_PENDING";
      await setDoc(orderRef, {
        buyerId: userRef,
        supplierRef: activeSupplierRef,
        shippingAddress: doc(db, "addresses", selectedAddressId),
        shippingCost,
        totalPrice,
        orderNumber,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        status: orderStatus,
        orderStatus,
        success: false,
        paymentMethod,
      });

      const batch = writeBatch(db);
      cartItems.forEach((item) => {
        const productRef = item.productRef ?? (item.productIdValue ? doc(db, "products", item.productIdValue) : null);
        if (!productRef) return;
        batch.set(doc(orderRef, "orderItems", item.id), {
          productRef,
          quantity: item.quantity ?? 1,
        });
      });
      await batch.commit();

      if (promo?.code) {
        const commitPromo = httpsCallable(functions, "commitPromo");
        await commitPromo({
          code: promo.code,
          cartId: cart.id,
          orderId: orderRef.id,
          discount: promo.discount,
        });
      }

      if (paymentMethod === "paymob") {
        const createPaymobPayment = httpsCallable(functions, "createPaymobPayment");
        const result = await createPaymobPayment({ orderId: orderRef.id });
        const data = result.data as { iframeUrl?: string };
        if (!data?.iframeUrl) {
          throw new Error("Unable to start Paymob payment.");
        }
        navigate(`/payment/paymob?orderId=${orderRef.id}`, {
          state: { iframeUrl: data.iframeUrl },
        });
        return;
      }

      await clearCart();
      localStorage.removeItem(PROMO_STORAGE_KEY);
      navigate(`/orders/${orderRef.id}`);
    } catch (err) {
      toast({
        title: "Checkout failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <ShopShell>
        <p className="text-sm text-slate-500">Loading...</p>
      </ShopShell>
    );
  }

  if (!user) {
    return (
      <ShopShell>
        <Card className="border-slate-100">
          <CardContent className="p-6">
            <p className="text-slate-600">Sign in to continue to checkout.</p>
            <Button asChild className="mt-4 bg-brand-green-dark text-white">
              <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`}>
                Sign in
              </Link>
            </Button>
          </CardContent>
        </Card>
      </ShopShell>
    );
  }

  return (
    <ShopShell>
      <header className="space-y-2">
        <p className="text-sm font-semibold text-brand-olive">Checkout</p>
        <h1 className="text-3xl font-semibold text-slate-900">Complete your order</h1>
        {supplierName && (
          <p className="text-sm text-slate-500">Supplier: {supplierName}</p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <Card className="border-slate-100">
            <CardContent className="space-y-4 p-6">
              <h3 className="text-lg font-semibold text-slate-900">Shipping address</h3>
              <RadioGroup
                value={selectedAddressId}
                onValueChange={setSelectedAddressId}
                className="space-y-2"
              >
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 p-3"
                  >
                    <RadioGroupItem value={address.id} />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {address.label ?? "Saved address"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatAddress(address)}
                      </p>
                    </div>
                  </label>
                ))}
                {addresses.length === 0 && (
                  <p className="text-sm text-slate-500">No saved addresses yet.</p>
                )}
              </RadioGroup>
            </CardContent>
          </Card>

          <Card className="border-slate-100">
            <CardContent className="space-y-4 p-6">
              <h3 className="text-lg font-semibold text-slate-900">Add new address</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Label</Label>
                  <Input
                    value={addressForm.label}
                    onChange={(event) =>
                      setAddressForm((prev) => ({ ...prev, label: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Recipient name</Label>
                  <Input
                    value={addressForm.recipientName}
                    onChange={(event) =>
                      setAddressForm((prev) => ({ ...prev, recipientName: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={addressForm.phone}
                    onChange={(event) =>
                      setAddressForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={addressForm.city}
                    onChange={(event) =>
                      setAddressForm((prev) => ({ ...prev, city: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Area</Label>
                  <Input
                    value={addressForm.area}
                    onChange={(event) =>
                      setAddressForm((prev) => ({ ...prev, area: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Street</Label>
                  <Input
                    value={addressForm.street}
                    onChange={(event) =>
                      setAddressForm((prev) => ({ ...prev, street: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Building</Label>
                  <Input
                    value={addressForm.building}
                    onChange={(event) =>
                      setAddressForm((prev) => ({ ...prev, building: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Floor</Label>
                  <Input
                    value={addressForm.floor}
                    onChange={(event) =>
                      setAddressForm((prev) => ({ ...prev, floor: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Apartment</Label>
                  <Input
                    value={addressForm.apartment}
                    onChange={(event) =>
                      setAddressForm((prev) => ({ ...prev, apartment: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={addressForm.notes}
                  onChange={(event) =>
                    setAddressForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                />
              </div>
              <Button className="bg-brand-green-dark text-white" onClick={handleAddAddress}>
                Save address
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-100">
            <CardContent className="space-y-4 p-6">
              <h3 className="text-lg font-semibold text-slate-900">Shipping</h3>
              <RadioGroup
                value={selectedZoneId}
                onValueChange={setSelectedZoneId}
                className="space-y-2"
              >
                {shippingZones.map((zone) => (
                  <label
                    key={zone.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 p-3"
                  >
                    <RadioGroupItem value={zone.id} />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {zone.label ?? "Shipping zone"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatCurrency(zone.rateEGP ?? 0)} · {zone.shippingEtaLabel ?? "ETA varies"}
                      </p>
                    </div>
                  </label>
                ))}
                {shippingZones.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No shipping zones configured for this supplier.
                  </p>
                )}
              </RadioGroup>
            </CardContent>
          </Card>

          <Card className="border-slate-100">
            <CardContent className="space-y-4 p-6">
              <h3 className="text-lg font-semibold text-slate-900">Payment method</h3>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as "cod" | "paymob")}
                className="space-y-2"
              >
                <label className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                  <RadioGroupItem value="cod" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Cash on Delivery</p>
                    <p className="text-xs text-slate-500">Pay when your order arrives.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                  <RadioGroupItem value="paymob" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Paymob (Card/Wallet)</p>
                    <p className="text-xs text-slate-500">Secure Paymob checkout.</p>
                  </div>
                </label>
              </RadioGroup>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-slate-100">
            <CardContent className="space-y-3 p-4">
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
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Shipping</span>
                <span>{formatCurrency(shippingCost)}</span>
              </div>
              <div className="flex items-center justify-between text-base font-semibold text-slate-900">
                <span>Total</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full bg-brand-olive text-brand-dark"
            onClick={handleCheckout}
            disabled={submitting || cartEmpty}
          >
            {submitting ? "Placing order..." : "Place order"}
          </Button>
        </div>
      </div>
    </ShopShell>
  );
}
