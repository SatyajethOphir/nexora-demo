import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Instagram, Linkedin, Mail, Share2 } from 'lucide-react';
import { CATEGORIES } from '../data/categories';
import { PWAInstallButton } from './Toast';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <Link
              to="/"
              className="font-display text-xl font-extrabold tracking-tight text-white inline-block"
            >
              NEXORA
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Discover. Shop. Experience. Curated technology, fashion, homewares, and everyday essentials designed for modern living.
            </p>
            <div className="pt-1">
              <PWAInstallButton variant="compact" />
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-display text-sm font-semibold text-white mb-4">
              Categories
            </h3>
            <ul className="space-y-2.5 text-sm">
              {CATEGORIES.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    to={`/shop?category=${cat.slug}`}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer & Policies */}
          <div>
            <h3 className="font-display text-sm font-semibold text-white mb-4">
              Company &amp; Policies
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/about" className="text-slate-400 hover:text-white transition-colors">
                  About NEXORA
                </Link>
              </li>
              <li>
                <Link to="/about#contact" className="text-slate-400 hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/about#privacy" className="text-slate-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/about#terms" className="text-slate-400 hover:text-white transition-colors">
                  Terms and Conditions
                </Link>
              </li>
              <li>
                <Link to="/about#returns" className="text-slate-400 hover:text-white transition-colors">
                  Return Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Account & Connect */}
          <div className="space-y-4">
            <h3 className="font-display text-sm font-semibold text-white">
              Account &amp; Connect
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/orders" className="text-slate-400 hover:text-white transition-colors">
                  My Orders
                </Link>
              </li>
              <li>
                <Link to="/wishlist" className="text-slate-400 hover:text-white transition-colors">
                  Saved Wishlist
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-slate-400 hover:text-white transition-colors">
                  Shopping Bag
                </Link>
              </li>
              <li>
                <Link to="/notifications" className="text-slate-400 hover:text-white transition-colors">
                  Notification Settings
                </Link>
              </li>
            </ul>

            <div className="pt-2 flex items-center gap-3">
              <Link
                to="/about#contact"
                aria-label="Email NEXORA support"
                className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
              >
                <Mail className="w-4 h-4" />
              </Link>
              <Link
                to="/about"
                aria-label="NEXORA on Instagram"
                className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </Link>
              <Link
                to="/about"
                aria-label="NEXORA on LinkedIn"
                className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </Link>
              <Link
                to="/about"
                aria-label="NEXORA Storefront"
                className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
              >
                <Globe className="w-4 h-4" />
              </Link>
              <button
                type="button"
                aria-label="Share NEXORA storefront"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'NEXORA — Discover. Shop. Experience.',
                      url: window.location.origin,
                    }).catch(() => {});
                  } else if (navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.origin).catch(() => {});
                  }
                }}
                className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} NEXORA Commerce Demo. All rights reserved.</p>
          <p>Demonstration storefront — LocalStorage persistence &amp; simulated payments.</p>
        </div>
      </div>
    </footer>
  );
};
