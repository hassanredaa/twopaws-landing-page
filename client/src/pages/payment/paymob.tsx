import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { doc, onSnapshot } from "firebase/firestore";
import ShopShell from "@/components/shop/ShopShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { functions, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/lib/seo/Seo";

const PAYMOB_GUEST_TOKEN_STORAGE_PREFIX = "twopaws:paymob:guest-token:";

const buildCheckoutUrl = (publicKey: string, clientSecret: string) => {
  const params = new URLSearchParams({
    publicKey,
    clientSecret,
  });
  return `https://accept.paymob.com/unifiedcheckout/?${params.toString()}`;
};

export default function PaymobPaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const orderId = params.get("orderId");
  const locationState = location.state as {
    clientSecret?: string;
    publicKey?: string;
    guestCheckoutToken?: string;
  } | null;
  const [clientSecret, setClientSecret] = useState<string | null>(locationState?.clientSecret ?? null);
  const [publicKey, setPublicKey] = useState<string | null>(locationState?.publicKey ?? null);
  const [guestCheckoutToken, setGuestCheckoutToken] = useState<string | null>(
    locationState?.guestCheckoutToken ?? params.get("guestCheckoutToken")
  );
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!orderId || guestCheckoutToken) return;
    const storedToken = window.sessionStorage.getItem(
      `${PAYMOB_GUEST_TOKEN_STORAGE_PREFIX}${orderId}`
    );
    if (storedToken) {
      setGuestCheckoutToken(storedToken);
    }
  }, [orderId, guestCheckoutToken]);

  useEffect(() => {
    if (!orderId || !guestCheckoutToken) return;
    window.sessionStorage.setItem(
      `${PAYMOB_GUEST_TOKEN_STORAGE_PREFIX}${orderId}`,
      guestCheckoutToken
    );
  }, [orderId, guestCheckoutToken]);

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

  useEffect(() => {
    if (clientSecret || !orderId) return;
    setLoading(true);
    const createPaymobPayment = httpsCallable(functions, "createPaymobPayment");
    createPaymobPayment({ orderId, guestCheckoutToken: guestCheckoutToken ?? undefined })
      .then((result) => {
        const data = result.data as { clientSecret?: string; publicKey?: string };
        if (data?.clientSecret && data?.publicKey) {
          setClientSecret(data.clientSecret);
          setPublicKey(data.publicKey);
        } else {
          toast({
            title: "Payment unavailable",
            description: "Unable to start Paymob payment.",
            variant: "destructive",
          });
        }
      })
      .catch((err) => {
        toast({
          title: "Payment unavailable",
          description: (err as Error).message,
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [clientSecret, guestCheckoutToken, orderId, toast]);

  useEffect(() => {
    if (!orderId || !status) return;
    const normalized = status.toUpperCase();
    const isTerminal = normalized.includes("PAID") || normalized.includes("FAILED");
    if (!isTerminal) return;
    window.sessionStorage.removeItem(`${PAYMOB_GUEST_TOKEN_STORAGE_PREFIX}${orderId}`);
  }, [orderId, status]);

  const checkoutUrl = useMemo(() => {
    if (!clientSecret || !publicKey) return null;
    return buildCheckoutUrl(publicKey, clientSecret);
  }, [clientSecret, publicKey]);

  useEffect(() => {
    if (!checkoutUrl || redirectedRef.current) return;
    redirectedRef.current = true;
    window.location.assign(checkoutUrl);
  }, [checkoutUrl]);

  return (
    <ShopShell>
      <Seo
        title="Paymob Checkout | TwoPaws Shop"
        description="Complete your TwoPaws payment."
        canonicalUrl="/payment/paymob/"
        noIndex
      />
      <header className="space-y-2">
        <p className="text-sm font-semibold text-brand-olive">Paymob</p>
        <h1 className="text-3xl font-semibold text-slate-900">Complete payment</h1>
        {status && <p className="text-sm text-slate-500">Order status: {status}</p>}
      </header>

      {!orderId && (
        <Card className="border-slate-100">
          <CardContent className="p-6 text-slate-600">Missing order.</CardContent>
        </Card>
      )}

      {orderId && (
        <div className="space-y-4">
          {loading && <p className="text-sm text-slate-500">Preparing payment...</p>}
          {!loading && checkoutUrl && (
            <Card className="border-slate-100">
              <CardContent className="space-y-3 p-6 text-slate-600">
                <p>Redirecting to Paymob checkout...</p>
                <Button asChild className="bg-brand-green-dark text-white">
                  <a href={checkoutUrl}>Continue to Paymob</a>
                </Button>
              </CardContent>
            </Card>
          )}
          {!loading && !checkoutUrl && (
            <Card className="border-slate-100">
              <CardContent className="p-6 text-slate-600">Payment session is not available yet.</CardContent>
            </Card>
          )}
          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-brand-green-dark text-white">
              <Link to={`/orders/${orderId}`}>View order</Link>
            </Button>
            <Button variant="outline" className="border-slate-200" onClick={() => navigate("/shop/")}>
              Continue shopping
            </Button>
          </div>
        </div>
      )}
    </ShopShell>
  );
}
