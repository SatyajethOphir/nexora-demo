import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { CATEGORIES } from '../data/categories';
import { PRODUCTS } from '../data/products';
import { ProductGrid } from '../components/ProductGrid';
import { SearchBar } from '../components/SearchBar';

type SortOption = 'popular' | 'price-asc' | 'price-desc' | 'newest';
type PriceBucket = 'all' | 'under-1000' | '1000-3000' | 'above-3000';

export const Shop: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const selectedCategory = searchParams.get('category') || 'all';
  const query = searchParams.get('q') || '';
  const dealsOnly = searchParams.get('deals') === 'true';
  const sort = (searchParams.get('sort') as SortOption) || 'popular';
  const priceBucket = (searchParams.get('price') as PriceBucket) || 'all';
  const minRating = Number(searchParams.get('rating') || '0');

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all' || value === '0' || value === 'false') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const resetAllFilters = () => {
    setSearchParams({});
  };

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();

    const list = PRODUCTS.filter((product) => {
      if (selectedCategory !== 'all' && product.categorySlug !== selectedCategory) {
        return false;
      }
      if (dealsOnly && product.discount < 35) {
        return false;
      }
      if (q) {
        const match =
          product.name.toLowerCase().includes(q) ||
          product.category.toLowerCase().includes(q) ||
          product.description.toLowerCase().includes(q) ||
          product.sku.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (priceBucket === 'under-1000' && product.price >= 1000) return false;
      if (priceBucket === '1000-3000' && (product.price < 1000 || product.price > 3000)) {
        return false;
      }
      if (priceBucket === 'above-3000' && product.price <= 3000) return false;
      if (minRating > 0 && product.rating < minRating) return false;

      return true;
    });

    return [...list].sort((a, b) => {
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'newest') {
        const aNew = a.isNew ? 1 : 0;
        const bNew = b.isNew ? 1 : 0;
        if (bNew !== aNew) return bNew - aNew;
        return b.id.localeCompare(a.id);
      }
      return b.reviewCount * b.rating - a.reviewCount * a.rating;
    });
  }, [selectedCategory, query, dealsOnly, priceBucket, minRating, sort]);

  const activeFilterCount =
    (selectedCategory !== 'all' ? 1 : 0) +
    (dealsOnly ? 1 : 0) +
    (priceBucket !== 'all' ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (query ? 1 : 0);

  const FilterPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-sm font-semibold text-slate-900 mb-3">
          Categories
        </h3>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => updateParam('category', 'all')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors min-h-[40px] ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>All Categories</span>
            <span className="text-xs opacity-75 tabular-nums">{PRODUCTS.length}</span>
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => updateParam('category', cat.slug)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors min-h-[40px] ${
                selectedCategory === cat.slug
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-xs opacity-75 tabular-nums">{cat.productCount}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-5 border-t border-slate-200">
        <h3 className="font-display text-sm font-semibold text-slate-900 mb-3">
          Price Range
        </h3>
        <div className="space-y-1.5">
          {[
            { id: 'all', label: 'All Prices' },
            { id: 'under-1000', label: 'Under ₹1,000' },
            { id: '1000-3000', label: '₹1,000 – ₹3,000' },
            { id: 'above-3000', label: 'Above ₹3,000' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => updateParam('price', opt.id)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors min-h-[40px] ${
                priceBucket === opt.id
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-5 border-t border-slate-200">
        <h3 className="font-display text-sm font-semibold text-slate-900 mb-3">
          Customer Rating
        </h3>
        <div className="space-y-1.5">
          {[
            { value: 0, label: 'All Ratings' },
            { value: 4.6, label: '4.6★ & above' },
            { value: 4.8, label: '4.8★ & above' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateParam('rating', String(opt.value))}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors min-h-[40px] ${
                minRating === opt.value
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-5 border-t border-slate-200">
        <label className="flex items-center justify-between gap-3 cursor-pointer min-h-[44px]">
          <span className="text-sm font-medium text-slate-900">Deals (35%+ Off)</span>
          <input
            type="checkbox"
            checked={dealsOnly}
            onChange={(e) => updateParam('deals', e.target.checked ? 'true' : 'false')}
            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
          />
        </label>
      </div>

      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={resetAllFilters}
          className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Filters</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-6 border-b border-slate-200">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {dealsOnly
              ? 'Limited Time Deals'
              : selectedCategory !== 'all'
                ? CATEGORIES.find((c) => c.slug === selectedCategory)?.name || 'Catalogue'
                : 'All Products'}
          </h1>
          <p className="mt-1 text-sm text-slate-600 tabular-nums">
            Showing {filteredProducts.length} of {PRODUCTS.length} products
            {query ? ` for “${query}”` : ''}
          </p>
        </div>

        <div className="w-full md:w-96">
          <SearchBar initialValue={query} />
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-4">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="lg:hidden min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
        </button>

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500">
          <span>Active filters:</span>
          <span className="font-medium text-slate-900">
            {activeFilterCount === 0 ? 'None' : `${activeFilterCount} applied`}
          </span>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="ml-2 text-blue-600 font-semibold hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <label htmlFor="sort-select" className="text-xs font-medium text-slate-500 whitespace-nowrap">
            Sort by
          </label>
          <select
            id="sort-select"
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
          >
            <option value="popular">Popularity</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="newest">Newest Arrivals</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-24 rounded-2xl border border-slate-200/80 bg-white p-5">
            {FilterPanel}
          </div>
        </aside>

        <div className="lg:col-span-9">
          {filteredProducts.length > 0 ? (
            <ProductGrid products={filteredProducts} />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h2 className="mt-4 font-display text-lg font-bold text-slate-900">
                No products match your search
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 max-w-md mx-auto">
                Try adjusting your keywords, broadening the price range, or clearing active category filters.
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-6 min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="relative w-80 max-w-[88vw] bg-white h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 h-14 border-b border-slate-200">
              <h2 className="font-display text-base font-bold text-slate-900">Filter Products</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">{FilterPanel}</div>
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full min-h-[44px] rounded-xl bg-slate-900 text-sm font-semibold text-white"
              >
                Show {filteredProducts.length} Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
