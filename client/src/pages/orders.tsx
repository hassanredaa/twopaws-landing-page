import ShopShell from "@/components/shop/ShopShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOrders } from "@/hooks/useOrders";
import { formatCurrency } from "@/lib/format";

const formatDate = (timestamp?: { toMillis?: () => number }) => {
  const millis = timestamp?.toMillis?.();
  if (!millis) return "";
  return new Date(millis).toLocaleDateString("en-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function OrdersPage() {
  const { user } = useAuth();
  const { orders, loading } = useOrders();

  if (!user) {
    return (
      <ShopShell>
        <Card className="border-slate-100">
          <CardContent className="p-6">
            <p className="text-slate-600">Sign in to see your orders.</p>
            <Button asChild className="mt-4 bg-brand-green-dark text-white">
              <a href="/login?redirect=/orders">Sign in</a>
            </Button>
          </CardContent>
        </Card>
      </ShopShell>
    );
  }

  return (
    <ShopShell>
      <header className="space-y-2">
        <p className="text-sm font-semibold text-brand-olive">Orders</p>
        <h1 className="text-3xl font-semibold text-slate-900">Your orders</h1>
      </header>

      <section className="space-y-4">
        {loading && <p className="text-sm text-slate-500">Loading orders...</p>}
        {!loading && orders.length === 0 && (
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
                  <a href={`/orders/${order.id}`}>View</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </ShopShell>
  );
}
