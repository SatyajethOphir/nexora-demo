import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isValidEmail } from '../utils/validation';

export const ForgotPassword: React.FC = () => {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    const res = requestPasswordReset(email);
    setNotice(res.message);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>

        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-bold text-slate-900">Reset Password</h1>
          <p className="text-sm text-slate-600">
            Simulated recovery flow for local NEXORA demo accounts.
          </p>
        </div>

        {notice ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-3">
            <div className="flex items-start gap-2.5 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed">{notice}</p>
            </div>
            <Link
              to="/login"
              className="block w-full text-center min-h-[44px] leading-[44px] rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
            >
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Registered Demo Email
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="demo@nexora.shop"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
              {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>Send Simulated Reset Link</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
