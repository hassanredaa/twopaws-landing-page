import type { ReactNode } from "react";
import { Menu, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import twoPawsLogo from "../../../../attached_assets/logotrans-brand-800.webp";
import SiteFooter from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  { href: "/shop/", label: "Shop" },
  { href: "/orders", label: "Orders" },
  { href: "/account", label: "Account" },
];

type ShopShellProps = {
  children: ReactNode;
  headerContent?: ReactNode;
};

export default function ShopShell({ children, headerContent }: ShopShellProps) {
  const { user, userDisplayName, signOutUser } = useAuth();
  const { cart } = useCart();
  const itemCount = cart?.itemCount ?? 0;
  const userLabel = userDisplayName || user?.email?.split("@")[0] || "Account";
  const userEmail = user?.email || "Signed in user";
  const userInitial = userLabel.charAt(0).toUpperCase();
  const compactUserLabel = userLabel.split(" ")[0] || userLabel;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-100 bg-white">
        <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-4">
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
            <Link to="/shop/" className="flex items-center gap-2">
              <img src={twoPawsLogo} alt="TwoPaws" className="h-8 w-auto sm:h-10" />
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
          <div className="flex items-center gap-2 sm:gap-3">
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex max-w-[132px] items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 pr-3 text-left hover:border-brand-green-dark sm:max-w-none"
                    aria-label="Open account menu"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-sm font-semibold text-brand-dark">
                      {userInitial}
                    </span>
                    <span className="hidden max-w-[72px] truncate text-xs font-medium text-slate-700 min-[420px]:block sm:hidden">
                      {compactUserLabel}
                    </span>
                    <span className="hidden max-w-[160px] sm:block">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {userLabel}
                      </span>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 sm:w-64">
                  <DropdownMenuLabel className="space-y-0.5">
                    <p className="truncate text-sm font-medium text-slate-900">{userLabel}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/account">Account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders">Orders</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-xs text-slate-500 focus:text-slate-700"
                    onSelect={() => {
                      void signOutUser();
                    }}
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" className="border-slate-200">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild className="bg-brand-green-dark text-white">
                  <Link to="/login?mode=signup">Sign up</Link>
                </Button>
              </div>
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
