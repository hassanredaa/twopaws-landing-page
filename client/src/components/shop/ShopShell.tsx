import type { ReactNode } from "react";
import { Menu, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import twoPawsLogo from "../../../../attached_assets/logotrans-320.webp";
import SiteFooter from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/orders", label: "Orders" },
  { href: "/account", label: "Account" },
];

type ShopShellProps = {
  children: ReactNode;
  headerContent?: ReactNode;
};

export default function ShopShell({ children, headerContent }: ShopShellProps) {
  const { user, signOutUser } = useAuth();
  const { cart } = useCart();
  const itemCount = cart?.itemCount ?? 0;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-100 bg-white">
        <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-700 hover:border-brand-green-dark hover:text-brand-green-dark md:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-6">
                <SheetHeader className="text-left">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-4 text-sm text-slate-700">
                  {navLinks.map((link) => (
                    <Link key={link.href} to={link.href} className="hover:text-brand-green-dark">
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <Link to="/shop" className="flex items-center gap-2">
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
        {headerContent ? (
          <div className="border-t border-slate-100 px-4 py-3 sm:px-6 lg:px-8">
            {headerContent}
          </div>
        ) : null}
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
