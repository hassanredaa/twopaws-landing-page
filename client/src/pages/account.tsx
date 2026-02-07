import { useState } from "react";
import { Link } from "react-router-dom";
import { GeoPoint } from "firebase/firestore";
import ShopShell from "@/components/shop/ShopShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useOrders } from "@/hooks/useOrders";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/lib/seo/Seo";

const formatDate = (timestamp?: { toMillis?: () => number }) => {
  const millis = timestamp?.toMillis?.();
  if (!millis) return "";
  return new Date(millis).toLocaleDateString("en-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

export default function AccountPage() {
  const { user } = useAuth();
  const { orders, loading: ordersLoading } = useOrders();
  const { addresses, loading: addressesLoading, addAddress, updateAddress } = useAddresses();
  const { toast } = useToast();
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

  if (!user) {
    return (
      <ShopShell>
        <Seo
          title="Account | TwoPaws Shop"
          description="Manage your TwoPaws account, addresses, and order history."
          canonicalUrl="/account"
          noIndex
        />
        <Card className="border-slate-100">
          <CardContent className="p-6">
            <p className="text-slate-600">Sign in to view your account.</p>
            <Button asChild className="mt-4 bg-brand-green-dark text-white">
              <Link to="/login?redirect=/account">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </ShopShell>
    );
  }

  return (
    <ShopShell>
      <Seo
        title="Account | TwoPaws Shop"
        description="Manage your TwoPaws account, addresses, and order history."
        canonicalUrl="/account"
        noIndex
      />
      <header className="space-y-2">
        <p className="text-sm font-semibold text-brand-olive">Account</p>
        <h1 className="text-3xl font-semibold text-slate-900">Your account</h1>
      </header>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Orders</h2>
            <p className="text-sm text-slate-500">Track and review your recent orders.</p>
          </div>
          <Button asChild variant="outline" className="border-slate-200">
            <Link to="/orders">View all orders</Link>
          </Button>
        </div>

        {ordersLoading && <p className="text-sm text-slate-500">Loading orders...</p>}
        {!ordersLoading && orders.length === 0 && (
          <p className="text-sm text-slate-500">No orders yet.</p>
        )}
        {orders.map((order) => (
          <Card key={order.id} className="border-slate-100">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Order #{order.orderNumber ?? order.id.slice(0, 6)} · {formatDate(order.created_at ?? order.createdAt)}
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {order.status ?? order.orderStatus ?? "Processing"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm font-semibold text-slate-900">
                  {formatCurrency(order.totalPrice ?? 0)}
                </p>
                <Button asChild variant="outline" className="border-slate-200">
                  <Link to={`/orders/${order.id}`}>View</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Addresses</h2>
            <p className="text-sm text-slate-500">Manage your delivery addresses.</p>
          </div>
          <Button className="bg-brand-green-dark text-white" onClick={openAddAddress}>
            Add address
          </Button>
        </div>

        {addressesLoading && <p className="text-sm text-slate-500">Loading addresses...</p>}
        {!addressesLoading && addresses.length === 0 && (
          <p className="text-sm text-slate-500">No saved addresses yet.</p>
        )}
        {addresses.map((address) => (
          <Card key={address.id} className="border-slate-100">
            <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">
                  {address.label ?? "Saved address"}
                </p>
                <p className="text-sm text-slate-600">{formatAddress(address)}</p>
              </div>
              <Button
                variant="outline"
                className="border-slate-200"
                onClick={() => openEditAddress(address)}
              >
                Edit
              </Button>
            </CardContent>
          </Card>
        ))}

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
      </section>
    </ShopShell>
  );
}
