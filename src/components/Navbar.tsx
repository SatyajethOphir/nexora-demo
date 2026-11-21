import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  Heart,
  Menu,
  Package,
  Search,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import { CATEGORIES } from '../data/categories';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { SearchBar } from './SearchBar';
import { PWAInstallButton } from './Toast';

interface NavbarProps {
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ searchOpen, setSearchOpen }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const { totalCount } = useCart();
  const { wishlistIds } = useWishlist();
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileMenuOpen(false);
    setCategoriesOpen(false);
  }, [location.pathname, location.search]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
      isActive ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 pt-safe">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile Top Bar (52px height) */}
          <div className="flex md:hidden items-center justify-between h-[52px]">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link
              to="/"
              className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
            >
              NEXORA
            </Link>

            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Toggle search"
              className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
            >
              {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </button>
          </div>

          {/* Desktop Top Bar (64px height, 3-zone contract) */}
          <div className="hidden md:flex items-center justify-between gap-8 h-16">
            {/* Zone 1: Single-element wordmark */}
            <Link
              to="/"
              className="font-display text-xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
            >
              NEXORA
            </Link>

            {/* Zone 2: 5 concise single-line nav links */}
            <nav aria-label="Primary navigation" className="flex items-center gap-7">
              <NavLink to="/" end className={navLinkClass}>
                Home
              </NavLink>
              <NavLink to="/shop" className={navLinkClass}>
                Shop
              </NavLink>

              <div
                className="relative"
                onMouseEnter={() => setCategoriesOpen(true)}
                onMouseLeave={() => setCategoriesOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setCategoriesOpen((prev) => !prev)}
                  aria-expanded={categoriesOpen}
                  className="inline-flex items-center gap-1 py-1 text-sm font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap shrink-0 transition-colors"
                >
                  <span>Categories</span>
                  <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                {categoriesOpen && (
                  <div className="absolute left-0 top-full pt-2 w-64 z-50">
                    <div className="rounded-2xl bg-white border border-slate-200 shadow-lg p-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.slug}
                          type="button"
                          onClick={() => {
                            setCategoriesOpen(false);
                            navigate(`/shop?category=${cat.slug}`);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 text-left text-sm font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors"
                        >
                          <span>{cat.name}</span>
                          <span className="text-xs text-slate-400 tabular-nums">
                            {cat.productCount}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <NavLink
                to="/shop?deals=true"
                className={() =>
                  `py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                    location.search.includes('deals=true')
                      ? 'text-blue-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                Deals
              </NavLink>
              <NavLink to="/about" className={navLinkClass}>
                About
              </NavLink>
            </nav>

            {/* Zone 3: Action utilities */}
            <div className="flex items-center gap-2 shrink-0">
              <PWAInstallButton variant="compact" />

              <button
                type="button"
                onClick={() => setSearchOpen(!searchOpen)}
                aria-label="Search products"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
              </button>

              <Link
                to="/wishlist"
                aria-label={`Wishlist (${wishlistIds.length} items)`}
                className="relative min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <Heart className="w-4 h-4" />
                {wishlistIds.length > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {wishlistIds.length}
                  </span>
                )}
              </Link>

              <Link
                to="/notifications"
                aria-label="Notification settings"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <Bell className="w-4 h-4" />
              </Link>

              <Link
                to={isAuthenticated ? '/profile' : '/login'}
                aria-label={isAuthenticated ? `Account: ${user?.name}` : 'Sign in'}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <User className="w-4 h-4" />
              </Link>

              <Link
                to="/cart"
                aria-label={`Shopping bag (${totalCount} items)`}
                className="relative min-h-[40px] inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0"
              >
                <ShoppingBag className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Bag</span>
                <span className="tabular-nums rounded-md bg-white/15 px-1.5 py-0.5 text-[11px]">
                  {totalCount}
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Expandable Search Tray */}
        {searchOpen && (
          <div className="border-t border-slate-200 bg-white px-4 sm:px-6 lg:px-8 py-3">
            <div className="max-w-3xl mx-auto">
              <SearchBar autoFocus onSelectResult={() => setSearchOpen(false)} />
            </div>
          </div>
        )}
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-5 h-14 border-b border-slate-200">
              <span className="font-display text-lg font-extrabold tracking-tight text-slate-900">
                NEXORA
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-6 flex-1">
              <nav className="space-y-1">
                <Link
                  to="/"
                  className="flex items-center min-h-[44px] px-3 rounded-xl text-base font-medium text-slate-900 hover:bg-slate-100"
                >
                  Home
                </Link>
                <Link
                  to="/shop"
                  className="flex items-center min-h-[44px] px-3 rounded-xl text-base font-medium text-slate-900 hover:bg-slate-100"
                >
                  Shop All
                </Link>
                <Link
                  to="/shop?deals=true"
                  className="flex items-center min-h-[44px] px-3 rounded-xl text-base font-medium text-blue-600 hover:bg-blue-50"
                >
                  Limited Time Deals
                </Link>
                <Link
                  to="/orders"
                  className="flex items-center gap-2 min-h-[44px] px-3 rounded-xl text-base font-medium text-slate-900 hover:bg-slate-100"
                >
                  <Package className="w-4 h-4 text-slate-500" />
                  <span>My Orders</span>
                </Link>
                <Link
                  to="/notifications"
                  className="flex items-center gap-2 min-h-[44px] px-3 rounded-xl text-base font-medium text-slate-900 hover:bg-slate-100"
                >
                  <Bell className="w-4 h-4 text-slate-500" />
                  <span>Notification Settings</span>
                </Link>
                <Link
                  to="/about"
                  className="flex items-center min-h-[44px] px-3 rounded-xl text-base font-medium text-slate-900 hover:bg-slate-100"
                >
                  About NEXORA
                </Link>
              </nav>

              <div className="pt-4 border-t border-slate-200">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Categories
                </p>
                <div className="space-y-1">
                  {CATEGORIES.map((cat) => (
                    <Link
                      key={cat.slug}
                      to={`/shop?category=${cat.slug}`}
                      className="flex items-center justify-between min-h-[44px] px-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <span>{cat.name}</span>
                      <span className="text-xs text-slate-400 tabular-nums">{cat.productCount}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 space-y-3 bg-slate-50">
              <PWAInstallButton variant="full" />
              <Link
                to={isAuthenticated ? '/profile' : '/login'}
                className="w-full min-h-[44px] flex items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900"
              >
                {isAuthenticated ? `Signed in as ${user?.name}` : 'Sign In / Register'}
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
