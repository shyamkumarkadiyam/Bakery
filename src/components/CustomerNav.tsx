'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, User, Home, UtensilsCrossed, Cake, PackageSearch } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuth } from '@/contexts/AuthContext';

const navLinks = [
  { label: 'Menu', href: '/menu-browser' },
  { label: 'Breakfast Box', href: '/breakfast-box' },
  { label: 'Cake Studio', href: '/cake-studio' },
  { label: 'Track Order', href: '/track-order' },
];

const bottomNavItems = [
  { label: 'HOME', href: '/', icon: Home },
  { label: 'MENU', href: '/menu-browser', icon: UtensilsCrossed },
  { label: 'STUDIO', href: '/cake-studio', icon: Cake },
  { label: 'ACCOUNT', href: '/account', icon: User },
];

export default function CustomerNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const cartCount = useCartStore((s) => s?.items?.reduce((a, i) => a + i?.qty, 0));
  const { user } = useAuth();

  const firstLetter = user
    ? (user?.user_metadata?.full_name?.trim()?.[0] ||
  user?.email?.[0] || 'U')?.toUpperCase()
    : null;

  useEffect(() => {
    setMounted(true);
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Use a stable active check only after mount to avoid hydration mismatch
  const isActive = (href: string) => mounted && pathname === href;

  return (
    <>
      {/* Desktop / Top Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled
            ? 'bg-white shadow-card border-b border-border'
            : 'bg-white/95 border-b border-border'
        }`}
      >
        <div className="max-w-screen-xl mx-auto px-4 lg:px-8 h-14 flex items-center justify-between">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="Lolita Bakery home"
          >
            <span
              className="font-sans font-extrabold text-lg tracking-tight"
              style={{ color: '#6b1a2e' }}
            >
              Lolita Bakery
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-extrabold font-sans transition-colors hover:text-foreground"
              style={{ color: isActive('/') ? '#6b1a2e' : '#3a2a2e' }}
            >
              Home
            </Link>
            {navLinks?.map((link) => (
              <Link
                key={`nav-${link?.href}`}
                href={link?.href}
                data-testid={`nav-link-${link?.href?.replace('/', '')}`}
                className="text-sm font-extrabold font-sans transition-colors hover:text-foreground"
                style={{ color: isActive(link?.href) ? '#6b1a2e' : '#3a2a2e' }}
              >
                {link?.label}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/track-order"
              data-testid="nav-track-order-mobile"
              className="md:hidden relative p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Track order"
            >
              <PackageSearch size={20} className="text-foreground" />
            </Link>
            <Link
              href="/cart-checkout"
              className="relative p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="View cart"
            >
              <ShoppingCart size={20} className="text-foreground" />
              {mounted && cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center font-sans">
                  {cartCount}
                </span>
              )}
            </Link>
            {mounted && firstLetter ? (
              <Link
                href="/account"
                className="hidden md:flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold font-sans hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#6b1a2e' }}
                aria-label="My account"
              >
                {firstLetter}
              </Link>
            ) : (
              <Link
                href="/account"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-bold font-sans hover:bg-muted transition-colors"
                style={{ color: '#3a2a2e' }}
              >
                <User size={14} />
                Account
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border">
        <div className="flex items-center justify-around px-2 py-1">
          {bottomNavItems?.map((item) => {
            const NavIcon = item?.icon;
            const active = isActive(item?.href);
            const isCart = item?.href === '/cart-checkout';
            const isAccount = item?.href === '/account';
            return (
              <Link
                key={`bottom-nav-${item?.href}`}
                href={item?.href}
                className={`bottom-nav-item relative ${active ? 'active' : ''}`}
              >
                {active ? (
                  <span className="bottom-nav-active-pill flex flex-col items-center gap-0.5">
                    {isAccount && firstLetter ? (
                      <span
                        className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: '#6b1a2e' }}
                      >
                        {firstLetter}
                      </span>
                    ) : (
                      <NavIcon size={18} />
                    )}
                    <span className="text-[10px] font-bold font-sans">{item?.label}</span>
                  </span>
                ) : (
                  <>
                    <span className="relative">
                      {isAccount && mounted && firstLetter ? (
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: '#6b1a2e' }}
                        >
                          {firstLetter}
                        </span>
                      ) : (
                        <NavIcon size={20} />
                      )}
                      {isCart && mounted && cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                          {cartCount}
                        </span>
                      )}
                    </span>
                    <span className="font-bold">{item?.label}</span>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}