import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, Home, Search, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';

interface BottomNavigationProps {
  onOpenSearch: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ onOpenSearch }) => {
  const location = useLocation();
  const { totalCount } = useCart();
  const { wishlistIds } = useWishlist();
  const { isAuthenticated } = useAuth();

  const isHome = location.pathname === '/';
  const isWishlist = location.pathname === '/wishlist';
  const isCart = location.pathname === '/cart';
  const isAccount =
    location.pathname === '/profile' ||
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/orders';

  const tabClass = (active: boolean) =>
    `flex flex-col items-center justify-center min-h-[44px] py-1 transition-colors ${
      active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
    }`;

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe"
    >
      <div className="grid grid-cols-5 h-[60px] items-center">
        <Link to="/" className={tabClass(isHome)}>
          <Home className="w-5 h-5" strokeWidth={isHome ? 2.25 : 1.75} />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Home</span>
        </Link>

        <button type="button" onClick={onOpenSearch} className={tabClass(false)}>
          <Search className="w-5 h-5" strokeWidth={1.75} />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Search</span>
        </button>

        <Link to="/wishlist" className={`relative ${tabClass(isWishlist)}`}>
          <div className="relative">
            <Heart className="w-5 h-5" strokeWidth={isWishlist ? 2.25 : 1.75} />
            {wishlistIds.length > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                {wishlistIds.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Wishlist</span>
        </Link>

        <Link to="/cart" className={`relative ${tabClass(isCart)}`}>
          <div className="relative">
            <ShoppingBag className="w-5 h-5" strokeWidth={isCart ? 2.25 : 1.75} />
            {totalCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                {totalCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Cart</span>
        </Link>

        <Link
          to={isAuthenticated ? '/profile' : '/login'}
          className={tabClass(isAccount)}
        >
          <User className="w-5 h-5" strokeWidth={isAccount ? 2.25 : 1.75} />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Account</span>
        </Link>
      </div>
    </nav>
  );
};
