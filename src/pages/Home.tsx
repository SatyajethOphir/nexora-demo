import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Truck, Undo2 } from 'lucide-react';
import { CATEGORIES } from '../data/categories';
import { HERO_BANNER_IMAGE, PRODUCTS } from '../data/products';
import { CategoryCard } from '../components/CategoryCard';
import { ProductGrid } from '../components/ProductGrid';
import { ProductImage } from '../components/ProductImage';

export const Home: React.FC = () => {
  const featuredProducts = PRODUCTS.filter((p) => p.featured).slice(0, 6);
  const bestSellers = PRODUCTS.filter((p) => p.bestSeller).slice(0, 6);

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                  NEXORA Curated Storefront
                </p>
                <h1
                  style={{ textWrap: 'balance' }}
                  className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-slate-900 leading-[1.08]"
                >
                  Upgrade Your Everyday.
                </h1>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-lg">
                  Discover premium technology, lifestyle essentials and accessories at exceptional prices.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/shop"
                  className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-600 transition-colors whitespace-nowrap"
                >
                  <span>Shop Now</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/shop?deals=true"
                  className="min-h-[48px] inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:border-slate-900 transition-colors whitespace-nowrap"
                >
                  Explore Deals
                </Link>
              </div>

              <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                  <span>Free delivery ₹999+</span>
                </div>
                <div className="flex items-center gap-2">
                  <Undo2 className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                  <span>14-day returns</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                  <span>Demo checkout</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[420px] rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-200 shadow-sm">
                <ProductImage
                  src={HERO_BANNER_IMAGE}
                  alt="NEXORA curated smartphones, headphones, watches, and desk essentials"
                  loading="eager"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Shop by Category
            </h2>
            <p className="mt-1.5 text-sm sm:text-base text-slate-600">
              Six curated departments built for work, home, and daily movement.
            </p>
          </div>
          <Link
            to="/shop"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap shrink-0 inline-flex items-center gap-1"
          >
            <span>All 30 items</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {CATEGORIES.map((category) => (
            <CategoryCard key={category.slug} category={category} />
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-slate-50/70 border-y border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Featured Products
              </h2>
              <p className="mt-1.5 text-sm sm:text-base text-slate-600">
                Standout hardware, carry essentials, and workspace upgrades.
              </p>
            </div>
            <Link
              to="/shop"
              className="text-sm font-semibold text-slate-900 hover:text-blue-600 whitespace-nowrap shrink-0 inline-flex items-center gap-1"
            >
              <span>View catalogue</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          <ProductGrid products={featuredProducts} />
        </div>
      </section>

      {/* Promotional Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
        <div className="rounded-3xl bg-slate-900 text-white px-6 py-10 sm:px-12 sm:py-14 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
              Seasonal Event
            </p>
            <h2
              style={{ textWrap: 'balance' }}
              className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight"
            >
              Limited Time Offers — Save Up to 50%
            </h2>
            <p className="text-sm sm:text-base text-slate-300">
              Use demo codes <span className="font-mono font-semibold text-white">NEXORA10</span> or{' '}
              <span className="font-mono font-semibold text-white">WELCOME20</span> at checkout for instant savings.
            </p>
          </div>
          <Link
            to="/shop?deals=true"
            className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Explore Deals</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Best Sellers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20 pt-2">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Best Sellers
            </h2>
            <p className="mt-1.5 text-sm sm:text-base text-slate-600">
              Highest-rated everyday essentials chosen by NEXORA shoppers.
            </p>
          </div>
          <Link
            to="/shop?sort=popular"
            className="text-sm font-semibold text-slate-900 hover:text-blue-600 whitespace-nowrap shrink-0 inline-flex items-center gap-1"
          >
            <span>See all top rated</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <ProductGrid products={bestSellers} />
      </section>
    </div>
  );
};
