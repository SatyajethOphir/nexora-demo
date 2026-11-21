import React from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { HydratedCartItem } from '../context/CartContext';
import { formatINR } from '../utils/pricing';
import { ProductImage } from './ProductImage';

interface CartItemProps {
  item: HydratedCartItem;
  onUpdateQuantity: (productId: string, qty: number) => void;
  onRemove: (productId: string, name: string) => void;
}

export const CartItem: React.FC<CartItemProps> = ({
  item,
  onUpdateQuantity,
  onRemove,
}) => {
  const { product, quantity, lineTotal } = item;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-5 border-b border-slate-200 last:border-b-0">
      <Link
        to={`/product/${product.slug}`}
        className="w-24 h-20 sm:w-28 sm:h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/60"
      >
        <ProductImage src={product.image} alt={product.name} />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
              {product.category} <span aria-hidden="true">·</span> SKU {product.sku}
            </p>
            <Link
              to={`/product/${product.slug}`}
              className="mt-0.5 block font-display text-base font-semibold text-slate-900 hover:text-blue-600 transition-colors truncate"
            >
              {product.name}
            </Link>
            <p className="mt-1 text-sm text-slate-600 tabular-nums">
              Unit price: {formatINR(product.price)}
            </p>
          </div>
          <p className="font-display text-base sm:text-lg font-bold text-slate-900 tabular-nums shrink-0">
            {formatINR(lineTotal)}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-4">
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={() => onUpdateQuantity(product.id, quantity - 1)}
              aria-label={`Decrease quantity of ${product.name}`}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-l-xl transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span
              className="w-10 text-center text-sm font-semibold text-slate-900 tabular-nums"
              aria-label="Quantity"
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => onUpdateQuantity(product.id, quantity + 1)}
              disabled={quantity >= product.stock}
              aria-label={`Increase quantity of ${product.name}`}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-r-xl transition-colors disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onRemove(product.id, product.name)}
            className="min-h-[44px] px-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            <span>Remove</span>
          </button>
        </div>
      </div>
    </div>
  );
};
