import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { formatINR } from '../utils/pricing';
import { ProductImage } from '../components/ProductImage';

export const Wishlist: React.FC = () => {
  const { wishlistProducts, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const handleMoveToCart = (productId: string, name: string) => {
    addToCart(productId, 1);
    removeFromWishlist(productId);
    showToast(`${name} moved to shopping bag`, 'success');
  };

  if (wishlistProducts.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <Heart className="w-7 h-7" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold text-slate-900">
          Your wishlist is empty
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-md mx-auto">
          Save items you love while browsing so you can compare and move them to your bag anytime.
        </p>
        <Link
          to="/shop"
          className="mt-7 min-h-[48px] inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
        >
          <span>Explore Products</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex items-baseline justify-between gap-4 pb-6 border-b border-slate-200">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Saved Wishlist
        </h1>
        <span className="text-sm text-slate-500 tabular-nums">
          {wishlistProducts.length} {wishlistProducts.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {wishlistProducts.map((product) => (
          <article
            key={product.id}
            className="flex flex-col rounded-2xl border border-slate-200/80 bg-white overflow-hidden"
          >
            <Link
              to={`/product/${product.slug}`}
              className="aspect-[4/3] w-full bg-slate-100 overflow-hidden"
            >
              <ProductImage src={product.image} alt={product.name} />
            </Link>

            <div className="p-5 flex-1 flex flex-col gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                  {product.category}
                </p>
                <Link
                  to={`/product/${product.slug}`}
                  className="mt-1 block font-display text-base font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                >
                  {product.name}
                </Link>
              </div>

              <div className="flex items-baseline gap-2 tabular-nums">
                <span className="text-lg font-bold text-slate-900">{formatINR(product.price)}</span>
                <span className="text-xs text-slate-400 line-through">
                  {formatINR(product.originalPrice)}
                </span>
                <span className="text-xs font-semibold text-blue-600">{product.discount}% off</span>
              </div>

              <div className="mt-auto pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMoveToCart(product.id, product.name)}
                  className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs sm:text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Move to Cart</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeFromWishlist(product.id);
                    showToast(`${product.name} removed from wishlist`, 'info');
                  }}
                  aria-label={`Remove ${product.name} from wishlist`}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
