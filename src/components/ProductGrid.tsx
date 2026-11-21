import React from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  columns?: 3 | 4;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products, columns = 3 }) => {
  const gridCols =
    columns === 4
      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      : 'grid-cols-2 md:grid-cols-3';

  return (
    <div className={`grid ${gridCols} gap-4 sm:gap-6 lg:gap-7`}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-7" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden"
      >
        <div className="aspect-[4/3] w-full bg-slate-100 animate-pulse" />
        <div className="p-4 sm:p-5 space-y-3">
          <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
          <div className="h-5 w-3/4 bg-slate-100 rounded animate-pulse" />
          <div className="h-5 w-1/2 bg-slate-100 rounded animate-pulse" />
          <div className="h-11 w-full bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);
