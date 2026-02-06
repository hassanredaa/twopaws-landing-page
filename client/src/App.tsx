import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { initMetaPixel, trackPageView } from "@/lib/metaPixel";
import Landing from "@/pages/landing";
import AboutPage from "@/pages/marketing/about";
import ContactPage from "@/pages/marketing/contact";
import EgyptPage from "@/pages/marketing/egypt";
import FeaturesPage from "@/pages/marketing/features";
import NotFound from "@/pages/not-found";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import DeleteAccount from "@/pages/delete-account";
import DownloadRedirect from "@/pages/download";
import ShopPage from "@/pages/shop";
import SuppliersPage from "@/pages/shop/suppliers";
import SupplierShopPage from "@/pages/shop/supplier";
import ProductDetailPage from "@/pages/shop/product";
import CartPage from "@/pages/cart";
import CheckoutPage from "@/pages/checkout";
import OrdersPage from "@/pages/orders";
import OrderDetailPage from "@/pages/order-detail";
import AccountPage from "@/pages/account";
import LoginPage from "@/pages/login";
import PaymobPaymentPage from "@/pages/payment/paymob";
import PaymentReturnPage from "@/pages/payment/return";

function MetaPixelTracker() {
  const location = useLocation();
  const enablePixel = import.meta.env.PROD;

  useEffect(() => {
    if (!enablePixel) return;
    initMetaPixel();
  }, [enablePixel]);

  useEffect(() => {
    if (!enablePixel) return;
    trackPageView();
  }, [enablePixel, location.pathname, location.search]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <TooltipProvider>
          <AuthProvider>
            <CartProvider>
              <BrowserRouter future={{ v7_relativeSplatPath: true }}>
                <Toaster />
                <MetaPixelTracker />
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/features" element={<FeaturesPage />} />
                  <Route path="/egypt" element={<EgyptPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/download" element={<DownloadRedirect />} />
                  <Route path="/delete-account" element={<DeleteAccount />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/shop" element={<ShopPage />} />
                  <Route path="/shop/suppliers" element={<SuppliersPage />} />
                  <Route path="/shop/supplier/:supplierId" element={<SupplierShopPage />} />
                  <Route path="/shop/product/:productId" element={<ProductDetailPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/orders/:orderId" element={<OrderDetailPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/payment/paymob" element={<PaymobPaymentPage />} />
                  <Route path="/payment/return" element={<PaymentReturnPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </CartProvider>
          </AuthProvider>
        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
