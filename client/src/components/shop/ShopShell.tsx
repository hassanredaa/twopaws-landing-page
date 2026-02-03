import type { ReactNode } from "react";
import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import twoPawsLogo from "../../../../attached_assets/logotrans.webp";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";

const navLinks = [
  { href: "/shop", label: "Shop" },
  { href: "/shop/suppliers", label: "Suppliers" },
  { href: "/orders", label: "Orders" },
];

type ShopShellProps = {
  children: ReactNode;
};

export default function ShopShell({ children }: ShopShellProps) {
  const { user, signOutUser } = useAuth();
  const { cart } = useCart();
  const itemCount = cart?.itemCount ?? 0;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img src={twoPawsLogo} alt="TwoPaws" className="h-10" />
            </Link>
            <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="hover:text-brand-green-dark"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/cart"
              className="relative inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-700 hover:border-brand-green-dark hover:text-brand-green-dark"
              aria-label="Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-2 -top-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-brand-olive px-1.5 text-xs font-semibold text-brand-dark">
                  {itemCount}
                </span>
              )}
            </Link>
            {user ? (
              <Button
                variant="outline"
                className="border-slate-200 text-slate-700"
                onClick={() => signOutUser()}
              >
                Sign out
              </Button>
            ) : (
              <Button asChild className="bg-brand-green-dark text-white">
                <Link to="/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="border-t border-slate-100 bg-white py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="font-semibold text-slate-900">TwoPaws Shop</p>
          <div className="flex flex-wrap gap-4">
            <Link className="hover:text-slate-900" to="/terms">
              Terms
            </Link>
            <Link className="hover:text-slate-900" to="/privacy">
              Privacy
            </Link>
            <Link className="hover:text-slate-900" to="/contact">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
