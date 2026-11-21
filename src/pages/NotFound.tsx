import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-5">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
        <Compass className="w-7 h-7" />
      </div>
      <p className="font-mono text-xs font-semibold text-blue-600 uppercase tracking-widest">
        Error 404
      </p>
      <h1 className="font-display text-3xl font-extrabold text-slate-900">Page not found</h1>
      <p className="text-sm sm:text-base text-slate-600">
        The page you are looking for might have moved or does not exist in this storefront.
      </p>
      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <Link
          to="/shop"
          className="min-h-[44px] inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
        >
          Browse Catalogue
        </Link>
      </div>
    </div>
  );
};
