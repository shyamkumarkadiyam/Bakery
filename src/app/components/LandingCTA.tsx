import React from 'react';
import Link from 'next/link';

export default function LandingCTA() {
  return (
    <section className="py-16 bg-primary">
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 text-center">
        <h2 className="font-sans font-bold text-3xl text-white mb-3">
          Ready to taste Venezuela?
        </h2>
        <p className="font-body text-white/85 text-base max-w-md mx-auto mb-8">
          Fresh arepas, empanadas, and more — made this morning, delivered to your door.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/menu-browser"
            className="inline-block bg-white font-sans font-semibold px-8 py-3 rounded-lg text-sm hover:bg-pink-light transition-colors shadow-sm"
            style={{ color: '#D63B5E' }}
          >
            Order Now
          </Link>
          <Link
            href="/breakfast-box"
            className="inline-block border border-white/60 text-white font-sans font-semibold px-8 py-3 rounded-lg text-sm hover:bg-white/10 transition-colors"
          >
            Build Breakfast Box
          </Link>
        </div>
      </div>
    </section>
  );
}