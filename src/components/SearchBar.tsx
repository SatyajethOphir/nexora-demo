import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { PRODUCTS } from '../data/products';
import { formatINR } from '../utils/pricing';

interface SearchBarProps {
  initialValue?: string;
  onSelectResult?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  initialValue = '',
  onSelectResult,
  placeholder = 'Search headphones, sneakers, desk lamps...',
  autoFocus = false,
}) => {
  const [query, setQuery] = useState(initialValue);
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    setFocused(false);
    if (trimmed) {
      navigate(`/shop?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/shop');
    }
    onSelectResult?.();
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <Search
          className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 180)}
          placeholder={placeholder}
          aria-label="Search products"
          className="w-full min-h-[44px] pl-10 pr-10 py-2 text-sm bg-slate-100 border border-transparent rounded-xl text-slate-900 placeholder:text-slate-500 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {focused && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-white border border-slate-200 shadow-lg overflow-hidden">
          {suggestions.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {suggestions.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setFocused(false);
                      navigate(`/product/${product.slug}`);
                      onSelectResult?.();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors min-h-[52px]"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.category}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 tabular-nums shrink-0">
                      {formatINR(product.price)}
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setFocused(false);
                    navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
                    onSelectResult?.();
                  }}
                  className="w-full px-4 py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 text-center transition-colors"
                >
                  View all results for &ldquo;{query.trim()}&rdquo;
                </button>
              </li>
            </ul>
          ) : (
            <div className="px-4 py-4 text-sm text-slate-500 text-center">
              No matching products found. Press Enter to search full catalogue.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
