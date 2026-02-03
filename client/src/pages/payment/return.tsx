import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import ShopShell from "@/components/shop/ShopShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";

export default function PaymentReturnPage() {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const orderId = params.get("orderId");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const orderRef = doc(db, "orders", orderId);
    const unsubscribe = onSnapshot(orderRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as { status?: string; orderStatus?: string; success?: boolean };
      setStatus(data.status ?? data.orderStatus ?? (data.success ? "PAID" : null));
    });
    return () => unsubscribe();
  }, [orderId]);

  return (
    <ShopShell>
      <header className="space-y-2">
        <p className="text-sm font-semibold text-brand-olive">Payment</p>
        <h1 className="text-3xl font-semibold text-slate-900">Payment result</h1>
      </header>

      <Card className="border-slate-100">
        <CardContent className="space-y-3 p-6">
          <p className="text-slate-600">
            {orderId
              ? `Order ${orderId} status: ${status ?? "Pending"}`
              : "Missing order reference."}
          </p>
          {orderId && (
            <Button asChild className="bg-brand-green-dark text-white">
              <Link to={`/orders/${orderId}`}>View order</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </ShopShell>
  );
}
