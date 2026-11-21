import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  Zap,
} from 'lucide-react';
import { getProductByIdOrSlug, PRODUCTS } from '../data/products';
import { formatINR } from '../utils/pricing';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { ProductImage } from '../components/ProductImage';
import { ProductGrid } from '../components/ProductGrid';

export const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { showToast } = useToast();

  const product = id ? getProductByIdOrSlug(id) : undefined;
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (product) {
      setSelectedImage(product.image);
      setQuantity(1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product]);

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-slate-900">Product not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          The product you requested could not be found in the NEXORA catalogue.
        </p>
        <Link
          to="/shop"
          className="mt-6 inline-flex items-center justify-center min-h-[44px] rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
        >
          Browse All Products
        </Link>
      </div>
    );
  }

  const wishlisted = isWishlisted(product.id);
  const relatedProducts = PRODUCTS.filter(
    (p) => p.categorySlug === product.categorySlug && p.id !== product.id
  ).slice(0, 3);

  const handleAddToCart = () => {
    addToCart(product.id, quantity);
    showToast(`Added ${quantity} × ${product.name} to bag`, 'success');
  };

  const handleBuyNow = () => {
    addToCart(product.id, quantity);
    navigate('/checkout');
  };

  const handleWishlist = () => {
    const added = toggleWishlist(product.id);
    showToast(
      added ? `${product.name} added to wishlist` : `${product.name} removed from wishlist`,
      'info'
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Breadcrumb Back Navigation */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="min-h-[44px] inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 flex items-center gap-2 truncate">
          <Link to="/" className="hover:text-slate-900">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to={`/shop?category=${product.categorySlug}`} className="hover:text-slate-900">
            {product.category}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-900 font-medium truncate">{product.name}</span>
        </nav>
      </div>

      {/* Main Split: Sticky Gallery Left, Contiguous Purchase Module Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-7 lg:sticky lg:top-24 space-y-4">
          <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80">
            <ProductImage
              src={selectedImage || product.image}
              alt={product.name}
              loading="eager"
              className="w-full h-full object-cover"
            />
          </div>

          {product.gallery.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.gallery.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setSelectedImage(img)}
                  className={`aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all bg-slate-100 ${
                    selectedImage === img
                      ? 'border-blue-600 ring-2 ring-blue-600/20'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <ProductImage
                    src={img}
                    alt={`${product.name} gallery view ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Purchase Module */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="uppercase tracking-wider font-semibold text-blue-600">
                {product.category}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">SKU {product.sku}</span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {product.name}
            </h1>

            <div className="flex items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-900 tabular-nums">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                {product.rating.toFixed(1)}
              </span>
              <span className="text-slate-400" aria-hidden="true">·</span>
              <span className="text-slate-600 tabular-nums">
                {product.reviewCount} verified reviews
              </span>
              <span className="text-slate-400" aria-hidden="true">·</span>
              <span className={product.stock > 0 ? 'text-emerald-700 font-medium' : 'text-rose-600 font-medium'}>
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </span>
            </div>
          </div>

          <div className="py-4 border-y border-slate-200 flex items-baseline gap-3 tabular-nums">
            <span className="font-display text-3xl font-extrabold text-slate-900">
              {formatINR(product.price)}
            </span>
            {product.originalPrice > product.price && (
              <>
                <span className="text-base text-slate-400 line-through">
                  {formatINR(product.originalPrice)}
                </span>
                <span className="text-sm font-semibold text-blue-600">
                  Save {product.discount}%
                </span>
              </>
            )}
          </div>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {product.description}
          </p>

          <ul className="space-y-2">
            {product.highlights.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
                <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {/* Quantity & Actions */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700">Quantity</span>
              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-l-xl"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-11 text-center text-sm font-semibold tabular-nums text-slate-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  aria-label="Increase quantity"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-r-xl"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 active:scale-[0.98] transition-all disabled:bg-slate-200"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={product.stock <= 0}
                className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all disabled:bg-slate-200"
              >
                <Zap className="w-4 h-4" />
                <span>Buy Now</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleWishlist}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Heart
                className={`w-4 h-4 ${wishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`}
              />
              <span>{wishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <Truck className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
              <span>Free express shipping on orders ₹999 and above.</span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
              <span>1-year standard demo warranty &amp; easy 14-day return policy.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-16 pt-12 border-t border-slate-200">
        <div className="flex items-baseline justify-between gap-4 mb-6">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
            Customer Reviews
          </h2>
          <span className="text-sm text-slate-500 tabular-nums">
            {product.rating.toFixed(1)} out of 5 · {product.reviewCount} ratings
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {product.reviews.map((rev) => (
            <div
              key={rev.id}
              className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-sm font-semibold text-slate-900">
                  {rev.author}
                </span>
                <span className="text-xs text-slate-500">{rev.date}</span>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                    }`}
                  />
                ))}
                {rev.verified && (
                  <span className="ml-2 text-xs text-emerald-700 font-medium">
                    Verified Demo Buyer
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{rev.comment}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-16 pt-12 border-t border-slate-200">
          <div className="flex items-end justify-between gap-4 mb-8">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
              Related in {product.category}
            </h2>
            <Link
              to={`/shop?category=${product.categorySlug}`}
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              View all
            </Link>
          </div>
          <ProductGrid products={relatedProducts} />
        </section>
      )}
    </div>
  );
};
