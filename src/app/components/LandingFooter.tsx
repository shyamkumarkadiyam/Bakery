import React from 'react';
import Link from 'next/link';
import { MapPin, Phone, Mail } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer className="bg-foreground text-white py-12 pb-20 md:pb-12">
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <p className="font-sans font-bold text-lg text-white mb-3">Lolita Bakery</p>
            <p className="font-body text-white/60 text-sm leading-relaxed max-w-xs">
              Authentic Venezuelan bites, made fresh daily in Miami with love and family recipes.
            </p>
          </div>

          {/* Contact */}
          <div>
            <p className="font-sans font-semibold text-xs mb-3 text-white/60 uppercase tracking-wider">Contact</p>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2 font-body text-sm text-white/50">
                <MapPin size={13} className="text-primary flex-shrink-0" />
                Peoria, IL
              </li>
              <li className="flex items-center gap-2 font-body text-sm text-white/50">
                <Phone size={13} className="text-primary flex-shrink-0" />
                (305) 555-0192
              </li>
              <li className="flex items-center gap-2 font-body text-sm text-white/50">
                <Mail size={13} className="text-primary flex-shrink-0" />
                hola@lolitabakery.com
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="font-body text-xs text-white/30">
            © 2026 Lolita Bakery. Made with love in Peoria, IL.
          </p>
          <div className="flex gap-4 font-body text-xs text-white/30">
            <Link href="/track-order" data-testid="footer-track-order-link" className="hover:text-white/60 transition-colors">Track Order</Link>
            <Link href="#" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white/60 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}