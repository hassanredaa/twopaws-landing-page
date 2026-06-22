import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  collection,
  GeoPoint,
  onSnapshot,
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
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
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
import Seo from "@/lib/seo/Seo";

const PROMO_STORAGE_KEY = "twopawsPromo";
const PAYMOB_GUEST_TOKEN_STORAGE_PREFIX = "twopaws:paymob:guest-token:";
const GUEST_PENDING_ORDER_STORAGE_KEY = "twopaws:guest-checkout:pending-order";

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
  verified?: boolean;
};

type CheckoutSummary = {
  itemCount: number;
  supplierCount: number;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  eta?: string;
};

type CheckoutOrderResult = CheckoutSummary & {
  orderId: string;
  orderNumber: number;
  paymentMethod: "cash" | "card";
  requiresPayment: boolean;
  guestCheckoutToken?: string | null;
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

type CustomerFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

const splitFullName = (value?: string | null): { firstName: string; lastName: string } => {
  const normalized = (value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) return { firstName: "", lastName: "" };
  const [firstName, ...rest] = normalized.split(" ");
  return {
    firstName: firstName ?? "",
    lastName: rest.join(" "),
  };
};

const isValidOptionalEmail = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
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
  const [checkoutSummary, setCheckoutSummary] = useState<CheckoutSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const checkoutAttemptKeyRef = useRef<string | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });
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
  const [guestAddressForm, setGuestAddressForm] = useState<AddressFormState>({
    label: "Delivery address",
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
  const isGuestCheckout = !user || !userRef;

  useEffect(() => {
    const stored = localStorage.getItem(PROMO_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PromoState;
        if (parsed?.code) {
          setPromo({
            code: parsed.code,
            discount: typeof parsed.discount === "number" ? parsed.discount : 0,
            total: typeof parsed.total === "number" ? parsed.total : 0,
            verified: false,
          });
        }
      } catch {
        localStorage.removeItem(PROMO_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const { firstName, lastName } = splitFullName(user.displayName);
    setCustomerForm((prev) => ({
      firstName: prev.firstName || firstName,
      lastName: prev.lastName || lastName,
      phone: prev.phone,
      email: prev.email || user.email || "",
    }));
  }, [user]);

  useEffect(() => {
    if (addresses.length === 0) {
      if (selectedAddressId) {
        setSelectedAddressId("");
      }
      return;
    }
    if (!selectedAddressId || !addresses.some((address) => address.id === selectedAddressId)) {
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

  useEffect(() => {
    const selectedAddress = addresses.find((address) => address.id === selectedAddressId);
    if (!selectedAddress || isGuestCheckout) return;
    const nameFromAddress = splitFullName(selectedAddress.recipientName as string | undefined);
    setCustomerForm((prev) => ({
      firstName: prev.firstName || nameFromAddress.firstName,
      lastName: prev.lastName || nameFromAddress.lastName,
      phone: prev.phone || String(selectedAddress.phone ?? ""),
      email: prev.email,
    }));
  }, [addresses, selectedAddressId, isGuestCheckout]);

  const selectedAddress = addresses.find((address) => address.id === selectedAddressId);
  const shippingCity = isGuestCheckout ? guestAddressForm.city : selectedAddress?.city;

  const filteredShippingZones = useMemo(() => {
    if (!shippingCity) return shippingZones;
    const city = shippingCity.trim().toLowerCase();
    return shippingZones.filter((zone) => (zone.label ?? "").trim().toLowerCase() === city);
  }, [shippingCity, shippingZones]);

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
  const cartEmpty = cartItems.length === 0;
  const checkoutRequestItems = useMemo(
    () =>
      cartItems
        .map((item) => {
          const productId = item.productIdValue ?? item.productRef?.id ?? item.product?.id ?? "";
          const quantity = typeof item.quantity === "number" ? Math.floor(item.quantity) : 0;
          if (!productId || quantity <= 0) return null;
          return { productId, quantity };
        })
        .filter((item): item is { productId: string; quantity: number } => Boolean(item)),
    [cartItems]
  );

  useEffect(() => {
    if (authLoading || checkoutRequestItems.length === 0) {
      setCheckoutSummary(null);
      return;
    }
    if (!isGuestCheckout && !selectedAddressId) {
      setCheckoutSummary(null);
      return;
    }
    const guestAddressReady = Boolean(
      guestAddressForm.city
      && guestAddressForm.street.trim()
      && guestAddressForm.phone.trim().length >= 7
      && guestAddressForm.location
    );
    if (isGuestCheckout && !guestAddressReady) {
      setCheckoutSummary(null);
      setSummaryError(null);
      return;
    }
    let active = true;
    setSummaryLoading(true);
    setSummaryError(null);
    const timer = window.setTimeout(() => {
      const summaryCall = httpsCallable(
        functions,
        isGuestCheckout ? "getGuestCheckoutSummary" : "getCheckoutSummary"
      );
      const payload = isGuestCheckout
        ? {
            items: checkoutRequestItems,
            promoCode: promo?.code ?? "",
            address: {
              ...guestAddressForm,
              location: guestAddressForm.location
                ? { lat: guestAddressForm.location.lat, lng: guestAddressForm.location.lng }
                : null,
            },
          }
        : { addressId: selectedAddressId, promoCode: promo?.code ?? "" };
      summaryCall(payload)
      .then((result) => {
        if (!active) return;
        const data = result.data as CheckoutSummary;
        setCheckoutSummary(data);
        if (promo?.code) {
          const verifiedPromo: PromoState = {
            code: promo.code,
            discount: data.discount,
            total: data.total,
            verified: true,
          };
          setPromo(verifiedPromo);
          localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(verifiedPromo));
        }
      })
      .catch((error) => {
        if (!active) return;
        setCheckoutSummary(null);
        setSummaryError((error as Error).message);
      })
      .finally(() => {
        if (active) setSummaryLoading(false);
      });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    authLoading,
    checkoutRequestItems,
    guestAddressForm,
    isGuestCheckout,
    promo?.code,
    selectedAddressId,
  ]);

  const subtotal = checkoutSummary?.subtotal ?? cart?.total ?? 0;
  const discount = checkoutSummary?.discount ?? 0;
  const shippingCost = checkoutSummary?.shipping ?? selectedZone?.rateEGP ?? 0;
  const totalPrice = checkoutSummary?.total ?? Math.max(subtotal - discount + shippingCost, 0);

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
    if (!addressForm.phone.trim()) {
      toast({
        title: "Phone required",
        description: "Add a phone number for this address.",
        variant: "destructive",
      });
      return;
    }
    if (!isValidPhoneNumber(addressForm.phone)) {
      toast({
        title: "Invalid phone number",
        description: "Enter a valid phone number with country code.",
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
        phone: addressForm.phone.trim(),
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

  const handleCheckout = async () => {
    if (!cart) {
      toast({ title: "Cart unavailable", description: "Reload and try again." });
      return;
    }
    if (cartEmpty) {
      toast({ title: "Cart empty", description: "Add items before checkout." });
      return;
    }
    if (!isGuestCheckout && addresses.length === 0) {
      toast({
        title: "No address saved",
        description: "Add a shipping address before placing your order.",
        variant: "destructive",
      });
      return;
    }
    if (!isGuestCheckout && !selectedAddress) {
      toast({
        title: "Select an address",
        description: "Choose a shipping address to continue.",
        variant: "destructive",
      });
      return;
    }
    const guestFirstName = customerForm.firstName.trim();
    const guestLastName = customerForm.lastName.trim();
    const guestPhone = customerForm.phone.trim();
    const guestEmail = customerForm.email.trim();
    const signedInNameCandidate = String(
      selectedAddress?.recipientName ?? user?.displayName ?? ""
    ).trim();
    const signedInNameParts = splitFullName(signedInNameCandidate);
    const firstName = isGuestCheckout
      ? guestFirstName
      : signedInNameParts.firstName || "Customer";
    const lastName = isGuestCheckout
      ? guestLastName
      : signedInNameParts.lastName || "TwoPaws";
    const normalizedPhone = isGuestCheckout
      ? guestPhone
      : String(selectedAddress?.phone ?? "").trim();
    const normalizedEmail = isGuestCheckout
      ? guestEmail
      : String(user?.email ?? "").trim() || guestEmail;

    if (isGuestCheckout) {
      if (!firstName || !lastName) {
        toast({
          title: "Name required",
          description: "Enter first and last name.",
          variant: "destructive",
        });
        return;
      }
      if (!normalizedPhone) {
        toast({
          title: "Phone required",
          description: "Enter your phone number to place the order.",
          variant: "destructive",
        });
        return;
      }
      if (!isValidPhoneNumber(normalizedPhone)) {
        toast({
          title: "Invalid phone number",
          description: "Enter a valid phone number with country code.",
          variant: "destructive",
        });
        return;
      }
      if (!ADDRESS_CITIES.includes(guestAddressForm.city as (typeof ADDRESS_CITIES)[number])) {
        toast({
          title: "Invalid city",
          description: "City must be Cairo or Giza.",
          variant: "destructive",
        });
        return;
      }
      if (!guestAddressForm.street.trim()) {
        toast({
          title: "Street required",
          description: "Enter a street for delivery.",
          variant: "destructive",
        });
        return;
      }
      if (!guestAddressForm.location) {
        toast({
          title: "Location required",
          description: "Select your delivery location on the map.",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!normalizedPhone) {
        toast({
          title: "Phone required",
          description: "Add a phone number to your selected shipping address.",
          variant: "destructive",
        });
        return;
      }
      if (!isValidPhoneNumber(normalizedPhone)) {
        toast({
          title: "Invalid phone number",
          description: "Update your selected address with a valid phone number.",
          variant: "destructive",
        });
        return;
      }
    }
    if (!isValidOptionalEmail(normalizedEmail)) {
      toast({
        title: "Invalid email",
        description: "Enter a valid email address or leave it empty.",
        variant: "destructive",
      });
      return;
    }

    if (!checkoutSummary) {
      toast({
        title: "Checkout not ready",
        description: summaryError || "Wait for the server to confirm pricing and delivery.",
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
      value: checkoutSummary.total,
      currency: META_PIXEL_CURRENCY,
      num_items: itemCount,
    });
    trackMetaEvent("AddPaymentInfo", {
      content_ids: checkoutItems.map((item) => item.id),
      contents: checkoutItems,
      value: checkoutSummary.total,
      currency: META_PIXEL_CURRENCY,
      num_items: itemCount,
      payment_method: paymentMethod,
    });

    setSubmitting(true);
    try {
      const isPaymob = paymentMethod === "paymob";
      checkoutAttemptKeyRef.current ??= window.crypto?.randomUUID?.()
        ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const createOrder = httpsCallable(
        functions,
        isGuestCheckout ? "createGuestCheckoutOrder" : "createCheckoutOrder"
      );
      const orderPayload = isGuestCheckout
        ? {
            idempotencyKey: checkoutAttemptKeyRef.current,
            paymentMethod: isPaymob ? "card" : "cash",
            promoCode: promo?.code ?? "",
            items: checkoutRequestItems,
            customer: {
              firstName,
              lastName,
              phone: normalizedPhone,
              email: normalizedEmail || null,
            },
            address: {
              ...guestAddressForm,
              recipientName: `${firstName} ${lastName}`.trim(),
              phone: normalizedPhone,
              email: normalizedEmail || null,
              location: guestAddressForm.location
                ? { lat: guestAddressForm.location.lat, lng: guestAddressForm.location.lng }
                : null,
            },
          }
        : {
            idempotencyKey: checkoutAttemptKeyRef.current,
            paymentMethod: isPaymob ? "card" : "cash",
            promoCode: promo?.code ?? "",
            addressId: selectedAddressId,
            source: "website",
          };
      const orderResult = await createOrder(orderPayload);
      const order = orderResult.data as CheckoutOrderResult;
      if (!order.orderId || !order.orderNumber) throw new Error("Unable to create order.");

      if (paymentMethod === "cod") {
        trackMetaEvent("Purchase", {
          content_ids: checkoutItems.map((item) => item.id),
          contents: checkoutItems,
          value: order.total,
          currency: META_PIXEL_CURRENCY,
          num_items: itemCount,
          order_id: order.orderId,
          payment_method: paymentMethod,
        });
      }

      if (paymentMethod === "paymob") {
        const guestCheckoutToken = order.guestCheckoutToken ?? undefined;
        if (isGuestCheckout && !guestCheckoutToken) {
          throw new Error("Guest payment authorization is unavailable.");
        }
        if (guestCheckoutToken) {
          window.sessionStorage.setItem(
            `${PAYMOB_GUEST_TOKEN_STORAGE_PREFIX}${order.orderId}`,
            guestCheckoutToken
          );
          window.sessionStorage.setItem(GUEST_PENDING_ORDER_STORAGE_KEY, order.orderId);
        }
        const createPaymobPayment = httpsCallable(functions, "createPaymobPayment");
        const result = await createPaymobPayment({
          orderId: order.orderId,
          guestCheckoutToken,
        });
        const payment = result.data as { clientSecret?: string; publicKey?: string };
        if (!payment?.clientSecret || !payment?.publicKey) {
          throw new Error("Unable to start Paymob payment.");
        }
        const checkoutUrl = buildPaymobCheckoutUrl(payment.publicKey, payment.clientSecret);
        window.location.assign(checkoutUrl);
        return;
      }

      if (isGuestCheckout) await clearCart();
      checkoutAttemptKeyRef.current = null;
      localStorage.removeItem(PROMO_STORAGE_KEY);
      if (isGuestCheckout) {
        toast({
          title: "Order placed",
          description: `Your order #${order.orderNumber} has been received.`,
        });
        navigate("/shop/");
      } else {
        navigate(`/orders/${order.orderId}`);
      }
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
        <Seo
          title="Checkout | TwoPaws Shop"
          description="Complete your TwoPaws order securely."
          canonicalUrl="/checkout/"
          noIndex
        />
        <p className="text-sm text-slate-500">Loading...</p>
      </ShopShell>
    );
  }

  return (
    <ShopShell>
      <Seo
        title="Checkout | TwoPaws Shop"
        description="Complete your TwoPaws order securely."
        canonicalUrl="/checkout/"
        noIndex
      />
      <header className="space-y-2">
        <p className="text-sm font-semibold text-brand-olive">Checkout</p>
        <h1 className="text-3xl font-semibold text-slate-900">Complete your order</h1>
        {supplierName && (
          <p className="text-sm text-slate-500">Supplier: {supplierName}</p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          {!user && (
            <Card className="border-slate-100">
              <CardContent className="space-y-3 p-6">
                <p className="text-sm text-slate-600">
                  You are checking out as guest.
                </p>
                <Button asChild variant="outline" className="border-slate-200">
                  <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`}>
                    Sign in for faster checkout
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {isGuestCheckout && (
            <Card className="border-slate-100">
              <CardContent className="space-y-4 p-6">
                <h3 className="text-lg font-semibold text-slate-900">Customer details</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>First name</Label>
                    <Input
                      value={customerForm.firstName}
                      onChange={(event) =>
                        setCustomerForm((prev) => ({ ...prev, firstName: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Last name</Label>
                    <Input
                      value={customerForm.lastName}
                      onChange={(event) =>
                        setCustomerForm((prev) => ({ ...prev, lastName: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <PhoneInput
                      className="auth-phone-input"
                      defaultCountry="EG"
                      international
                      countryCallingCodeEditable={false}
                      value={customerForm.phone || undefined}
                      onChange={(value) =>
                        setCustomerForm((prev) => ({ ...prev, phone: value ?? "" }))
                      }
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <Label>Email (optional)</Label>
                    <Input
                      type="email"
                      value={customerForm.email}
                      onChange={(event) =>
                        setCustomerForm((prev) => ({ ...prev, email: event.target.value }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!isGuestCheckout ? (
            <>
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
                <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto p-4 sm:p-6">
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
                        <PhoneInput
                          className="auth-phone-input"
                          defaultCountry="EG"
                          international
                          countryCallingCodeEditable={false}
                          value={addressForm.phone || undefined}
                          onChange={(value) =>
                            setAddressForm((prev) => ({ ...prev, phone: value ?? "" }))
                          }
                          placeholder="Enter phone number"
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
                        heightClassName="h-52 sm:h-64"
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
            </>
          ) : (
            <Card className="border-slate-100">
              <CardContent className="space-y-4 p-6">
                <h3 className="text-lg font-semibold text-slate-900">Shipping address</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>City</Label>
                    <Select
                      value={guestAddressForm.city}
                      onValueChange={(value) =>
                        setGuestAddressForm((prev) => ({ ...prev, city: value }))
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
                      value={guestAddressForm.area}
                      onChange={(event) =>
                        setGuestAddressForm((prev) => ({ ...prev, area: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Street</Label>
                    <Input
                      value={guestAddressForm.street}
                      onChange={(event) =>
                        setGuestAddressForm((prev) => ({ ...prev, street: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Building</Label>
                    <Input
                      value={guestAddressForm.building}
                      onChange={(event) =>
                        setGuestAddressForm((prev) => ({ ...prev, building: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Floor</Label>
                    <Input
                      value={guestAddressForm.floor}
                      onChange={(event) =>
                        setGuestAddressForm((prev) => ({ ...prev, floor: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Apartment</Label>
                    <Input
                      value={guestAddressForm.apartment}
                      onChange={(event) =>
                        setGuestAddressForm((prev) => ({ ...prev, apartment: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={guestAddressForm.notes}
                    onChange={(event) =>
                      setGuestAddressForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <GoogleMapPicker
                    value={guestAddressForm.location}
                    onChange={(location) =>
                      setGuestAddressForm((prev) => ({ ...prev, location }))
                    }
                  />
                  <p className="text-xs text-slate-500">
                    Tap on the map to set the exact delivery location.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

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
                    No shipping zones available for the selected city.
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
              {discount > 0 && (
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
              {summaryLoading ? (
                <p className="text-xs text-slate-500">Confirming prices and delivery...</p>
              ) : summaryError ? (
                <p className="text-xs text-red-600">{summaryError}</p>
              ) : checkoutSummary?.eta ? (
                <p className="text-xs text-slate-500">Estimated delivery: {checkoutSummary.eta}</p>
              ) : null}
            </CardContent>
          </Card>

          <Button
            className="w-full bg-brand-olive text-brand-dark"
            onClick={handleCheckout}
            disabled={submitting || summaryLoading || cartEmpty || !checkoutSummary}
          >
            {submitting ? "Placing order..." : "Place order"}
          </Button>
        </div>
      </div>
    </ShopShell>
  );
}
