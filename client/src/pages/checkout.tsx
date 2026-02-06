import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  GeoPoint,
  getDocs,
  getDoc,
  onSnapshot,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import GoogleMapPicker, {
  type LatLngLiteral,
} from "@/components/maps/GoogleMapPicker";
import { useAuth } from "@/hooks/useAuth";
import {
  ADDRESS_CITIES,
  ADDRESS_COUNTRY,
  formatAddress,
  useAddresses,
} from "@/hooks/useAddresses";
import { useCart } from "@/hooks/useCart";
import { useSuppliers } from "@/hooks/useSuppliers";
import { formatCurrency } from "@/lib/format";
import { db, functions } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { META_PIXEL_CURRENCY, trackMetaEvent } from "@/lib/metaPixel";

const PROMO_STORAGE_KEY = "twopawsPromo";

const buildPaymobCheckoutUrl = (publicKey: string, clientSecret: string) => {
  const params = new URLSearchParams({
    publicKey,
    clientSecret,
  });
  return `https://accept.paymob.com/unifiedcheckout/?${params.toString()}`;
};

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

type AddressFormState = {
  label: string;
  recipientName: string;
  phone: string;
  country: string;
  city: string;
  area: string;
  street: string;
  building: string;
  floor: string;
  apartment: string;
  notes: string;
  location: LatLngLiteral | null;
};

const toLatLng = (location?: { latitude?: number; longitude?: number } | null) => {
  if (!location) return null;
  const lat = location.latitude;
  const lng = location.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return { lat, lng } as LatLngLiteral;
};

export default function CheckoutPage() {
  const { user, loading: authLoading, userRef } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { addresses, addAddress, updateAddress } = useAddresses();
  const { cart, cartItems, clearCart, activeSupplierRef } = useCart();
  const { supplierMap } = useSuppliers();
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [shippingZones, setShippingZones] = useState<ShippingZoneDoc[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "paymob">("cod");
  const [promo, setPromo] = useState<PromoState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressFormState>({
    label: "",
    recipientName: "",
    phone: "",
    country: ADDRESS_COUNTRY,
    city: ADDRESS_CITIES[0],
    area: "",
    street: "",
    building: "",
    floor: "",
    apartment: "",
    notes: "",
    location: null,
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

  const selectedAddress = addresses.find((address) => address.id === selectedAddressId);

  const filteredShippingZones = useMemo(() => {
    if (!selectedAddress?.city) return shippingZones;
    const city = selectedAddress.city.trim().toLowerCase();
    return shippingZones.filter((zone) => (zone.label ?? "").trim().toLowerCase() === city);
  }, [selectedAddress?.city, shippingZones]);

  useEffect(() => {
    if (filteredShippingZones.length === 0) {
      setSelectedZoneId("");
      return;
    }
    if (!filteredShippingZones.some((zone) => zone.id === selectedZoneId)) {
      setSelectedZoneId(filteredShippingZones[0].id);
    }
  }, [filteredShippingZones, selectedZoneId]);

  const selectedZone = filteredShippingZones.find((zone) => zone.id === selectedZoneId);
  const subtotal = cart?.total ?? 0;
  const discount = promo?.discount ?? 0;
  const shippingCost = selectedZone?.rateEGP ?? 0;
  const totalPrice = Math.max(subtotal - discount + shippingCost, 0);

  const cartEmpty = cartItems.length === 0;

  const resetAddressForm = () => {
    setAddressForm({
      label: "",
      recipientName: "",
      phone: "",
      country: ADDRESS_COUNTRY,
      city: ADDRESS_CITIES[0],
      area: "",
      street: "",
      building: "",
      floor: "",
      apartment: "",
      notes: "",
      location: null,
    });
    setEditingAddressId(null);
  };

  const startEditAddress = (address: (typeof addresses)[number]) => {
    setEditingAddressId(address.id);
    setSelectedAddressId(address.id);
    setAddressForm({
      label: address.label ?? "",
      recipientName: address.recipientName ?? "",
      phone: address.phone ?? "",
      country: ADDRESS_COUNTRY,
      city: ADDRESS_CITIES.includes(
        (address.city ?? "") as (typeof ADDRESS_CITIES)[number]
      )
        ? (address.city as (typeof ADDRESS_CITIES)[number])
        : ADDRESS_CITIES[0],
      area: address.area ?? "",
      street: address.street ?? "",
      building: address.building ?? "",
      floor: address.floor ?? "",
      apartment: address.apartment ?? "",
      notes: address.notes ?? "",
      location: toLatLng(address.location as { latitude?: number; longitude?: number } | null),
    });
  };

  const openAddAddress = () => {
    resetAddressForm();
    setIsAddressDialogOpen(true);
  };

  const openEditAddress = (address: (typeof addresses)[number]) => {
    startEditAddress(address);
    setIsAddressDialogOpen(true);
  };

  const handleSaveAddress = async () => {
    const city = addressForm.city;
    if (!ADDRESS_CITIES.includes(city as (typeof ADDRESS_CITIES)[number])) {
      toast({
        title: "Invalid city",
        description: "City must be Cairo or Giza.",
        variant: "destructive",
      });
      return;
    }
    if (!addressForm.location) {
      toast({
        title: "Location required",
        description: "Select the address location on the map.",
        variant: "destructive",
      });
      return;
    }
    try {
      const payload = {
        ...addressForm,
        country: ADDRESS_COUNTRY,
        city,
        location: new GeoPoint(addressForm.location.lat, addressForm.location.lng),
      };
      if (editingAddressId) {
        await updateAddress(editingAddressId, payload);
      } else {
        await addAddress(payload);
      }
      resetAddressForm();
      setIsAddressDialogOpen(false);
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

    const checkoutItems = cartItems
      .map((item) => {
        const unitPrice =
          typeof item.unitPrice === "number"
            ? item.unitPrice
            : typeof item.product?.price === "number"
              ? item.product.price
              : 0;
        const id = item.productIdValue ?? item.product?.id ?? item.id;
        return { id, quantity: item.quantity ?? 1, item_price: unitPrice };
      })
      .filter((item) => Boolean(item.id));
    const itemCount = checkoutItems.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
    trackMetaEvent("InitiateCheckout", {
      content_ids: checkoutItems.map((item) => item.id),
      contents: checkoutItems,
      value: totalPrice,
      currency: META_PIXEL_CURRENCY,
      num_items: itemCount,
    });
    trackMetaEvent("AddPaymentInfo", {
      content_ids: checkoutItems.map((item) => item.id),
      contents: checkoutItems,
      value: totalPrice,
      currency: META_PIXEL_CURRENCY,
      num_items: itemCount,
      payment_method: paymentMethod,
    });

    setSubmitting(true);
    try {
      await verifyStock();

      const getOrderNumber = httpsCallable(functions, "getNextOrderNumber");
      const orderNumberResult = await getOrderNumber({});
      const orderNumber = (orderNumberResult.data as { orderNumber?: number })?.orderNumber;
      if (!orderNumber) {
        throw new Error("Unable to generate order number.");
      }
      const orderRef = doc(collection(db, "orders"));
      const isPaymob = paymentMethod === "paymob";
      const orderStatus = isPaymob ? "PAYMENT_INITIALIZING" : "Pending";
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
        success: paymentMethod === "cod",
        paymentMethod: paymentMethod === "cod" ? "cash" : "card",
        paymentStatus: paymentMethod === "cod" ? "PENDING_COD" : "PAYMENT_INITIALIZING",
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

      if (paymentMethod === "cod") {
        trackMetaEvent("Purchase", {
          content_ids: checkoutItems.map((item) => item.id),
          contents: checkoutItems,
          value: totalPrice,
          currency: META_PIXEL_CURRENCY,
          num_items: itemCount,
          order_id: orderRef.id,
          payment_method: paymentMethod,
        });
      }

      if (paymentMethod === "paymob") {
        try {
          const createPaymobPayment = httpsCallable(functions, "createPaymobPayment");
          const result = await createPaymobPayment({ orderId: orderRef.id });
          const data = result.data as { clientSecret?: string; publicKey?: string };
          if (!data?.clientSecret || !data?.publicKey) {
            throw new Error("Unable to start Paymob payment.");
          }
          const checkoutUrl = buildPaymobCheckoutUrl(data.publicKey, data.clientSecret);
          window.location.assign(checkoutUrl);
          return;
        } catch (paymobErr) {
          // Roll back the draft order if we fail to initialize the payment session.
          const orderItemsSnap = await getDocs(collection(orderRef, "orderItems"));
          const cleanupBatch = writeBatch(db);
          orderItemsSnap.docs.forEach((docSnap) => cleanupBatch.delete(docSnap.ref));
          cleanupBatch.delete(orderRef);
          await cleanupBatch.commit();
          throw paymobErr;
        }
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
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {address.label ?? "Saved address"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatAddress(address)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        openEditAddress(address);
                      }}
                      className="text-xs font-semibold text-brand-green-dark hover:underline"
                    >
                      Edit
                    </button>
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Need a new address?</h3>
                  <p className="text-sm text-slate-500">Add one to continue checkout.</p>
                </div>
                <Button className="bg-brand-green-dark text-white" onClick={openAddAddress}>
                  Add address
                </Button>
              </div>
            </CardContent>
          </Card>

          <Dialog
            open={isAddressDialogOpen}
            onOpenChange={(open) => {
              setIsAddressDialogOpen(open);
              if (!open) {
                resetAddressForm();
              }
            }}
          >
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editingAddressId ? "Edit address" : "Add new address"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
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
                    <Label>Country</Label>
                    <Input value={ADDRESS_COUNTRY} disabled className="bg-slate-50" />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Select
                      value={addressForm.city}
                      onValueChange={(value) =>
                        setAddressForm((prev) => ({ ...prev, city: value }))
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        {ADDRESS_CITIES.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                <div className="space-y-2">
                  <Label>Location</Label>
                  <GoogleMapPicker
                    value={addressForm.location}
                    onChange={(location) =>
                      setAddressForm((prev) => ({ ...prev, location }))
                    }
                  />
                  <p className="text-xs text-slate-500">
                    Tap on the map to set the exact delivery location.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button className="bg-brand-green-dark text-white" onClick={handleSaveAddress}>
                    {editingAddressId ? "Update address" : "Save address"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-200"
                    onClick={() => {
                      resetAddressForm();
                      setIsAddressDialogOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Card className="border-slate-100">
            <CardContent className="space-y-4 p-6">
              <h3 className="text-lg font-semibold text-slate-900">Shipping</h3>
              <RadioGroup
                value={selectedZoneId}
                onValueChange={setSelectedZoneId}
                className="space-y-2"
              >
                {filteredShippingZones.map((zone) => (
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
                {filteredShippingZones.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No shipping zones available for this address.
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
