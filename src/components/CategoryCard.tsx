import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Category } from '../types';
import { ProductImage } from './ProductImage';

interface CategoryCardProps {
  category: Category;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
  return (
    <Link
      to={`/shop?category=${category.slug}`}
      className="group relative block rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-100 aspect-[4/3] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-600"
    >
      <ProductImage
        src={category.image}
        alt={category.name}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex items-end justify-between gap-2 text-white">
        <div className="min-w-0">
          <h3 className="font-display text-base sm:text-lg font-semibold leading-tight truncate">
            {category.name}
          </h3>
          <p className="text-xs text-slate-200 mt-0.5 tabular-nums">
            {category.productCount} essentials
          </p>
        </div>
        <span className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:bg-blue-600">
          <ArrowUpRight className="w-4 h-4 text-white" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
};
