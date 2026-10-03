'use client';
import React from 'react';
import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="pt-14 bg-white">

      {/* ── MOBILE HERO (portrait image, natural height) ── */}
      <div className="block md:hidden relative w-full bg-[#fce8ef]">
        {/* Portrait image — no fill, natural aspect ratio */}
        <img
          src="/assets/images/ChatGPT_Image_Sep_22__2026__03_22_21_AM__1_-1790029862191.jpg"
          alt="Lolita Bakery — portrait illustration for mobile"
          className="w-full h-auto block"
          style={{ display: 'block', maxHeight: '90vh', objectFit: 'contain', objectPosition: 'center top' }}
          fetchPriority="high"
          decoding="async"
        />

        {/* Glassy top blend */}
        <div
          className="absolute top-0 left-0 right-0 h-20 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.80) 0%, transparent 100%)',
          }}
        />

        {/* Glassy bottom blend */}
        <div
          className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(to top, rgba(255,255,255,0.80) 0%, transparent 100%)',
          }}
        />

        {/* CTA buttons */}
        <div className="absolute bottom-6 left-5 z-20 flex flex-col gap-3">
          <Link
            href="/menu-browser"
            className="btn-primary px-6 py-3 text-sm font-sans font-semibold inline-block text-center"
          >
            Order Now
          </Link>
          <Link
            href="/breakfast-box"
            className="px-6 py-3 text-sm font-sans font-semibold inline-block text-center rounded-lg border-2 transition-all"
            style={{ borderColor: '#7a2a3a', color: '#7a2a3a', background: 'rgba(255,255,255,0.80)' }}
          >
            Build Breakfast Box
          </Link>
        </div>
      </div>

      {/* ── DESKTOP HERO (fill/cover, fixed height) ── */}
      <div className="hidden md:block relative w-full h-[620px] overflow-hidden bg-[#fce8ef]">
        <img
          src="/assets/images/ChatGPT_Image_Sep_22__2026__02_56_40_AM__1_-1790029862189.png"
          alt="Lolita Bakery — illustrated lady with Venezuelan sweets and pastries"
          className="absolute inset-0 w-full h-full object-cover object-top"
          fetchPriority="high"
          decoding="async"
        />

        {/* Glassy top blend */}
        <div
          className="absolute top-0 left-0 right-0 h-28 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.38) 55%, transparent 100%)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
          }}
        />

        {/* Glassy bottom blend */}
        <div
          className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(to top, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.38) 55%, transparent 100%)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            maskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
          }}
        />

        {/* CTA buttons */}
        <div className="absolute bottom-10 left-10 z-20 flex flex-col sm:flex-row gap-3">
          <Link
            href="/menu-browser"
            className="btn-primary px-7 py-3 text-sm font-sans font-semibold inline-block text-center"
          >
            Order Now
          </Link>
          <Link
            href="/breakfast-box"
            className="px-7 py-3 text-sm font-sans font-semibold inline-block text-center rounded-lg border-2 transition-all"
            style={{ borderColor: '#7a2a3a', color: '#7a2a3a', background: 'rgba(255,255,255,0.75)' }}
          >
            Build Breakfast Box
          </Link>
        </div>
      </div>

      {/* Info bar */}
      <div className="bg-white border-b border-border">
        <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-4 flex flex-wrap items-center gap-6 text-sm font-body text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            <span>Open now · Closes 8 PM</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>
            <span>Peoria, IL</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            <span>~30 min delivery</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            <span className="font-semibold text-foreground">4.9</span>
            <span>(200+ reviews)</span>
          </div>
        </div>
      </div>
    </section>
  );
}