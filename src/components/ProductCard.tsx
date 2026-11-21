import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { Product } from '../types';
import { formatINR } from '../utils/pricing';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { showToast } = useToast();

  const wishlisted = isWishlisted(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) return;
    addToCart(product.id, 1);
    showToast(`${product.name} added to bag`, 'success');
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleWishlist(product.id);
    showToast(
      added ? `${product.name} saved to wishlist` : `${product.name} removed from wishlist`,
      'info'
    );
  };

  return (
    <article className="group flex flex-col bg-white rounded-2xl border border-slate-200/80 overflow-hidden transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
        <Link to={`/product/${product.slug}`} className="block w-full h-full focus-visible:outline-none">
          <ProductImage
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>
        <button
          type="button"
          onClick={handleToggleWishlist}
          aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className="absolute top-2 right-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-slate-700 hover:text-blue-600 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              wishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-700'
            }`}
          />
        </button>
      </div>

      <div className="flex flex-col flex-1 p-4 sm:p-5 gap-2.5">
        {/* Clean unboxed metadata row (Zero-Pill Discipline) */}
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <span className="uppercase tracking-wider font-medium truncate">
            {product.category}
          </span>
          <span className="inline-flex items-center gap-1 shrink-0 tabular-nums text-slate-700 font-medium">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
            {product.rating.toFixed(1)}
            <span className="text-slate-400 font-normal">({product.reviewCount})</span>
          </span>
        </div>

        <Link
          to={`/product/${product.slug}`}
          className="font-display text-sm sm:text-base font-semibold text-slate-900 leading-snug line-clamp-2 hover:text-blue-600 transition-colors"
        >
          {product.name}
        </Link>

        <div className="mt-auto pt-1 flex items-baseline flex-wrap gap-x-2 gap-y-0.5 tabular-nums">
          <span className="text-base sm:text-lg font-bold text-slate-900">
            {formatINR(product.price)}
          </span>
          {product.originalPrice > product.price && (
            <>
              <span className="text-xs sm:text-sm text-slate-400 line-through">
                {formatINR(product.originalPrice)}
              </span>
              <span className="text-xs font-semibold text-blue-600">
                {product.discount}% off
              </span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={product.stock <= 0}
          className="mt-2 w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs sm:text-sm font-medium text-white transition-colors hover:bg-blue-600 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <ShoppingBag className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}</span>
        </button>
      </div>
    </article>
  );
};
