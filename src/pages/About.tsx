import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2, Mail, MapPin, Phone, Send } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { isValidEmail } from '../utils/validation';

export const About: React.FC = () => {
  const { hash } = useLocation();
  const { showToast } = useToast();

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.replace('#', ''));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [hash]);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !isValidEmail(contactEmail) || contactMessage.trim().length < 5) {
      showToast('Please enter your name, valid email, and a message.', 'error');
      return;
    }
    setSubmitted(true);
    showToast('Demo message submitted. No external email was sent.', 'success');
    setContactName('');
    setContactEmail('');
    setContactMessage('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-14">
      {/* Brand Intro */}
      <section className="space-y-4 pb-10 border-b border-slate-200">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
          About NEXORA
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          Discover. Shop. Experience.
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          NEXORA is a modern e-commerce storefront engineered to showcase responsive mobile-first
          shopping workflows, Progressive Web App (PWA) installability, offline resilience, and
          Trusted Web Activity (TWA) readiness for Android packaging.
        </p>
        <p className="text-sm text-slate-500 leading-relaxed">
          All products, pricing, user accounts, and payment steps operate locally in your browser
          using simulated logic and LocalStorage persistence—making NEXORA safe for end-to-end
          testing without real financial transactions.
        </p>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-24 space-y-6 pb-10 border-b border-slate-200">
        <h2 className="font-display text-2xl font-bold text-slate-900">Contact Us</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4 text-sm text-slate-600">
            <p>
              Questions about testing NEXORA, PWA installation, or Android TWA packaging? Reach our
              demo support desk below.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                <span>support@nexora.demo</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="tabular-nums">+91 80 4000 1200 (Demo Line)</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Indiranagar, Bengaluru 560038, India</span>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleContactSubmit}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3"
          >
            {submitted ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-display text-base font-bold text-slate-900">
                  Demo Inquiry Recorded
                </p>
                <p className="text-xs text-slate-600">
                  Thank you for testing the NEXORA contact workflow.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Your Name"
                  aria-label="Your Name"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 bg-white text-sm focus:border-blue-600 focus:outline-none"
                />
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Your Email"
                  aria-label="Your Email"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 bg-white text-sm focus:border-blue-600 focus:outline-none"
                />
                <textarea
                  rows={3}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="How can we help?"
                  aria-label="Message"
                  className="w-full p-3.5 rounded-xl border border-slate-200 bg-white text-sm focus:border-blue-600 focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Message</span>
                </button>
              </>
            )}
          </form>
        </div>
      </section>

      {/* Policies */}
      <section id="privacy" className="scroll-mt-24 space-y-3 pb-8 border-b border-slate-200">
        <h2 className="font-display text-xl font-bold text-slate-900">Privacy Policy</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          NEXORA stores cart items, wishlist selections, demo profile names, shipping addresses, and
          simulated order records exclusively inside your device&apos;s LocalStorage. No personal
          information is transmitted to external payment gateways or third-party trackers. Simulated
          card numbers and CVV inputs are cleared immediately in memory and are never persisted.
        </p>
      </section>

      <section id="terms" className="scroll-mt-24 space-y-3 pb-8 border-b border-slate-200">
        <h2 className="font-display text-xl font-bold text-slate-900">Terms and Conditions</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          All products, prices, discounts, and order tracking statuses displayed on NEXORA are
          demonstration data designed for testing e-commerce flows, PWA capabilities, and Android
          application wrappers. No commercial fulfillment or monetary settlement occurs.
        </p>
      </section>

      <section id="returns" className="scroll-mt-24 space-y-3">
        <h2 className="font-display text-xl font-bold text-slate-900">Return Policy</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          In a live commercial deployment of this architecture, items qualify for a 14-day easy
          return window in original packaging. Within this demo application, you can clear LocalStorage
          orders or advance delivery statuses directly from the My Orders screen.
        </p>
      </section>
    </div>
  );
};
